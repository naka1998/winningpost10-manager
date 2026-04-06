import type { YearlyStatus } from '@/features/horses/types';
import type { DistanceBand, Surface } from './types';
import { DISTANCE_BAND_RANGES, GOOD_SURFACE_APTITUDES } from './types';

/** 馬場適性でフィルタ: 適性が△・×なら非表示。データなし(null)は表示 */
export function hasSurfaceAptitude(status: YearlyStatus | undefined, surface: Surface): boolean {
  if (!status) return true;
  const aptitude = surface === '芝' ? status.turfAptitude : status.dirtAptitude;
  if (!aptitude) return true;
  return GOOD_SURFACE_APTITUDES.includes(aptitude);
}

/** 距離適性でフィルタ: 馬の距離範囲と距離帯が重なるもののみ表示。データなし(null)は表示 */
export function hasDistanceAptitude(
  status: YearlyStatus | undefined,
  distanceBand: DistanceBand,
): boolean {
  if (!status) return true;
  const { distanceMin, distanceMax } = status;
  if (distanceMin === null || distanceMax === null) return true;
  const range = DISTANCE_BAND_RANGES[distanceBand];
  return distanceMin <= range.max && distanceMax >= range.min;
}
