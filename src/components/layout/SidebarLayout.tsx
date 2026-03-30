import type { ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  to: string;
  group: string;
}

const navItems: NavItem[] = [
  { label: '馬一覧', to: '/horses', group: '馬管理' },
  { label: 'データインポート', to: '/horses/import', group: '馬管理' },
  { label: '系統マスタ', to: '/lineages', group: '血統' },
  { label: '設定', to: '/settings', group: '設定' },
];

export function SidebarLayout({ children }: { children: ReactNode }) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const groups = [...new Set(navItems.map((item) => item.group))];

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r bg-gray-50 p-4">
        <h1 className="mb-6 text-lg font-bold">WP ブリーディング</h1>
        <nav className="space-y-4">
          {groups.map((group) => (
            <div key={group}>
              <p className="mb-1 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                {group}
              </p>
              <ul className="space-y-1">
                {navItems
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          'block rounded px-3 py-2 text-sm',
                          currentPath.startsWith(item.to) &&
                            (item.to !== '/horses' || currentPath === '/horses')
                            ? 'bg-blue-100 font-medium text-blue-900'
                            : 'text-gray-700 hover:bg-gray-200',
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
