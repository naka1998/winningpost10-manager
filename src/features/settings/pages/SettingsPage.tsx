import { useEffect, useRef, useState } from 'react';
import { useDatabaseContext } from '@/app/database-context';
import { useServiceContext } from '@/app/service-context';
import { downloadBackupFile, exportDatabase, importDatabase } from '@/database/backup';
import { seedTestHorses } from '@/database/seed/test-horses';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettingsStore } from '../store';

export function SettingsPage() {
  const { db } = useDatabaseContext();
  const { settingsService } = useServiceContext();
  const { settings, isLoading, error, loadSettings, updateCurrentYear, updatePedigreeDepth } =
    useSettingsStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [yearInput, setYearInput] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [dbActionError, setDbActionError] = useState<string | null>(null);
  const [dbActionMessage, setDbActionMessage] = useState<string | null>(null);
  const [selectedRestoreFile, setSelectedRestoreFile] = useState<File | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [finalConfirmDialogOpen, setFinalConfirmDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const isDbActionRunning = isExporting || isRestoring || seeding;

  useEffect(() => {
    loadSettings(settingsService);
  }, [loadSettings, settingsService]);

  useEffect(() => {
    if (settings) {
      setYearInput(String(settings.currentYear));
    }
  }, [settings]);

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  async function handleSaveYear() {
    const year = Number(yearInput);
    if (!Number.isNaN(year) && year > 0) {
      await updateCurrentYear(settingsService, year);
    }
  }

  async function handleDepthChange(value: string) {
    const depth = Number(value) as 4 | 5;
    await updatePedigreeDepth(settingsService, depth);
  }

  async function handleExportDatabase() {
    setDbActionError(null);
    setDbActionMessage(null);
    setIsExporting(true);
    try {
      const { blob, filename } = await exportDatabase(db);
      await downloadBackupFile(blob, filename);
      setDbActionMessage(`バックアップを出力しました: ${filename}`);
    } catch (err) {
      setDbActionError(
        `エクスポートに失敗しました: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsExporting(false);
    }
  }

  function handleRestoreFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setDbActionError(null);
    setDbActionMessage(null);
    setSelectedRestoreFile(file);
    setRestoreDialogOpen(true);
  }

  async function executeRestore() {
    if (!selectedRestoreFile) {
      return;
    }

    setIsRestoring(true);
    setDbActionError(null);
    setDbActionMessage(null);

    try {
      await importDatabase(db, selectedRestoreFile);
      setDbActionMessage(
        'リストアが完了しました。画面を再読み込みしてアプリ状態とDB状態を同期します。',
      );
      window.location.reload();
    } catch (err) {
      setDbActionError(
        `リストアに失敗しました。変更はロールバックされ元のDBを維持します: ${
          err instanceof Error ? err.message : String(err)
        }。バックアップファイルとアプリのバージョンを確認して再試行してください。`,
      );
    } finally {
      setIsRestoring(false);
      setFinalConfirmDialogOpen(false);
      setRestoreDialogOpen(false);
      setSelectedRestoreFile(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>

      <Card>
        <CardHeader>
          <CardTitle>ゲーム設定</CardTitle>
          <CardDescription>ゲーム内の基本設定を管理します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="current-year">現在の年度</Label>
              <Input
                id="current-year"
                type="number"
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                className="w-32"
              />
            </div>
            <Button onClick={handleSaveYear}>保存</Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pedigree-depth">血統ツリー表示世代数</Label>
            <Select value={String(settings.pedigreeDepth)} onValueChange={handleDepthChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4世代</SelectItem>
                <SelectItem value="5">5世代</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ランクシステム</CardTitle>
          <CardDescription>能力値の評価ランク一覧</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {settings.rankSystem.map((rank) => (
              <Badge key={rank} variant="secondary">
                {rank}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>データベース</CardTitle>
          <CardDescription>データベースの管理</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">バージョン:</span>
            <span className="text-sm font-medium">{settings.dbVersion}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportDatabase} disabled={isDbActionRunning}>
              {isExporting ? 'エクスポート中...' : 'エクスポート'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDbActionRunning}
            >
              {isRestoring ? 'リストア中...' : 'データベースリストア'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.sqlite,.sqlite3"
              className="hidden"
              onChange={handleRestoreFileSelected}
              data-testid="restore-file-input"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            リストア失敗時はトランザクションをロールバックし、既存データを維持します。
          </p>
          {dbActionMessage ? (
            <p className="text-sm text-muted-foreground">{dbActionMessage}</p>
          ) : null}
          {dbActionError ? <p className="text-sm text-destructive">{dbActionError}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>テストデータ</CardTitle>
          <CardDescription>開発・テスト用のサンプルデータを投入します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            disabled={seeding || isDbActionRunning}
            onClick={async () => {
              setSeeding(true);
              setSeedResult(null);
              try {
                const count = await seedTestHorses(db);
                setSeedResult(`${count}頭のテストデータを投入しました`);
              } catch (err) {
                setSeedResult(`エラー: ${err instanceof Error ? err.message : String(err)}`);
              } finally {
                setSeeding(false);
              }
            }}
          >
            {seeding ? '投入中...' : 'テストデータ投入'}
          </Button>
          {seedResult && (
            <p
              className={`text-sm ${seedResult.startsWith('エラー') ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {seedResult}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>バックアップをリストアしますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            選択ファイル: {selectedRestoreFile?.name}
            <br />
            現在のデータはバックアップ内容で上書きされます。
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreDialogOpen(false)}
              disabled={isDbActionRunning}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setRestoreDialogOpen(false);
                setFinalConfirmDialogOpen(true);
              }}
              disabled={isDbActionRunning}
            >
              次へ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={finalConfirmDialogOpen} onOpenChange={setFinalConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>最終確認: リストアを実行します</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            この操作は取り消せません。続行する場合はリストア実行を押してください。
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFinalConfirmDialogOpen(false)}
              disabled={isDbActionRunning}
            >
              戻る
            </Button>
            <Button variant="destructive" onClick={executeRestore} disabled={isDbActionRunning}>
              リストア実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
