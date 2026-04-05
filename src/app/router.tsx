import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
  Outlet,
  notFound,
} from '@tanstack/react-router';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { HorseListPage } from '@/features/horses/pages/HorseListPage';
import { HorseDetailPage } from '@/features/horses/pages/HorseDetailPage';
import { ImportPage } from '@/features/import/pages/ImportPage';
import { PedigreePage } from '@/features/pedigree/pages/PedigreePage';
import { LineageListPage } from '@/features/lineages/pages/LineageListPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { BreedingRecordListPage } from '@/features/breeding-records/pages/BreedingRecordListPage';
import { BroodmareListPage } from '@/features/broodmares/pages/BroodmareListPage';
import { RacePlanPage } from '@/features/race-plans/pages/RacePlanPage';

const rootRoute = createRootRoute({
  component: () => (
    <SidebarLayout>
      <Outlet />
    </SidebarLayout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/horses' });
  },
});

const horsesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/horses',
  component: HorseListPage,
});

const horseImportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/horses/import',
  component: ImportPage,
});

const parseHorseId = (params: Record<string, string>) => {
  const horseId = Number(params.horseId);
  if (Number.isNaN(horseId)) throw notFound();
  return { horseId };
};

const horseDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/horses/$horseId',
  params: { parse: parseHorseId },
  component: HorseDetailPage,
});

const pedigreeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/horses/$horseId/pedigree',
  params: { parse: parseHorseId },
  component: PedigreePage,
});

const lineagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lineages',
  component: LineageListPage,
});

const breedingRecordsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/breeding-records',
  component: BreedingRecordListPage,
});

const broodmaresRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/broodmares',
  component: BroodmareListPage,
});

const parseYear = (params: Record<string, string>) => {
  const year = Number(params.year);
  if (Number.isNaN(year)) throw notFound();
  return { year };
};

const racePlansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/race-plans/$year',
  params: { parse: parseYear },
  component: RacePlanPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  horsesRoute,
  horseImportRoute,
  horseDetailRoute,
  pedigreeRoute,
  lineagesRoute,
  breedingRecordsRoute,
  broodmaresRoute,
  racePlansRoute,
  settingsRoute,
]);

export const router = createRouter({
  routeTree,
  basepath: '/',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
