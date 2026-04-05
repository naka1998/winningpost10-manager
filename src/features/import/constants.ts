import type { ImportStatus } from './service';
import type { ImportStep } from './store';

export function actionRowClass(action: string): string {
  switch (action) {
    case 'create':
      return 'bg-green-50/50 dark:bg-green-950/20';
    case 'update':
      return 'bg-blue-50/50 dark:bg-blue-950/20';
    case 'invalid':
      return 'bg-red-50/50 dark:bg-red-950/20';
    default:
      return '';
  }
}

export const STATUS_OPTIONS: { value: ImportStatus; label: string }[] = [
  { value: '現役', label: '現役' },
  { value: '種牡馬', label: '種牡馬' },
  { value: '繁殖牝馬', label: '繁殖牝馬' },
];

export const STEPS: { key: ImportStep; label: string }[] = [
  { key: 'file', label: '1. データ入力' },
  { key: 'settings', label: '2. 設定' },
  { key: 'preview', label: '3. プレビュー' },
  { key: 'result', label: '4. 結果' },
];
