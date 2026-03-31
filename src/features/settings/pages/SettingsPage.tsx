import { useEffect, useState } from 'react';
import { useRepositoryContext } from '@/app/repository-context';
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
  const { settingsRepository } = useRepositoryContext();
  const { settings, isLoading, error, loadSettings, updateCurrentYear, updatePedigreeDepth } =
    useSettingsStore();

  const [yearInput, setYearInput] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  useEffect(() => {
    loadSettings(settingsRepository);
  }, [loadSettings, settingsRepository]);

  useEffect(() => {
    if (settings) {
      setYearInput(String(settings.currentYear));
    }
  }, [settings]);

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  async function handleSaveYear() {
    const year = Number(yearInput);
    if (!Number.isNaN(year) && year > 0) {
      await updateCurrentYear(settingsRepository, year);
    }
  }

  async function handleDepthChange(value: string) {
    const depth = Number(value) as 4 | 5;
    await updatePedigreeDepth(settingsRepository, depth);
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
            <Button variant="outline" onClick={() => alert('エクスポート機能は今後実装予定です')}>
              エクスポート
            </Button>
            <Button variant="destructive" onClick={() => setResetDialogOpen(true)}>
              データベースリセット
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>本当にリセットしますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            すべてのデータが削除されます。この操作は取り消せません。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setResetDialogOpen(false);
                alert('リセット機能は今後実装予定です');
              }}
            >
              リセット実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
