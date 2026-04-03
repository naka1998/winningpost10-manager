import { STEPS } from '../constants';
import type { ImportStep } from '../store';

export function StepIndicator({ currentStep }: { currentStep: ImportStep }) {
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
