import { create } from 'zustand';
import type { ImportPreview, ImportResult, ParseResult } from './types';
import type { ImportService, ImportStatus } from './service';

export type ImportStep = 'file' | 'settings' | 'preview' | 'result';
export type InputMode = 'file' | 'text';

export interface ImportState {
  step: ImportStep;
  inputMode: InputMode;
  file: File | null;
  textContent: string;
  importYear: number;
  importStatus: ImportStatus;
  parseResult: ParseResult | null;
  preview: ImportPreview | null;
  result: ImportResult | null;
  isLoading: boolean;
  error: string | null;

  setStep: (step: ImportStep) => void;
  setInputMode: (mode: InputMode) => void;
  setFile: (file: File | null) => void;
  setTextContent: (content: string) => void;
  setImportYear: (year: number) => void;
  setImportStatus: (status: ImportStatus) => void;
  parseFile: (importYear: number) => Promise<void>;
  runPreview: (service: ImportService) => Promise<void>;
  runExecute: (service: ImportService) => Promise<void>;
  reset: () => void;
}

const initialState = {
  step: 'file' as ImportStep,
  inputMode: 'text' as InputMode,
  file: null as File | null,
  textContent: '',
  importYear: new Date().getFullYear(),
  importStatus: '現役' as ImportStatus,
  parseResult: null as ParseResult | null,
  preview: null as ImportPreview | null,
  result: null as ImportResult | null,
  isLoading: false,
  error: null as string | null,
};

export const useImportStore = create<ImportState>((set, get) => ({
  ...initialState,

  setStep(step: ImportStep) {
    set({ step });
  },

  setInputMode(mode: InputMode) {
    if (mode === 'text') {
      set({
        inputMode: mode,
        file: null,
        parseResult: null,
        preview: null,
        result: null,
        error: null,
      });
    } else {
      set({
        inputMode: mode,
        textContent: '',
        parseResult: null,
        preview: null,
        result: null,
        error: null,
      });
    }
  },

  setFile(file: File | null) {
    set({ file, parseResult: null, preview: null, result: null, error: null });
  },

  setTextContent(content: string) {
    set({ textContent: content, parseResult: null, preview: null, result: null, error: null });
  },

  setImportYear(year: number) {
    set({ importYear: year });
  },

  setImportStatus(status: ImportStatus) {
    set({ importStatus: status });
  },

  async parseFile(importYear: number) {
    const { inputMode, file, textContent } = get();

    if (inputMode === 'file' && !file) return;
    if (inputMode === 'text' && !textContent.trim()) return;

    set({ isLoading: true, error: null });
    try {
      const { parseTsv, readFileAsText } = await import('./parser');
      const content = inputMode === 'text' ? textContent : await readFileAsText(file!);
      const parseResult = parseTsv(content, importYear);
      set({ parseResult, importYear, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  async runPreview(service: ImportService) {
    const { parseResult, importYear } = get();
    if (!parseResult) return;

    set({ isLoading: true, error: null });
    try {
      const { importStatus } = get();
      const preview = await service.preview(parseResult.rows, importYear, importStatus);
      set({ preview, isLoading: false, step: 'preview' });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  async runExecute(service: ImportService) {
    const { preview } = get();
    if (!preview) return;

    set({ isLoading: true, error: null });
    try {
      const result = await service.execute(preview);
      set({ result, isLoading: false, step: 'result' });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  reset() {
    set(initialState);
  },
}));
