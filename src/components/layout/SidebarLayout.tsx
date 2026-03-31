import type { ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/app/theme-context';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

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
  const { setTheme } = useTheme();

  const groups = [...new Set(navItems.map((item) => item.group))];

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 flex-col border-r bg-sidebar p-4">
        <h1 className="mb-6 text-lg font-bold">WP ブリーディング</h1>
        <nav className="flex-1 space-y-4 overflow-y-auto">
          {groups.map((group) => (
            <div key={group}>
              <p className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
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
                            ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent',
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
        <div className="border-t border-sidebar-border pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Sun className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                <span className="ml-4">テーマ切替</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="mr-2 h-4 w-4" />
                ライト
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="mr-2 h-4 w-4" />
                ダーク
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Monitor className="mr-2 h-4 w-4" />
                システム
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
