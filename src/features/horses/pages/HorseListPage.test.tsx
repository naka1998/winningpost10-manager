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

vi.mock('@/components/ui/toggle-group', () => {
  const ToggleGroupContext = React.createContext<{
    value?: string;
    onValueChange?: (v: string) => void;
  }>({});
  function ToggleGroup({
    value,
    onValueChange,
    children,
  }: {
    type: string;
    value?: string;
    onValueChange?: (v: string) => void;
    children: React.ReactNode;
  }) {
    return (
      <ToggleGroupContext.Provider value={{ value, onValueChange }}>
        <div role="group" data-value={value}>
          {children}
        </div>
      </ToggleGroupContext.Provider>
    );
  }
  function ToggleGroupItem({ value, children }: { value: string; children: React.ReactNode }) {
    const ctx = React.useContext(ToggleGroupContext);
    return (
      <button
        type="button"
        data-value={value}
        data-state={ctx.value === value ? 'on' : 'off'}
        onClick={() => ctx.onValueChange?.(value)}
      >
        {children}
      </button>
    );
  }
  return { ToggleGroup, ToggleGroupItem };
});

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

vi.mock('@/components/ui/tabs', () => {
  const TabsContext = React.createContext<{
    value?: string;
    onValueChange?: (v: string) => void;
  }>({});
  function Tabs({
    defaultValue,
    value,
    onValueChange,
    children,
    ...props
  }: {
    defaultValue?: string;
    value?: string;
    onValueChange?: (v: string) => void;
    children: React.ReactNode;
    className?: string;
  }) {
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? '');
    const currentValue = value ?? internalValue;
    const handleChange = (v: string) => {
      if (!value) setInternalValue(v);
      onValueChange?.(v);
    };
    return (
      <TabsContext.Provider value={{ value: currentValue, onValueChange: handleChange }}>
        <div data-testid="tabs" {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
  function TabsList({ children, ...props }: { children: React.ReactNode; className?: string }) {
    return (
      <div role="tablist" {...props}>
        {children}
      </div>
    );
  }
  function TabsTrigger({
    value,
    children,
    ...props
  }: {
    value: string;
    children: React.ReactNode;
    className?: string;
  }) {
    const ctx = React.useContext(TabsContext);
    return (
      <button
        type="button"
        role="tab"
        data-state={ctx.value === value ? 'active' : 'inactive'}
        aria-selected={ctx.value === value}
        onClick={() => ctx.onValueChange?.(value)}
        {...props}
      >
        {children}
      </button>
    );
  }
  function TabsContent({
    value,
    children,
    ...props
  }: {
    value: string;
    children: React.ReactNode;
    className?: string;
  }) {
    const ctx = React.useContext(TabsContext);
    if (ctx.value !== value) return null;
    return (
      <div role="tabpanel" data-value={value} {...props}>
        {children}
      </div>
    );
  }
  return { Tabs, TabsList, TabsTrigger, TabsContent };
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
    createTestHorse({
      id: 4,
      name: 'オルフェーヴル',
      sex: '牡',
      birthYear: 2008,
      country: '日',
      status: '引退',
      lineageId: 10,
    }),
    createTestHorse({
      id: 5,
      name: 'ジェンティルドンナ',
      sex: '牝',
      birthYear: 2009,
      country: '日',
      status: '売却済',
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
      filter: { status: '現役' },
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

  it('フィルタで性別絞り込みができる', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    // 性別フィルタはToggleGroup形式 — フィルタバー内の「牡」ボタンをクリック
    const groups = screen.getAllByRole('group');
    const sexGroup = groups.find((g) => g.querySelector('[data-value="牡"]'));
    const maleButton = within(sexGroup!).getByText('牡');
    await user.click(maleButton);
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

  it('初回マウントで findAll が1回だけ呼ばれる（並行アクセス防止）', async () => {
    await renderAndWait();
    expect(mockFindAll).toHaveBeenCalledTimes(1);
  });

  it('ローディング状態が表示される', async () => {
    useHorseStore.setState({ isLoading: true, horses: [] });
    const { HorseListPage } = await import('./HorseListPage');
    render(<HorseListPage />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('データがある状態でローディング中でも「読み込み中」が表示されない', async () => {
    useHorseStore.setState({ isLoading: true, horses });
    const { HorseListPage } = await import('./HorseListPage');
    render(<HorseListPage />);
    expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    // 前のデータが表示され続ける
    expect(screen.getByText('ディープインパクト')).toBeInTheDocument();
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

  describe('タブ切り替え', () => {
    it('4つのタブ（現役・引退・種牡馬・繁殖牝馬）が表示される', async () => {
      await renderAndWait();

      const tabs = screen.getAllByRole('tab');
      const tabTexts = tabs.map((t) => t.textContent);
      expect(tabTexts).toContain('現役');
      expect(tabTexts).toContain('引退');
      expect(tabTexts).toContain('種牡馬');
      expect(tabTexts).toContain('繁殖牝馬');
    });

    it('デフォルトで「現役」タブがアクティブ', async () => {
      await renderAndWait();

      const activeTab = screen.getByRole('tab', { name: '現役' });
      expect(activeTab).toHaveAttribute('data-state', 'active');
    });

    it('「引退」タブクリックで statuses フィルタが設定される', async () => {
      const user = userEvent.setup();
      await renderAndWait();

      await user.click(screen.getByRole('tab', { name: '引退' }));

      const filter = useHorseStore.getState().filter;
      expect(filter.statuses).toEqual(
        expect.arrayContaining(['引退', '種牡馬', '繁殖牝馬', '売却済']),
      );
      expect(filter.status).toBeUndefined();
    });

    it('「種牡馬」タブクリックで status フィルタが設定される', async () => {
      const user = userEvent.setup();
      await renderAndWait();

      await user.click(screen.getByRole('tab', { name: '種牡馬' }));

      const filter = useHorseStore.getState().filter;
      expect(filter.status).toBe('種牡馬');
      expect(filter.statuses).toBeUndefined();
    });

    it('「繁殖牝馬」タブクリックで status フィルタが設定される', async () => {
      const user = userEvent.setup();
      await renderAndWait();

      await user.click(screen.getByRole('tab', { name: '繁殖牝馬' }));

      const filter = useHorseStore.getState().filter;
      expect(filter.status).toBe('繁殖牝馬');
      expect(filter.statuses).toBeUndefined();
    });

    it('「現役」タブクリックで status フィルタが設定される', async () => {
      const user = userEvent.setup();
      await renderAndWait();

      // まず別のタブに切替
      await user.click(screen.getByRole('tab', { name: '種牡馬' }));
      // 現役に戻る
      await user.click(screen.getByRole('tab', { name: '現役' }));

      const filter = useHorseStore.getState().filter;
      expect(filter.status).toBe('現役');
      expect(filter.statuses).toBeUndefined();
    });

    it('ステータスフィルタのドロップダウンが表示されない', async () => {
      await renderAndWait();

      // ステータスドロップダウンに存在していた「すべて」のoption(ステータス)は無い
      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects.find((s) => s.querySelector('option[value="現役"]'));
      expect(statusSelect).toBeUndefined();
    });
  });
});
