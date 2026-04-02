import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TAB_DEFINITIONS } from '../constants';
import { useHorseListPage } from '../hooks/useHorseListPage';
import { HorseFormDialog } from '../components/HorseFormDialog';
import { HorseFilterBar } from '../components/HorseFilterBar';
import { HorseTable } from '../components/HorseTable';

export function HorseListPage() {
  const {
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
  } = useHorseListPage();

  if (isLoading && horses.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">馬一覧</h1>
        <p className="mt-4 text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">馬一覧</h1>
        <p className="mt-4 text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">馬一覧</h1>
        <Button onClick={handleCreate}>新規登録</Button>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          {TAB_DEFINITIONS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TAB_DEFINITIONS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <HorseFilterBar
              filter={filter}
              allLineages={allLineages}
              onFilterChange={handleFilterChange}
            />
            <HorseTable
              horses={horses}
              lineageMap={lineageMap}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
            />
          </TabsContent>
        ))}
      </Tabs>

      <HorseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editTarget={editTarget}
        lineages={allLineages}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="馬の削除"
        description={`「${deleteTarget?.name}」を削除しますか？この操作は取り消せません。`}
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
