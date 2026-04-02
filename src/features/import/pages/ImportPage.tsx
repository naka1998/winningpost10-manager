import { useCallback, useMemo, useRef } from 'react';
import { useDatabaseContext } from '@/app/database-context';
import { useRepositoryContext } from '@/app/repository-context';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createImportService, type ImportService, type ImportStatus } from '../service';
import { useImportStore, type ImportStep } from '../store';

const STATUS_OPTIONS: { value: ImportStatus; label: string }[] = [
  { value: '現役', label: '現役' },
  { value: '種牡馬', label: '種牡馬' },
  { value: '繁殖牝馬', label: '繁殖牝馬' },
];

const STEPS: { key: ImportStep; label: string }[] = [
  { key: 'file', label: '1. ファイル選択' },
  { key: 'settings', label: '2. 設定' },
  { key: 'preview', label: '3. プレビュー' },
  { key: 'result', label: '4. 結果' },
];

export function ImportPage() {
  const { db } = useDatabaseContext();
  const { horseRepository, yearlyStatusRepository, lineageRepository } = useRepositoryContext();

  const service = useMemo<ImportService>(
    () =>
      createImportService({
        db,
        horseRepo: horseRepository,
        yearlyStatusRepo: yearlyStatusRepository,
        lineageRepo: lineageRepository,
      }),
    [db, horseRepository, yearlyStatusRepository, lineageRepository],
  );

  const { step } = useImportStore();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">データインポート</h1>
      <StepIndicator currentStep={step} />
      {step === 'file' && <FileStep />}
      {step === 'settings' && <SettingsStep service={service} />}
      {step === 'preview' && <PreviewStep service={service} />}
      {step === 'result' && <ResultStep />}
    </div>
  );
}

function StepIndicator({ currentStep }: { currentStep: ImportStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  return (
    <div className="flex gap-2">
      {STEPS.map((s, i) => (
        <div
          key={s.key}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            i === currentIndex
              ? 'bg-primary text-primary-foreground'
              : i < currentIndex
                ? 'bg-muted text-muted-foreground'
                : 'bg-muted/50 text-muted-foreground/50'
          }`}
        >
          {s.label}
        </div>
      ))}
    </div>
  );
}

function FileStep() {
  const { file, setFile, setStep, error } = useImportStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) setFile(droppedFile);
    },
    [setFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) setFile(selected);
    },
    [setFile],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>ファイル選択</CardTitle>
        <CardDescription>読専から出力されたTSVファイルを選択してください</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-muted-foreground/50"
        >
          <p className="text-sm text-muted-foreground">
            ここにファイルをドラッグ&ドロップ、またはクリックして選択
          </p>
          {file && (
            <Badge variant="secondary">
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </Badge>
          )}
          <Input
            ref={fileInputRef}
            type="file"
            accept=".txt,.tsv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end">
          <Button onClick={() => setStep('settings')} disabled={!file}>
            次へ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsStep({ service }: { service: ImportService }) {
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

function PreviewStep({ service }: { service: ImportService }) {
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

function ResultStep() {
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

function ActionBadge({ action }: { action: string }) {
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

function actionRowClass(action: string): string {
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
