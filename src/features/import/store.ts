import { create } from 'zustand';
import type { ImportPreview, ImportResult, ParseResult } from './types';
import type { ImportService } from './service';

export type ImportStep = 'file' | 'settings' | 'preview' | 'result';

export interface ImportState {
  step: ImportStep;
  file: File | null;
  importYear: number;
  parseResult: ParseResult | null;
  preview: ImportPreview | null;
  result: ImportResult | null;
  isLoading: boolean;
  error: string | null;

  setStep: (step: ImportStep) => void;
  setFile: (file: File | null) => void;
  setImportYear: (year: number) => void;
  parseFile: (importYear: number) => Promise<void>;
  runPreview: (service: ImportService) => Promise<void>;
  runExecute: (service: ImportService) => Promise<void>;
  reset: () => void;
}

const initialState = {
  step: 'file' as ImportStep,
  file: null as File | null,
  importYear: new Date().getFullYear(),
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

  setFile(file: File | null) {
    set({ file, parseResult: null, preview: null, result: null, error: null });
  },

  setImportYear(year: number) {
    set({ importYear: year });
  },

  async parseFile(importYear: number) {
    const { file } = get();
    if (!file) return;

    set({ isLoading: true, error: null });
    try {
      const { parseTsv, readFileAsText } = await import('./parser');
      const content = await readFileAsText(file);
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
      const preview = await service.preview(parseResult.rows, importYear);
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
