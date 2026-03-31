import { useParams } from '@tanstack/react-router';

export function PedigreePage() {
  const { horseId } = useParams({ strict: false });

  return (
    <div>
      <h1 className="text-2xl font-bold">血統ツリー</h1>
      <p className="mt-2 text-muted-foreground">Horse ID: {horseId}（未実装）</p>
    </div>
  );
}
