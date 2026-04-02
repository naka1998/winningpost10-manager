import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useBreedingRecordListPage } from '../hooks/useBreedingRecordListPage';
import { BreedingRecordFormDialog } from '../components/BreedingRecordFormDialog';
import { BreedingRecordFilterBar } from '../components/BreedingRecordFilterBar';
import { BreedingRecordTable } from '../components/BreedingRecordTable';

export function BreedingRecordListPage() {
  const {
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
  } = useBreedingRecordListPage();

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">配合記録</h1>
        <p className="mt-4 text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold">配合記録</h1>
        <p className="mt-4 text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">配合記録</h1>
        <Button onClick={handleCreate}>新規登録</Button>
      </div>

      <BreedingRecordFilterBar
        filter={filter}
        mares={mares}
        stallions={stallions}
        onFilterChange={handleFilterChange}
      />

      <BreedingRecordTable records={records} onEdit={handleEdit} onDelete={setDeleteTarget} />

      <BreedingRecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editTarget={editTarget}
        mares={mares}
        stallions={stallions}
        defaultYear={currentYear}
        records={allRecords}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="配合記録の削除"
        description="この配合記録を削除しますか？"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="削除する"
        variant="destructive"
      />
    </div>
  );
}
