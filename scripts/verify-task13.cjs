const fs = require('fs');
const os = require('os');
const path = require('path');
const { SearchIndex } = require('../src/main/search-index.ts');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function writeNotes(notesFolder, notes) {
  fs.mkdirSync(notesFolder, { recursive: true });
  for (const note of notes) {
    fs.writeFileSync(path.join(notesFolder, note.filename), note.content, 'utf-8');
  }
}

function filenamesForQuery(index, query) {
  return index.searchNotes(query).map((result) => result.filename);
}

function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'slate-task13-'));
  const notesFolder = path.join(tempRoot, 'notes');
  const databasePath = path.join(tempRoot, 'search-index.db');
  const searchIndex = new SearchIndex(databasePath);

  try {
    const initialNotes = [
      {
        filename: '2026-03-24.md',
        content: '# Today\n\nAlpha term lives in the current note.',
      },
      {
        filename: '2026-03-23.md',
        content: '# Yesterday\n\nImported markdown content keeps the omega term searchable.',
      },
    ];

    writeNotes(notesFolder, initialNotes);

    let status = searchIndex.initialize(notesFolder, initialNotes);
    assert(status.ready, 'Search index should be ready after initialization');
    assert(status.noteCount === 2, 'Search index should count the initialized notes');
    assert(status.notesFolder === notesFolder, 'Search index should remember the notes folder');
    assert(filenamesForQuery(searchIndex, 'alpha').includes('2026-03-24.md'), 'Initialized index should find alpha note');
    assert(filenamesForQuery(searchIndex, 'omega').includes('2026-03-23.md'), 'Initialized index should find omega note');

    status = searchIndex.clear(notesFolder);
    assert(status.noteCount === 0, 'Cleared index should report zero notes');
    assert(status.lastIndexedAt === null, 'Cleared index should reset last indexed timestamp');
    assert(filenamesForQuery(searchIndex, 'alpha').length === 0, 'Cleared index should remove alpha results');

    const rebuiltNotes = [
      ...initialNotes,
      {
        filename: '2026-03-22.md',
        content: '# Archive\n\nGamma term appears only after rebuild.',
      },
    ];

    writeNotes(notesFolder, rebuiltNotes);
    status = searchIndex.rebuild(notesFolder, rebuiltNotes);
    assert(status.noteCount === 3, 'Rebuilt index should count all rebuilt notes');
    assert(filenamesForQuery(searchIndex, 'gamma').includes('2026-03-22.md'), 'Rebuilt index should find gamma note');

    searchIndex.upsertNote('2026-03-25.md', '# Fresh\n\nDelta term arrives through incremental update.');
    assert(filenamesForQuery(searchIndex, 'delta').includes('2026-03-25.md'), 'Upsert should make delta note searchable');

    searchIndex.removeNote('2026-03-23.md');
    assert(!filenamesForQuery(searchIndex, 'omega').includes('2026-03-23.md'), 'Removed note should disappear from search results');

    console.log('Task 13 verification passed.');
    console.log(`Database: ${databasePath}`);
    console.log(`Notes folder: ${notesFolder}`);
  } finally {
    searchIndex.close();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

try {
  main();
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}