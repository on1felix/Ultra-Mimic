import React from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Clock3,
  Database,
  Gamepad2,
  LayoutDashboard,
  ListChecks,
  Smile,
  TerminalSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUi, type UIKey } from '@/i18n/ui';

export type Tab =
  | 'overview'
  | 'games'
  | 'hours'
  | 'history'
  | 'database'
  | 'status'
  | 'console'
  | 'docs';

interface NavItem {
  id: Tab;
  labelKey: UIKey;
  icon: React.ComponentType<{ className?: string }>;
}

const GROUP_FARM: NavItem[] = [
  { id: 'overview', labelKey: 'nav.overview', icon: LayoutDashboard },
  { id: 'games', labelKey: 'nav.games', icon: Gamepad2 },
  { id: 'hours', labelKey: 'nav.hours', icon: Clock3 },
];

const GROUP_DATA: NavItem[] = [
  { id: 'history', labelKey: 'nav.history', icon: ListChecks },
  { id: 'database', labelKey: 'nav.database', icon: Database },
];

const GROUP_TOOLS: NavItem[] = [
  { id: 'status', labelKey: 'nav.status', icon: Smile },
  { id: 'console', labelKey: 'nav.console', icon: TerminalSquare },
  { id: 'docs', labelKey: 'nav.docs', icon: BookOpen },
];

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  historyCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  historyCount,
}) => {
  const { u } = useUi();

  const renderGroup = (labelKey: UIKey, items: NavItem[]) => (
    <div className="space-y-0.5">
      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint/80">
        {u(labelKey)}
      </p>
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={cn(
              'group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[12.5px] font-medium transition-colors duration-150',
              active ? 'text-white' : 'text-muted hover:bg-white/[0.04] hover:text-foreground'
            )}
          >
            {active && (
              <motion.span
                layoutId="sidebar-active"
                initial={false}
                className="absolute inset-0 rounded-lg bg-white/[0.07]"
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            )}
            <Icon
              className={cn(
                'relative h-4 w-4 transition-colors',
                active ? 'text-accent-soft' : 'text-faint group-hover:text-muted'
              )}
            />
            <span className="relative">{u(item.labelKey)}</span>
            {item.id === 'history' && historyCount > 0 && (
              <span
                className={cn(
                  'num relative ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  active ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-muted'
                )}
              >
                {historyCount > 9999 ? '9k+' : historyCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <aside className="relative z-10 flex h-full w-[228px] flex-shrink-0 flex-col bg-[#17181c]/60 backdrop-blur">
      <span className="pointer-events-none absolute -right-px bottom-3 top-3 w-0.5 rounded-full bg-white/[0.08]" />
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 pb-4 pt-4">
        {renderGroup('sidebar.farmGroup', GROUP_FARM)}
        {renderGroup('sidebar.dataGroup', GROUP_DATA)}
        {renderGroup('sidebar.toolsGroup', GROUP_TOOLS)}
      </nav>
    </aside>
  );
};
