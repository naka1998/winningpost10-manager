import { useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useImportStore } from '../store';

export function FileStep() {
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
