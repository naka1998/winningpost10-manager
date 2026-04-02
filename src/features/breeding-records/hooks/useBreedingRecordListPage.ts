import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRepositoryContext } from '@/app/repository-context';
import { useSettingsStore } from '@/features/settings/store';
import { useBreedingRecordStore } from '../store';
import type {
  BreedingRecordCreateInput,
  BreedingRecordUpdateInput,
  BreedingRecordWithNames,
} from '../types';
import type { Horse } from '@/features/horses/types';

export function useBreedingRecordListPage() {
  const { breedingRecordRepository, horseRepository, settingsRepository } = useRepositoryContext();
  const records = useBreedingRecordStore((s) => s.records);
  const isLoading = useBreedingRecordStore((s) => s.isLoading);
  const error = useBreedingRecordStore((s) => s.error);
  const filter = useBreedingRecordStore((s) => s.filter);
  const settings = useSettingsStore((s) => s.settings);

  const [horses, setHorses] = useState<Horse[]>([]);
  const [allRecords, setAllRecords] = useState<BreedingRecordWithNames[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BreedingRecordWithNames | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BreedingRecordWithNames | null>(null);

  const refreshAllRecords = useCallback(async () => {
    try {
      const all = await breedingRecordRepository.findAll();
      setAllRecords(all);
    } catch {
      // Error is handled by the store's loadRecords
    }
  }, [breedingRecordRepository]);

  useEffect(() => {
    async function loadData() {
      await useSettingsStore.getState().loadSettings(settingsRepository);
      const allHorses = await horseRepository.findAll();
      setHorses(allHorses);
      await refreshAllRecords();
      await useBreedingRecordStore.getState().loadRecords(breedingRecordRepository);
    }
    loadData();
  }, [breedingRecordRepository, horseRepository, settingsRepository, refreshAllRecords]);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    useBreedingRecordStore.getState().loadRecords(breedingRecordRepository);
  }, [filter, breedingRecordRepository]);

  const mares = useMemo(() => horses.filter((h) => h.status === '繁殖牝馬'), [horses]);
  const stallions = useMemo(() => horses.filter((h) => h.status === '種牡馬'), [horses]);
  const currentYear = settings?.currentYear ?? 2025;

  const handleCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const handleEdit = (record: BreedingRecordWithNames) => {
    setEditTarget(record);
    setDialogOpen(true);
  };

  const handleSubmit = async (
    data:
      | (BreedingRecordCreateInput & { sireName?: string })
      | (BreedingRecordUpdateInput & { id: number; sireName?: string }),
  ) => {
    const store = useBreedingRecordStore.getState();
    let { sireName: newSireName, ...recordData } = data;

    if (newSireName) {
      const newHorse = await horseRepository.create({
        name: newSireName,
        sex: '牡',
        status: '種牡馬',
      });
      recordData = { ...recordData, sireId: newHorse.id };
      const allHorses = await horseRepository.findAll();
      setHorses(allHorses);
    }

    if ('id' in recordData) {
      const { id, ...updateData } = recordData;
      await store.updateRecord(breedingRecordRepository, id, updateData);
    } else {
      await store.createRecord(breedingRecordRepository, recordData as BreedingRecordCreateInput);
    }
    await refreshAllRecords();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await useBreedingRecordStore.getState().deleteRecord(breedingRecordRepository, deleteTarget.id);
    setDeleteTarget(null);
    await refreshAllRecords();
  };

  const handleFilterChange = (key: string, value: string) => {
    const numValue = value ? Number(value) : undefined;
    useBreedingRecordStore.getState().setFilter({ [key]: numValue });
  };

  return {
    records,
    isLoading,
    error,
    filter,
    mares,
    stallions,
    currentYear,
    allRecords,
    dialogOpen,
    setDialogOpen,
    editTarget,
    deleteTarget,
    setDeleteTarget,
    handleCreate,
    handleEdit,
    handleSubmit,
    handleDelete,
    handleFilterChange,
  };
}
