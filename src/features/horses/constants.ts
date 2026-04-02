export const TAB_DEFINITIONS = [
  { value: 'active', label: '現役', filter: { status: '現役', statuses: undefined } },
  {
    value: 'retired',
    label: '引退',
    filter: { status: undefined, statuses: ['引退', '種牡馬', '繁殖牝馬', '売却済'] },
  },
  { value: 'stallion', label: '種牡馬', filter: { status: '種牡馬', statuses: undefined } },
  {
    value: 'broodmare',
    label: '繁殖牝馬',
    filter: { status: '繁殖牝馬', statuses: undefined },
  },
] as const;

export const SORT_OPTIONS = [
  { value: 'name', label: '馬名' },
  { value: 'birth_year', label: '生年' },
  { value: 'status', label: 'ステータス' },
] as const;

export function statusBadgeClass(status: string): string {
  switch (status) {
    case '現役':
      return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-900';
    case '種牡馬':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-900';
    case '繁殖牝馬':
      return 'bg-pink-100 text-pink-800 hover:bg-pink-100 dark:bg-pink-900 dark:text-pink-200 dark:hover:bg-pink-900';
    case '引退':
      return 'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-800';
    case '売却済':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200 dark:hover:bg-yellow-900';
    default:
      return '';
  }
}
