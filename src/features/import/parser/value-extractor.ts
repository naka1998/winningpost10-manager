/** "83(82)" → 83 */
export function extractSpValue(raw: string): number | null {
  if (!raw) return null;
  const match = raw.match(/^(\d+)\(/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/** "S+(0)" → { rank: "S+", value: 0 } */
export function extractRankAndValue(raw: string): { rank: string; value: number } | null {
  if (!raw) return null;
  const match = raw.match(/^([A-GS][+]?)\((\d+)\)$/);
  if (!match) return null;
  return { rank: match[1], value: parseInt(match[2], 10) };
}

/** "1100～2000m" → { min: 1100, max: 2000 } */
export function extractDistanceRange(raw: string): { min: number; max: number } | null {
  if (!raw) return null;
  const match = raw.match(/^(\d+)～(\d+)m$/);
  if (!match) return null;
  return { min: parseInt(match[1], 10), max: parseInt(match[2], 10) };
}

/** "(外)ジンショウドウ" → "ジンショウドウ" */
export function cleanHorseName(raw: string): string {
  return raw
    .trim()
    .replace(/^\(外\)/, '')
    .trim();
}

/** "大舞台 鉄砲 牡馬混合 直一気" → ["大舞台","鉄砲","牡馬混合","直一気"] */
export function extractTraits(raw: string): string[] | null {
  if (!raw.trim()) return null;
  const traits = raw.split(/\s+/).filter(Boolean);
  return traits.length > 0 ? traits : null;
}

/** age string + importYear → birthYear */
export function ageToBirthYear(ageStr: string, importYear: number): number | null {
  if (!ageStr) return null;
  const age = parseInt(ageStr, 10);
  if (isNaN(age)) return null;
  return importYear - age;
}

/** "" → false, any non-empty string → true */
export function extractIsHistorical(raw: string): boolean {
  return raw.trim() !== '';
}
