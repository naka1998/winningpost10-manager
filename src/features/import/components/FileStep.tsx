import { useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { InputMode } from '../store';
import { useImportStore } from '../store';

export function FileStep() {
  const { inputMode, file, textContent, setInputMode, setFile, setTextContent, setStep, error } =
    useImportStore();
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

  const canProceed = inputMode === 'file' ? !!file : !!textContent.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle>データ入力</CardTitle>
        <CardDescription>
          読専から出力されたTSVファイルを選択するか、TSVデータを直接入力してください
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)}>
          <TabsList>
            <TabsTrigger value="file">ファイルアップロード</TabsTrigger>
            <TabsTrigger value="text">テキスト入力</TabsTrigger>
          </TabsList>
          <TabsContent value="file">
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
          </TabsContent>
          <TabsContent value="text">
            <Textarea
              placeholder="TSVデータをここに貼り付けてください"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="min-h-[200px] font-mono text-xs"
            />
          </TabsContent>
        </Tabs>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end">
          <Button onClick={() => setStep('settings')} disabled={!canProceed}>
            次へ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
