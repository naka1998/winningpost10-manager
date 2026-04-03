import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { STATUS_OPTIONS } from '../constants';
import type { ImportService, ImportStatus } from '../service';
import { useImportStore } from '../store';

export function SettingsStep({ service }: { service: ImportService }) {
  const {
    importYear,
    setImportYear,
    importStatus,
    setImportStatus,
    parseFile,
    runPreview,
    isLoading,
    error,
    parseResult,
  } = useImportStore();

  const handleParse = async () => {
    await parseFile(importYear);
  };

  const handlePreview = async () => {
    if (!parseResult) {
      await parseFile(importYear);
    }
    const store = useImportStore.getState();
    if (store.parseResult) {
      await runPreview(service);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>インポート設定</CardTitle>
        <CardDescription>インポート年度を指定してください（年齢→生年変換に使用）</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex max-w-md gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="import-year">インポート年（ゲーム内年度）</Label>
            <Input
              id="import-year"
              type="number"
              min={2000}
              max={2100}
              value={importYear}
              onChange={(e) => setImportYear(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label>ステータス</Label>
            <Select value={importStatus} onValueChange={(v) => setImportStatus(v as ImportStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {parseResult && (
          <div className="rounded-md bg-muted p-3 text-sm">
            パース完了: {parseResult.rows.length} 行
            {parseResult.warnings.length > 0 && (
              <span className="ml-2 text-yellow-600">
                （警告 {parseResult.warnings.length} 件）
              </span>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => useImportStore.getState().setStep('file')}
            disabled={isLoading}
          >
            戻る
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleParse} disabled={isLoading}>
              パース実行
            </Button>
            <Button onClick={handlePreview} disabled={isLoading || importYear < 2000}>
              {isLoading ? '処理中...' : 'プレビュー'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
