import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { filterHierarchy, useLineageStore } from '../store';
import type { LineageNode } from '../types';

function createTestHierarchy(): LineageNode[] {
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
        {
          id: 11,
          name: 'ニジンスキー系',
          lineageType: 'child',
          parentLineageId: 1,
          spStType: 'ST',
          notes: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          children: [],
        },
        {
          id: 12,
          name: 'ノーザンダンサー直系',
          lineageType: 'child',
          parentLineageId: 1,
          spStType: null,
          notes: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          children: [],
        },
      ],
    },
    {
      id: 2,
      name: 'サンデーサイレンス系',
      lineageType: 'parent',
      parentLineageId: null,
      spStType: null,
      notes: null,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      children: [
        {
          id: 20,
          name: 'ディープインパクト系',
          lineageType: 'child',
          parentLineageId: 2,
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

const mockGetHierarchy = vi.fn<() => Promise<LineageNode[]>>();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

const mockLineageRepo = {
  findById: vi.fn(),
  findByName: vi.fn(),
  findAll: vi.fn(),
  getChildren: vi.fn(),
  getHierarchy: mockGetHierarchy,
  create: mockCreate,
  update: mockUpdate,
};

const mockRepoContext = {
  lineageRepository: mockLineageRepo,
  horseRepository: {},
};

vi.mock('@/app/repository-context', () => ({
  useRepositoryContext: () => mockRepoContext,
}));

describe('LineageListPage', () => {
  const hierarchy = createTestHierarchy();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHierarchy.mockResolvedValue(hierarchy);
    mockCreate.mockResolvedValue({ id: 100 });
    mockUpdate.mockResolvedValue({ id: 1 });
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
    const { LineageListPage } = await import('./LineageListPage');
    render(<LineageListPage />);
    // Wait for loadHierarchy to finish and data to appear
    await screen.findByText('ノーザンダンサー系');
  }

  it('階層ツリーが正しく表示される', async () => {
    await renderAndWait();

    // ヘッダー
    expect(screen.getByRole('heading', { name: '系統マスタ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新規登録' })).toBeInTheDocument();

    // 親系統
    expect(screen.getByText('ノーザンダンサー系')).toBeInTheDocument();
    expect(screen.getByText('サンデーサイレンス系')).toBeInTheDocument();

    // 子系統
    expect(screen.getByText('リファール系')).toBeInTheDocument();
    expect(screen.getByText('ニジンスキー系')).toBeInTheDocument();
    expect(screen.getByText('ディープインパクト系')).toBeInTheDocument();

    // 子系統数バッジ
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    // SP/STバッジ
    expect(screen.getAllByText('SP').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('ST').length).toBeGreaterThanOrEqual(1);

    // 検索欄
    expect(screen.getByPlaceholderText('系統名で検索...')).toBeInTheDocument();
  });

  it('検索入力でstoreが更新される', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    await user.type(screen.getByPlaceholderText('系統名で検索...'), 'ディープ');
    expect(useLineageStore.getState().searchQuery).toBe('ディープ');
  });

  it('新規登録ダイアログが開きフォームフィールドが表示される', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    await user.click(screen.getByRole('button', { name: '新規登録' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('系統を登録')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('系統名')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('系統タイプ')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('SP/ST')).toBeInTheDocument();
  });

  it('編集ダイアログが開く', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    const editButtons = screen.getAllByRole('button', { name: '編集' });
    await user.click(editButtons[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('系統を編集')).toBeInTheDocument();
  });

  it('ローディング状態が表示される', async () => {
    useLineageStore.setState({ isLoading: true, hierarchy: [], parentLineages: [] });
    const { LineageListPage } = await import('./LineageListPage');
    render(<LineageListPage />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('エラー状態が表示される', async () => {
    mockGetHierarchy.mockRejectedValue(new Error('データ取得に失敗しました'));
    const { LineageListPage } = await import('./LineageListPage');
    render(<LineageListPage />);
    // Wait for the error to appear after loadHierarchy fails
    await screen.findByText('データ取得に失敗しました');
  });

  it('子系統で親系統未選択のまま送信できない', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    // 新規登録ダイアログを開く
    await user.click(screen.getByRole('button', { name: '新規登録' }));
    const dialog = screen.getByRole('dialog');

    // 系統タイプを子系統に変更
    await user.selectOptions(within(dialog).getByLabelText('系統タイプ'), 'child');

    // 親系統selectが required であること
    const parentSelect = within(dialog).getByLabelText('親系統');
    expect(parentSelect).toBeRequired();

    // 系統名を入力して、親系統を選択せずに送信を試みる
    await user.type(within(dialog).getByLabelText('系統名'), 'テスト子系統');
    await user.click(within(dialog).getByRole('button', { name: '登録' }));

    // ダイアログは閉じず、create は呼ばれない（required による native validation）
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('子を持つ親系統は系統タイプを変更できない', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    // ノーザンダンサー系（子を3つ持つ親系統）の編集ボタンをクリック
    const editButtons = screen.getAllByRole('button', { name: '編集' });
    await user.click(editButtons[0]);

    const dialog = screen.getByRole('dialog');
    const typeSelect = within(dialog).getByLabelText('系統タイプ');

    // disabled であること
    expect(typeSelect).toBeDisabled();
    // 説明テキストが表示されること
    expect(screen.getByText('子系統を持つ親系統のタイプは変更できません')).toBeInTheDocument();
  });

  it('保存失敗時にダイアログが閉じずエラーが表示される', async () => {
    const user = userEvent.setup();
    mockCreate.mockRejectedValue(new Error('UNIQUE constraint failed'));
    // mockGetHierarchy needs to return data for the reload after create
    mockGetHierarchy.mockResolvedValue(hierarchy);
    await renderAndWait();

    // 新規登録ダイアログを開く
    await user.click(screen.getByRole('button', { name: '新規登録' }));
    const dialog = screen.getByRole('dialog');

    // 親系統として送信
    await user.type(within(dialog).getByLabelText('系統名'), 'テスト系統');
    await user.click(within(dialog).getByRole('button', { name: '登録' }));

    // エラーメッセージが表示され、ダイアログは閉じない
    await screen.findByText('UNIQUE constraint failed');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('filterHierarchy で検索フィルタが動作する', () => {
    const filtered = filterHierarchy(hierarchy, 'ディープ');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('サンデーサイレンス系');
    expect(filtered[0].children).toHaveLength(1);
    expect(filtered[0].children[0].name).toBe('ディープインパクト系');
  });
});
