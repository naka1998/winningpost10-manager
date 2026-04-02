import { Badge } from '@/components/ui/badge';

export function ActionBadge({ action }: { action: string }) {
  switch (action) {
    case 'create':
      return <Badge variant="default">新規</Badge>;
    case 'update':
      return <Badge variant="secondary">更新</Badge>;
    case 'skip':
      return <Badge variant="outline">スキップ</Badge>;
    case 'invalid':
      return <Badge variant="destructive">エラー</Badge>;
    default:
      return null;
  }
}
