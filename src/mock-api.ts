import type { ClaudeNotesAnswer, ClaudeSettings, MarkdownImportDecision, MarkdownImportResult, MarkdownImportScanResult, SlateAPI, WindowState } from './preload';
import { compareNoteFilenames, createUniqueGeneralNoteFilename, getNoteFolder, getNoteSummary, getTodayFilename, isNotePath, normalizeNotePath, type NoteSearchResult } from './shared/notes';

const MOCK_INDEX_STATUS_KEY = 'slate-search-index-status';
const MOCK_IMPORT_SESSION_KEY = 'slate-import-session';
const ASSET_STORAGE_PREFIX = 'slate-asset:';
const MOCK_CLAUDE_API_KEY = 'slate-claude-api-key';
const MOCK_CLAUDE_MODEL = 'slate-claude-model';
const DEFAULT_CLAUDE_MODEL = 'claude-3-5-sonnet-latest';

/**
 * Mock API for browser-based development.
 * Uses localStorage so notes persist across page reloads.
 * Automatically used when window.api is not provided by Electron's preload.
 */

const STORAGE_PREFIX = 'slate-note:';

function bytesToDataUrl(bytes: number[], mimeType: string): string {
  let binary = '';
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function assetStorageKey(assetPath: string): string {
  return `${ASSET_STORAGE_PREFIX}${assetPath}`;
}

function resolveMockAssetPath(notePath: string, assetPath: string): string {
  const stack = getNoteFolder(notePath).split('/').filter(Boolean);
  for (const segment of assetPath.replace(/\\/g, '/').split('/')) {
    if (!segment || segment === '.') {
      continue;
    }

    if (segment === '..') {
      stack.pop();
      continue;
    }

    stack.push(segment);
  }

  return stack.join('/');
}

function getAllNoteKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keys.push(key.slice(STORAGE_PREFIX.length));
    }
  }
  return keys.filter(isNotePath);
}

function getMockIndexStatus() {
  const raw = localStorage.getItem(MOCK_INDEX_STATUS_KEY);
  if (raw) {
    return JSON.parse(raw) as {
      ready: boolean;
      databasePath: string;
      notesFolder: string | null;
      noteCount: number;
      lastIndexedAt: string | null;
    };
  }

  return {
    ready: true,
    databasePath: '(browser mock)',
    notesFolder: '(browser mock — localStorage)',
    noteCount: getAllNoteKeys().length,
    lastIndexedAt: null,
  };
}

function setMockIndexStatus(partial?: Partial<ReturnType<typeof getMockIndexStatus>>): void {
  const status = {
    ...getMockIndexStatus(),
    noteCount: partial?.noteCount ?? getAllNoteKeys().length,
    ...partial,
  };
  localStorage.setItem(MOCK_INDEX_STATUS_KEY, JSON.stringify(status));
}

function createMockImportScan(): MarkdownImportScanResult {
  const today = getTodayFilename();
  const existingConflict = getAllNoteKeys()[0] ?? today;
  const candidateNew = '2026-03-23.md';
  const session: MarkdownImportScanResult = {
    sessionId: `mock-import-${Date.now()}`,
    sourceFolder: '(browser mock import source)',
    validFiles: [
      { id: 'mock-conflict', filename: existingConflict, conflict: true },
      { id: 'mock-new', filename: candidateNew, conflict: getAllNoteKeys().includes(candidateNew) },
    ],
    invalidFiles: [
      { filename: 'notes.md', reason: 'Filename must match YYYY-MM-DD.md' },
    ],
  };
  localStorage.setItem(MOCK_IMPORT_SESSION_KEY, JSON.stringify(session));
  return session;
}

function getMockImportSession(): MarkdownImportScanResult | null {
  const raw = localStorage.getItem(MOCK_IMPORT_SESSION_KEY);
  return raw ? JSON.parse(raw) as MarkdownImportScanResult : null;
}

function buildMockImportContent(filename: string): string {
  return `# Imported ${filename.replace('.md', '')}\n\nImported through the browser mock workflow.`;
}

function getMockWindowState(): WindowState {
  return {
    isDesktop: false,
    isMaximized: false,
  };
}

function getMockClaudeSettings(): ClaudeSettings {
  return {
    apiKey: localStorage.getItem(MOCK_CLAUDE_API_KEY) ?? '',
    model: localStorage.getItem(MOCK_CLAUDE_MODEL) ?? DEFAULT_CLAUDE_MODEL,
  };
}

function summarizeMockText(text: string): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return '';
  }

  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177).trim()}...`;
}

function rewriteMockText(text: string): string {
  const normalized = text.trim();
  if (!normalized) {
    return '';
  }

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .join('\n\n');
}

function buildMockClaudeNotesAnswer(question: string): ClaudeNotesAnswer {
  const lowerQuestion = question.toLowerCase();
  const matches = getAllNoteKeys()
    .map((filename) => ({
      filename,
      content: localStorage.getItem(STORAGE_PREFIX + filename) ?? '',
    }))
    .filter((entry) => entry.content.toLowerCase().includes(lowerQuestion))
    .slice(0, 3);

  if (matches.length === 0) {
    return {
      answer: 'I could not find anything relevant in the current mock notes for that question.',
      sources: [],
    };
  }

  const bullets = matches
    .map((entry) => `- ${entry.filename}: ${summarizeMockText(entry.content)}`)
    .join('\n');

  return {
    answer: `Here is what I found in your notes:\n${bullets}`,
    sources: matches.map((entry) => entry.filename),
  };
}

export const mockApi: SlateAPI = {
  getToday: async () => getTodayFilename(),

  createNote: async (title: string) => {
    const filename = createUniqueGeneralNoteFilename(title, getAllNoteKeys());
    localStorage.setItem(STORAGE_PREFIX + filename, '');
    setMockIndexStatus({ lastIndexedAt: new Date().toISOString() });
    return getNoteSummary(filename);
  },

  deleteNote: async (filename: string) => {
    const normalizedFilename = normalizeNotePath(filename);
    localStorage.removeItem(STORAGE_PREFIX + normalizedFilename);

    const raw = localStorage.getItem('slate-pinned');
    const pinned: string[] = raw ? JSON.parse(raw) : [];
    const nextPinned = pinned.filter((entry) => entry !== normalizedFilename);
    localStorage.setItem('slate-pinned', JSON.stringify(nextPinned));

    setMockIndexStatus({ lastIndexedAt: new Date().toISOString() });
  },

  readNote: async (filename: string) => {
    return localStorage.getItem(STORAGE_PREFIX + filename) ?? '';
  },

  writeNote: async (filename: string, content: string) => {
    localStorage.setItem(STORAGE_PREFIX + filename, content);
    setMockIndexStatus({ lastIndexedAt: new Date().toISOString() });
  },

  savePastedImage: async ({ filename, mimeType, bytes }) => {
    const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.replace('image/', '');
    const normalizedFilename = normalizeNotePath(filename);
    const assetPath = `attachments/${normalizedFilename.replace(/\.md$/i, '').replace(/[^a-zA-Z0-9/_-]/g, '-')}-${Date.now()}.${extension}`;
    localStorage.setItem(assetStorageKey(assetPath), bytesToDataUrl(bytes, mimeType));

    const noteFolder = getNoteFolder(normalizedFilename);
    if (!noteFolder) {
      return assetPath;
    }

    const upLevels = noteFolder.split('/').filter(Boolean).map(() => '..').join('/');
    return `${upLevels}/${assetPath}`;
  },

  resolveNoteAssetUrl: async (filename, assetPath) => {
    if (/^(https?:|data:|blob:|file:)/i.test(assetPath)) {
      return assetPath;
    }

    const normalizedFilename = normalizeNotePath(filename);
    const resolvedAssetPath = resolveMockAssetPath(normalizedFilename, assetPath);

    return localStorage.getItem(assetStorageKey(resolvedAssetPath));
  },

  listNotes: async () => {
    const files = getAllNoteKeys().sort(compareNoteFilenames);
    // Ensure today's note always exists in the list
    const today = getTodayFilename();
    if (!files.includes(today)) {
      localStorage.setItem(STORAGE_PREFIX + today, '');
      files.unshift(today);
    }
    return files.sort(compareNoteFilenames).map(getNoteSummary);
  },

  searchNotes: async (query: string) => {
    if (!query || query.trim().length === 0) return [];
    if (!getMockIndexStatus().lastIndexedAt) return [];

    const searchTerm = query.toLowerCase();
    const results: NoteSearchResult[] = [];

    for (const file of getAllNoteKeys()) {
      const content = localStorage.getItem(STORAGE_PREFIX + file) ?? '';
      const idx = content.toLowerCase().indexOf(searchTerm);
      if (idx !== -1) {
        const start = Math.max(0, idx - 30);
        const end = Math.min(content.length, idx + query.length + 50);
        const snippet = (start > 0 ? '...' : '') + content.substring(start, end).trim() + (end < content.length ? '...' : '');
        results.push({ note: getNoteSummary(file), snippet });
      }
    }

    return results.sort((a, b) => compareNoteFilenames(a.note.filename, b.note.filename));
  },

  getSearchIndexStatus: async () => {
    return getMockIndexStatus();
  },

  rebuildSearchIndex: async () => {
    setMockIndexStatus({
      ready: true,
      lastIndexedAt: new Date().toISOString(),
    });
    return getMockIndexStatus();
  },

  clearSearchIndex: async () => {
    setMockIndexStatus({
      ready: true,
      lastIndexedAt: null,
      noteCount: 0,
    });
    return getMockIndexStatus();
  },

  chooseMarkdownImportFolder: async () => {
    return createMockImportScan();
  },

  applyMarkdownImport: async (sessionId: string, decisions: MarkdownImportDecision[]) => {
    const session = getMockImportSession();
    if (!session || session.sessionId !== sessionId) {
      throw new Error('Import session expired');
    }

    const result: MarkdownImportResult = {
      imported: [],
      overwritten: [],
      skipped: [],
      invalid: session.invalidFiles,
      failed: [],
    };

    for (const candidate of session.validFiles) {
      const action = decisions.find((decision) => decision.id === candidate.id)?.action ?? (candidate.conflict ? 'skip' : 'import');
      if (action === 'skip') {
        result.skipped.push(candidate.filename);
        continue;
      }

      if (candidate.conflict && action !== 'overwrite') {
        result.skipped.push(candidate.filename);
        continue;
      }

      localStorage.setItem(STORAGE_PREFIX + candidate.filename, buildMockImportContent(candidate.filename));
      if (candidate.conflict) {
        result.overwritten.push(candidate.filename);
      } else {
        result.imported.push(candidate.filename);
      }
    }

    setMockIndexStatus({ lastIndexedAt: new Date().toISOString() });
    localStorage.removeItem(MOCK_IMPORT_SESSION_KEY);
    return result;
  },

  getNotesFolder: async () => '(browser mock — localStorage)',

  openNotesFolder: async () => {
    console.warn('[mock] openNotesFolder is not available in browser mode');
    return false;
  },

  chooseNotesFolder: async () => {
    console.warn('[mock] chooseNotesFolder has no effect in browser mode');
    return null;
  },

  getTemplate: async () => {
    return localStorage.getItem('slate-template') ?? '';
  },

  setTemplate: async (template: string) => {
    localStorage.setItem('slate-template', template);
  },

  getClaudeSettings: async () => {
    return getMockClaudeSettings();
  },

  setClaudeSettings: async ({ apiKey, model }: ClaudeSettings) => {
    localStorage.setItem(MOCK_CLAUDE_API_KEY, apiKey);
    localStorage.setItem(MOCK_CLAUDE_MODEL, model || DEFAULT_CLAUDE_MODEL);
  },

  summarizeSelection: async (selection: string) => {
    return summarizeMockText(selection);
  },

  rewriteSelection: async (selection: string) => {
    return rewriteMockText(selection);
  },

  askClaudeAboutNotes: async (question: string) => {
    return buildMockClaudeNotesAnswer(question);
  },

  getPinnedNotes: async () => {
    const raw = localStorage.getItem('slate-pinned');
    return raw ? JSON.parse(raw) : [];
  },

  togglePin: async (filename: string) => {
    const raw = localStorage.getItem('slate-pinned');
    const pinned: string[] = raw ? JSON.parse(raw) : [];
    const idx = pinned.indexOf(filename);
    if (idx === -1) {
      pinned.push(filename);
    } else {
      pinned.splice(idx, 1);
    }
    localStorage.setItem('slate-pinned', JSON.stringify(pinned));
    return pinned;
  },

  exportPdf: async () => {
    console.warn('[mock] exportPdf is not available in browser mode');
    return false;
  },

  getWindowState: async () => getMockWindowState(),

  minimizeWindow: async () => {
    console.warn('[mock] minimizeWindow is not available in browser mode');
  },

  toggleMaximizeWindow: async () => {
    console.warn('[mock] toggleMaximizeWindow is not available in browser mode');
    return false;
  },

  closeWindow: async () => {
    console.warn('[mock] closeWindow is not available in browser mode');
  },

  reloadWindow: async () => {
    window.location.reload();
  },

  toggleDevTools: async () => {
    console.warn('[mock] toggleDevTools is not available in browser mode');
  },

  quitApp: async () => {
    console.warn('[mock] quitApp is not available in browser mode');
  },

  onNotesChanged: () => {
    // No file watcher in browser mock — no-op
  },

  onWindowStateChanged: () => {
    // No native window state in browser mock — no-op
  },

  setTitle: (noteDate: string) => {
    document.title = `mSlate — ${noteDate}`;
  },
};
