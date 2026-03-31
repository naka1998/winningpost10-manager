import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHorseStore } from '../store';
import { useLineageStore } from '@/features/lineages/store';
import type { Horse } from '../types';
import type { LineageNode } from '@/features/lineages/types';

function createTestHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: 1,
    name: 'テスト馬',
    sex: '牡',
    birthYear: 2020,
    country: '日',
    isHistorical: false,
    mareLine: null,
    status: '現役',
    sireId: null,
    damId: null,
    lineageId: 10,
    factors: ['スピード'],
    notes: null,
    createdAt: '2026-01-01 00:00:00',
    updatedAt: '2026-01-01 00:00:00',
    ...overrides,
  };
}

function createTestLineageHierarchy(): LineageNode[] {
  return [
    {
      id: 1,
      name: 'ノーザンダンサー系',
      lineageType: 'parent',
      parentLineageId: null,
      spStType: null,
      notes: null,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      children: [
        {
          id: 10,
          name: 'リファール系',
          lineageType: 'child',
          parentLineageId: 1,
          spStType: 'SP',
          notes: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          children: [],
        },
      ],
    },
  ];
}

const mockFindAll = vi.fn<() => Promise<Horse[]>>();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockGetHierarchy = vi.fn<() => Promise<LineageNode[]>>();

const mockHorseRepo = {
  findById: vi.fn(),
  findByNameAndBirthYear: vi.fn(),
  findAncestorByName: vi.fn(),
  findAll: mockFindAll,
  create: mockCreate,
  update: mockUpdate,
  delete: mockDelete,
  getAncestorRows: vi.fn(),
};

const mockLineageRepo = {
  findById: vi.fn(),
  findByName: vi.fn(),
  findAll: vi.fn(),
  getChildren: vi.fn(),
  getHierarchy: mockGetHierarchy,
  create: vi.fn(),
  update: vi.fn(),
};

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, unknown>;
    [key: string]: unknown;
  }) => {
    let href = to;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        href = href.replace(`$${key}`, String(value));
      }
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

vi.mock('@/components/ui/select', () => {
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
  const SelectContext = React.createContext<{
    value?: string;
    onValueChange?: (v: string) => void;
  }>({});
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

vi.mock('@/app/repository-context', () => ({
  useRepositoryContext: () => ({
    horseRepository: mockHorseRepo,
    yearlyStatusRepository: {},
    lineageRepository: mockLineageRepo,
  }),
}));

describe('HorseListPage', () => {
  const horses = [
    createTestHorse({
      id: 1,
      name: 'ディープインパクト',
      sex: '牡',
      birthYear: 2002,
      country: '日',
      status: '種牡馬',
      lineageId: 10,
    }),
    createTestHorse({
      id: 2,
      name: 'アーモンドアイ',
      sex: '牝',
      birthYear: 2015,
      country: '日',
      status: '繁殖牝馬',
      lineageId: 10,
    }),
    createTestHorse({
      id: 3,
      name: 'イクイノックス',
      sex: '牡',
      birthYear: 2019,
      country: '日',
      status: '現役',
      lineageId: null,
    }),
  ];
  const hierarchy = createTestLineageHierarchy();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindAll.mockResolvedValue(horses);
    mockCreate.mockResolvedValue(createTestHorse({ id: 100 }));
    mockUpdate.mockResolvedValue(createTestHorse({ id: 1 }));
    mockDelete.mockResolvedValue(undefined);
    mockGetHierarchy.mockResolvedValue(hierarchy);
    useHorseStore.setState({
      horses: [],
      isLoading: false,
      error: null,
      filter: {},
    });
    useLineageStore.setState({
      hierarchy: [],
      parentLineages: [],
      isLoading: false,
      error: null,
      searchQuery: '',
    });
  });

  afterEach(() => {
    cleanup();
  });

  async function renderAndWait() {
    const { HorseListPage } = await import('./HorseListPage');
    render(<HorseListPage />);
    await screen.findByText('ディープインパクト');
  }

  it('一覧テーブルに馬名・性別・生年・国・系統名・ステータスが表示される', async () => {
    await renderAndWait();

    // ヘッダー
    expect(screen.getByRole('heading', { name: '馬一覧' })).toBeInTheDocument();

    // テーブルヘッダー（ソートの option にも同名があるため columnheader ロールで確認）
    const headers = screen.getAllByRole('columnheader');
    const headerTexts = headers.map((h) => h.textContent);
    expect(headerTexts).toContain('馬名');
    expect(headerTexts).toContain('性別');
    expect(headerTexts).toContain('生年');
    expect(headerTexts).toContain('国');
    expect(headerTexts).toContain('系統');
    expect(headerTexts).toContain('ステータス');

    // データ行
    expect(screen.getByText('ディープインパクト')).toBeInTheDocument();
    expect(screen.getByText('アーモンドアイ')).toBeInTheDocument();
    expect(screen.getByText('イクイノックス')).toBeInTheDocument();

    // 系統名がマッピングされて表示される
    expect(screen.getAllByText('リファール系').length).toBeGreaterThanOrEqual(1);
  });

  it('馬名クリックで詳細画面へのリンクが存在する', async () => {
    await renderAndWait();

    const link = screen.getByRole('link', { name: 'ディープインパクト' });
    expect(link).toHaveAttribute('href', '/horses/1');
  });

  it('新規登録ダイアログが開きフォーム入力→登録できる', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    await user.click(screen.getByRole('button', { name: '新規登録' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('馬を登録')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('馬名'), '新しい馬');
    // 性別はデフォルト「牡」、国はデフォルト「日」
    await user.type(within(dialog).getByLabelText('生年'), '2023');
    await user.click(within(dialog).getByRole('button', { name: '登録' }));

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: '新しい馬', sex: '牡', birthYear: 2023 }),
    );
  });

  it('編集ダイアログが開き更新できる', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    const editButtons = screen.getAllByRole('button', { name: '編集' });
    await user.click(editButtons[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('馬を編集')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    const nameInput = within(dialog).getByLabelText('馬名');
    await user.clear(nameInput);
    await user.type(nameInput, '更新馬名');
    await user.click(within(dialog).getByRole('button', { name: '更新' }));

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ name: '更新馬名' }));
  });

  it('削除確認ダイアログで削除できる', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    const deleteButtons = screen.getAllByRole('button', { name: '削除' });
    await user.click(deleteButtons[0]);

    // 確認ダイアログが表示される
    expect(screen.getByText('馬の削除')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '削除する' }));

    expect(mockDelete).toHaveBeenCalledWith(1);
  });

  it('フィルタでステータス絞り込みができる', async () => {
    await renderAndWait();

    // フィルタバー内のステータスselect（初期値 'all'）を変更
    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects.find((s) => s.querySelector('option[value="現役"]'));
    fireEvent.change(statusSelect!, { target: { value: '現役' } });
    expect(useHorseStore.getState().filter.status).toBe('現役');
    // loadHorses がフィルタ変更後に再呼び出しされる（初回 loadData + filter effect + filter変更後）
    expect(mockFindAll.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('フィルタで性別絞り込みができる', async () => {
    await renderAndWait();

    const selects = screen.getAllByRole('combobox');
    const sexSelect = selects.find(
      (s) => s.querySelector('option[value="牡"]') && s.querySelector('option[value="セン"]'),
    );
    fireEvent.change(sexSelect!, { target: { value: '牡' } });
    expect(useHorseStore.getState().filter.sex).toBe('牡');
  });

  it('フィルタで系統絞り込みができる', async () => {
    await renderAndWait();

    const selects = screen.getAllByRole('combobox');
    const lineageSelect = selects.find((s) => s.querySelector('option[value="10"]'));
    fireEvent.change(lineageSelect!, { target: { value: '10' } });
    expect(useHorseStore.getState().filter.lineageId).toBe(10);
  });

  it('フィルタで生年範囲（から）絞り込みができる', async () => {
    await renderAndWait();

    fireEvent.change(screen.getByLabelText('生年（から）'), { target: { value: '2010' } });
    expect(useHorseStore.getState().filter.birthYearFrom).toBe(2010);
  });

  it('フィルタで生年範囲（まで）絞り込みができる', async () => {
    await renderAndWait();

    fireEvent.change(screen.getByLabelText('生年（まで）'), { target: { value: '2020' } });
    expect(useHorseStore.getState().filter.birthYearTo).toBe(2020);
  });

  it('ソート切り替えができる', async () => {
    await renderAndWait();

    const selects = screen.getAllByRole('combobox');
    const sortSelect = selects.find((s) => s.querySelector('option[value="birth_year"]'));
    fireEvent.change(sortSelect!, { target: { value: 'birth_year' } });
    expect(useHorseStore.getState().filter.sortBy).toBe('birth_year');
  });

  it('ローディング状態が表示される', async () => {
    useHorseStore.setState({ isLoading: true, horses: [] });
    const { HorseListPage } = await import('./HorseListPage');
    render(<HorseListPage />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('エラー状態が表示される', async () => {
    mockFindAll.mockRejectedValue(new Error('データ取得に失敗しました'));
    const { HorseListPage } = await import('./HorseListPage');
    render(<HorseListPage />);
    await screen.findByText('データ取得に失敗しました');
  });

  it('馬がない場合に空状態メッセージが表示される', async () => {
    mockFindAll.mockResolvedValue([]);
    const { HorseListPage } = await import('./HorseListPage');
    render(<HorseListPage />);
    await screen.findByText('馬が登録されていません');
  });

  it('保存失敗時にダイアログが閉じずエラーが表示される', async () => {
    const user = userEvent.setup();
    mockCreate.mockRejectedValue(new Error('UNIQUE constraint failed'));
    await renderAndWait();

    await user.click(screen.getByRole('button', { name: '新規登録' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('馬名'), 'テスト馬');
    await user.click(within(dialog).getByRole('button', { name: '登録' }));

    await screen.findByText('UNIQUE constraint failed');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
