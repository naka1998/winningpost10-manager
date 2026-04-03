import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useImportStore } from '../store';

export function ResultStep() {
  const { result, reset } = useImportStore();

  if (!result) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{result.success ? 'インポート完了' : 'インポートエラー'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.success ? (
          <div className="rounded-md bg-green-50 p-4 dark:bg-green-950">
            <p className="font-medium text-green-800 dark:text-green-200">
              インポートが正常に完了しました
            </p>
            <div className="mt-2 flex gap-4 text-sm text-green-700 dark:text-green-300">
              <span>作成: {result.created}件</span>
              <span>更新: {result.updated}件</span>
              <span>スキップ: {result.skipped}件</span>
            </div>
          </div>
        ) : (
          <div className="rounded-md bg-destructive/10 p-4">
            <p className="font-medium text-destructive">インポートに失敗しました</p>
            {result.errors.map((err, i) => (
              <p key={i} className="mt-1 text-sm text-destructive">
                行{err.row} ({err.horseName}): {err.message}
              </p>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={reset}>新しいインポート</Button>
        </div>
      </CardContent>
    </Card>
  );
}
