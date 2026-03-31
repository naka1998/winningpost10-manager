import type { DatabaseConnection } from '../connection';

export interface PresetLineage {
  name: string;
  lineageType: 'parent' | 'child';
  parentName?: string;
  spStType?: 'SP' | 'ST' | null;
}

/**
 * WP10 2026 の親系統・子系統マスタデータ。
 * 親系統を先に、子系統をその後に配置する。
 */
export const presetLineages: PresetLineage[] = [
  // ===== 親系統 =====
  { name: 'エクリプス系', lineageType: 'parent', spStType: null },
  { name: 'ナスルーラ系', lineageType: 'parent', spStType: null },
  { name: 'ターントゥ系', lineageType: 'parent', spStType: null },
  { name: 'ノーザンダンサー系', lineageType: 'parent', spStType: null },
  { name: 'ミスタープロスペクター系', lineageType: 'parent', spStType: null },
  { name: 'ネイティヴダンサー系', lineageType: 'parent', spStType: null },
  { name: 'サンデーサイレンス系', lineageType: 'parent', spStType: null },
  { name: 'ロイヤルチャージャー系', lineageType: 'parent', spStType: null },
  { name: 'ヘロド系', lineageType: 'parent', spStType: null },
  { name: 'マッチェム系', lineageType: 'parent', spStType: null },
  { name: 'セントサイモン系', lineageType: 'parent', spStType: null },
  { name: 'ハンプトン系', lineageType: 'parent', spStType: null },
  { name: 'スウィンフォード系', lineageType: 'parent', spStType: null },
  { name: 'ファラリス系', lineageType: 'parent', spStType: null },
  { name: 'ヒムヤー系', lineageType: 'parent', spStType: null },

  // ===== 子系統: エクリプス系 =====
  { name: 'エクリプス直系', lineageType: 'child', parentName: 'エクリプス系', spStType: null },

  // ===== 子系統: ナスルーラ系 =====
  { name: 'ナスルーラ直系', lineageType: 'child', parentName: 'ナスルーラ系', spStType: null },
  { name: 'グレイソヴリン系', lineageType: 'child', parentName: 'ナスルーラ系', spStType: 'SP' },
  { name: 'ボールドルーラー系', lineageType: 'child', parentName: 'ナスルーラ系', spStType: 'SP' },
  { name: 'レッドゴッド系', lineageType: 'child', parentName: 'ナスルーラ系', spStType: 'SP' },
  { name: 'ネヴァーベンド系', lineageType: 'child', parentName: 'ナスルーラ系', spStType: 'ST' },
  {
    name: 'プリンスリーギフト系',
    lineageType: 'child',
    parentName: 'ナスルーラ系',
    spStType: 'SP',
  },

  // ===== 子系統: ターントゥ系 =====
  { name: 'ターントゥ直系', lineageType: 'child', parentName: 'ターントゥ系', spStType: null },
  {
    name: 'ヘイルトゥリーズン系',
    lineageType: 'child',
    parentName: 'ターントゥ系',
    spStType: 'SP',
  },
  { name: 'ロベルト系', lineageType: 'child', parentName: 'ターントゥ系', spStType: 'ST' },

  // ===== 子系統: ノーザンダンサー系 =====
  {
    name: 'ノーザンダンサー直系',
    lineageType: 'child',
    parentName: 'ノーザンダンサー系',
    spStType: null,
  },
  {
    name: 'リファール系',
    lineageType: 'child',
    parentName: 'ノーザンダンサー系',
    spStType: 'SP',
  },
  {
    name: 'ニジンスキー系',
    lineageType: 'child',
    parentName: 'ノーザンダンサー系',
    spStType: 'ST',
  },
  {
    name: 'ヌレイエフ系',
    lineageType: 'child',
    parentName: 'ノーザンダンサー系',
    spStType: 'SP',
  },
  {
    name: 'サドラーズウェルズ系',
    lineageType: 'child',
    parentName: 'ノーザンダンサー系',
    spStType: 'ST',
  },
  {
    name: 'ダンジグ系',
    lineageType: 'child',
    parentName: 'ノーザンダンサー系',
    spStType: 'SP',
  },
  {
    name: 'ストームキャット系',
    lineageType: 'child',
    parentName: 'ノーザンダンサー系',
    spStType: 'SP',
  },
  {
    name: 'ヴァイスリージェント系',
    lineageType: 'child',
    parentName: 'ノーザンダンサー系',
    spStType: 'SP',
  },
  {
    name: 'ノーザンテースト系',
    lineageType: 'child',
    parentName: 'ノーザンダンサー系',
    spStType: null,
  },
  {
    name: 'カーリアン系',
    lineageType: 'child',
    parentName: 'ノーザンダンサー系',
    spStType: 'ST',
  },
  {
    name: 'フェアリーキング系',
    lineageType: 'child',
    parentName: 'ノーザンダンサー系',
    spStType: 'SP',
  },

  // ===== 子系統: ミスタープロスペクター系 =====
  {
    name: 'ミスタープロスペクター直系',
    lineageType: 'child',
    parentName: 'ミスタープロスペクター系',
    spStType: null,
  },
  {
    name: 'フォーティナイナー系',
    lineageType: 'child',
    parentName: 'ミスタープロスペクター系',
    spStType: 'SP',
  },
  {
    name: 'キングマンボ系',
    lineageType: 'child',
    parentName: 'ミスタープロスペクター系',
    spStType: null,
  },
  {
    name: 'ゴーンウエスト系',
    lineageType: 'child',
    parentName: 'ミスタープロスペクター系',
    spStType: 'SP',
  },
  {
    name: 'ファピアノ系',
    lineageType: 'child',
    parentName: 'ミスタープロスペクター系',
    spStType: 'SP',
  },

  // ===== 子系統: ネイティヴダンサー系 =====
  {
    name: 'ネイティヴダンサー直系',
    lineageType: 'child',
    parentName: 'ネイティヴダンサー系',
    spStType: null,
  },
  {
    name: 'レイズアネイティヴ系',
    lineageType: 'child',
    parentName: 'ネイティヴダンサー系',
    spStType: 'SP',
  },

  // ===== 子系統: サンデーサイレンス系 =====
  {
    name: 'サンデーサイレンス直系',
    lineageType: 'child',
    parentName: 'サンデーサイレンス系',
    spStType: null,
  },
  {
    name: 'ディープインパクト系',
    lineageType: 'child',
    parentName: 'サンデーサイレンス系',
    spStType: 'SP',
  },
  {
    name: 'ステイゴールド系',
    lineageType: 'child',
    parentName: 'サンデーサイレンス系',
    spStType: 'ST',
  },
  {
    name: 'ハーツクライ系',
    lineageType: 'child',
    parentName: 'サンデーサイレンス系',
    spStType: 'ST',
  },
  {
    name: 'ダイワメジャー系',
    lineageType: 'child',
    parentName: 'サンデーサイレンス系',
    spStType: 'SP',
  },
  {
    name: 'マンハッタンカフェ系',
    lineageType: 'child',
    parentName: 'サンデーサイレンス系',
    spStType: 'ST',
  },

  // ===== 子系統: ロイヤルチャージャー系 =====
  {
    name: 'ロイヤルチャージャー直系',
    lineageType: 'child',
    parentName: 'ロイヤルチャージャー系',
    spStType: null,
  },

  // ===== 子系統: ヘロド系 =====
  { name: 'ヘロド直系', lineageType: 'child', parentName: 'ヘロド系', spStType: null },
  { name: 'トウルビヨン系', lineageType: 'child', parentName: 'ヘロド系', spStType: 'ST' },

  // ===== 子系統: マッチェム系 =====
  { name: 'マッチェム直系', lineageType: 'child', parentName: 'マッチェム系', spStType: null },
  { name: 'マンノウォー系', lineageType: 'child', parentName: 'マッチェム系', spStType: 'ST' },

  // ===== 子系統: セントサイモン系 =====
  {
    name: 'セントサイモン直系',
    lineageType: 'child',
    parentName: 'セントサイモン系',
    spStType: null,
  },
  {
    name: 'リボー系',
    lineageType: 'child',
    parentName: 'セントサイモン系',
    spStType: 'ST',
  },

  // ===== 子系統: ハンプトン系 =====
  { name: 'ハンプトン直系', lineageType: 'child', parentName: 'ハンプトン系', spStType: null },

  // ===== 子系統: スウィンフォード系 =====
  {
    name: 'スウィンフォード直系',
    lineageType: 'child',
    parentName: 'スウィンフォード系',
    spStType: null,
  },

  // ===== 子系統: ファラリス系 =====
  { name: 'ファラリス直系', lineageType: 'child', parentName: 'ファラリス系', spStType: null },

  // ===== 子系統: ヒムヤー系 =====
  { name: 'ヒムヤー直系', lineageType: 'child', parentName: 'ヒムヤー系', spStType: null },
];

/**
 * プリセット系統データを DB に投入する。
 * INSERT OR IGNORE で冪等性を担保。
 */
export async function seedPresetLineages(db: DatabaseConnection): Promise<void> {
  const parents = presetLineages.filter((l) => l.lineageType === 'parent');
  const children = presetLineages.filter((l) => l.lineageType === 'child');

  // Insert parent lineages first
  for (const p of parents) {
    await db.run(
      'INSERT OR IGNORE INTO lineages (name, lineage_type, sp_st_type) VALUES (?, ?, ?)',
      [p.name, p.lineageType, p.spStType ?? null],
    );
  }

  // Insert child lineages with parent reference
  for (const c of children) {
    const parent = await db.get<{ id: number }>('SELECT id FROM lineages WHERE name = ?', [
      c.parentName,
    ]);
    await db.run(
      'INSERT OR IGNORE INTO lineages (name, lineage_type, parent_lineage_id, sp_st_type) VALUES (?, ?, ?, ?)',
      [c.name, c.lineageType, parent?.id ?? null, c.spStType ?? null],
    );
  }
}
