import { useEffect, useMemo, useRef, useState } from 'react';
import { useRepositoryContext } from '@/app/repository-context';
import { useHorseStore } from '../store';
import { useLineageStore } from '@/features/lineages/store';
import { TAB_DEFINITIONS } from '../constants';
import type { Horse, HorseCreateInput, HorseUpdateInput } from '../types';
import type { Lineage } from '@/features/lineages/types';

export function useHorseListPage() {
  const { horseRepository, lineageRepository } = useRepositoryContext();
  const horses = useHorseStore((s) => s.horses);
  const isLoading = useHorseStore((s) => s.isLoading);
  const error = useHorseStore((s) => s.error);
  const filter = useHorseStore((s) => s.filter);
  const hierarchy = useLineageStore((s) => s.hierarchy);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Horse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Horse | null>(null);

  const allLineages = useMemo(() => {
    const list: Lineage[] = [];
    for (const parent of hierarchy) {
      const { children, ...parentLineage } = parent;
      list.push(parentLineage);
      for (const child of children) {
        const { children: _grandchildren, ...childLineage } = child;
        list.push(childLineage);
      }
    }
    return list;
  }, [hierarchy]);

  const lineageMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const l of allLineages) {
      map.set(l.id, l.name);
    }
    return map;
  }, [allLineages]);

  const isInitialMount = useRef(true);

  useEffect(() => {
    async function loadData() {
      await useLineageStore.getState().loadHierarchy(lineageRepository);
      await useHorseStore.getState().loadHorses(horseRepository);
    }
    loadData();
  }, [horseRepository, lineageRepository]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    useHorseStore.getState().loadHorses(horseRepository);
  }, [filter, horseRepository]);

  const handleCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const handleEdit = (horse: Horse) => {
    setEditTarget(horse);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: HorseCreateInput | (HorseUpdateInput & { id: number })) => {
    const store = useHorseStore.getState();
    if ('id' in data) {
      const { id, ...updateData } = data;
      await store.updateHorse(horseRepository, id, updateData);
    } else {
      await store.createHorse(horseRepository, data);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await useHorseStore.getState().deleteHorse(horseRepository, deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleTabChange = (tabValue: string) => {
    const tab = TAB_DEFINITIONS.find((t) => t.value === tabValue);
    if (!tab) return;
    const store = useHorseStore.getState();
    store.setFilter({
      status: tab.filter.status,
      statuses: tab.filter.statuses as string[] | undefined,
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    const store = useHorseStore.getState();
    if (key === 'birthYearFrom' || key === 'birthYearTo' || key === 'lineageId') {
      store.setFilter({ [key]: value ? Number(value) : undefined });
    } else if (key === 'sortBy') {
      store.setFilter({
        sortBy: (value || undefined) as 'name' | 'birth_year' | 'status' | undefined,
      });
    } else {
      store.setFilter({ [key]: value || undefined });
    }
  };

  const currentTab =
    TAB_DEFINITIONS.find((t) => {
      if (t.filter.statuses) {
        return filter.statuses && filter.statuses.length > 0;
      }
      return filter.status === t.filter.status && !filter.statuses;
    })?.value ?? 'active';

  return {
    horses,
    isLoading,
    error,
    filter,
    allLineages,
    lineageMap,
    currentTab,
    dialogOpen,
    setDialogOpen,
    editTarget,
    deleteTarget,
    setDeleteTarget,
    handleCreate,
    handleEdit,
    handleSubmit,
    handleDelete,
    handleTabChange,
    handleFilterChange,
  };
}
