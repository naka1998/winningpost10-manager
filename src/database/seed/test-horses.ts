import type { DatabaseConnection } from '../connection';

/**
 * テスト用の馬データを投入する。
 * 10頭の馬（祖先馬含む）と年度別ステータスを作成する。
 */
export async function seedTestHorses(db: DatabaseConnection): Promise<number> {
  return db.transaction(async (conn) => {
    // 系統IDを名前で引く
    async function getLineageId(name: string): Promise<number | null> {
      const row = await conn.get<{ id: number }>('SELECT id FROM lineages WHERE name = ?', [name]);
      return row?.id ?? null;
    }

    const deepImpactLineage = await getLineageId('ディープインパクト系');
    const kingKameLineage = await getLineageId('キングカメハメハ系');
    const lordKaguraLineage = await getLineageId('ロードカナロア系');
    const heartsCryLineage = await getLineageId('ハーツクライ系');
    const stayGoldLineage = await getLineageId('ステイゴールド系');

    // 祖先馬（父・母）を先に作成
    const sires = [
      { name: 'ディープインパクト', sex: '牡', country: '日', lineageId: deepImpactLineage },
      { name: 'キングカメハメハ', sex: '牡', country: '日', lineageId: kingKameLineage },
      { name: 'ロードカナロア', sex: '牡', country: '日', lineageId: lordKaguraLineage },
      { name: 'ハーツクライ', sex: '牡', country: '日', lineageId: heartsCryLineage },
      { name: 'オルフェーヴル', sex: '牡', country: '日', lineageId: stayGoldLineage },
    ];

    const dams = [
      { name: 'ウインドインハーヘア', sex: '牝', country: '日' },
      { name: 'マンファス', sex: '牝', country: '日' },
      { name: 'レディブロンド', sex: '牝', country: '日' },
      { name: 'シーザリオ', sex: '牝', country: '日' },
      { name: 'オリエンタルアート', sex: '牝', country: '日' },
    ];

    const sireIds: number[] = [];
    for (const s of sires) {
      const result = await conn.run(
        "INSERT INTO horses (name, sex, country, status, lineage_id, is_historical) VALUES (?, ?, ?, 'ancestor', ?, 1)",
        [s.name, s.sex, s.country, s.lineageId],
      );
      sireIds.push(result.lastInsertRowId);
    }

    const damIds: number[] = [];
    for (const d of dams) {
      const result = await conn.run(
        "INSERT INTO horses (name, sex, country, status, is_historical) VALUES (?, ?, ?, 'ancestor', 1)",
        [d.name, d.sex, d.country],
      );
      damIds.push(result.lastInsertRowId);
    }

    // 現役馬・繁殖馬データ
    const horses = [
      {
        name: 'コントレイル',
        sex: '牡',
        birthYear: 2017,
        country: '日',
        status: '種牡馬',
        sireIdx: 0,
        damIdx: 2,
        lineageId: deepImpactLineage,
        factors: ['大舞台', 'スピード'],
        mareLine: null,
      },
      {
        name: 'イクイノックス',
        sex: '牡',
        birthYear: 2019,
        country: '日',
        status: '種牡馬',
        sireIdx: 1,
        damIdx: 3,
        lineageId: kingKameLineage,
        factors: ['スピード', 'パワー'],
        mareLine: null,
      },
      {
        name: 'リバティアイランド',
        sex: '牝',
        birthYear: 2020,
        country: '日',
        status: '繁殖牝馬',
        sireIdx: 0,
        damIdx: 1,
        lineageId: deepImpactLineage,
        factors: ['スピード'],
        mareLine: null,
      },
      {
        name: 'ドウデュース',
        sex: '牡',
        birthYear: 2019,
        country: '日',
        status: '現役',
        sireIdx: 3,
        damIdx: 4,
        lineageId: heartsCryLineage,
        factors: ['根幹距離', 'スタミナ'],
        mareLine: null,
      },
      {
        name: 'スターズオンアース',
        sex: '牝',
        birthYear: 2019,
        country: '日',
        status: '繁殖牝馬',
        sireIdx: 0,
        damIdx: 0,
        lineageId: deepImpactLineage,
        factors: ['スピード'],
        mareLine: null,
      },
      {
        name: 'タスティエーラ',
        sex: '牡',
        birthYear: 2020,
        country: '日',
        status: '現役',
        sireIdx: 2,
        damIdx: 1,
        lineageId: lordKaguraLineage,
        factors: ['パワー', 'スピード'],
        mareLine: null,
      },
      {
        name: 'ソールオリエンス',
        sex: '牡',
        birthYear: 2020,
        country: '日',
        status: '現役',
        sireIdx: 1,
        damIdx: 4,
        lineageId: kingKameLineage,
        factors: ['スタミナ'],
        mareLine: null,
      },
      {
        name: 'レガレイラ',
        sex: '牝',
        birthYear: 2021,
        country: '日',
        status: '現役',
        sireIdx: 2,
        damIdx: 3,
        lineageId: lordKaguraLineage,
        factors: ['大舞台', 'スピード'],
        mareLine: null,
      },
      {
        name: 'ジャスティンミラノ',
        sex: '牡',
        birthYear: 2021,
        country: '日',
        status: '現役',
        sireIdx: 1,
        damIdx: 2,
        lineageId: kingKameLineage,
        factors: ['スピード'],
        mareLine: null,
      },
      {
        name: 'アーバンシック',
        sex: '牡',
        birthYear: 2021,
        country: '日',
        status: '現役',
        sireIdx: 4,
        damIdx: 0,
        lineageId: stayGoldLineage,
        factors: ['スタミナ', 'パワー'],
        mareLine: null,
      },
    ];

    const horseIds: number[] = [];
    for (const h of horses) {
      const result = await conn.run(
        'INSERT INTO horses (name, sex, birth_year, country, status, sire_id, dam_id, lineage_id, factors, is_historical) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
        [
          h.name,
          h.sex,
          h.birthYear,
          h.country,
          h.status,
          sireIds[h.sireIdx],
          damIds[h.damIdx],
          h.lineageId,
          JSON.stringify(h.factors),
        ],
      );
      horseIds.push(result.lastInsertRowId);
    }

    // 年度別ステータス
    const statuses = [
      {
        idx: 0,
        year: 2025,
        sp: 'S',
        spV: 3,
        pow: 'A+',
        powV: 8,
        inst: 'A',
        instV: 12,
        sta: 'A',
        staV: 10,
        men: 'B+',
        menV: 15,
        wis: 'A',
        wisV: 11,
        turf: '◎',
        dirt: '○',
        dMin: 1800,
        dMax: 2400,
        growth: '普通',
        style: ['先行'],
        record: '11-8-1-0',
      },
      {
        idx: 1,
        year: 2025,
        sp: 'S+',
        spV: 0,
        pow: 'S',
        powV: 2,
        inst: 'A+',
        instV: 6,
        sta: 'A+',
        staV: 7,
        men: 'A',
        menV: 10,
        wis: 'S',
        wisV: 1,
        turf: '◎',
        dirt: '△',
        dMin: 1600,
        dMax: 2500,
        growth: '普通',
        style: ['先行', '差'],
        record: '10-8-0-0',
      },
      {
        idx: 2,
        year: 2025,
        sp: 'S',
        spV: 4,
        pow: 'A',
        powV: 11,
        inst: 'A+',
        instV: 8,
        sta: 'A',
        staV: 12,
        men: 'A',
        menV: 13,
        wis: 'A+',
        wisV: 9,
        turf: '◎',
        dirt: '△',
        dMin: 1400,
        dMax: 2400,
        growth: '早熟',
        style: ['差'],
        record: '8-6-1-0',
      },
      {
        idx: 3,
        year: 2025,
        sp: 'A+',
        spV: 7,
        pow: 'A+',
        powV: 6,
        inst: 'A',
        instV: 14,
        sta: 'S',
        staV: 3,
        men: 'A+',
        menV: 8,
        wis: 'A',
        wisV: 14,
        turf: '◎',
        dirt: '○',
        dMin: 1800,
        dMax: 3000,
        growth: '遅咲',
        style: ['差', '追込'],
        record: '14-7-2-1',
      },
      {
        idx: 4,
        year: 2025,
        sp: 'A+',
        spV: 9,
        pow: 'A',
        powV: 13,
        inst: 'A',
        instV: 15,
        sta: 'A',
        staV: 14,
        men: 'B+',
        menV: 16,
        wis: 'A',
        wisV: 12,
        turf: '◎',
        dirt: '△',
        dMin: 1600,
        dMax: 2400,
        growth: '普通',
        style: ['先行'],
        record: '9-5-2-0',
      },
      {
        idx: 5,
        year: 2025,
        sp: 'A',
        spV: 12,
        pow: 'A+',
        powV: 7,
        inst: 'A',
        instV: 10,
        sta: 'A+',
        staV: 8,
        men: 'A',
        menV: 11,
        wis: 'B+',
        wisV: 17,
        turf: '◎',
        dirt: '○',
        dMin: 1800,
        dMax: 2600,
        growth: '普通',
        style: ['先行'],
        record: '7-3-1-1',
      },
      {
        idx: 6,
        year: 2025,
        sp: 'A',
        spV: 14,
        pow: 'A',
        powV: 12,
        inst: 'B+',
        instV: 18,
        sta: 'A+',
        staV: 6,
        men: 'A',
        menV: 10,
        wis: 'A',
        wisV: 13,
        turf: '◎',
        dirt: '△',
        dMin: 2000,
        dMax: 2800,
        growth: '普通',
        style: ['差'],
        record: '7-3-2-0',
      },
      {
        idx: 7,
        year: 2025,
        sp: 'A+',
        spV: 8,
        pow: 'A',
        powV: 10,
        inst: 'A+',
        instV: 7,
        sta: 'A',
        staV: 11,
        men: 'A+',
        menV: 9,
        wis: 'A',
        wisV: 10,
        turf: '◎',
        dirt: '○',
        dMin: 1600,
        dMax: 2500,
        growth: '普通',
        style: ['差', '追込'],
        record: '6-4-1-0',
      },
      {
        idx: 8,
        year: 2025,
        sp: 'A+',
        spV: 6,
        pow: 'A',
        powV: 14,
        inst: 'A',
        instV: 11,
        sta: 'A',
        staV: 13,
        men: 'A',
        menV: 12,
        wis: 'B+',
        wisV: 16,
        turf: '◎',
        dirt: '△',
        dMin: 1600,
        dMax: 2000,
        growth: '早熟',
        style: ['先行'],
        record: '5-3-1-0',
      },
      {
        idx: 9,
        year: 2025,
        sp: 'A',
        spV: 13,
        pow: 'A',
        powV: 11,
        inst: 'A',
        instV: 12,
        sta: 'A+',
        staV: 5,
        men: 'B+',
        menV: 17,
        wis: 'A',
        wisV: 14,
        turf: '◎',
        dirt: '△',
        dMin: 2000,
        dMax: 3000,
        growth: '遅咲',
        style: ['差'],
        record: '5-2-2-0',
      },
    ];

    // --- ドウデュース・アーバンシック 5世代血統データ ---
    // ドウデュースの母を実データに修正（オリエンタルアート→ダストアンドダイヤモンズ）
    // アーバンシックの父母を実データに修正（オルフェーヴル→スワーヴリチャード、ウインドインハーヘア→エッジースタイル）

    async function insertAnc(
      name: string,
      sex: string,
      country: string,
      birthYear: number | null = null,
      sireId: number | null = null,
      damId: number | null = null,
      lineageId: number | null = null,
    ): Promise<number> {
      const result = await conn.run(
        "INSERT INTO horses (name, sex, country, birth_year, status, sire_id, dam_id, lineage_id, is_historical) VALUES (?, ?, ?, ?, 'ancestor', ?, ?, ?, 1)",
        [name, sex, country, birthYear, sireId, damId, lineageId],
      );
      return result.lastInsertRowId;
    }

    // 系統ID取得
    const ssLineage = await getLineageId('サンデーサイレンス直系');
    const htrLineage = await getLineageId('ヘイルトゥリーズン系');
    const gsLineage = await getLineageId('グレイソヴリン系');
    const lyphardLineage = await getLineageId('リファール系');
    const mrpLineage = await getLineageId('ミスタープロスペクター直系');
    const gwLineage = await getLineageId('ゴーンウエスト系');
    const brLineage = await getLineageId('ボールドルーラー系');
    const danzigLineage = await getLineageId('ダンジグ系');
    const fappianoLineage = await getLineageId('ファピアノ系');

    // ===== 5代前（Gen 5）- 葉ノード =====
    // ドウデュース父系
    const hailToReasonId = await insertAnc('Hail To Reason', '牡', '米');
    const cosmahId = await insertAnc('Cosmah', '牝', '米');
    const understandingId = await insertAnc('Understanding', '牡', '米');
    const mountainFlowerId = await insertAnc('Mountain Flower', '牝', '米');
    const kamparaId = await insertAnc('カンパラ', '牡', '欧');
    const severnBridgeId = await insertAnc('Severn Bridge', '牝', '欧');
    const lyphardId = await insertAnc('Lyphard', '牡', '米', null, null, null, lyphardLineage);
    const myBupersId = await insertAnc('My Bupers', '牝', '米');
    // ドウデュース母系
    const boldReasoningId = await insertAnc('Bold Reasoning', '牡', '米');
    const myCharmerId = await insertAnc('My Charmer', '牝', '米');
    const strawberryRoadId = await insertAnc('Strawberry Road', '牡', '米');
    const prettyReasonId = await insertAnc('Pretty Reason', '牝', '米');
    const mrProspectorId = await insertAnc(
      'Mr. Prospector',
      '牡',
      '米',
      null,
      null,
      null,
      mrpLineage,
    );
    const secrettameId = await insertAnc('Secrettame', '牝', '米');
    const darlingLadyId = await insertAnc('Darling Lady', '牝', '米');
    // アーバンシック父母系
    const unbridledId = await insertAnc('Unbridled', '牡', '米');
    const trolleySongId = await insertAnc('Trolley Song', '牝', '米');
    const generalMeetingId = await insertAnc('General Meeting', '牡', '米');
    const riverOfStarsId = await insertAnc('River Of Stars', '牝', '米');
    // アーバンシック母系
    const deinhillId = await insertAnc('デインヒル', '牡', '欧', null, null, null, danzigLineage);
    const hasiliId = await insertAnc('Hasili', '牝', '欧');
    const beringId = await insertAnc('Bering', '牡', '欧');
    const guapaId = await insertAnc('Guapa', '牝', '欧');
    const dancingKeyId = await insertAnc('ダンシングキイ', '牝', '日');
    const alzaoId = await insertAnc('Alzao', '牡', '欧');
    const burghclereId = await insertAnc('Burghclere', '牝', '欧');

    // ===== 4代前（Gen 4） =====
    // ドウデュース父系
    const haloId = await insertAnc('Halo', '牡', '米', 1969, hailToReasonId, cosmahId, htrLineage);
    const wishingWellId = await insertAnc(
      'Wishing Well',
      '牝',
      '米',
      1975,
      understandingId,
      mountainFlowerId,
    );
    const tonyBinId = await insertAnc(
      'トニービン',
      '牡',
      '欧',
      1983,
      kamparaId,
      severnBridgeId,
      gsLineage,
    );
    const beauperDanceId = await insertAnc(
      'ビューパーダンス',
      '牝',
      '欧',
      1983,
      lyphardId,
      myBupersId,
    );
    // ドウデュース母系
    const seattleSlewId = await insertAnc(
      'Seattle Slew',
      '牡',
      '米',
      1974,
      boldReasoningId,
      myCharmerId,
      brLineage,
    );
    const strawberryReasonId = await insertAnc(
      'Strawberry Reason',
      '牝',
      '米',
      1992,
      strawberryRoadId,
      prettyReasonId,
    );
    const goneWestId = await insertAnc(
      'Gone West',
      '牡',
      '米',
      1984,
      mrProspectorId,
      secrettameId,
      gwLineage,
    );
    const darlingDameId = await insertAnc(
      'Darling Dame',
      '牝',
      '米',
      1989,
      lyphardId,
      darlingLadyId,
    );
    // アーバンシック父母系
    const unbridledsSongId = await insertAnc(
      "Unbridled's Song",
      '牡',
      '米',
      1993,
      unbridledId,
      trolleySongId,
      fappianoLineage,
    );
    const careerCollectionId = await insertAnc(
      'キャリアコレクション',
      '牝',
      '米',
      1995,
      generalMeetingId,
      riverOfStarsId,
    );
    // アーバンシック母系
    const dansiliId = await insertAnc(
      'Dansili',
      '牡',
      '欧',
      1996,
      deinhillId,
      hasiliId,
      danzigLineage,
    );
    const penangPearlId = await insertAnc('Penang Pearl', '牝', '欧', 1996, beringId, guapaId);

    // ===== 3代前（Gen 3） =====
    // 共通祖先: サンデーサイレンス（ドウデュース3代前 & アーバンシック4代前 via ダンスインザダーク）
    const sundaySilenceId = await insertAnc(
      'サンデーサイレンス',
      '牡',
      '米',
      1986,
      haloId,
      wishingWellId,
      ssLineage,
    );
    const irishDanceId = await insertAnc(
      'アイリッシュダンス',
      '牝',
      '日',
      1990,
      tonyBinId,
      beauperDanceId,
    );
    // ドウデュース母系
    const vindicationId = await insertAnc(
      'Vindication',
      '牡',
      '米',
      2000,
      seattleSlewId,
      strawberryReasonId,
    );
    const majesticallyId = await insertAnc(
      'Majestically',
      '牝',
      '米',
      2002,
      goneWestId,
      darlingDameId,
    );
    // アーバンシック父母系
    const piramimaId = await insertAnc(
      'ピラミマ',
      '牝',
      '米',
      2005,
      unbridledsSongId,
      careerCollectionId,
    );
    // アーバンシック母系（ダンスインザダーク: 父=サンデーサイレンス）
    const danceInTheDarkId = await insertAnc(
      'ダンスインザダーク',
      '牡',
      '日',
      1993,
      sundaySilenceId,
      dancingKeyId,
    );
    const harbingerId = await insertAnc(
      'ハービンジャー',
      '牡',
      '欧',
      2006,
      dansiliId,
      penangPearlId,
    );

    // ===== 2代前（Gen 2） - 既存馬の更新 & 新規作成 =====
    // ハーツクライに親情報を追加
    await conn.run('UPDATE horses SET birth_year = ?, sire_id = ?, dam_id = ? WHERE id = ?', [
      2001,
      sundaySilenceId,
      irishDanceId,
      sireIds[3],
    ]);
    // ウインドインハーヘアに親情報を追加
    await conn.run('UPDATE horses SET birth_year = ?, sire_id = ?, dam_id = ? WHERE id = ?', [
      1991,
      alzaoId,
      burghclereId,
      damIds[0],
    ]);

    // ドウデュースの母: ダストアンドダイヤモンズ
    const dustAndDiamondsId = await insertAnc(
      'ダストアンドダイヤモンズ',
      '牝',
      '米',
      2008,
      vindicationId,
      majesticallyId,
    );
    // アーバンシック母系: ランズエッジ（母=ウインドインハーヘア）
    const landsEdgeId = await insertAnc(
      'ランズエッジ',
      '牝',
      '日',
      2006,
      danceInTheDarkId,
      damIds[0],
    );

    // ===== 1代前（Gen 1） =====
    // アーバンシックの父: スワーヴリチャード
    const swaverRichardId = await insertAnc(
      'スワーヴリチャード',
      '牡',
      '日',
      2014,
      sireIds[3],
      piramimaId,
      heartsCryLineage,
    );
    // アーバンシックの母: エッジースタイル
    const edgyStyleId = await insertAnc(
      'エッジースタイル',
      '牝',
      '日',
      2013,
      harbingerId,
      landsEdgeId,
    );

    // ===== ドウデュース・アーバンシックの親を実データに更新 =====
    // ドウデュース（horses[3]）: 母をダストアンドダイヤモンズに変更
    await conn.run('UPDATE horses SET dam_id = ? WHERE id = ?', [dustAndDiamondsId, horseIds[3]]);
    // アーバンシック（horses[9]）: 父をスワーヴリチャード、母をエッジースタイルに変更
    await conn.run('UPDATE horses SET sire_id = ?, dam_id = ? WHERE id = ?', [
      swaverRichardId,
      edgyStyleId,
      horseIds[9],
    ]);

    for (const s of statuses) {
      await conn.run(
        `INSERT INTO yearly_statuses (
          horse_id, year, sp_rank, sp_value, power_rank, power_value,
          instant_rank, instant_value, stamina_rank, stamina_value,
          mental_rank, mental_value, wisdom_rank, wisdom_value,
          turf_aptitude, dirt_aptitude, distance_min, distance_max,
          growth_type, running_style, race_record
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          horseIds[s.idx],
          s.year,
          s.sp,
          s.spV,
          s.pow,
          s.powV,
          s.inst,
          s.instV,
          s.sta,
          s.staV,
          s.men,
          s.menV,
          s.wis,
          s.wisV,
          s.turf,
          s.dirt,
          s.dMin,
          s.dMax,
          s.growth,
          JSON.stringify(s.style),
          s.record,
        ],
      );
    }

    // ===== 繁殖牝馬評価画面用テストデータ =====

    // 既存繁殖牝馬にmare_lineを設定
    // リバティアイランド(horses[2]), スターズオンアース(horses[4])
    await conn.run("UPDATE horses SET mare_line = 'フロリースカップ系' WHERE id = ?", [
      horseIds[2],
    ]);
    await conn.run("UPDATE horses SET mare_line = 'ビューチフルドリーマー系' WHERE id = ?", [
      horseIds[4],
    ]);

    // 追加の繁殖牝馬4頭
    const broodmares = [
      {
        name: 'クロノジェネシス',
        sex: '牝',
        birthYear: 2016,
        country: '日',
        sireIdx: 4, // オルフェーヴル
        damIdx: 1, // マンファス
        lineageId: stayGoldLineage,
        mareLine: 'パシフィカス系',
      },
      {
        name: 'グランアレグリア',
        sex: '牝',
        birthYear: 2016,
        country: '日',
        sireIdx: 0, // ディープインパクト
        damIdx: 3, // シーザリオ
        lineageId: deepImpactLineage,
        mareLine: 'フロリースカップ系',
      },
      {
        name: 'デアリングタクト',
        sex: '牝',
        birthYear: 2017,
        country: '日',
        sireIdx: 4, // オルフェーヴル
        damIdx: 0, // ウインドインハーヘア
        lineageId: stayGoldLineage,
        mareLine: 'ダイナカール系',
      },
      {
        name: 'ソダシ',
        sex: '牝',
        birthYear: 2018,
        country: '日',
        sireIdx: 1, // キングカメハメハ
        damIdx: 2, // レディブロンド
        lineageId: kingKameLineage,
        mareLine: 'ビューチフルドリーマー系',
      },
    ];

    const broodmareIds: number[] = [];
    for (const bm of broodmares) {
      const result = await conn.run(
        "INSERT INTO horses (name, sex, birth_year, country, status, sire_id, dam_id, lineage_id, mare_line, is_historical) VALUES (?, ?, ?, ?, '繁殖牝馬', ?, ?, ?, ?, 0)",
        [
          bm.name,
          bm.sex,
          bm.birthYear,
          bm.country,
          sireIds[bm.sireIdx],
          damIds[bm.damIdx],
          bm.lineageId,
          bm.mareLine,
        ],
      );
      broodmareIds.push(result.lastInsertRowId);
    }

    // 繁殖牝馬のグレード付きyearly_statuses（現役時代の実績）
    const broodmareStatuses = [
      // リバティアイランド: G1馬
      { horseId: horseIds[2], year: 2023, grade: 'G1', record: '6-5-0-0' },
      { horseId: horseIds[2], year: 2024, grade: 'G1', record: '8-6-1-0' },
      // スターズオンアース: G1馬
      { horseId: horseIds[4], year: 2022, grade: 'G1', record: '5-3-1-0' },
      { horseId: horseIds[4], year: 2023, grade: 'G2', record: '8-4-2-1' },
      // クロノジェネシス: G1馬
      { horseId: broodmareIds[0], year: 2020, grade: 'G1', record: '7-5-1-0' },
      { horseId: broodmareIds[0], year: 2021, grade: 'G1', record: '11-7-2-1' },
      // グランアレグリア: G1馬
      { horseId: broodmareIds[1], year: 2020, grade: 'G1', record: '6-5-0-0' },
      { horseId: broodmareIds[1], year: 2021, grade: 'G1', record: '10-8-1-0' },
      // デアリングタクト: G1馬
      { horseId: broodmareIds[2], year: 2020, grade: 'G1', record: '5-5-0-0' },
      { horseId: broodmareIds[2], year: 2021, grade: 'G2', record: '8-5-2-1' },
      // ソダシ: G1馬
      { horseId: broodmareIds[3], year: 2021, grade: 'G1', record: '5-4-0-0' },
      { horseId: broodmareIds[3], year: 2022, grade: 'G3', record: '9-5-2-1' },
    ];

    for (const bs of broodmareStatuses) {
      await conn.run(
        'INSERT INTO yearly_statuses (horse_id, year, grade, race_record) VALUES (?, ?, ?, ?)',
        [bs.horseId, bs.year, bs.grade, bs.record],
      );
    }

    // 産駒データ: 繁殖牝馬ごとに2〜4頭
    const offspringData = [
      // リバティアイランドの産駒 (horses[2])
      {
        name: 'リバティスター',
        sex: '牡',
        birthYear: 2024,
        damId: horseIds[2],
        sireIdx: 0, // ディープインパクト
        status: '現役',
        lineageId: deepImpactLineage,
      },
      {
        name: 'リバティクイーン',
        sex: '牝',
        birthYear: 2025,
        damId: horseIds[2],
        sireIdx: 1, // キングカメハメハ
        status: '現役',
        lineageId: kingKameLineage,
      },
      // スターズオンアースの産駒 (horses[4])
      {
        name: 'スターライトソング',
        sex: '牡',
        birthYear: 2023,
        damId: horseIds[4],
        sireIdx: 1, // キングカメハメハ
        status: '現役',
        lineageId: kingKameLineage,
      },
      {
        name: 'スターダスト',
        sex: '牝',
        birthYear: 2024,
        damId: horseIds[4],
        sireIdx: 2, // ロードカナロア
        status: '現役',
        lineageId: lordKaguraLineage,
      },
      {
        name: 'スターオブホープ',
        sex: '牡',
        birthYear: 2025,
        damId: horseIds[4],
        sireIdx: 0, // ディープインパクト
        status: '現役',
        lineageId: deepImpactLineage,
      },
      // クロノジェネシスの産駒
      {
        name: 'クロノスフィア',
        sex: '牡',
        birthYear: 2023,
        damId: broodmareIds[0],
        sireIdx: 0, // ディープインパクト
        status: '現役',
        lineageId: deepImpactLineage,
      },
      {
        name: 'クロノレガシー',
        sex: '牝',
        birthYear: 2024,
        damId: broodmareIds[0],
        sireIdx: 1, // キングカメハメハ
        status: '現役',
        lineageId: kingKameLineage,
      },
      {
        name: 'クロノブレイブ',
        sex: '牡',
        birthYear: 2025,
        damId: broodmareIds[0],
        sireIdx: 2, // ロードカナロア
        status: '現役',
        lineageId: lordKaguraLineage,
      },
      // グランアレグリアの産駒
      {
        name: 'グランフィナーレ',
        sex: '牡',
        birthYear: 2023,
        damId: broodmareIds[1],
        sireIdx: 1, // キングカメハメハ
        status: '引退',
        lineageId: kingKameLineage,
      },
      {
        name: 'グランブリリアント',
        sex: '牝',
        birthYear: 2024,
        damId: broodmareIds[1],
        sireIdx: 0, // ディープインパクト
        status: '現役',
        lineageId: deepImpactLineage,
      },
      {
        name: 'グランマジック',
        sex: '牡',
        birthYear: 2025,
        damId: broodmareIds[1],
        sireIdx: 3, // ハーツクライ
        status: '現役',
        lineageId: heartsCryLineage,
      },
      // デアリングタクトの産駒
      {
        name: 'デアリングスピリット',
        sex: '牝',
        birthYear: 2023,
        damId: broodmareIds[2],
        sireIdx: 0, // ディープインパクト
        status: '現役',
        lineageId: deepImpactLineage,
      },
      {
        name: 'デアリングソウル',
        sex: '牡',
        birthYear: 2024,
        damId: broodmareIds[2],
        sireIdx: 2, // ロードカナロア
        status: '現役',
        lineageId: lordKaguraLineage,
      },
      // ソダシの産駒
      {
        name: 'ソダシスノー',
        sex: '牝',
        birthYear: 2023,
        damId: broodmareIds[3],
        sireIdx: 0, // ディープインパクト
        status: '引退',
        lineageId: deepImpactLineage,
      },
      {
        name: 'ソダシブリーズ',
        sex: '牡',
        birthYear: 2024,
        damId: broodmareIds[3],
        sireIdx: 3, // ハーツクライ
        status: '現役',
        lineageId: heartsCryLineage,
      },
      {
        name: 'ソダシブルーム',
        sex: '牝',
        birthYear: 2025,
        damId: broodmareIds[3],
        sireIdx: 1, // キングカメハメハ
        status: '現役',
        lineageId: kingKameLineage,
      },
      {
        name: 'ソダシドリーム',
        sex: '牡',
        birthYear: 2026,
        damId: broodmareIds[3],
        sireIdx: 4, // オルフェーヴル
        status: '現役',
        lineageId: stayGoldLineage,
      },
    ];

    const offspringIds: number[] = [];
    for (const o of offspringData) {
      const result = await conn.run(
        'INSERT INTO horses (name, sex, birth_year, country, status, dam_id, sire_id, lineage_id, is_historical) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
        [o.name, o.sex, o.birthYear, '日', o.status, o.damId, sireIds[o.sireIdx], o.lineageId],
      );
      offspringIds.push(result.lastInsertRowId);
    }

    // 産駒のグレード（一部の産駒に実績をつける）
    const offspringGrades = [
      { idx: 0, year: 2026, grade: 'G2', record: '4-3-0-0' }, // リバティスター
      { idx: 2, year: 2025, grade: 'G1', record: '6-4-1-0' }, // スターライトソング
      { idx: 2, year: 2026, grade: 'G1', record: '9-6-1-1' },
      { idx: 3, year: 2026, grade: 'G3', record: '3-2-0-0' }, // スターダスト
      { idx: 5, year: 2025, grade: 'G2', record: '5-3-1-0' }, // クロノスフィア
      { idx: 5, year: 2026, grade: 'G1', record: '8-5-2-0' },
      { idx: 8, year: 2025, grade: 'G3', record: '5-2-1-1' }, // グランフィナーレ
      { idx: 9, year: 2026, grade: 'G2', record: '3-2-0-0' }, // グランブリリアント
      { idx: 11, year: 2025, grade: 'G3', record: '4-2-1-0' }, // デアリングスピリット
      { idx: 13, year: 2025, grade: 'OP', record: '4-1-1-1' }, // ソダシスノー
      { idx: 14, year: 2026, grade: 'G3', record: '3-2-0-0' }, // ソダシブリーズ
    ];

    for (const og of offspringGrades) {
      await conn.run(
        'INSERT INTO yearly_statuses (horse_id, year, grade, race_record) VALUES (?, ?, ?, ?)',
        [offspringIds[og.idx], og.year, og.grade, og.record],
      );
    }

    // 配合記録: 繁殖牝馬 × 種牡馬の組み合わせ
    const breedingRecords = [
      // リバティアイランドの配合
      { mareId: horseIds[2], sireIdx: 0, year: 2023, eval: 'A', power: 85 },
      { mareId: horseIds[2], sireIdx: 1, year: 2024, eval: 'B', power: 70 },
      // スターズオンアースの配合
      { mareId: horseIds[4], sireIdx: 1, year: 2022, eval: 'S', power: 92 },
      { mareId: horseIds[4], sireIdx: 2, year: 2023, eval: 'A', power: 80 },
      { mareId: horseIds[4], sireIdx: 0, year: 2024, eval: 'A', power: 78 },
      // クロノジェネシスの配合
      { mareId: broodmareIds[0], sireIdx: 0, year: 2022, eval: 'A', power: 88 },
      { mareId: broodmareIds[0], sireIdx: 1, year: 2023, eval: 'A', power: 82 },
      { mareId: broodmareIds[0], sireIdx: 2, year: 2024, eval: 'B', power: 72 },
      // グランアレグリアの配合
      { mareId: broodmareIds[1], sireIdx: 1, year: 2022, eval: 'A', power: 86 },
      { mareId: broodmareIds[1], sireIdx: 0, year: 2023, eval: 'S', power: 95 },
      { mareId: broodmareIds[1], sireIdx: 3, year: 2024, eval: 'A', power: 84 },
      // デアリングタクトの配合
      { mareId: broodmareIds[2], sireIdx: 0, year: 2022, eval: 'B', power: 68 },
      { mareId: broodmareIds[2], sireIdx: 2, year: 2023, eval: 'A', power: 76 },
      // ソダシの配合
      { mareId: broodmareIds[3], sireIdx: 0, year: 2022, eval: 'A', power: 80 },
      { mareId: broodmareIds[3], sireIdx: 3, year: 2023, eval: 'B', power: 65 },
      { mareId: broodmareIds[3], sireIdx: 1, year: 2024, eval: 'A', power: 78 },
      { mareId: broodmareIds[3], sireIdx: 4, year: 2025, eval: 'A', power: 82 },
    ];

    for (const br of breedingRecords) {
      await conn.run(
        'INSERT INTO breeding_records (mare_id, sire_id, year, evaluation, total_power) VALUES (?, ?, ?, ?, ?)',
        [br.mareId, sireIds[br.sireIdx], br.year, br.eval, br.power],
      );
    }

    return horses.length + broodmares.length + offspringData.length;
  });
}
