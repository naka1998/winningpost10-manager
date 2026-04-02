import { describe, it, expect } from 'vitest';
import { buildColumnMap, HEADER_FIELD_MAP } from './column-mapper';

const REAL_HEADER =
  '馬名\t国\t年\t性\tSP\tST\tSP率\t力\t瞬\t勝\t柔\t精\t賢\t健\tサ\t芝\tダ\t芝質\t距離適性\t気\t脚質\t成型\t成力\t成度\t成限\t寿命\t調子\t疲労\t闘\t馬体重\t子出\t毛色\t性格\t高\t長\t跳\t小\t左\t右\t脚\t喉\t腰\t遅\t特性\t関係性効果\t父馬\t父系\t母馬\t牝系\t出走\t戦績\t前走\t次走\tクラス\t賞金\t本賞金\t生産国\t馬主\t牧場\t調教師\t騎手\t海外遠征\t現役\t史実\t史実番号\t能力番号\t馬番号\t継承特性\t馬名';

describe('HEADER_FIELD_MAP', () => {
  it('contains all 23 expected mappings', () => {
    expect(Object.keys(HEADER_FIELD_MAP)).toHaveLength(23);
  });

  it('maps 馬名 to name', () => {
    expect(HEADER_FIELD_MAP['馬名']).toBe('name');
  });

  it('maps 距離適性 to distance', () => {
    expect(HEADER_FIELD_MAP['距離適性']).toBe('distance');
  });

  it('maps 勝 to stamina', () => {
    expect(HEADER_FIELD_MAP['勝']).toBe('stamina');
  });
});

describe('buildColumnMap', () => {
  it('maps the full real header to correct indices', () => {
    const map = buildColumnMap(REAL_HEADER);
    expect(map.name).toBe(0);
    expect(map.country).toBe(1);
    expect(map.age).toBe(2);
    expect(map.sex).toBe(3);
    expect(map.sp).toBe(4);
    expect(map.power).toBe(7);
    expect(map.instant).toBe(8);
    expect(map.stamina).toBe(9);
    expect(map.mental).toBe(11);
    expect(map.wisdom).toBe(12);
    expect(map.turf).toBe(15);
    expect(map.dirt).toBe(16);
    expect(map.distance).toBe(18);
    expect(map.growthType).toBe(21);
    expect(map.runningStyle).toBe(20);
    expect(map.traits).toBe(43);
    expect(map.sireName).toBe(45);
    expect(map.sireLineage).toBe(46);
    expect(map.damName).toBe(47);
    expect(map.mareLine).toBe(48);
    expect(map.raceRecord).toBe(50);
    expect(map.jockey).toBe(60);
    expect(map.isHistorical).toBe(63);
  });

  it('assigns first 馬名 occurrence to name (not the duplicate last column)', () => {
    const map = buildColumnMap(REAL_HEADER);
    expect(map.name).toBe(0);
    // last column (index 68) is also 馬名 but should not override
  });

  it('returns -1 for columns not present in the header', () => {
    const map = buildColumnMap('馬名\t国\t年');
    expect(map.name).toBe(0);
    expect(map.country).toBe(1);
    expect(map.age).toBe(2);
    expect(map.sp).toBe(-1);
    expect(map.power).toBe(-1);
    expect(map.traits).toBe(-1);
  });
});
