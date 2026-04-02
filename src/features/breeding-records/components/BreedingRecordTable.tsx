import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BreedingRecordWithNames } from '../types';

export function BreedingRecordTable({
  records,
  onEdit,
  onDelete,
}: {
  records: BreedingRecordWithNames[];
  onEdit: (record: BreedingRecordWithNames) => void;
  onDelete: (record: BreedingRecordWithNames) => void;
}) {
  if (records.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">配合記録がありません</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>繁殖牝馬</TableHead>
          <TableHead>種牡馬</TableHead>
          <TableHead>配合年</TableHead>
          <TableHead>評価</TableHead>
          <TableHead>配合理論</TableHead>
          <TableHead>爆発力</TableHead>
          <TableHead>産駒</TableHead>
          <TableHead>メモ</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={record.id}>
            <TableCell>{record.mareName}</TableCell>
            <TableCell>{record.sireName}</TableCell>
            <TableCell>{record.year}</TableCell>
            <TableCell>{record.evaluation ?? '-'}</TableCell>
            <TableCell>{record.theories?.map((t) => t.name).join(', ') ?? '-'}</TableCell>
            <TableCell>{record.totalPower ?? '-'}</TableCell>
            <TableCell>{record.offspringName ?? '-'}</TableCell>
            <TableCell title={record.notes ?? undefined}>
              {record.notes
                ? record.notes.length > 10
                  ? `${record.notes.slice(0, 10)}…`
                  : record.notes
                : '-'}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(record)}>
                  編集
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(record)}>
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
