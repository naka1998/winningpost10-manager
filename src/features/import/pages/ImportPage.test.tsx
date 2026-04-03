import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useImportStore } from '../store';

// Mock context providers
vi.mock('@/app/database-context', () => ({
  useDatabaseContext: () => ({ db: {} }),
}));

vi.mock('@/app/repository-context', () => ({
  useRepositoryContext: () => ({
    horseRepository: {},
    yearlyStatusRepository: {},
    lineageRepository: {},
    breedingRecordRepository: {},
  }),
}));

// Mock service factory to return a stub
vi.mock('../service', () => ({
  createImportService: () => ({
    preview: vi.fn(),
    execute: vi.fn(),
  }),
}));

describe('ImportPage step transitions', () => {
  beforeEach(() => {
    useImportStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders file step initially with StepIndicator', async () => {
    const { ImportPage } = await import('./ImportPage');
    render(<ImportPage />);

    expect(screen.getByText('データインポート')).toBeInTheDocument();
    expect(screen.getByText('ファイル選択')).toBeInTheDocument();
    // The "次へ" button should be disabled when no file is selected
    expect(screen.getByRole('button', { name: '次へ' })).toBeDisabled();
  });

  it('enables 次へ button when a file is set and transitions to settings step', async () => {
    const user = userEvent.setup();
    const { ImportPage } = await import('./ImportPage');
    render(<ImportPage />);

    // Set a file in the store
    const testFile = new File(['test content'], 'horses.txt', { type: 'text/plain' });
    useImportStore.getState().setFile(testFile);

    // Re-render to reflect store change - the button should now be enabled
    cleanup();
    render(<ImportPage />);

    const nextButton = screen.getByRole('button', { name: '次へ' });
    expect(nextButton).toBeEnabled();

    await user.click(nextButton);

    // Should now show settings step
    expect(screen.getByText('インポート設定')).toBeInTheDocument();
  });

  it('can navigate back from settings to file step', async () => {
    const user = userEvent.setup();

    // Start at settings step with a file
    const testFile = new File(['test content'], 'horses.txt', { type: 'text/plain' });
    useImportStore.getState().setFile(testFile);
    useImportStore.getState().setStep('settings');

    const { ImportPage } = await import('./ImportPage');
    render(<ImportPage />);

    expect(screen.getByText('インポート設定')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '戻る' }));

    expect(screen.getByText('ファイル選択')).toBeInTheDocument();
  });

  it('can navigate back from preview to settings step', async () => {
    const user = userEvent.setup();

    // Set up preview state
    useImportStore.getState().setStep('preview');
    useImportStore.setState({
      preview: {
        importYear: 2026,
        rows: [],
        summary: { newCount: 0, updateCount: 0, skipCount: 0, invalidCount: 0 },
      },
    });

    const { ImportPage } = await import('./ImportPage');
    render(<ImportPage />);

    expect(screen.getByText('インポートプレビュー')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '戻る' }));

    expect(screen.getByText('インポート設定')).toBeInTheDocument();
  });

  it('shows result step and allows starting a new import', async () => {
    const user = userEvent.setup();

    // Set up result state
    useImportStore.getState().setStep('result');
    useImportStore.setState({
      result: {
        success: true,
        created: 5,
        updated: 2,
        skipped: 1,
        errors: [],
      },
    });

    const { ImportPage } = await import('./ImportPage');
    render(<ImportPage />);

    expect(screen.getByText('インポート完了')).toBeInTheDocument();
    expect(screen.getByText(/作成: 5件/)).toBeInTheDocument();
    expect(screen.getByText(/更新: 2件/)).toBeInTheDocument();

    // Click "新しいインポート" to reset
    await user.click(screen.getByRole('button', { name: '新しいインポート' }));

    // Should be back to file step
    expect(screen.getByText('ファイル選択')).toBeInTheDocument();
  });

  it('shows error result step correctly', async () => {
    useImportStore.getState().setStep('result');
    useImportStore.setState({
      result: {
        success: false,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [{ row: 3, horseName: 'エラー馬', message: '不正なデータ' }],
      },
    });

    const { ImportPage } = await import('./ImportPage');
    render(<ImportPage />);

    expect(screen.getByText('インポートエラー')).toBeInTheDocument();
    expect(screen.getByText(/行3.*エラー馬.*不正なデータ/)).toBeInTheDocument();
  });
});
