import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Horse, YearlyStatus } from '../types';
import type { Lineage } from '@/features/lineages/types';

function createTestHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: 1,
    name: 'ディープインパクト',
    sex: '牡',
    birthYear: 2002,
    country: '日',
    isHistorical: true,
    mareLine: 'ハイクレア系',
    status: '種牡馬',
    sireId: 10,
    damId: 20,
    lineageId: 5,
    factors: ['スピード', 'パワー'],
    notes: 'テスト備考',
    createdAt: '2026-01-01 00:00:00',
    updatedAt: '2026-01-01 00:00:00',
    ...overrides,
  };
}

function createTestYearlyStatus(overrides: Partial<YearlyStatus> = {}): YearlyStatus {
  return {
    id: 1,
    horseId: 1,
    year: 2005,
    spRank: 'S+',
    spValue: 95,
    powerRank: 'A',
    powerValue: 80,
    instantRank: 'S',
    instantValue: 90,
    staminaRank: 'A',
    staminaValue: 78,
    mentalRank: 'B+',
    mentalValue: 70,
    wisdomRank: 'A',
    wisdomValue: 82,
    subParams: 75,
    turfAptitude: '◎',
    dirtAptitude: '×',
    turfQuality: '軽',
    distanceMin: 1800,
    distanceMax: 3200,
    growthType: '普通',
    runningStyle: ['差', '追'],
    traits: ['大舞台', '鉄砲'],
    jockey: '武豊',
    grade: 'G1',
    raceRecord: '13戦12勝',
    notes: null,
    createdAt: '2026-01-01 00:00:00',
    updatedAt: '2026-01-01 00:00:00',
    ...overrides,
  };
}

const mockFindById = vi.fn<(id: number) => Promise<Horse | null>>();
const mockUpdate = vi.fn();
const mockYsFindByHorseId = vi.fn<(horseId: number) => Promise<YearlyStatus[]>>();
const mockYsCreate = vi.fn();
const mockYsUpdate = vi.fn();
const mockYsDelete = vi.fn();
const mockLineageFindById = vi.fn<(id: number) => Promise<Lineage | null>>();

const mockHorseRepo = {
  findById: mockFindById,
  findByNameAndBirthYear: vi.fn(),
  findAncestorByName: vi.fn(),
  findAll: vi.fn(),
  create: vi.fn(),
  update: mockUpdate,
  delete: vi.fn(),
  getAncestorRows: vi.fn(),
};

const mockYearlyStatusRepo = {
  findById: vi.fn(),
  findByName: vi.fn(),
  findByHorseId: mockYsFindByHorseId,
  create: mockYsCreate,
  update: mockYsUpdate,
  delete: mockYsDelete,
};

const mockLineageRepo = {
  findById: mockLineageFindById,
  findAll: vi.fn(),
  getChildren: vi.fn(),
  getHierarchy: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

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

vi.mock('@/app/repository-context', () => ({
  useRepositoryContext: () => ({
    horseRepository: mockHorseRepo,
    yearlyStatusRepository: mockYearlyStatusRepo,
    lineageRepository: mockLineageRepo,
  }),
}));

let mockHorseId = 1;

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ horseId: mockHorseId }),
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

describe('HorseDetailPage', () => {
  const horse = createTestHorse();
  const sire = createTestHorse({ id: 10, name: 'サンデーサイレンス', sex: '牡', status: '種牡馬' });
  const dam = createTestHorse({
    id: 20,
    name: 'ウインドインハーヘア',
    sex: '牝',
    status: '繁殖牝馬',
  });
  const yearlyStatus = createTestYearlyStatus();
  const lineage: Lineage = {
    id: 5,
    name: 'サンデーサイレンス系',
    lineageType: 'child',
    parentLineageId: 1,
    spStType: 'SP',
    notes: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHorseId = 1;
    mockFindById.mockImplementation(async (id: number) => {
      if (id === 1) return horse;
      if (id === 10) return sire;
      if (id === 20) return dam;
      return null;
    });
    mockYsFindByHorseId.mockResolvedValue([yearlyStatus]);
    mockLineageFindById.mockResolvedValue(lineage);
    mockUpdate.mockResolvedValue(horse);
    mockYsCreate.mockResolvedValue(createTestYearlyStatus({ id: 2, year: 2006 }));
    mockYsUpdate.mockResolvedValue(yearlyStatus);
    mockYsDelete.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  async function renderAndWait() {
    const { HorseDetailPage } = await import('./HorseDetailPage');
    render(<HorseDetailPage />);
    await screen.findByText('ディープインパクト');
  }

  // D1: 基本情報
  it('D1 基本情報が表示される（馬名、性別、生年、国、史実/自家生産、牝系、ステータス）', async () => {
    await renderAndWait();

    expect(screen.getByRole('heading', { name: 'ディープインパクト' })).toBeInTheDocument();
    expect(screen.getByText('牡')).toBeInTheDocument();
    expect(screen.getByText('2002')).toBeInTheDocument();
    expect(screen.getByText('日')).toBeInTheDocument();
    expect(screen.getByText('史実馬')).toBeInTheDocument();
    expect(screen.getByText('ハイクレア系')).toBeInTheDocument();
    expect(screen.getByText('種牡馬')).toBeInTheDocument();
  });

  // D2: 年度別ステータス
  it('D2 年度別ステータスが表示される（能力値、適性、距離、成長型、脚質、特性、騎手、グレード、戦績）', async () => {
    await renderAndWait();

    // 年度
    expect(screen.getByText('2005')).toBeInTheDocument();
    // 能力値（ランク+数値）
    expect(screen.getByText('S+ (95)')).toBeInTheDocument();
    // 適性
    expect(screen.getByText('◎')).toBeInTheDocument();
    // 距離範囲
    expect(screen.getByText('1800m〜3200m')).toBeInTheDocument();
    // 成長型
    expect(screen.getByText('普通')).toBeInTheDocument();
    // 脚質
    expect(screen.getByText('差')).toBeInTheDocument();
    expect(screen.getByText('追')).toBeInTheDocument();
    // 特性
    expect(screen.getByText('大舞台')).toBeInTheDocument();
    expect(screen.getByText('鉄砲')).toBeInTheDocument();
    // 騎手
    expect(screen.getByText('武豊')).toBeInTheDocument();
    // グレード
    expect(screen.getByText('G1')).toBeInTheDocument();
    // 戦績
    expect(screen.getByText('13戦12勝')).toBeInTheDocument();
  });

  // D3: 血統情報
  it('D3 血統情報が表示される（父馬・母馬リンク、系統、因子）', async () => {
    await renderAndWait();

    // 父馬リンク
    const sireLink = screen.getByRole('link', { name: 'サンデーサイレンス' });
    expect(sireLink).toHaveAttribute('href', '/horses/10');

    // 母馬リンク
    const damLink = screen.getByRole('link', { name: 'ウインドインハーヘア' });
    expect(damLink).toHaveAttribute('href', '/horses/20');

    // 系統名
    expect(screen.getByText('サンデーサイレンス系')).toBeInTheDocument();

    // 因子
    expect(screen.getByText('スピード')).toBeInTheDocument();
    expect(screen.getByText('パワー')).toBeInTheDocument();
  });

  // 血統ツリーリンク
  it('血統ツリーへの遷移リンクが存在する', async () => {
    await renderAndWait();

    const pedigreeLink = screen.getByRole('link', { name: /血統ツリー/ });
    expect(pedigreeLink).toHaveAttribute('href', '/horses/1/pedigree');
  });

  // 馬一覧へ戻るリンク
  it('馬一覧へ戻るリンクがある', async () => {
    await renderAndWait();

    const backLink = screen.getByRole('link', { name: /馬一覧/ });
    expect(backLink).toHaveAttribute('href', '/horses');
  });

  // 基本情報の編集
  it('基本情報の編集ができる', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    // 編集ボタンをクリック（基本情報セクション内）
    const editButton = screen.getByRole('button', { name: '基本情報を編集' });
    await user.click(editButton);

    // ダイアログが開く
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    const nameInput = within(dialog).getByLabelText('馬名');
    await user.clear(nameInput);
    await user.type(nameInput, '新馬名');
    await user.click(within(dialog).getByRole('button', { name: '更新' }));

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ name: '新馬名' }));
  });

  // 年度別ステータスの追加
  it('年度別ステータスの追加ができる', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    await user.click(screen.getByRole('button', { name: /ステータスを追加/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('年度'), '2006');
    await user.type(within(dialog).getByLabelText('SPランク'), 'A');
    await user.click(within(dialog).getByRole('button', { name: '追加' }));

    expect(mockYsCreate).toHaveBeenCalledTimes(1);
    expect(mockYsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ horseId: 1, year: 2006, spRank: 'A' }),
    );
  });

  // 年度別ステータスの編集
  it('年度別ステータスの編集ができる', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    const editButtons = screen.getAllByRole('button', { name: 'ステータスを編集' });
    await user.click(editButtons[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    const spRankInput = within(dialog).getByLabelText('SPランク');
    await user.clear(spRankInput);
    await user.type(spRankInput, 'S');
    await user.click(within(dialog).getByRole('button', { name: '更新' }));

    expect(mockYsUpdate).toHaveBeenCalledTimes(1);
    expect(mockYsUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ spRank: 'S' }));
  });

  // 年度別ステータスの削除
  it('年度別ステータスの削除ができる', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    const deleteButtons = screen.getAllByRole('button', { name: 'ステータスを削除' });
    await user.click(deleteButtons[0]);

    // 確認ダイアログが表示される
    expect(screen.getByText(/削除しますか/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '削除する' }));

    expect(mockYsDelete).toHaveBeenCalledWith(1);
  });

  // ローディング状態
  it('ローディング状態が表示される', async () => {
    mockFindById.mockImplementation(() => new Promise(() => {})); // never resolves
    const { HorseDetailPage } = await import('./HorseDetailPage');
    render(<HorseDetailPage />);

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  // エラー状態
  it('エラー状態が表示される', async () => {
    mockFindById.mockRejectedValue(new Error('データ取得に失敗しました'));
    const { HorseDetailPage } = await import('./HorseDetailPage');
    render(<HorseDetailPage />);

    await screen.findByText('データ取得に失敗しました');
  });

  // 馬が見つからない場合
  it('馬が見つからない場合にメッセージが表示される', async () => {
    mockFindById.mockResolvedValue(null);
    const { HorseDetailPage } = await import('./HorseDetailPage');
    render(<HorseDetailPage />);

    await screen.findByText('馬が見つかりません');
  });

  // 区分（isHistorical）の編集
  it('基本情報編集で区分（史実/自家生産）を変更できる', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    await user.click(screen.getByRole('button', { name: '基本情報を編集' }));
    const dialog = screen.getByRole('dialog');

    // 現在「史実馬」（historical）が選択されている → 「自家生産馬」に切り替え
    const homebredButton = within(dialog).getByRole('button', { name: '自家生産馬' });
    await user.click(homebredButton);
    await user.click(within(dialog).getByRole('button', { name: '更新' }));

    expect(mockUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ isHistorical: false }));
  });

  // 詳細→詳細遷移（父馬リンクなど）
  it('horseId が変わると新しい馬のデータに切り替わる', async () => {
    const horse2 = createTestHorse({
      id: 10,
      name: 'サンデーサイレンス',
      sex: '牡',
      status: '種牡馬',
      sireId: null,
      damId: null,
      lineageId: null,
      factors: null,
    });

    mockFindById.mockImplementation(async (id: number) => {
      if (id === 1) return horse;
      if (id === 10) return horse2;
      if (id === 20) return dam;
      return null;
    });
    mockYsFindByHorseId.mockImplementation(async (horseId: number) => {
      if (horseId === 1) return [yearlyStatus];
      return [];
    });

    const { HorseDetailPage } = await import('./HorseDetailPage');
    const { rerender } = render(<HorseDetailPage />);
    await screen.findByText('ディープインパクト');

    // horseId を変更して rerender
    mockHorseId = 10;
    rerender(<HorseDetailPage />);
    await screen.findByText('サンデーサイレンス');

    // 前の馬のデータが残っていないことを確認
    expect(screen.queryByText('ディープインパクト')).not.toBeInTheDocument();
  });
});
