export type NoteKind = 'journal' | 'note';

export interface NoteSummary {
  filename: string;
  kind: NoteKind;
  title: string;
  subtitle: string;
  folder: string;
  basename: string;
}

export interface NoteSearchResult {
  note: NoteSummary;
  snippet: string;
}

const JOURNAL_FILENAME_PATTERN = /^\d{4}-\d{2}-\d{2}\.md$/;
const NOTE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

function stripMarkdownExtension(filename: string): string {
  return filename.replace(/\.md$/i, '');
}

function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, '/');
}

function splitRelativePath(relativePath: string): string[] {
  return normalizeSlashes(relativePath)
    .split('/')
    .filter((segment) => segment.length > 0);
}

export function getNoteFolder(relativePath: string): string {
  const segments = splitRelativePath(relativePath);
  return segments.slice(0, -1).join('/');
}

export function getNoteBasename(relativePath: string): string {
  const segments = splitRelativePath(relativePath);
  return segments[segments.length - 1] ?? '';
}

export function normalizeNoteFolder(folder: string): string {
  const normalized = normalizeSlashes(folder).trim().replace(/^\/+|\/+$/g, '');
  if (!normalized) {
    return '';
  }

  const segments = normalized.split('/').filter((segment) => segment.length > 0);
  for (const segment of segments) {
    if (segment === '.' || segment === '..') {
      throw new Error('Invalid folder path');
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(segment)) {
      throw new Error('Folder names can use letters, numbers, and hyphens');
    }
  }

  return segments.join('/');
}

export function normalizeNotePath(notePath: string): string {
  const normalized = normalizeSlashes(notePath).trim().replace(/^\/+/, '');
  const segments = normalized.split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    throw new Error('Invalid note path');
  }

  for (const segment of segments) {
    if (segment === '.' || segment === '..') {
      throw new Error('Invalid note path');
    }
  }

  return segments.join('/');
}

function capitalizeWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function getTodayFilename(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}.md`;
}

export function isJournalFilename(filename: string): boolean {
  return JOURNAL_FILENAME_PATTERN.test(filename);
}

export function isJournalPath(relativePath: string): boolean {
  const normalized = normalizeNotePath(relativePath);
  return !normalized.includes('/') && isJournalFilename(normalized);
}

export function isGeneralNoteFilename(filename: string): boolean {
  return NOTE_SLUG_PATTERN.test(filename) && !isJournalFilename(filename);
}

export function isGeneralNotePath(relativePath: string): boolean {
  const basename = getNoteBasename(relativePath);
  return isGeneralNoteFilename(basename);
}

export function isNoteFilename(filename: string): boolean {
  return isJournalFilename(filename) || isGeneralNoteFilename(filename);
}

export function isNotePath(relativePath: string): boolean {
  const normalized = normalizeNotePath(relativePath);
  return isJournalPath(normalized) || isGeneralNotePath(normalized);
}

export function humanizeNoteSlug(filename: string): string {
  const slug = stripMarkdownExtension(filename);
  return slug
    .split('-')
    .filter((segment) => segment.length > 0)
    .map(capitalizeWord)
    .join(' ');
}

export function getNoteSummary(filename: string): NoteSummary {
  const normalized = normalizeNotePath(filename);
  const basename = getNoteBasename(normalized);
  const folder = getNoteFolder(normalized);

  if (isJournalPath(normalized)) {
    const dateText = stripMarkdownExtension(basename);
    const [year, month, day] = dateText.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    let title = dateText;
    if (!Number.isNaN(date.getTime())) {
      title = date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }

    return {
      filename: normalized,
      kind: 'journal',
      title,
      subtitle: '',
      folder: '',
      basename,
    };
  }

  return {
    filename: normalized,
    kind: 'note',
    title: humanizeNoteSlug(basename),
    subtitle: '',
    folder,
    basename,
  };
}

export function compareNoteFilenames(left: string, right: string): number {
  const leftPath = normalizeNotePath(left);
  const rightPath = normalizeNotePath(right);
  const leftIsJournal = isJournalPath(leftPath);
  const rightIsJournal = isJournalPath(rightPath);

  if (leftIsJournal && rightIsJournal) {
    return rightPath.localeCompare(leftPath);
  }

  if (leftIsJournal) {
    return -1;
  }

  if (rightIsJournal) {
    return 1;
  }

  return leftPath.localeCompare(rightPath);
}

export function slugifyNoteTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function createUniqueGeneralNoteFilename(title: string, existingFilenames: Iterable<string>): string {
  let baseSlug = slugifyNoteTitle(title);
  if (!baseSlug) {
    baseSlug = 'untitled-note';
  }

  if (isJournalFilename(`${baseSlug}.md`)) {
    baseSlug = `${baseSlug}-note`;
  }

  const existing = new Set(Array.from(existingFilenames, (entry) => normalizeNotePath(entry)));
  let candidate = `${baseSlug}.md`;
  let index = 2;

  while (existing.has(candidate)) {
    candidate = `${baseSlug}-${index}.md`;
    index += 1;
  }

  return candidate;
}
