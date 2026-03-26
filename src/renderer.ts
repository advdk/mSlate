import './index.css';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup } from 'codemirror';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type {
  EditorSettings,
  MarkdownImportDecision,
  MarkdownImportResult,
  MarkdownImportScanResult,
  SearchIndexStatus,
  SlateAPI,
  WindowState,
} from './preload';
import { mockApi } from './mock-api';
import { getNoteSummary, type NoteSummary } from './shared/notes';

declare global {
  interface Window {
    api: SlateAPI;
  }
}

// Use Electron's preload API if available, otherwise fall back to browser mock
const api: SlateAPI = window.api ?? mockApi;

// --- State ---

let currentFilename = '';
let currentNote: NoteSummary | null = null;
let editorView: EditorView | null = null;
let allNotes: NoteSummary[] = [];
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let isSaving = false;
let pinnedNotes: string[] = [];
let sidebarMode: 'journal' | 'note' = 'journal';
const lastOpenedByMode: Record<'journal' | 'note', string> = {
  journal: '',
  note: '',
};
let paletteMode: 'notes' | 'commands' = 'notes';
let paletteSelectedIndex = -1;
let paletteItems: PaletteItem[] = [];
let paletteSearchTimeout: ReturnType<typeof setTimeout> | null = null;
let noticeTimeout: ReturnType<typeof setTimeout> | null = null;
let importScanResult: MarkdownImportScanResult | null = null;
let activeTitlebarMenu: string | null = null;
let windowState: WindowState = { isDesktop: false, isMaximized: false };
let isPreviewMode = false;
let isZenMode = false;
let pendingTableContext: TableContextState | null = null;
let previewRenderToken = 0;
let editorSettings: EditorSettings = {
  fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
  fontSize: 15,
};

const DEFAULT_EDITOR_FONT_FAMILY = "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace";

// --- DOM refs ---

const editorContainer = document.getElementById('editor-container')!;
const previewContainer = document.getElementById('preview-container')!;
const editorArea = document.getElementById('editor-area')!;
const noteList = document.getElementById('note-list')!;
const statusSave = document.getElementById('status-save')!;
const zenToggleButton = document.getElementById('zen-toggle-button') as HTMLButtonElement;
const previewToggleButton = document.getElementById('preview-toggle-button') as HTMLButtonElement;
const helpButton = document.getElementById('help-button') as HTMLButtonElement;
const settingsButton = document.getElementById('settings-button') as HTMLButtonElement | null;
const appNotice = document.getElementById('app-notice')!;
const sidebar = document.getElementById('sidebar')!;
const sidebarHeader = document.getElementById('sidebar-header')!;
const sidebarJournalButton = document.getElementById('sidebar-journal-button') as HTMLButtonElement;
const sidebarNotesButton = document.getElementById('sidebar-notes-button') as HTMLButtonElement;
const sidebarNewNoteButton = document.getElementById('sidebar-new-note-button') as HTMLButtonElement;
const sidebarDeleteNoteButton = document.getElementById('sidebar-delete-note-button') as HTMLButtonElement;

// Title bar DOM refs
const titlebar = document.getElementById('titlebar')!;
const titlebarAppButton = document.getElementById('titlebar-app') as HTMLButtonElement;
const titlebarOverflowButton = document.getElementById('titlebar-overflow') as HTMLButtonElement;
const titlebarSearch = document.getElementById('titlebar-search') as HTMLInputElement;
const titlebarMenuPopover = document.getElementById('titlebar-menu-popover')!;
const titlebarMenuButtons = Array.from(document.querySelectorAll('.titlebar-menu-button')) as HTMLButtonElement[];
const minimizeWindowButton = document.getElementById('window-minimize') as HTMLButtonElement;
const maximizeWindowButton = document.getElementById('window-maximize') as HTMLButtonElement;
const closeWindowButton = document.getElementById('window-close') as HTMLButtonElement;

// Command palette DOM refs
const commandPalette = document.getElementById('command-palette')!;
const paletteBackdrop = document.getElementById('palette-backdrop')!;
const paletteTitle = document.getElementById('palette-title')!;
const paletteHint = document.getElementById('palette-hint')!;
const paletteInput = document.getElementById('palette-input') as HTMLInputElement;
const paletteResults = document.getElementById('palette-results')!;

// Settings modal DOM refs
const settingsModal = document.getElementById('settings-modal')!;
const settingsBackdrop = document.getElementById('settings-backdrop')!;
const settingsClose = document.getElementById('settings-close') as HTMLButtonElement;
const settingsEditorFontFamily = document.getElementById('settings-editor-font-family') as HTMLSelectElement;
const settingsEditorFontSize = document.getElementById('settings-editor-font-size') as HTMLInputElement;
const settingsSaveEditor = document.getElementById('settings-save-editor') as HTMLButtonElement;
const settingsNotesFolder = document.getElementById('settings-notes-folder')!;
const settingsIndexReady = document.getElementById('settings-index-ready')!;
const settingsNoteCount = document.getElementById('settings-note-count')!;
const settingsLastIndexed = document.getElementById('settings-last-indexed')!;
const settingsDatabasePath = document.getElementById('settings-database-path')!;
const settingsRebuildIndex = document.getElementById('settings-rebuild-index') as HTMLButtonElement;
const settingsClearIndex = document.getElementById('settings-clear-index') as HTMLButtonElement;
const settingsImportMarkdown = document.getElementById('settings-import-markdown') as HTMLButtonElement;
const settingsMessage = document.getElementById('settings-message')!;
const importModal = document.getElementById('import-modal')!;
const importBackdrop = document.getElementById('import-backdrop')!;
const importClose = document.getElementById('import-close') as HTMLButtonElement;
const importSourceFolder = document.getElementById('import-source-folder')!;
const importValidFiles = document.getElementById('import-valid-files')!;
const importInvalidFiles = document.getElementById('import-invalid-files')!;
const importApply = document.getElementById('import-apply') as HTMLButtonElement;
const importCancel = document.getElementById('import-cancel') as HTMLButtonElement;
const importMessage = document.getElementById('import-message')!;
const tableModal = document.getElementById('table-modal')!;
const tableBackdrop = document.getElementById('table-backdrop')!;
const tableClose = document.getElementById('table-close') as HTMLButtonElement;
const tableRowsInput = document.getElementById('table-rows-input') as HTMLInputElement;
const tableColumnsInput = document.getElementById('table-columns-input') as HTMLInputElement;
const tableInsertApply = document.getElementById('table-insert-apply') as HTMLButtonElement;
const tableInsertCancel = document.getElementById('table-insert-cancel') as HTMLButtonElement;
const tableMessage = document.getElementById('table-message')!;
const newNoteModal = document.getElementById('new-note-modal')!;
const newNoteBackdrop = document.getElementById('new-note-backdrop')!;
const newNoteClose = document.getElementById('new-note-close') as HTMLButtonElement;
const newNoteTitleInput = document.getElementById('new-note-title-input') as HTMLInputElement;
const newNoteCreateButton = document.getElementById('new-note-create') as HTMLButtonElement;
const newNoteCancelButton = document.getElementById('new-note-cancel') as HTMLButtonElement;
const newNoteMessage = document.getElementById('new-note-message')!;
const helpDrawer = document.getElementById('help-drawer')!;
const helpBackdrop = document.getElementById('help-backdrop')!;
const helpClose = document.getElementById('help-close') as HTMLButtonElement;
const tableContextMenu = document.getElementById('table-context-menu')!;
const tableAddColumnRightButton = document.getElementById('table-add-column-right') as HTMLButtonElement;
const tableAddRowBelowButton = document.getElementById('table-add-row-below') as HTMLButtonElement;

marked.setOptions({
  gfm: true,
  breaks: true,
});

type PaletteItem = NotePaletteItem | CommandPaletteItem;

interface NotePaletteItem {
  kind: 'note';
  note: NoteSummary;
  snippet?: string;
}

interface CommandPaletteItem {
  kind: 'command';
  id: string;
  title: string;
  detail: string;
  run: () => Promise<void>;
}

interface TableCellPosition {
  text: string;
  start: number;
  end: number;
}

interface ParsedTableRow {
  cells: TableCellPosition[];
}

interface ParsedMarkdownTable {
  from: number;
  to: number;
  lineFrom: number;
  lineTo: number;
  rows: string[];
  parsedRows: ParsedTableRow[];
  separatorIndex: number;
}

interface TableContextState {
  table: ParsedMarkdownTable;
  columnIndex: number;
  rowIndex: number;
}

function ensureEditorFontFamilyOption(fontFamily: string): void {
  const normalizedFontFamily = fontFamily.trim() || DEFAULT_EDITOR_FONT_FAMILY;
  const existingOption = Array.from(settingsEditorFontFamily.options).find((option) => option.value === normalizedFontFamily);
  const customOption = settingsEditorFontFamily.querySelector('option[data-custom-font="true"]');

  if (existingOption) {
    customOption?.remove();
    return;
  }

  if (customOption instanceof HTMLOptionElement) {
    customOption.value = normalizedFontFamily;
    customOption.textContent = `Custom (${normalizedFontFamily})`;
    return;
  }

  const option = document.createElement('option');
  option.value = normalizedFontFamily;
  option.textContent = `Custom (${normalizedFontFamily})`;
  option.dataset.customFont = 'true';
  settingsEditorFontFamily.appendChild(option);
}

function normalizeEditorSettings(input: Partial<EditorSettings>): EditorSettings {
  const normalizedFontFamily = typeof input.fontFamily === 'string' && input.fontFamily.trim()
    ? input.fontFamily.trim()
    : DEFAULT_EDITOR_FONT_FAMILY;
  const requestedFontSize = typeof input.fontSize === 'number' ? input.fontSize : Number.parseInt(String(input.fontSize ?? ''), 10);

  return {
    fontFamily: normalizedFontFamily,
    fontSize: Number.isFinite(requestedFontSize)
      ? Math.min(32, Math.max(10, Math.round(requestedFontSize)))
      : editorSettings.fontSize,
  };
}

function applyEditorSettings(nextSettings: EditorSettings): void {
  editorSettings = normalizeEditorSettings(nextSettings);
  document.documentElement.style.setProperty('--editor-font-family', editorSettings.fontFamily);
  document.documentElement.style.setProperty('--editor-font-size', `${editorSettings.fontSize}px`);
}

function syncEditorSettingsControls(): void {
  ensureEditorFontFamilyOption(editorSettings.fontFamily);
  settingsEditorFontFamily.value = editorSettings.fontFamily;
  settingsEditorFontSize.value = String(editorSettings.fontSize);
}

async function persistEditorSettings(
  requestedSettings: EditorSettings,
  options?: { notice?: string; successMessage?: string; errorMessage?: string; updateSettingsMessage?: boolean },
): Promise<boolean> {
  const updateSettingsMessage = options?.updateSettingsMessage ?? false;

  if (updateSettingsMessage) {
    setSettingsMessage(options?.successMessage ?? 'Saving editor settings...');
  }

  try {
    const savedSettings = await api.setEditorSettings(normalizeEditorSettings(requestedSettings));
    applyEditorSettings(savedSettings);
    syncEditorSettingsControls();

    if (updateSettingsMessage) {
      setSettingsMessage(options?.successMessage ?? 'Editor settings saved.');
    }

    if (options?.notice) {
      showNotice(options.notice);
    }

    return true;
  } catch (error) {
    if (updateSettingsMessage) {
      setSettingsMessage(options?.errorMessage ?? (error instanceof Error ? error.message : 'Could not save editor settings.'), true);
    } else if (options?.notice) {
      showNotice(options.errorMessage ?? 'Could not update editor font size.');
    }

    return false;
  }
}

async function adjustEditorFontSize(delta: number): Promise<void> {
  if (!editorView?.hasFocus) {
    return;
  }

  const nextSettings = normalizeEditorSettings({
    fontFamily: editorSettings.fontFamily,
    fontSize: editorSettings.fontSize + delta,
  });

  if (nextSettings.fontSize === editorSettings.fontSize) {
    return;
  }

  await persistEditorSettings(nextSettings, {
    notice: `Editor font size: ${nextSettings.fontSize}px`,
    errorMessage: 'Could not update editor font size.',
  });
}

// --- Editor Setup ---

function createEditor(content: string): EditorView {
  const state = EditorState.create({
    doc: content,
    extensions: [
      basicSetup,
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      oneDark,
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          scheduleSave();
          void renderPreview(update.state.doc.toString());
        }
      }),
      keymap.of([
        { key: 'Mod-b', run: wrapSelection('**', '**') },
        { key: 'Mod-i', run: wrapSelection('*', '*') },
        { key: 'Mod-h', run: cycleHeading },
        { key: 'Mod-l', run: insertListItem },
        { key: 'Ctrl-Alt-/', run: () => { toggleHelpDrawer(); return true; } },
        { key: 'Mod-s', run: () => { saveNow(); return true; } },
      ]),
    ],
  });

  const view = new EditorView({
    state,
    parent: editorContainer,
  });

  view.dom.addEventListener('contextmenu', handleEditorContextMenu);
  view.dom.addEventListener('keydown', () => {
    hideTableContextMenu();
  });
  view.dom.addEventListener('paste', (event) => {
    void handleEditorPaste(event);
  });

  return view;
}

// --- Markdown Shortcuts ---

function wrapSelection(before: string, after: string): () => boolean {
  return () => {
    if (!editorView) return false;
    const { from, to } = editorView.state.selection.main;
    const selected = editorView.state.sliceDoc(from, to);
    editorView.dispatch({
      changes: { from, to, insert: before + selected + after },
      selection: { anchor: from + before.length, head: to + before.length },
    });
    return true;
  };
}

function cycleHeading(): boolean {
  if (!editorView) return false;
  const { from } = editorView.state.selection.main;
  const line = editorView.state.doc.lineAt(from);
  const text = line.text;
  const match = text.match(/^(#{1,6})\s/);
  if (match) {
    const level = match[1].length;
    if (level >= 6) {
      // Remove heading
      editorView.dispatch({ changes: { from: line.from, to: line.from + level + 1, insert: '' } });
    } else {
      // Increase level
      editorView.dispatch({ changes: { from: line.from, to: line.from, insert: '#' } });
    }
  } else {
    // Add h1
    editorView.dispatch({ changes: { from: line.from, to: line.from, insert: '# ' } });
  }
  return true;
}

function insertListItem(): boolean {
  if (!editorView) return false;
  const { from } = editorView.state.selection.main;
  const line = editorView.state.doc.lineAt(from);
  if (line.text.match(/^\s*- /)) {
    // Already a list item — insert new one on next line
    const insert = '\n- ';
    editorView.dispatch({
      changes: { from: line.to, insert },
      selection: { anchor: line.to + insert.length },
    });
  } else {
    // Convert current line to list item
    editorView.dispatch({ changes: { from: line.from, to: line.from, insert: '- ' } });
  }
  return true;
}

function setTableMessage(message: string, isError = false): void {
  tableMessage.textContent = message;
  tableMessage.classList.toggle('error', isError);
}

function buildMarkdownTable(rowCount: number, columnCount: number): string {
  const headerCells = Array.from({ length: columnCount }, (_value, index) => `Column ${index + 1}`);
  const separatorCells = Array.from({ length: columnCount }, () => '---');
  const bodyRows = Array.from({ length: Math.max(rowCount - 1, 0) }, (_value, rowIndex) => (
    Array.from({ length: columnCount }, (_cell, columnIndex) => `Row ${rowIndex + 1} Col ${columnIndex + 1}`)
  ));

  return [headerCells, separatorCells, ...bodyRows]
    .map((cells) => `| ${cells.join(' | ')} |`)
    .join('\n');
}

function insertTableAtSelection(rowCount: number, columnCount: number): void {
  if (!editorView) return;

  const table = buildMarkdownTable(rowCount, columnCount);
  insertBlockAtSelection(table);
  editorView.focus();
}

function insertBlockAtSelection(block: string): void {
  if (!editorView) return;

  const { from, to } = editorView.state.selection.main;
  const line = editorView.state.doc.lineAt(from);
  const needsLeadingNewline = line.length > 0 && from > line.from;
  const needsTrailingNewline = to < editorView.state.doc.length;
  const insert = `${needsLeadingNewline ? '\n' : ''}${block}${needsTrailingNewline ? '\n' : ''}`;

  editorView.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
  });
}

async function handleEditorPaste(event: ClipboardEvent): Promise<void> {
  const items = Array.from(event.clipboardData?.items ?? []);
  const imageItem = items.find((item) => item.kind === 'file' && item.type.startsWith('image/'));
  if (!imageItem || !currentFilename) {
    return;
  }

  const file = imageItem.getAsFile();
  if (!file) {
    return;
  }

  event.preventDefault();
  try {
    const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
    const assetPath = await api.savePastedImage({
      filename: currentFilename,
      mimeType: file.type || 'image/png',
      bytes,
    });
    insertBlockAtSelection(`![Pasted image](${assetPath})`);
    showNotice('Pasted image saved to attachments.');
    await renderPreview();
  } catch (error) {
    console.error('Failed to save pasted image:', error);
    showNotice('Image paste failed.');
  }
}

function isMarkdownTableLine(text: string): boolean {
  return /\|/.test(text);
}

function isTableSeparatorLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.includes('|')) {
    return false;
  }

  const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseTableRow(text: string): ParsedTableRow {
  const cells: TableCellPosition[] = [];
  const raw = text.trim();
  const line = raw.startsWith('|') ? raw.slice(1) : raw;
  const normalized = line.endsWith('|') ? line.slice(0, -1) : line;
  let cursor = 0;

  for (const part of normalized.split('|')) {
    const start = cursor;
    const end = cursor + part.length;
    cells.push({ text: part.trim(), start, end });
    cursor = end + 1;
  }

  return { cells };
}

function findMarkdownTableAt(pos: number): ParsedMarkdownTable | null {
  if (!editorView) {
    return null;
  }

  const doc = editorView.state.doc;
  const line = doc.lineAt(pos);
  if (!isMarkdownTableLine(line.text)) {
    return null;
  }

  let startNumber = line.number;
  while (startNumber > 1 && isMarkdownTableLine(doc.line(startNumber - 1).text)) {
    startNumber -= 1;
  }

  let endNumber = line.number;
  while (endNumber < doc.lines && isMarkdownTableLine(doc.line(endNumber + 1).text)) {
    endNumber += 1;
  }

  const rows: string[] = [];
  for (let lineNumber = startNumber; lineNumber <= endNumber; lineNumber += 1) {
    rows.push(doc.line(lineNumber).text);
  }

  const separatorIndex = rows.findIndex((rowText) => isTableSeparatorLine(rowText));
  if (rows.length < 2 || separatorIndex !== 1) {
    return null;
  }

  const startLine = doc.line(startNumber);
  const endLine = doc.line(endNumber);
  return {
    from: startLine.from,
    to: endLine.to,
    lineFrom: startNumber,
    lineTo: endNumber,
    rows,
    parsedRows: rows.map((rowText) => parseTableRow(rowText)),
    separatorIndex,
  };
}

function clampTableDimensions(rows: ParsedTableRow[]): ParsedTableRow[] {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.cells.length), 0);
  return rows.map((row) => {
    const cells = [...row.cells];
    while (cells.length < columnCount) {
      cells.push({ text: '', start: 0, end: 0 });
    }
    return { cells };
  });
}

function formatTableRow(cells: string[]): string {
  return `| ${cells.join(' | ')} |`;
}

function getTableColumnIndex(table: ParsedMarkdownTable, pos: number): number {
  const doc = editorView?.state.doc;
  if (!doc) {
    return 0;
  }

  const line = doc.lineAt(pos);
  const relativePos = Math.max(pos - line.from - (line.text.trimStart().startsWith('|') ? 1 : 0), 0);
  const parsedRow = table.parsedRows[line.number - table.lineFrom];
  if (!parsedRow) {
    return 0;
  }

  for (let index = 0; index < parsedRow.cells.length; index += 1) {
    const cell = parsedRow.cells[index];
    if (relativePos <= cell.end + 1) {
      return index;
    }
  }

  return Math.max(parsedRow.cells.length - 1, 0);
}

function updateTable(table: ParsedMarkdownTable, mutator: (rows: ParsedTableRow[]) => string[]): void {
  if (!editorView) {
    return;
  }

  const normalizedRows = clampTableDimensions(table.parsedRows);
  const nextRows = mutator(normalizedRows);
  editorView.dispatch({
    changes: { from: table.from, to: table.to, insert: nextRows.join('\n') },
  });
  hideTableContextMenu();
  editorView.focus();
}

function addTableColumnRight(context: TableContextState): void {
  updateTable(context.table, (rows) => rows.map((row, rowIndex) => {
    const cells = row.cells.map((cell) => cell.text);
    let insertValue = '';
    if (rowIndex === 0) {
      insertValue = `Column ${context.columnIndex + 2}`;
    } else if (rowIndex === context.table.separatorIndex) {
      insertValue = '---';
    }
    cells.splice(context.columnIndex + 1, 0, insertValue);
    return formatTableRow(cells);
  }));
}

function addTableRowBelow(context: TableContextState): void {
  updateTable(context.table, (rows) => {
    const lines = rows.map((row) => formatTableRow(row.cells.map((cell) => cell.text)));
    const bodyColumnCount = rows[0]?.cells.length ?? 0;
    const newRow = formatTableRow(Array.from({ length: bodyColumnCount }, () => ''));
    const insertRowIndex = Math.max(context.rowIndex + 1, context.table.separatorIndex + 1);
    lines.splice(insertRowIndex, 0, newRow);
    return lines;
  });
}

function hideTableContextMenu(): void {
  tableContextMenu.classList.add('hidden');
  pendingTableContext = null;
}

function showTableContextMenu(x: number, y: number): void {
  tableContextMenu.style.left = `${Math.max(8, x)}px`;
  tableContextMenu.style.top = `${Math.max(8, y)}px`;
  tableContextMenu.classList.remove('hidden');
}

function handleEditorContextMenu(event: MouseEvent): void {
  if (!editorView) {
    return;
  }

  const pos = editorView.posAtCoords({ x: event.clientX, y: event.clientY });
  if (pos == null) {
    hideTableContextMenu();
    return;
  }

  const table = findMarkdownTableAt(pos);
  if (!table) {
    hideTableContextMenu();
    return;
  }

  event.preventDefault();
  const rowIndex = editorView.state.doc.lineAt(pos).number - table.lineFrom;
  pendingTableContext = {
    table,
    columnIndex: getTableColumnIndex(table, pos),
    rowIndex,
  };
  showTableContextMenu(event.clientX, event.clientY);
}

function openHelpDrawer(): void {
  closeTitlebarMenu();
  closePalette();
  helpDrawer.classList.remove('hidden');
}

function closeHelpDrawer(): void {
  helpDrawer.classList.add('hidden');
  editorView?.focus();
}

function toggleHelpDrawer(): void {
  if (helpDrawer.classList.contains('hidden')) {
    openHelpDrawer();
  } else {
    closeHelpDrawer();
  }
}

function openInsertTableDialog(): void {
  closeTitlebarMenu();
  closePalette();
  closeHelpDrawer();
  setTableMessage('');
  tableRowsInput.value = '3';
  tableColumnsInput.value = '3';
  tableModal.classList.remove('hidden');
  tableRowsInput.focus();
  tableRowsInput.select();
}

function closeInsertTableDialog(): void {
  tableModal.classList.add('hidden');
  setTableMessage('');
  editorView?.focus();
}

function submitInsertTableDialog(): void {
  const rows = Number(tableRowsInput.value);
  const columns = Number(tableColumnsInput.value);
  if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 1 || columns < 1) {
    setTableMessage('Rows and columns must both be at least 1.', true);
    return;
  }

  insertTableAtSelection(rows, columns);
  closeInsertTableDialog();
  showNotice(`Inserted ${rows}x${columns} table.`);
}

function isExternalAssetSource(src: string): boolean {
  return /^(https?:|data:|blob:|file:)/i.test(src);
}

async function hydratePreviewImages(container: HTMLElement, renderToken: number): Promise<void> {
  if (!currentFilename) {
    return;
  }

  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(images.map(async (image) => {
    const source = image.getAttribute('src');
    if (!source || isExternalAssetSource(source)) {
      return;
    }

    const resolvedSource = await api.resolveNoteAssetUrl(currentFilename, source);
    if (renderToken !== previewRenderToken) {
      return;
    }

    if (resolvedSource) {
      image.setAttribute('src', resolvedSource);
      return;
    }

    image.removeAttribute('src');
  }));
}

async function renderPreview(content = editorView?.state.doc.toString() ?? ''): Promise<void> {
  const renderToken = ++previewRenderToken;
  const html = marked.parse(content.length > 0 ? content : '*Nothing to preview yet.*') as string;
  const sanitizedHtml = DOMPurify.sanitize(html);
  const nextPreview = document.createElement('div');
  nextPreview.innerHTML = sanitizedHtml;
  await hydratePreviewImages(nextPreview, renderToken);
  if (renderToken !== previewRenderToken) {
    return;
  }

  previewContainer.replaceChildren(...Array.from(nextPreview.childNodes));
}

function setPreviewMode(enabled: boolean): void {
  isPreviewMode = enabled;
  editorArea.classList.toggle('preview-mode', enabled);
  previewContainer.classList.toggle('hidden', !enabled);
  editorContainer.classList.toggle('hidden', enabled);
  previewToggleButton.classList.toggle('active', enabled);
  previewToggleButton.setAttribute('aria-pressed', String(enabled));
  previewToggleButton.title = enabled ? 'Exit preview mode' : 'Preview mode';
  if (enabled) {
    void renderPreview();
  } else {
    editorView?.focus();
  }
}

function togglePreviewMode(): void {
  setPreviewMode(!isPreviewMode);
}

// --- Auto-Save ---

function scheduleSave(): void {
  statusSave.textContent = 'Unsaved';
  statusSave.className = '';
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveNow, 1000);
}

async function saveNow(): Promise<void> {
  if (!editorView || !currentFilename || isSaving) return;
  isSaving = true;
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  try {
    const content = editorView.state.doc.toString();
    await api.writeNote(currentFilename, content);
    statusSave.textContent = 'Saved';
    statusSave.className = 'saved';
  } catch (err) {
    statusSave.textContent = 'Save error';
    console.error('Failed to save:', err);
  } finally {
    isSaving = false;
  }
}

// --- Note Loading ---

async function loadNote(filename: string): Promise<void> {
  // Save current note before switching
  if (currentFilename && editorView) {
    await saveNow();
  }

  currentFilename = filename;
  currentNote = getNoteSummary(filename);
  lastOpenedByMode[currentNote.kind] = filename;
  if (sidebarMode !== currentNote.kind) {
    sidebarMode = currentNote.kind;
    renderNoteList();
  } else {
    updateSidebarModeControls();
  }
  const content = await api.readNote(filename);

  // Replace editor content
  if (editorView) {
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: content },
    });
  } else {
    editorView = createEditor(content);
  }

  api.setTitle(currentNote.title);
  highlightActiveNote(filename);
  await renderPreview(content);
  if (!isPreviewMode) {
    editorView.focus();
  }
}

async function clearActiveNote(): Promise<void> {
  currentFilename = '';
  currentNote = null;

  if (editorView) {
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: '' },
    });
  } else {
    editorView = createEditor('');
  }

  await renderPreview('');
  api.setTitle('Notes');
  highlightActiveNote('');
  updateSidebarModeControls();
}

// --- Sidebar ---

function highlightActiveNote(filename: string): void {
  const items = noteList.querySelectorAll('li');
  items.forEach((li) => {
    li.classList.toggle('active', li.dataset.filename === filename);
  });
}

function filterNotesForSidebar(notes: NoteSummary[]): NoteSummary[] {
  return notes.filter((note) => note.kind === sidebarMode);
}

function createNoteListItem(note: NoteSummary): HTMLLIElement {
  const li = document.createElement('li');
  li.dataset.filename = note.filename;

  const row = document.createElement('div');
  row.className = 'note-row';

  const body = document.createElement('div');
  body.className = 'note-body';

  const titleSpan = document.createElement('span');
  titleSpan.className = 'note-title';
  titleSpan.textContent = note.title;
  body.appendChild(titleSpan);

  row.appendChild(body);

  const pinBtn = document.createElement('button');
  pinBtn.className = 'pin-btn' + (pinnedNotes.includes(note.filename) ? ' pinned' : '');
  pinBtn.textContent = pinnedNotes.includes(note.filename) ? '\u2605' : '\u2606';
  pinBtn.title = pinnedNotes.includes(note.filename) ? 'Unpin note' : 'Pin note';
  pinBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    pinnedNotes = await api.togglePin(note.filename);
    renderNoteList();
  });
  row.appendChild(pinBtn);

  li.appendChild(row);
  li.addEventListener('click', () => loadNote(note.filename));

  return li;
}

function updateSidebarModeControls(): void {
  const isJournalMode = sidebarMode === 'journal';
  sidebarJournalButton.classList.toggle('active', isJournalMode);
  sidebarJournalButton.setAttribute('aria-pressed', String(isJournalMode));
  sidebarNotesButton.classList.toggle('active', !isJournalMode);
  sidebarNotesButton.setAttribute('aria-pressed', String(!isJournalMode));

  const showNoteActions = !isJournalMode;
  sidebarNewNoteButton.classList.toggle('hidden', !showNoteActions);
  sidebarDeleteNoteButton.classList.toggle('hidden', !(showNoteActions && currentNote?.kind === 'note'));
  sidebarHeader.classList.toggle('hidden', !showNoteActions);
}

function renderNoteList(): void {
  noteList.innerHTML = '';
  updateSidebarModeControls();

  const visibleNotes = filterNotesForSidebar(allNotes);
  const pinned = visibleNotes.filter((note) => pinnedNotes.includes(note.filename));
  const unpinned = visibleNotes.filter((note) => !pinnedNotes.includes(note.filename));
  const sorted = [...pinned, ...unpinned];

  if (sorted.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'note-empty';
    emptyItem.textContent = sidebarMode === 'journal'
      ? 'No journal entries found yet.'
      : 'No notes found in Notes mode yet.';
    noteList.appendChild(emptyItem);
    return;
  }

  for (const note of sorted) {
    noteList.appendChild(createNoteListItem(note));
  }

  highlightActiveNote(currentFilename);
}

function setSidebarMode(mode: 'journal' | 'note'): void {
  if (sidebarMode === mode) {
    updateSidebarModeControls();
    return;
  }

  sidebarMode = mode;
  renderNoteList();
}

function getPreferredFilenameForMode(mode: 'journal' | 'note'): string {
  const modeNotes = allNotes.filter((note) => note.kind === mode);
  if (modeNotes.length === 0) {
    return '';
  }

  const preferredFilename = lastOpenedByMode[mode];
  if (preferredFilename && modeNotes.some((note) => note.filename === preferredFilename)) {
    return preferredFilename;
  }

  return modeNotes[0].filename;
}

async function activateSidebarMode(mode: 'journal' | 'note'): Promise<void> {
  setSidebarMode(mode);

  const preferredFilename = getPreferredFilenameForMode(mode);
  if (!preferredFilename) {
    if (currentNote?.kind !== mode) {
      await clearActiveNote();
    } else {
      highlightActiveNote('');
    }
    return;
  }

  if (currentFilename === preferredFilename) {
    highlightActiveNote(preferredFilename);
    return;
  }

  await loadNote(preferredFilename);
}

async function refreshNoteList(): Promise<void> {
  allNotes = await api.listNotes();
  pinnedNotes = await api.getPinnedNotes();
  renderNoteList();
}

// --- Command Palette ---

function showNotice(message: string): void {
  if (noticeTimeout) clearTimeout(noticeTimeout);
  appNotice.textContent = message;
  appNotice.classList.remove('hidden');
  noticeTimeout = setTimeout(() => {
    appNotice.classList.add('hidden');
    noticeTimeout = null;
  }, 2600);
}

function setSettingsMessage(message: string, isError = false): void {
  settingsMessage.textContent = message;
  settingsMessage.classList.toggle('error', isError);
}

function setImportMessage(message: string, isError = false): void {
  importMessage.textContent = message;
  importMessage.classList.toggle('error', isError);
}

function setNewNoteMessage(message: string, isError = false): void {
  newNoteMessage.textContent = message;
  newNoteMessage.classList.toggle('error', isError);
}

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return 'Not indexed';

  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
}

async function refreshSettingsStatus(status?: SearchIndexStatus): Promise<void> {
  const [indexStatus, notesFolder] = await Promise.all([
    status ? Promise.resolve(status) : api.getSearchIndexStatus(),
    api.getNotesFolder(),
  ]);

  settingsNotesFolder.textContent = notesFolder;
  settingsIndexReady.textContent = indexStatus.ready ? 'Ready' : 'Unavailable';
  settingsNoteCount.textContent = String(indexStatus.noteCount);
  settingsLastIndexed.textContent = formatTimestamp(indexStatus.lastIndexedAt);
  settingsDatabasePath.textContent = indexStatus.databasePath;
}

async function saveEditorSettings(): Promise<void> {
  const requestedSettings = {
    fontFamily: settingsEditorFontFamily.value,
    fontSize: Number.parseInt(settingsEditorFontSize.value, 10),
  };

  await persistEditorSettings(normalizeEditorSettings(requestedSettings), {
    notice: 'Editor settings updated.',
    successMessage: 'Editor settings saved.',
    errorMessage: 'Could not save editor settings.',
    updateSettingsMessage: true,
  });
}

async function openSettings(): Promise<void> {
  closeTitlebarMenu();
  closePalette();
  closeHelpDrawer();
  hideTableContextMenu();
  settingsModal.classList.remove('hidden');
  syncEditorSettingsControls();
  setSettingsMessage('');
  await refreshSettingsStatus();
}

function closeSettings(): void {
  settingsModal.classList.add('hidden');
  setSettingsMessage('');
  editorView?.focus();
}

function closeImportModal(): void {
  importModal.classList.add('hidden');
  setImportMessage('');
  importScanResult = null;
  importValidFiles.innerHTML = '';
  importInvalidFiles.innerHTML = '';
  editorView?.focus();
}

function createImportSummary(validCount: number, conflictCount: number, invalidCount: number): HTMLDivElement {
  const summary = document.createElement('div');
  summary.className = 'import-summary';

  const readyCount = Math.max(validCount - conflictCount, 0);
  const parts = [`${readyCount} ready`, `${conflictCount} conflicts`, `${invalidCount} invalid`];
  summary.textContent = parts.join('  •  ');

  return summary;
}

function renderImportPreview(scanResult: MarkdownImportScanResult): void {
  importSourceFolder.textContent = scanResult.sourceFolder;
  importValidFiles.innerHTML = '';
  importInvalidFiles.innerHTML = '';

  const conflictCount = scanResult.validFiles.filter((file) => file.conflict).length;
  importValidFiles.appendChild(
    createImportSummary(scanResult.validFiles.length, conflictCount, scanResult.invalidFiles.length),
  );

  if (scanResult.validFiles.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'import-item';
    empty.textContent = 'No valid dated markdown files were found.';
    importValidFiles.appendChild(empty);
  }

  const sortedValidFiles = [...scanResult.validFiles].sort((left, right) => {
    if (left.conflict !== right.conflict) {
      return Number(right.conflict) - Number(left.conflict);
    }

    return left.filename.localeCompare(right.filename);
  });

  for (const file of sortedValidFiles) {
    const item = document.createElement('div');
    item.className = 'import-item';
    if (file.conflict) {
      item.classList.add('conflict');
    }
    item.dataset.fileId = file.id;

    const header = document.createElement('div');
    header.className = 'import-item-header';

    const filename = document.createElement('span');
    filename.className = 'import-filename';
    filename.textContent = file.filename;
    header.appendChild(filename);

    const badge = document.createElement('span');
    badge.className = 'import-badge';
    badge.textContent = file.conflict ? 'Conflict' : 'Ready';
    header.appendChild(badge);
    item.appendChild(header);

    const detailRow = document.createElement('div');
    detailRow.className = 'import-item-detail';

    const reason = document.createElement('span');
    reason.className = 'import-reason';
    reason.textContent = file.conflict
      ? 'Existing note already uses this date.'
      : 'New dated note.';
    detailRow.appendChild(reason);

    const select = document.createElement('select');
    select.dataset.fileId = file.id;
    if (file.conflict) {
      select.innerHTML = `
        <option value="skip">Skip</option>
        <option value="overwrite">Overwrite existing note</option>
      `;
    } else {
      select.innerHTML = `
        <option value="import">Import note</option>
        <option value="skip">Skip</option>
      `;
    }
    detailRow.appendChild(select);
    item.appendChild(detailRow);

    importValidFiles.appendChild(item);
  }

  if (scanResult.invalidFiles.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'import-item';
    empty.textContent = 'No invalid markdown files were found.';
    importInvalidFiles.appendChild(empty);
  }

  for (const file of scanResult.invalidFiles) {
    const item = document.createElement('div');
    item.className = 'import-item';

    const header = document.createElement('div');
    header.className = 'import-item-header';

    const filename = document.createElement('span');
    filename.className = 'import-filename';
    filename.textContent = file.filename;
    header.appendChild(filename);
    item.appendChild(header);

    const reason = document.createElement('div');
    reason.className = 'import-reason';
    reason.textContent = file.reason;
    item.appendChild(reason);
    importInvalidFiles.appendChild(item);
  }
}

async function startImportFlow(): Promise<void> {
  closePalette();
  closeSettings();
  closeHelpDrawer();
  hideTableContextMenu();
  setImportMessage('Scanning markdown files...');
  const scanResult = await api.chooseMarkdownImportFolder();
  if (!scanResult) {
    closeImportModal();
    showNotice('Markdown import cancelled.');
    return;
  }

  importScanResult = scanResult;
  importModal.classList.remove('hidden');
  renderImportPreview(scanResult);
  setImportMessage('Review conflicts before importing.');
}

function collectImportDecisions(): MarkdownImportDecision[] {
  const selects = importValidFiles.querySelectorAll('select');
  const decisions: MarkdownImportDecision[] = [];
  selects.forEach((selectElement) => {
    const select = selectElement as HTMLSelectElement;
    const id = select.dataset.fileId;
    if (id) {
      decisions.push({ id, action: select.value as MarkdownImportDecision['action'] });
    }
  });
  return decisions;
}

function summarizeImportResult(result: MarkdownImportResult): string {
  const parts = [
    `${result.imported.length} imported`,
    `${result.overwritten.length} overwritten`,
    `${result.skipped.length} skipped`,
  ];
  if (result.failed.length > 0) {
    parts.push(`${result.failed.length} failed`);
  }
  return parts.join(', ');
}

async function applyImportFlow(): Promise<void> {
  if (!importScanResult) {
    setImportMessage('Import session expired. Start the import again.', true);
    return;
  }

  setImportMessage('Applying import...');
  try {
    const result = await api.applyMarkdownImport(importScanResult.sessionId, collectImportDecisions());
    await refreshNoteList();
    await refreshSettingsStatus();
    const summary = summarizeImportResult(result);
    closeImportModal();
    closeSettings();
    showNotice(`Import complete: ${summary}.`);
  } catch (error) {
    setImportMessage(error instanceof Error ? error.message : 'Import failed.', true);
  }
}

async function rebuildIndex(): Promise<void> {
  setSettingsMessage('Rebuilding search index...');
  const status = await api.rebuildSearchIndex();
  await refreshSettingsStatus(status);
  setSettingsMessage('Search index rebuilt.');
  showNotice('Search index rebuilt.');
}

async function clearIndex(): Promise<void> {
  setSettingsMessage('Clearing search index...');
  const status = await api.clearSearchIndex();
  await refreshSettingsStatus(status);
  setSettingsMessage('Search index cleared. Rebuild it to restore search results.');
  showNotice('Search index cleared.');
}

async function openImportPlaceholder(): Promise<void> {
  await startImportFlow();
}

function openNewNoteDialog(): void {
  closePalette();
  closeSettings();
  closeHelpDrawer();
  hideTableContextMenu();
  setNewNoteMessage('');
  newNoteTitleInput.value = '';
  newNoteModal.classList.remove('hidden');
  window.setTimeout(() => {
    newNoteTitleInput.focus();
  }, 0);
}

function closeNewNoteDialog(): void {
  newNoteModal.classList.add('hidden');
  setNewNoteMessage('');
  editorView?.focus();
}

async function submitNewNoteDialog(): Promise<void> {
  const title = newNoteTitleInput.value.trim();
  if (!title) {
    setNewNoteMessage('Enter a note title.', true);
    newNoteTitleInput.focus();
    return;
  }

  setNewNoteMessage('Creating note...');
  try {
    const note = await api.createNote(title);
    setSidebarMode('note');
    await refreshNoteList();
    await loadNote(note.filename);
    closeNewNoteDialog();
    showNotice(`Created note: ${note.title}.`);
  } catch (error) {
    setNewNoteMessage(error instanceof Error ? error.message : 'Could not create note.', true);
  }
}

async function deleteCurrentNote(): Promise<void> {
  if (!currentNote || currentNote.kind !== 'note') {
    showNotice('Only notes can be deleted in Notes mode.');
    return;
  }

  const confirmed = window.confirm(`Delete note "${currentNote.title}"? This cannot be undone.`);
  if (!confirmed) {
    return;
  }

  const deletedFilename = currentNote.filename;
  try {
    await api.deleteNote(deletedFilename);
    await refreshNoteList();

    const remainingNotes = filterNotesForSidebar(allNotes);
    if (remainingNotes.length > 0) {
      await loadNote(remainingNotes[0].filename);
    } else {
      await clearActiveNote();
    }

    showNotice('Note deleted.');
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Could not delete note.');
  }
}

async function checkForUpdates(): Promise<void> {
  closePalette();
  closeTitlebarMenu();
  const result = await api.checkForUpdates();
  showNotice(result.message);
}

function getCommandItems(): CommandPaletteItem[] {
  return [
    {
      kind: 'command',
      id: 'new-note',
      title: 'Create Note',
      detail: 'Create a note in Notes mode.',
      run: async () => {
        closePalette();
        openNewNoteDialog();
      },
    },
    {
      kind: 'command',
      id: 'delete-note',
      title: 'Delete Current Note',
      detail: 'Permanently delete the active note in Notes mode.',
      run: async () => {
        closePalette();
        await deleteCurrentNote();
      },
    },
    {
      kind: 'command',
      id: 'markdown-help',
      title: 'Open Markdown Help',
      detail: 'Show a right-side syntax reference for markdown and tables.',
      run: async () => {
        closePalette();
        openHelpDrawer();
      },
    },
    {
      kind: 'command',
      id: 'insert-table',
      title: 'Insert Table',
      detail: 'Choose rows and columns and insert a markdown table at the cursor.',
      run: async () => {
        closePalette();
        openInsertTableDialog();
      },
    },
    {
      kind: 'command',
      id: 'open-settings',
      title: 'Open Settings',
      detail: 'View search index status and maintenance controls.',
      run: async () => {
        closePalette();
        await openSettings();
      },
    },
    {
      kind: 'command',
      id: 'check-for-updates',
      title: 'Check for Updates',
      detail: 'Ask the packaged app to check GitHub Releases now.',
      run: async () => {
        await checkForUpdates();
      },
    },
    {
      kind: 'command',
      id: 'rebuild-index',
      title: 'Rebuild Search Index',
      detail: 'Scan all notes again and refresh indexed search results.',
      run: async () => {
        closePalette();
        await rebuildIndex();
      },
    },
    {
      kind: 'command',
      id: 'clear-index',
      title: 'Clear Search Index',
      detail: 'Remove indexed search data until you rebuild it.',
      run: async () => {
        closePalette();
        await clearIndex();
      },
    },
    {
      kind: 'command',
      id: 'import-markdown',
      title: 'Import Markdown Files',
      detail: 'Open the import entry point for dated markdown notes.',
      run: async () => {
        closePalette();
        await openImportPlaceholder();
      },
    },
  ];
}

async function openPalette(mode: 'notes' | 'commands'): Promise<void> {
  closeTitlebarMenu();
  closeSettings();
  closeHelpDrawer();
  paletteMode = mode;
  commandPalette.classList.remove('hidden');
  paletteInput.value = '';
  paletteSelectedIndex = -1;
  paletteTitle.textContent = mode === 'notes' ? 'Notes' : 'Commands';
  paletteHint.textContent = mode === 'notes' ? 'Ctrl+P' : 'Ctrl+Shift+P';
  paletteInput.placeholder = mode === 'notes' ? 'Search notes...' : 'Run a command...';
  if (mode === 'notes') {
    await populatePaletteWithNotes();
  } else {
    renderPaletteItems(getCommandItems());
  }
  paletteInput.focus();
}

function closePalette(): void {
  commandPalette.classList.add('hidden');
  paletteInput.value = '';
  paletteResults.innerHTML = '';
  paletteSelectedIndex = -1;
  paletteItems = [];
  hideTableContextMenu();
  syncTitlebarSearch('');
  editorView?.focus();
}

interface TitlebarMenuItem {
  label: string;
  action: () => Promise<void>;
}

function syncTitlebarSearch(value: string): void {
  if (titlebarSearch.value !== value) {
    titlebarSearch.value = value;
  }
}

function toggleSidebar(): void {
  sidebar.classList.toggle('hidden');
}

function setZenMode(enabled: boolean): void {
  isZenMode = enabled;
  document.body.classList.toggle('zen-mode', enabled);
  zenToggleButton.classList.toggle('active', enabled);
  zenToggleButton.setAttribute('aria-pressed', String(enabled));
  zenToggleButton.title = enabled ? 'Exit zen mode' : 'Zen mode';
  if (enabled) {
    closeTitlebarMenu();
    closePalette();
    closeSettings();
    closeImportModal();
  }
}

function toggleZenMode(): void {
  setZenMode(!isZenMode);
}

async function openTitlebarSearch(query = ''): Promise<void> {
  if (commandPalette.classList.contains('hidden') || paletteMode !== 'notes') {
    await openPalette('notes');
  }

  paletteInput.value = query;
  syncTitlebarSearch(query);
  await handlePaletteSearch();
  paletteInput.focus();
}

function updateWindowControls(state: WindowState): void {
  windowState = state;
  document.body.classList.toggle('desktop-frame', state.isDesktop);
  minimizeWindowButton.disabled = !state.isDesktop;
  maximizeWindowButton.disabled = !state.isDesktop;
  closeWindowButton.disabled = !state.isDesktop;
  maximizeWindowButton.textContent = state.isMaximized ? '❐' : '□';
  maximizeWindowButton.setAttribute('aria-label', state.isMaximized ? 'Restore window' : 'Maximize window');
  maximizeWindowButton.title = state.isMaximized ? 'Restore' : 'Maximize';
  minimizeWindowButton.title = state.isDesktop ? 'Minimize' : 'Desktop only';
  closeWindowButton.title = state.isDesktop ? 'Close' : 'Desktop only';
}

function closeTitlebarMenu(): void {
  activeTitlebarMenu = null;
  titlebarMenuPopover.classList.add('hidden');
  titlebarMenuPopover.replaceChildren();
  titlebarMenuButtons.forEach((button) => {
    button.classList.remove('active');
    button.setAttribute('aria-expanded', 'false');
  });
  titlebarAppButton.classList.remove('active');
  titlebarAppButton.setAttribute('aria-expanded', 'false');
  titlebarOverflowButton.classList.remove('active');
  titlebarOverflowButton.setAttribute('aria-expanded', 'false');
}

function getTitlebarMenuItems(menuId: string): TitlebarMenuItem[] {
  const common = {
    createNote: async () => openNewNoteDialog(),
    deleteNote: async () => deleteCurrentNote(),
    openNotes: async () => openTitlebarSearch(titlebarSearch.value.trim()),
    openNotesFolder: async () => {
      await api.openNotesFolder();
      showNotice('Opened notes folder.');
    },
    openCommands: async () => openPalette('commands'),
    openSettings: async () => openSettings(),
    importMarkdown: async () => openImportPlaceholder(),
    markdownHelp: async () => openHelpDrawer(),
    checkForUpdates: async () => checkForUpdates(),
    reload: async () => api.reloadWindow(),
    devTools: async () => api.toggleDevTools(),
    toggleSidebar: async () => {
      toggleSidebar();
    },
  };

  switch (menuId) {
    case 'app':
      return [
        { label: 'New Note', action: common.createNote },
        { label: 'Delete Current Note', action: common.deleteNote },
        { label: 'Settings', action: common.openSettings },
        { label: 'Import Markdown', action: common.importMarkdown },
        { label: 'Quit mSlate', action: async () => api.quitApp() },
      ];
    case 'file':
      return [
        { label: 'New Note', action: common.createNote },
        { label: 'Search Notes', action: common.openNotes },
        { label: 'Open Notes Folder', action: common.openNotesFolder },
        { label: 'Import Markdown', action: common.importMarkdown },
        { label: 'Settings', action: common.openSettings },
      ];
    case 'edit':
      return [
        { label: 'Command Palette', action: common.openCommands },
        { label: 'Search Notes', action: common.openNotes },
        { label: 'Toggle Sidebar', action: common.toggleSidebar },
      ];
    case 'view':
      return [
        { label: 'Reload', action: common.reload },
        { label: 'Toggle DevTools', action: common.devTools },
        { label: 'Toggle Sidebar', action: common.toggleSidebar },
      ];
    case 'help':
      return [
        { label: 'Check for Updates', action: common.checkForUpdates },
        { label: 'Markdown Help', action: common.markdownHelp },
        {
          label: 'Keyboard Shortcuts',
          action: async () => {
            showNotice('Shortcuts: Ctrl+P notes, Ctrl+Shift+P commands, Ctrl+, settings.');
          },
        },
        {
          label: 'About mSlate',
          action: async () => {
            showNotice('mSlate is a local-first markdown notes app.');
          },
        },
      ];
    case 'overflow':
      return [
        { label: 'File: New Note', action: common.createNote },
        { label: 'File: Search Notes', action: common.openNotes },
        { label: 'File: Open Notes Folder', action: common.openNotesFolder },
        { label: 'File: Import Markdown', action: common.importMarkdown },
        { label: 'Edit: Command Palette', action: common.openCommands },
        { label: 'Edit: Toggle Sidebar', action: common.toggleSidebar },
        { label: 'View: Reload', action: common.reload },
        { label: 'View: Toggle DevTools', action: common.devTools },
        { label: 'Help: Check for Updates', action: common.checkForUpdates },
        { label: 'Help: Markdown Help', action: common.markdownHelp },
        {
          label: 'Help: Keyboard Shortcuts',
          action: async () => {
            showNotice('Shortcuts: Ctrl+P notes, Ctrl+Shift+P commands, Ctrl+, settings, Ctrl+Shift+V preview.');
          },
        },
        {
          label: 'Help: About mSlate',
          action: async () => {
            showNotice('mSlate is a local-first markdown notes app.');
          },
        },
      ];
    default:
      return [];
  }
}

function openTitlebarMenu(menuId: string, anchor: HTMLElement): void {
  if (activeTitlebarMenu === menuId) {
    closeTitlebarMenu();
    return;
  }

  activeTitlebarMenu = menuId;
  titlebarMenuButtons.forEach((button) => {
    const expanded = button.dataset.menu === menuId;
    button.classList.toggle('active', expanded);
    button.setAttribute('aria-expanded', String(expanded));
  });
  const appExpanded = menuId === 'app';
  titlebarAppButton.classList.toggle('active', appExpanded);
  titlebarAppButton.setAttribute('aria-expanded', String(appExpanded));
  const overflowExpanded = menuId === 'overflow';
  titlebarOverflowButton.classList.toggle('active', overflowExpanded);
  titlebarOverflowButton.setAttribute('aria-expanded', String(overflowExpanded));

  const menuItems = getTitlebarMenuItems(menuId);
  titlebarMenuPopover.replaceChildren();

  for (const item of menuItems) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'titlebar-popover-item';
    button.textContent = item.label;
    button.addEventListener('click', async () => {
      closeTitlebarMenu();
      await item.action();
    });
    titlebarMenuPopover.appendChild(button);
  }

  const anchorRect = anchor.getBoundingClientRect();
  const titlebarRect = titlebar.getBoundingClientRect();
  titlebarMenuPopover.style.left = `${Math.max(anchorRect.left - titlebarRect.left, 8)}px`;
  titlebarMenuPopover.style.top = `${anchorRect.bottom - titlebarRect.top + 6}px`;
  titlebarMenuPopover.classList.remove('hidden');
}

async function initializeWindowState(): Promise<void> {
  const state = await api.getWindowState();
  updateWindowControls(state);
}

async function populatePaletteWithNotes(): Promise<void> {
  const notes = await api.listNotes();
  const pinned = await api.getPinnedNotes();
  const visibleNotes = filterNotesForSidebar(notes);
  const pinnedNotesList = visibleNotes.filter((note) => pinned.includes(note.filename));
  const unpinnedNotesList = visibleNotes.filter((note) => !pinned.includes(note.filename));
  renderPaletteItems([...pinnedNotesList, ...unpinnedNotesList].map((note) => ({ kind: 'note', note })));
}

async function handlePaletteSearch(): Promise<void> {
  const query = paletteInput.value.trim();
  if (paletteMode === 'commands') {
    const commands = getCommandItems();
    if (!query) {
      renderPaletteItems(commands);
      return;
    }

    const filtered = commands.filter((command) => {
      const haystack = `${command.title} ${command.detail}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
    renderPaletteItems(filtered);
    return;
  }

  if (!query) {
    await populatePaletteWithNotes();
    return;
  }
  const results = await api.searchNotes(query);
  renderPaletteItems(
    results
      .filter((result) => result.note.kind === sidebarMode)
      .map((result) => ({ kind: 'note', note: result.note, snippet: result.snippet })),
  );
}

function renderPaletteItems(items: PaletteItem[]): void {
  paletteItems = items;
  paletteResults.innerHTML = '';
  paletteSelectedIndex = items.length > 0 ? 0 : -1;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const li = document.createElement('li');
    if (i === 0) li.classList.add('selected');

    if (item.kind === 'note') {
      const titleSpan = document.createElement('span');
      titleSpan.className = 'note-title';
      titleSpan.textContent = item.note.title;
      li.appendChild(titleSpan);

      if (item.snippet) {
        const snippetSpan = document.createElement('span');
        snippetSpan.className = 'note-snippet';
        snippetSpan.textContent = item.snippet;
        li.appendChild(snippetSpan);
      }
    } else {
      const title = document.createElement('span');
      title.className = 'palette-title';
      title.textContent = item.title;
      li.appendChild(title);

      const detail = document.createElement('span');
      detail.className = 'palette-detail';
      detail.textContent = item.detail;
      li.appendChild(detail);
    }

    li.addEventListener('click', () => {
      void executePaletteItem(item);
    });
    paletteResults.appendChild(li);
  }
}

async function executePaletteItem(item: PaletteItem): Promise<void> {
  if (item.kind === 'note') {
    closePalette();
    setSidebarMode(item.note.kind);
    await loadNote(item.note.filename);
    await refreshNoteList();
    return;
  }

  await item.run();
}

function updatePaletteSelection(): void {
  const items = paletteResults.querySelectorAll('li');
  items.forEach((li, i) => li.classList.toggle('selected', i === paletteSelectedIndex));
  items[paletteSelectedIndex]?.scrollIntoView({ block: 'nearest' });
}

paletteInput.addEventListener('input', () => {
  if (paletteSearchTimeout) clearTimeout(paletteSearchTimeout);
  syncTitlebarSearch(paletteInput.value);
  paletteSearchTimeout = setTimeout(handlePaletteSearch, 200);
});

paletteInput.addEventListener('keydown', (e) => {
  const items = paletteResults.querySelectorAll('li');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    paletteSelectedIndex = Math.min(paletteSelectedIndex + 1, items.length - 1);
    updatePaletteSelection();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    paletteSelectedIndex = Math.max(paletteSelectedIndex - 1, 0);
    updatePaletteSelection();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const selected = paletteItems[paletteSelectedIndex];
    if (selected) {
      void executePaletteItem(selected);
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closePalette();
  }
});

paletteBackdrop.addEventListener('click', closePalette);
settingsBackdrop.addEventListener('click', closeSettings);
settingsClose.addEventListener('click', closeSettings);
settingsSaveEditor.addEventListener('click', () => {
  void saveEditorSettings();
});
settingsEditorFontFamily.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    void saveEditorSettings();
  }
});
settingsEditorFontSize.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    void saveEditorSettings();
  }
});
helpBackdrop.addEventListener('click', closeHelpDrawer);
helpClose.addEventListener('click', closeHelpDrawer);
sidebarJournalButton.addEventListener('click', () => {
  void activateSidebarMode('journal');
});
sidebarNotesButton.addEventListener('click', () => {
  void activateSidebarMode('note');
});
sidebarNewNoteButton.addEventListener('click', () => {
  openNewNoteDialog();
});
sidebarDeleteNoteButton.addEventListener('click', () => {
  void deleteCurrentNote();
});
newNoteBackdrop.addEventListener('click', closeNewNoteDialog);
newNoteClose.addEventListener('click', closeNewNoteDialog);
newNoteCancelButton.addEventListener('click', closeNewNoteDialog);
newNoteCreateButton.addEventListener('click', () => {
  void submitNewNoteDialog();
});
newNoteTitleInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    void submitNewNoteDialog();
  }
});
tableBackdrop.addEventListener('click', closeInsertTableDialog);
tableClose.addEventListener('click', closeInsertTableDialog);
tableInsertCancel.addEventListener('click', closeInsertTableDialog);
tableInsertApply.addEventListener('click', submitInsertTableDialog);
titlebarSearch.addEventListener('input', () => {
  void openTitlebarSearch(titlebarSearch.value.trim());
});
titlebarAppButton.addEventListener('click', () => {
  openTitlebarMenu('app', titlebarAppButton);
});
titlebarMenuButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const menuId = button.dataset.menu;
    if (!menuId) {
      return;
    }
    openTitlebarMenu(menuId, button);
  });
});
minimizeWindowButton.addEventListener('click', () => {
  void api.minimizeWindow();
});
maximizeWindowButton.addEventListener('click', () => {
  void api.toggleMaximizeWindow();
});
closeWindowButton.addEventListener('click', () => {
  void api.closeWindow();
});
previewToggleButton.addEventListener('click', () => {
  togglePreviewMode();
});
helpButton.addEventListener('click', () => {
  toggleHelpDrawer();
});
zenToggleButton.addEventListener('click', () => {
  toggleZenMode();
});
settingsButton?.addEventListener('click', () => {
  void openSettings();
});
settingsRebuildIndex.addEventListener('click', () => {
  void rebuildIndex();
});
settingsClearIndex.addEventListener('click', () => {
  void clearIndex();
});
settingsImportMarkdown.addEventListener('click', () => {
  void openImportPlaceholder();
});
tableAddColumnRightButton.addEventListener('click', () => {
  if (pendingTableContext) {
    addTableColumnRight(pendingTableContext);
  }
});
tableAddRowBelowButton.addEventListener('click', () => {
  if (pendingTableContext) {
    addTableRowBelow(pendingTableContext);
  }
});
importBackdrop.addEventListener('click', closeImportModal);
importClose.addEventListener('click', closeImportModal);
importCancel.addEventListener('click', closeImportModal);
importApply.addEventListener('click', () => {
  void applyImportFlow();
});
document.addEventListener('click', (event) => {
  const target = event.target as Node;
  if (!titlebar.contains(target)) {
    closeTitlebarMenu();
  }
  if (!tableContextMenu.contains(target)) {
    hideTableContextMenu();
  }
});
api.onWindowStateChanged((state) => {
  updateWindowControls(state);
});

// --- Keyboard Shortcuts (global) ---

document.addEventListener('keydown', (e) => {
  const editorHasFocus = editorView?.hasFocus ?? false;

  if (editorHasFocus && e.ctrlKey && !e.altKey && !e.metaKey && (e.key === '+' || e.key === '=' || e.key === 'Add' || e.code === 'NumpadAdd')) {
    e.preventDefault();
    void adjustEditorFontSize(1);
    return;
  }

  if (editorHasFocus && e.ctrlKey && !e.altKey && !e.metaKey && (e.key === '-' || e.key === '_' || e.key === 'Subtract' || e.code === 'NumpadSubtract')) {
    e.preventDefault();
    void adjustEditorFontSize(-1);
    return;
  }

  // Command palette: Ctrl+P
  if (e.ctrlKey && !e.shiftKey && e.key === 'p') {
    e.preventDefault();
    if (commandPalette.classList.contains('hidden')) {
      void openPalette('notes');
    } else {
      closePalette();
    }
  }

  // Command palette: Ctrl+Shift+P
  if (e.ctrlKey && e.shiftKey && e.key === 'P') {
    e.preventDefault();
    if (commandPalette.classList.contains('hidden')) {
      void openPalette('commands');
    } else {
      closePalette();
    }
  }

  // Settings: Ctrl+,
  if (e.ctrlKey && e.key === ',') {
    e.preventDefault();
    if (settingsModal.classList.contains('hidden')) {
      void openSettings();
    } else {
      closeSettings();
    }
  }

  // Toggle sidebar: Ctrl+\
  if (e.ctrlKey && e.key === '\\') {
    e.preventDefault();
    toggleSidebar();
  }

  // Jump to today: Ctrl+T
  if (e.ctrlKey && !e.shiftKey && e.key === 't') {
    e.preventDefault();
    api.getToday().then((filename) => {
      void loadNote(filename);
      void refreshNoteList();
    });
  }

  if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    openNewNoteDialog();
  }

  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
    e.preventDefault();
    togglePreviewMode();
  }

  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    toggleZenMode();
  }

  if (e.ctrlKey && e.altKey && e.key === '/') {
    e.preventDefault();
    toggleHelpDrawer();
  }

  // Export to PDF: Ctrl+Shift+E
  if (e.ctrlKey && e.shiftKey && e.key === 'E') {
    e.preventDefault();
    if (currentFilename) {
      api.exportPdf(currentFilename);
    }
  }

  if (e.key === 'Escape' && !settingsModal.classList.contains('hidden') && commandPalette.classList.contains('hidden')) {
    e.preventDefault();
    closeSettings();
  }

  if (e.key === 'Escape' && !tableModal.classList.contains('hidden')) {
    e.preventDefault();
    closeInsertTableDialog();
  }

  if (e.key === 'Escape' && !newNoteModal.classList.contains('hidden')) {
    e.preventDefault();
    closeNewNoteDialog();
    return;
  }

  if (e.key === 'Escape' && activeTitlebarMenu) {
    e.preventDefault();
    closeTitlebarMenu();
  }
});

// --- File Watcher (Electron) ---

api.onNotesChanged(() => {
  // Debounce: refresh sidebar when notes folder changes on disk
  refreshNoteList();
});

// --- Midnight Rollover ---

function scheduleMidnightRollover(): void {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const msUntilMidnight = tomorrow.getTime() - now.getTime();

  setTimeout(async () => {
    const newToday = await api.getToday();
    if (currentFilename !== newToday) {
      await refreshNoteList();
      await loadNote(newToday);
    }
    // Schedule next rollover
    scheduleMidnightRollover();
  }, msUntilMidnight + 1000); // +1s buffer past midnight
}

// --- Init ---

async function init(): Promise<void> {
  applyEditorSettings(await api.getEditorSettings());
  await initializeWindowState();
  const todayFile = await api.getToday();
  await refreshNoteList();
  await loadNote(todayFile);
  scheduleMidnightRollover();
}

init();
