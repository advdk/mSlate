import { contextBridge, ipcRenderer } from 'electron';
import type { NoteSearchResult, NoteSummary } from './shared/notes';

export interface SearchIndexStatus {
  ready: boolean;
  databasePath: string;
  notesFolder: string | null;
  noteCount: number;
  lastIndexedAt: string | null;
}

export interface MarkdownImportCandidate {
  id: string;
  filename: string;
  conflict: boolean;
}

export interface MarkdownImportInvalidFile {
  filename: string;
  reason: string;
}

export interface MarkdownImportScanResult {
  sessionId: string;
  sourceFolder: string;
  validFiles: MarkdownImportCandidate[];
  invalidFiles: MarkdownImportInvalidFile[];
}

export interface MarkdownImportDecision {
  id: string;
  action: 'import' | 'overwrite' | 'skip';
}

export interface MarkdownImportFailure {
  filename: string;
  reason: string;
}

export interface MarkdownImportResult {
  imported: string[];
  overwritten: string[];
  skipped: string[];
  invalid: MarkdownImportInvalidFile[];
  failed: MarkdownImportFailure[];
}

export interface WindowState {
  isDesktop: boolean;
  isMaximized: boolean;
}

export interface PastedImagePayload {
  filename: string;
  mimeType: string;
  bytes: number[];
}

export interface ClaudeSettings {
  apiKey: string;
  model: string;
}

export interface EditorSettings {
  fontFamily: string;
  fontSize: number;
}

export interface ClaudeNotesAnswer {
  answer: string;
  sources: string[];
}

export interface SlateAPI {
  getToday(): Promise<string>;
  createNote(title: string): Promise<NoteSummary>;
  deleteNote(filename: string): Promise<void>;
  readNote(filename: string): Promise<string>;
  writeNote(filename: string, content: string): Promise<void>;
  savePastedImage(payload: PastedImagePayload): Promise<string>;
  resolveNoteAssetUrl(filename: string, assetPath: string): Promise<string | null>;
  listNotes(): Promise<NoteSummary[]>;
  searchNotes(query: string): Promise<NoteSearchResult[]>;
  getSearchIndexStatus(): Promise<SearchIndexStatus>;
  rebuildSearchIndex(): Promise<SearchIndexStatus>;
  clearSearchIndex(): Promise<SearchIndexStatus>;
  chooseMarkdownImportFolder(): Promise<MarkdownImportScanResult | null>;
  applyMarkdownImport(sessionId: string, decisions: MarkdownImportDecision[]): Promise<MarkdownImportResult>;
  getNotesFolder(): Promise<string>;
  openNotesFolder(): Promise<boolean>;
  chooseNotesFolder(): Promise<string | null>;
  getTemplate(): Promise<string>;
  setTemplate(template: string): Promise<void>;
  getEditorSettings(): Promise<EditorSettings>;
  setEditorSettings(settings: EditorSettings): Promise<EditorSettings>;
  getClaudeSettings(): Promise<ClaudeSettings>;
  setClaudeSettings(settings: ClaudeSettings): Promise<void>;
  summarizeSelection(selection: string, filename?: string): Promise<string>;
  rewriteSelection(selection: string, filename?: string): Promise<string>;
  askClaudeAboutNotes(question: string): Promise<ClaudeNotesAnswer>;
  getPinnedNotes(): Promise<string[]>;
  togglePin(filename: string): Promise<string[]>;
  exportPdf(filename: string): Promise<boolean>;
  getWindowState(): Promise<WindowState>;
  minimizeWindow(): Promise<void>;
  toggleMaximizeWindow(): Promise<boolean>;
  closeWindow(): Promise<void>;
  reloadWindow(): Promise<void>;
  toggleDevTools(): Promise<void>;
  quitApp(): Promise<void>;
  onNotesChanged(callback: () => void): void;
  onWindowStateChanged(callback: (state: WindowState) => void): void;
  setTitle(noteTitle: string): void;
}

const api: SlateAPI = {
  getToday: () => ipcRenderer.invoke('get-today'),
  createNote: (title: string) => ipcRenderer.invoke('create-note', title),
  deleteNote: (filename: string) => ipcRenderer.invoke('delete-note', filename),
  readNote: (filename: string) => ipcRenderer.invoke('read-note', filename),
  writeNote: (filename: string, content: string) => ipcRenderer.invoke('write-note', filename, content),
  savePastedImage: (payload: PastedImagePayload) => ipcRenderer.invoke('save-pasted-image', payload.filename, payload.mimeType, payload.bytes),
  resolveNoteAssetUrl: (filename: string, assetPath: string) => ipcRenderer.invoke('resolve-note-asset-url', filename, assetPath),
  listNotes: () => ipcRenderer.invoke('list-notes'),
  searchNotes: (query: string) => ipcRenderer.invoke('search-notes', query),
  getSearchIndexStatus: () => ipcRenderer.invoke('get-search-index-status'),
  rebuildSearchIndex: () => ipcRenderer.invoke('rebuild-search-index'),
  clearSearchIndex: () => ipcRenderer.invoke('clear-search-index'),
  chooseMarkdownImportFolder: () => ipcRenderer.invoke('choose-markdown-import-folder'),
  applyMarkdownImport: (sessionId: string, decisions: MarkdownImportDecision[]) => ipcRenderer.invoke('apply-markdown-import', sessionId, decisions),
  getNotesFolder: () => ipcRenderer.invoke('get-notes-folder'),
  openNotesFolder: () => ipcRenderer.invoke('open-notes-folder'),
  chooseNotesFolder: () => ipcRenderer.invoke('choose-notes-folder'),
  getTemplate: () => ipcRenderer.invoke('get-template'),
  setTemplate: (template: string) => ipcRenderer.invoke('set-template', template),
  getEditorSettings: () => ipcRenderer.invoke('get-editor-settings'),
  setEditorSettings: (settings: EditorSettings) => ipcRenderer.invoke('set-editor-settings', settings),
  getClaudeSettings: () => ipcRenderer.invoke('get-claude-settings'),
  setClaudeSettings: (settings: ClaudeSettings) => ipcRenderer.invoke('set-claude-settings', settings),
  summarizeSelection: (selection: string, filename?: string) => ipcRenderer.invoke('claude-summarize-selection', selection, filename),
  rewriteSelection: (selection: string, filename?: string) => ipcRenderer.invoke('claude-rewrite-selection', selection, filename),
  askClaudeAboutNotes: (question: string) => ipcRenderer.invoke('claude-ask-notes', question),
  getPinnedNotes: () => ipcRenderer.invoke('get-pinned-notes'),
  togglePin: (filename: string) => ipcRenderer.invoke('toggle-pin', filename),
  exportPdf: (filename: string) => ipcRenderer.invoke('export-pdf', filename),
  getWindowState: () => ipcRenderer.invoke('get-window-state'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('toggle-maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  reloadWindow: () => ipcRenderer.invoke('reload-window'),
  toggleDevTools: () => ipcRenderer.invoke('toggle-devtools'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  onNotesChanged: (callback: () => void) => {
    ipcRenderer.on('notes-changed', () => callback());
  },
  onWindowStateChanged: (callback: (state: WindowState) => void) => {
    ipcRenderer.on('window-state-changed', (_event, state: WindowState) => callback(state));
  },
  setTitle: (noteTitle: string) => ipcRenderer.send('set-title', noteTitle),
};

contextBridge.exposeInMainWorld('api', api);
