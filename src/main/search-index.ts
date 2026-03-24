import Database from 'better-sqlite3';

export interface IndexedNoteRecord {
  filename: string;
  content: string;
}

export interface SearchIndexStatus {
  ready: boolean;
  databasePath: string;
  notesFolder: string | null;
  noteCount: number;
  lastIndexedAt: string | null;
}

type BetterSqliteDatabase = InstanceType<typeof Database>;

function buildSnippet(content: string, query: string): string {
  const trimmed = content.trim();
  if (!trimmed) return '';

  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerContent.indexOf(lowerQuery);

  if (idx === -1) {
    return trimmed.length > 80 ? `${trimmed.slice(0, 80).trim()}...` : trimmed;
  }

  const start = Math.max(0, idx - 30);
  const end = Math.min(content.length, idx + query.length + 50);
  return `${start > 0 ? '...' : ''}${content.slice(start, end).trim()}${end < content.length ? '...' : ''}`;
}

function buildFtsQuery(query: string): string {
  const terms = query
    .trim()
    .split(/\s+/)
    .map((term) => term.replace(/"/g, '""'))
    .filter((term) => term.length > 0);

  return terms.map((term) => `"${term}"`).join(' AND ');
}

export class SearchIndex {
  private db: BetterSqliteDatabase | null = null;
  private notesFolder: string | null = null;

  constructor(private readonly databasePath: string) {}

  initialize(notesFolder: string, notes: IndexedNoteRecord[]): SearchIndexStatus {
    const db = this.getDb();
    this.notesFolder = notesFolder;
    this.configureDatabase(db);
    this.ensureSchema(db);

    const indexedFolder = this.getMetadata('notesFolder');
    const shouldRebuild = indexedFolder !== notesFolder || this.getNoteCount(db) !== notes.length;

    this.setMetadata('notesFolder', notesFolder);

    if (shouldRebuild) {
      this.rebuild(notesFolder, notes);
    }

    return this.getStatus();
  }

  rebuild(notesFolder: string, notes: IndexedNoteRecord[]): SearchIndexStatus {
    const db = this.getDb();
    this.notesFolder = notesFolder;
    this.ensureSchema(db);

    const replaceAll = db.transaction((records: IndexedNoteRecord[]) => {
      db.prepare('DELETE FROM notes').run();

      const insert = db.prepare(`
        INSERT INTO notes (filename, content, updated_at)
        VALUES (?, ?, ?)
      `);

      const now = new Date().toISOString();
      for (const note of records) {
        insert.run(note.filename, note.content, now);
      }
    });

    replaceAll(notes);
    this.setMetadata('notesFolder', notesFolder);
    this.touchIndex();
    return this.getStatus();
  }

  clear(notesFolder?: string): SearchIndexStatus {
    const db = this.getDb();
    db.prepare('DELETE FROM notes').run();
    if (notesFolder) {
      this.notesFolder = notesFolder;
      this.setMetadata('notesFolder', notesFolder);
    }
    this.setMetadata('lastIndexedAt', '');
    return this.getStatus();
  }

  upsertNote(filename: string, content: string): void {
    const db = this.getDb();
    db.prepare(`
      INSERT INTO notes (filename, content, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(filename) DO UPDATE SET
        content = excluded.content,
        updated_at = excluded.updated_at
    `).run(filename, content, new Date().toISOString());
    this.touchIndex();
  }

  removeNote(filename: string): void {
    const db = this.getDb();
    db.prepare('DELETE FROM notes WHERE filename = ?').run(filename);
    this.touchIndex();
  }

  searchNotes(query: string): Array<{ filename: string; snippet: string }> {
    const db = this.getDb();
    const ftsQuery = buildFtsQuery(query);

    if (!ftsQuery) return [];

    const rows = db.prepare(`
      SELECT notes.filename AS filename, notes.content AS content
      FROM note_search
      JOIN notes ON notes.rowid = note_search.rowid
      WHERE note_search MATCH ?
      ORDER BY notes.filename DESC
      LIMIT 100
    `).all(ftsQuery) as Array<{ filename: string; content: string }>;

    return rows.map((row) => ({
      filename: row.filename,
      snippet: buildSnippet(row.content, query),
    }));
  }

  getStatus(): SearchIndexStatus {
    if (!this.db) {
      return {
        ready: false,
        databasePath: this.databasePath,
        notesFolder: this.notesFolder,
        noteCount: 0,
        lastIndexedAt: null,
      };
    }

    return {
      ready: true,
      databasePath: this.databasePath,
      notesFolder: this.getMetadata('notesFolder') || this.notesFolder,
      noteCount: this.getNoteCount(this.db),
      lastIndexedAt: this.getMetadata('lastIndexedAt') || null,
    };
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private getDb(): BetterSqliteDatabase {
    if (!this.db) {
      this.db = new Database(this.databasePath);
    }

    return this.db;
  }

  private configureDatabase(db: BetterSqliteDatabase): void {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }

  private ensureSchema(db: BetterSqliteDatabase): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        filename TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS index_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS note_search USING fts5(
        filename,
        content,
        content = 'notes',
        content_rowid = 'rowid',
        tokenize = 'unicode61 remove_diacritics 2'
      );

      CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
        INSERT INTO note_search(rowid, filename, content)
        VALUES (new.rowid, new.filename, new.content);
      END;

      CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
        INSERT INTO note_search(note_search, rowid, filename, content)
        VALUES ('delete', old.rowid, old.filename, old.content);
      END;

      CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
        INSERT INTO note_search(note_search, rowid, filename, content)
        VALUES ('delete', old.rowid, old.filename, old.content);
        INSERT INTO note_search(rowid, filename, content)
        VALUES (new.rowid, new.filename, new.content);
      END;
    `);
  }

  private touchIndex(): void {
    this.setMetadata('lastIndexedAt', new Date().toISOString());
  }

  private getNoteCount(db: BetterSqliteDatabase): number {
    const row = db.prepare('SELECT COUNT(*) AS count FROM notes').get() as { count: number };
    return row.count;
  }

  private getMetadata(key: string): string {
    const db = this.getDb();
    const row = db.prepare('SELECT value FROM index_metadata WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? '';
  }

  private setMetadata(key: string, value: string): void {
    const db = this.getDb();
    db.prepare(`
      INSERT INTO index_metadata (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
  }
}