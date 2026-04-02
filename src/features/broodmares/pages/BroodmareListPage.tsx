import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useRepositoryContext } from '@/app/repository-context';
import { useBroodmareStore } from '../store';
import { useSettingsStore } from '@/features/settings/store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { BroodmareSummary, LineageDistribution } from '../types';

const PIE_COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#0088fe',
  '#00c49f',
  '#ffbb28',
  '#ff8042',
  '#a4de6c',
  '#d0ed57',
];

function gradeBadgeClass(grade: string | null): string {
  switch (grade) {
    case 'G1':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'G2':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'G3':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}

function DistributionChart({ title, data }: { title: string; data: LineageDistribution[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="mb-2 text-sm font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">データがありません</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
              {data.map((_entry, index) => (
                <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={80} />
            <Tooltip />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function OffspringTable({ mareId }: { mareId: number }) {
  const { broodmareRepository } = useRepositoryContext();
  const offspring = useBroodmareStore((s) => s.offspring[mareId]);
  const loadOffspring = useBroodmareStore((s) => s.loadOffspring);

  useEffect(() => {
    if (!offspring) {
      loadOffspring(broodmareRepository, mareId);
    }
  }, [offspring, broodmareRepository, mareId, loadOffspring]);

  if (!offspring) {
    return <p className="px-4 py-2 text-sm text-muted-foreground">読み込み中...</p>;
  }

  if (offspring.length === 0) {
    return <p className="px-4 py-2 text-sm text-muted-foreground">産駒がいません</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>名前</TableHead>
          <TableHead>生年</TableHead>
          <TableHead>性別</TableHead>
          <TableHead>状態</TableHead>
          <TableHead>父</TableHead>
          <TableHead>実績</TableHead>
          <TableHead>評価</TableHead>
          <TableHead>爆発力</TableHead>
          <TableHead>メモ</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {offspring.map((o) => (
          <TableRow key={o.id}>
            <TableCell className="font-medium">{o.name}</TableCell>
            <TableCell>{o.birthYear ?? '-'}</TableCell>
            <TableCell>{o.sex ?? '-'}</TableCell>
            <TableCell>{o.status}</TableCell>
            <TableCell>{o.sireName ?? '-'}</TableCell>
            <TableCell>
              {o.bestGrade ? (
                <Badge className={gradeBadgeClass(o.bestGrade)}>{o.bestGrade}</Badge>
              ) : (
                '-'
              )}
            </TableCell>
            <TableCell>{o.evaluation ?? '-'}</TableCell>
            <TableCell>{o.totalPower ?? '-'}</TableCell>
            <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
              {o.breedingNotes ?? '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BroodmareRow({
  summary,
  isExpanded,
  onToggle,
}: {
  summary: BroodmareSummary;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <TableCell className="w-10 text-center text-muted-foreground">
          {isExpanded ? '▼' : '▶'}
        </TableCell>
        <TableCell className="font-medium">{summary.name}</TableCell>
        <TableCell>{summary.age ?? '-'}</TableCell>
        <TableCell>{summary.breedingStartYear ?? '-'}</TableCell>
        <TableCell>{summary.offspringCount}</TableCell>
        <TableCell>{summary.activeOffspringCount}</TableCell>
        <TableCell>
          {summary.bestGrade ? (
            <Badge className={gradeBadgeClass(summary.bestGrade)}>{summary.bestGrade}</Badge>
          ) : (
            '-'
          )}
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/50 p-0 pl-4">
            <div className="px-8 py-2">
              <OffspringTable mareId={summary.id} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function BroodmareListPage() {
  const { broodmareRepository, settingsRepository } = useRepositoryContext();
  const {
    summaries,
    sireLineDistribution,
    damLineDistribution,
    stallionDistribution,
    isLoading,
    error,
    loadSummaries,
    loadDistributions,
  } = useBroodmareStore();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    // wa-sqlite は並行アクセスに対応していないため、DB操作を直列化する
    async function loadData() {
      await useSettingsStore.getState().loadSettings(settingsRepository);
      const currentYear = useSettingsStore.getState().settings?.currentYear ?? 2025;
      await loadSummaries(broodmareRepository, currentYear);
      await loadDistributions(broodmareRepository);
    }
    loadData();
  }, [broodmareRepository, settingsRepository, loadSummaries, loadDistributions]);

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">繁殖牝馬評価</h1>

      <Tabs defaultValue="individual">
        <TabsList>
          <TabsTrigger value="individual">個別評価</TabsTrigger>
          <TabsTrigger value="balance">全体バランス</TabsTrigger>
        </TabsList>

        <TabsContent value="individual">
          {error ? (
            <p className="py-4 text-destructive">{error}</p>
          ) : summaries.length === 0 ? (
            <p className="py-4 text-muted-foreground">繁殖牝馬がいません</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>名前</TableHead>
                  <TableHead>年齢</TableHead>
                  <TableHead>繁殖開始年</TableHead>
                  <TableHead>産駒数</TableHead>
                  <TableHead>現役産駒</TableHead>
                  <TableHead>主な実績</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((s) => (
                  <BroodmareRow
                    key={s.id}
                    summary={s}
                    isExpanded={expandedIds.has(s.id)}
                    onToggle={() => toggleExpanded(s.id)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="balance">
          <div className="space-y-6">
            <DistributionChart title="父系統別分布" data={sireLineDistribution} />
            <DistributionChart title="母系別分布" data={damLineDistribution} />
            <DistributionChart title="種牡馬別分布" data={stallionDistribution} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
