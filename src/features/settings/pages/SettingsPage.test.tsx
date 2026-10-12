import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../store';

const mockGetAll = vi.fn();
const mockUpdateCurrentYear = vi.fn();
const mockUpdatePedigreeDepth = vi.fn();

const mockSettingsService = {
  getAll: mockGetAll,
  updateCurrentYear: mockUpdateCurrentYear,
  updatePedigreeDepth: mockUpdatePedigreeDepth,
};

const mockExportDatabase = vi.fn();
const mockDownloadBackupFile = vi.fn();
const mockImportDatabase = vi.fn();

vi.mock('@/database/backup', () => ({
  exportDatabase: (...args: unknown[]) => mockExportDatabase(...args),
  downloadBackupFile: (...args: unknown[]) => mockDownloadBackupFile(...args),
  importDatabase: (...args: unknown[]) => mockImportDatabase(...args),
}));

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

const mockDb = {};

vi.mock('@/app/database-context', () => ({
  useDatabaseContext: () => ({ db: mockDb }),
}));

vi.mock('@/app/service-context', () => ({
  useServiceContext: () => ({
    settingsService: mockSettingsService,
  }),
}));

const defaultSettings = {
  currentYear: 2025,
  pedigreeDepth: 4 as 4 | 5,
  rankSystem: ['S+', 'S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E+', 'E'],
  dbVersion: 1,
};

async function renderAndWait() {
  const { SettingsPage } = await import('./SettingsPage');
  render(<SettingsPage />);
  await screen.findByLabelText('現在の年度');
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const currentSettings = { ...defaultSettings };
    mockGetAll.mockImplementation(async () => ({ ...currentSettings }));
    mockUpdateCurrentYear.mockImplementation(async (year: number) => {
      currentSettings.currentYear = year;
    });
    mockUpdatePedigreeDepth.mockImplementation(async (depth: 4 | 5) => {
      currentSettings.pedigreeDepth = depth;
    });
    mockSeedTestHorses.mockResolvedValue(10);
    mockExportDatabase.mockResolvedValue({
      blob: new Blob(['backup']),
      filename: 'wp10-manager-backup-20260402-120000.sqlite3',
    });
    mockDownloadBackupFile.mockResolvedValue(undefined);
    mockImportDatabase.mockResolvedValue(undefined);
    useSettingsStore.setState({
      settings: null,
      isLoading: false,
      error: null,
    });
    vi.stubGlobal('location', { reload: vi.fn() });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('設定が読み込まれて表示される', async () => {
    await renderAndWait();
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

    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(mockUpdateCurrentYear).toHaveBeenCalledWith(2030);
  });

  it('血統表示世代数を切り替えられる', async () => {
    await renderAndWait();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '5' } });

    await vi.waitFor(() => {
      expect(mockUpdatePedigreeDepth).toHaveBeenCalledWith(5);
    });
  });

  it('エクスポートボタン押下でバックアップ処理が実行される', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    await user.click(screen.getByRole('button', { name: 'エクスポート' }));

    expect(mockExportDatabase).toHaveBeenCalledWith(mockDb);
    expect(mockDownloadBackupFile).toHaveBeenCalledTimes(1);
  });

  it('リストアは二重確認ダイアログを経て実行される', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    const file = new File(['{"format":"wp10-manager-backup-v1","tables":[]}'], 'test.sqlite3', {
      type: 'application/x-sqlite3',
    });

    const input = screen.getByTestId('restore-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('バックアップをリストアしますか？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '次へ' }));

    expect(screen.getByText('最終確認: リストアを実行します')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'リストア実行' }));

    expect(mockImportDatabase).toHaveBeenCalledWith(mockDb, file);
    expect(location.reload).toHaveBeenCalledTimes(1);
  });

  it('リストア失敗時にエラーメッセージが表示される', async () => {
    mockImportDatabase.mockRejectedValue(new Error('restore failed'));
    const user = userEvent.setup();
    await renderAndWait();

    const file = new File(['{}'], 'broken.sqlite3', { type: 'application/x-sqlite3' });
    const input = screen.getByTestId('restore-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    await user.click(screen.getByRole('button', { name: '次へ' }));
    await user.click(screen.getByRole('button', { name: 'リストア実行' }));

    await screen.findByText(/リストアに失敗しました。変更はロールバックされ元のDBを維持します/);
    expect(location.reload).not.toHaveBeenCalled();
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

  it('テストデータ投入中はエクスポート/リストア操作がロックされる', async () => {
    mockSeedTestHorses.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    await renderAndWait();

    await user.click(screen.getByRole('button', { name: 'テストデータ投入' }));

    expect(screen.getByRole('button', { name: 'エクスポート' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'データベースリストア' })).toBeDisabled();
  });

  it('初回ロード失敗時にエラーメッセージが表示される（読み込み中のままにならない）', async () => {
    mockGetAll.mockRejectedValue(new Error('DB connection failed'));
    const { SettingsPage } = await import('./SettingsPage');
    render(<SettingsPage />);

    await screen.findByText('DB connection failed');
    expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
  });

  it('ローディング中は読み込み中メッセージが表示される', async () => {
    mockGetAll.mockImplementation(() => new Promise(() => {}));
    const { SettingsPage } = await import('./SettingsPage');
    render(<SettingsPage />);

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });
});
