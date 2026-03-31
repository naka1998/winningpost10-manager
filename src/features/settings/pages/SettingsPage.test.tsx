import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../store';

const mockGetAll = vi.fn<() => Promise<Record<string, string>>>();
const mockSet = vi.fn<(key: string, value: string) => Promise<void>>();

const mockSettingsRepo = {
  get: vi.fn(),
  getAll: mockGetAll,
  set: mockSet,
};

vi.mock('@/components/ui/select', () => {
  const SelectContext = React.createContext<{
    value?: string;
    onValueChange?: (v: string) => void;
  }>({});
  function Select({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    children: React.ReactNode;
  }) {
    return (
      <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>
    );
  }
  function SelectTrigger({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }
  function SelectValue({ placeholder }: { placeholder?: string }) {
    const { value } = React.useContext(SelectContext);
    return <span>{value || placeholder || ''}</span>;
  }
  function SelectContent({ children }: { children: React.ReactNode }) {
    const { value, onValueChange } = React.useContext(SelectContext);
    return (
      <select
        value={value}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onValueChange?.(e.target.value)}
      >
        {children}
      </select>
    );
  }
  function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
    return <option value={value}>{children}</option>;
  }
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

const mockSeedTestHorses = vi.fn<() => Promise<number>>();

vi.mock('@/database/seed/test-horses', () => ({
  seedTestHorses: (...args: unknown[]) => mockSeedTestHorses(...(args as [])),
}));

vi.mock('@/app/database-context', () => ({
  useDatabaseContext: () => ({ db: {} }),
}));

vi.mock('@/app/repository-context', () => ({
  useRepositoryContext: () => ({
    horseRepository: {},
    yearlyStatusRepository: {},
    lineageRepository: {},
    settingsRepository: mockSettingsRepo,
  }),
}));

const defaultRaw: Record<string, string> = {
  current_year: '2025',
  pedigree_depth: '4',
  rank_system: '{"ranks":["S+","S","A+","A","B+","B","C+","C","D+","D","E+","E"]}',
  db_version: '1',
};

async function renderAndWait() {
  const { SettingsPage } = await import('./SettingsPage');
  render(<SettingsPage />);
  // Wait for settings to fully load (this element only appears after loading completes)
  await screen.findByLabelText('現在の年度');
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAll.mockResolvedValue({ ...defaultRaw });
    mockSet.mockResolvedValue(undefined);
    mockSeedTestHorses.mockResolvedValue(10);
    useSettingsStore.setState({
      settings: null,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('設定が読み込まれて表示される', async () => {
    await renderAndWait();
    // 年度が表示される
    const yearInput = screen.getByLabelText('現在の年度');
    expect(yearInput).toHaveValue(2025);
  });

  it('データベースバージョンが表示される', async () => {
    await renderAndWait();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('ランクシステムが一覧表示される', async () => {
    await renderAndWait();
    expect(screen.getByText('S+')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
  });

  it('年度を変更できる', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    const yearInput = screen.getByLabelText('現在の年度');
    await user.clear(yearInput);
    await user.type(yearInput, '2030');

    const saveButton = screen.getByRole('button', { name: '保存' });
    await user.click(saveButton);

    expect(mockSet).toHaveBeenCalledWith('current_year', '2030');
  });

  it('血統表示世代数を切り替えられる', async () => {
    await renderAndWait();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '5' } });

    // Wait for the async store update
    await vi.waitFor(() => {
      expect(mockSet).toHaveBeenCalledWith('pedigree_depth', '5');
    });
  });

  it('エクスポートボタンが表示される', async () => {
    await renderAndWait();
    expect(screen.getByRole('button', { name: 'エクスポート' })).toBeInTheDocument();
  });

  it('リセットボタンで確認ダイアログが表示される', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    const resetButton = screen.getByRole('button', { name: 'データベースリセット' });
    await user.click(resetButton);

    expect(screen.getByText('本当にリセットしますか？')).toBeInTheDocument();
  });

  it('テストデータ投入ボタンが表示される', async () => {
    await renderAndWait();
    expect(screen.getByRole('button', { name: 'テストデータ投入' })).toBeInTheDocument();
  });

  it('テストデータ投入ボタンをクリックすると結果が表示される', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    await user.click(screen.getByRole('button', { name: 'テストデータ投入' }));

    await screen.findByText('10頭のテストデータを投入しました');
    expect(mockSeedTestHorses).toHaveBeenCalledTimes(1);
  });

  it('テストデータ投入でエラー時にエラーメッセージが表示される', async () => {
    mockSeedTestHorses.mockRejectedValue(new Error('UNIQUE constraint failed'));
    const user = userEvent.setup();
    await renderAndWait();

    await user.click(screen.getByRole('button', { name: 'テストデータ投入' }));

    await screen.findByText('エラー: UNIQUE constraint failed');
  });

  it('初回ロード失敗時にエラーメッセージが表示される（読み込み中のままにならない）', async () => {
    mockGetAll.mockRejectedValue(new Error('DB connection failed'));
    const { SettingsPage } = await import('./SettingsPage');
    render(<SettingsPage />);

    await screen.findByText('DB connection failed');
    expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
  });

  it('ローディング中は読み込み中メッセージが表示される', async () => {
    mockGetAll.mockImplementation(
      () => new Promise(() => {}), // never resolves
    );
    const { SettingsPage } = await import('./SettingsPage');
    render(<SettingsPage />);

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });
});
