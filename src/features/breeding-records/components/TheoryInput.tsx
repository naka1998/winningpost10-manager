import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BreedingTheory } from '../types';

export function TheoryInput({
  theories,
  onChange,
}: {
  theories: BreedingTheory[];
  onChange: (theories: BreedingTheory[]) => void;
}) {
  const addTheory = () => {
    onChange([...theories, { name: '', points: 0 }]);
  };

  const removeTheory = (index: number) => {
    onChange(theories.filter((_, i) => i !== index));
  };

  const updateTheory = (index: number, field: keyof BreedingTheory, value: string | number) => {
    const updated = theories.map((t, i) => (i === index ? { ...t, [field]: value } : t));
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>配合理論</Label>
        <Button type="button" variant="outline" size="sm" onClick={addTheory}>
          追加
        </Button>
      </div>
      {theories.map((theory, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            placeholder="理論名"
            value={theory.name}
            onChange={(e) => updateTheory(index, 'name', e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="点数"
            value={theory.points || ''}
            onChange={(e) => updateTheory(index, 'points', Number(e.target.value))}
            className="w-20"
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => removeTheory(index)}>
            ✕
          </Button>
        </div>
      ))}
    </div>
  );
}
