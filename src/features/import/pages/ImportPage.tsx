import { useMemo } from 'react';
import { useDatabaseContext } from '@/app/database-context';
import { useRepositoryContext } from '@/app/repository-context';
import { createImportService, type ImportService } from '../service';
import { useImportStore } from '../store';
import { StepIndicator } from '../components/StepIndicator';
import { FileStep } from '../components/FileStep';
import { SettingsStep } from '../components/SettingsStep';
import { PreviewStep } from '../components/PreviewStep';
import { ResultStep } from '../components/ResultStep';

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
