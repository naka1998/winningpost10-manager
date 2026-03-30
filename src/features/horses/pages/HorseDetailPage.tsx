import { useParams } from '@tanstack/react-router';

export function HorseDetailPage() {
  const { horseId } = useParams({ strict: false });

  return (
    <div>
      <h1 className="text-2xl font-bold">馬詳細</h1>
      <p className="mt-2 text-gray-500">Horse ID: {horseId}（未実装）</p>
    </div>
  );
}
