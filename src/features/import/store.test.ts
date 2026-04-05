import { afterEach, describe, expect, it, vi } from 'vitest';
import { useImportStore } from './store';

vi.mock('./parser', () => ({
  parseTsv: vi.fn((_content: string, _importYear: number) => ({
    rows: [{ name: 'テスト馬' }],
    warnings: [],
  })),
  readFileAsText: vi.fn(async () => 'file content'),
}));

describe('useImportStore', () => {
  afterEach(() => {
    useImportStore.getState().reset();
  });

  describe('setInputMode', () => {
    it('clears file when switching to text mode', () => {
      const store = useImportStore.getState();
      store.setFile(new File(['test'], 'test.txt'));
      expect(useImportStore.getState().file).not.toBeNull();

      useImportStore.getState().setInputMode('text');
      expect(useImportStore.getState().inputMode).toBe('text');
      expect(useImportStore.getState().file).toBeNull();
    });

    it('clears textContent when switching to file mode', () => {
      useImportStore.getState().setInputMode('text');
      useImportStore.getState().setTextContent('some content');
      expect(useImportStore.getState().textContent).toBe('some content');

      useImportStore.getState().setInputMode('file');
      expect(useImportStore.getState().inputMode).toBe('file');
      expect(useImportStore.getState().textContent).toBe('');
    });

    it('clears downstream state when switching mode', () => {
      useImportStore.setState({
        parseResult: { rows: [], warnings: [] },
        preview: {
          importYear: 2026,
          rows: [],
          summary: { newCount: 0, updateCount: 0, skipCount: 0, invalidCount: 0 },
        },
        result: { success: true, created: 0, updated: 0, skipped: 0, errors: [] },
        error: 'some error',
      });

      useImportStore.getState().setInputMode('text');
      const state = useImportStore.getState();
      expect(state.parseResult).toBeNull();
      expect(state.preview).toBeNull();
      expect(state.result).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('setTextContent', () => {
    it('sets text content and clears downstream state', () => {
      useImportStore.setState({
        parseResult: { rows: [], warnings: [] },
        preview: {
          importYear: 2026,
          rows: [],
          summary: { newCount: 0, updateCount: 0, skipCount: 0, invalidCount: 0 },
        },
      });

      useImportStore.getState().setTextContent('new content');
      const state = useImportStore.getState();
      expect(state.textContent).toBe('new content');
      expect(state.parseResult).toBeNull();
      expect(state.preview).toBeNull();
    });
  });

  describe('parseFile', () => {
    it('uses textContent directly in text mode', async () => {
      const { parseTsv } = await import('./parser');

      useImportStore.getState().setInputMode('text');
      useImportStore.getState().setTextContent('馬名\tSP\nテスト馬\t80');

      await useImportStore.getState().parseFile(2026);

      expect(parseTsv).toHaveBeenCalledWith('馬名\tSP\nテスト馬\t80', 2026);
      expect(useImportStore.getState().parseResult).not.toBeNull();
    });

    it('reads file in file mode', async () => {
      const { readFileAsText } = await import('./parser');

      const testFile = new File(['test'], 'test.txt');
      useImportStore.getState().setFile(testFile);

      await useImportStore.getState().parseFile(2026);

      expect(readFileAsText).toHaveBeenCalledWith(testFile);
      expect(useImportStore.getState().parseResult).not.toBeNull();
    });

    it('does nothing in text mode with empty textContent', async () => {
      useImportStore.getState().setInputMode('text');
      useImportStore.getState().setTextContent('');

      await useImportStore.getState().parseFile(2026);

      expect(useImportStore.getState().parseResult).toBeNull();
    });

    it('does nothing in file mode with no file', async () => {
      await useImportStore.getState().parseFile(2026);

      expect(useImportStore.getState().parseResult).toBeNull();
    });
  });

  describe('reset', () => {
    it('restores inputMode and textContent to defaults', () => {
      useImportStore.getState().setInputMode('text');
      useImportStore.getState().setTextContent('some content');

      useImportStore.getState().reset();
      const state = useImportStore.getState();
      expect(state.inputMode).toBe('file');
      expect(state.textContent).toBe('');
    });
  });
});
