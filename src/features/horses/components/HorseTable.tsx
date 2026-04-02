import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { statusBadgeClass } from '../constants';
import type { Horse } from '../types';

export function HorseTable({
  horses,
  lineageMap,
  onEdit,
  onDelete,
}: {
  horses: Horse[];
  lineageMap: Map<number, string>;
  onEdit: (horse: Horse) => void;
  onDelete: (horse: Horse) => void;
}) {
  if (horses.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">馬が登録されていません</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>馬名</TableHead>
          <TableHead>性別</TableHead>
          <TableHead>生年</TableHead>
          <TableHead>国</TableHead>
          <TableHead>系統</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead className="w-24">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {horses.map((horse) => (
          <TableRow key={horse.id}>
            <TableCell>
              <Link
                to="/horses/$horseId"
                params={{ horseId: horse.id }}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {horse.name}
              </Link>
            </TableCell>
            <TableCell>{horse.sex ?? '-'}</TableCell>
            <TableCell>{horse.birthYear ?? '-'}</TableCell>
            <TableCell>{horse.country ?? '-'}</TableCell>
            <TableCell>
              {horse.lineageId ? (lineageMap.get(horse.lineageId) ?? '-') : '-'}
            </TableCell>
            <TableCell>
              <Badge className={statusBadgeClass(horse.status)}>{horse.status}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(horse)}>
                  編集
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(horse)}>
                  削除
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
