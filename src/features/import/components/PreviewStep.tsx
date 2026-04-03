import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ImportService } from '../service';
import { useImportStore } from '../store';
import { actionRowClass } from '../constants';
import { ActionBadge } from './ActionBadge';

export function PreviewStep({ service }: { service: ImportService }) {
  const { preview, runExecute, isLoading, error } = useImportStore();

  if (!preview) return null;

  const { summary, rows } = preview;

  return (
    <Card>
      <CardHeader>
        <CardTitle>インポートプレビュー</CardTitle>
        <CardDescription>
          {preview.importYear}年度 — {rows.length}件
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Badge variant="default">新規: {summary.newCount}</Badge>
          <Badge variant="secondary">更新: {summary.updateCount}</Badge>
          <Badge variant="outline">スキップ: {summary.skipCount}</Badge>
          {summary.invalidCount > 0 && (
            <Badge variant="destructive">エラー: {summary.invalidCount}</Badge>
          )}
        </div>

        <div className="max-h-96 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">状態</TableHead>
                <TableHead>馬名</TableHead>
                <TableHead className="w-16">性</TableHead>
                <TableHead className="w-20">生年</TableHead>
                <TableHead className="w-16">国</TableHead>
                <TableHead className="w-16">SP</TableHead>
                <TableHead>父馬</TableHead>
                <TableHead>母馬</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i} className={actionRowClass(row.action)}>
                  <TableCell>
                    <ActionBadge action={row.action} />
                  </TableCell>
                  <TableCell className="font-medium">{row.parsed.name}</TableCell>
                  <TableCell>{row.parsed.sex}</TableCell>
                  <TableCell>{row.parsed.birthYear}</TableCell>
                  <TableCell>{row.parsed.country}</TableCell>
                  <TableCell>{row.parsed.spValue}</TableCell>
                  <TableCell>{row.parsed.sireName}</TableCell>
                  <TableCell>{row.parsed.damName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => useImportStore.getState().setStep('settings')}
            disabled={isLoading}
          >
            戻る
          </Button>
          <Button
            onClick={() => runExecute(service)}
            disabled={isLoading || summary.newCount + summary.updateCount === 0}
          >
            {isLoading ? '実行中...' : 'インポート実行'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
