import React, { useMemo, useState } from 'react';
import { Database, RefreshCw, Search } from 'lucide-react';
import { useUi } from '@/i18n/ui';
import {
  Badge,
  Card,
  EmptyState,
  GameIcon,
  SearchInput,
} from '@/components/ui/kit';
import { Button } from '@/components/ui/Button';
import type { SpoofableGameItem } from '@/types/spoofer';

interface DatabaseViewProps {
  games: SpoofableGameItem[];
  isFetching: boolean;
  totalCount: number;
  processCount: number;
  onRefresh: () => void;
  isHistoryGame: (id: string) => boolean;
  onOpenHistory: () => void;
}

const LIMIT = 300;

export const DatabaseView: React.FC<DatabaseViewProps> = ({
  games,
  isFetching,
  totalCount,
  processCount,
  onRefresh,
  isHistoryGame,
  onOpenHistory,
}) => {
  const { u, formatNumber } = useUi();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return games.filter((game) => {
      // Only native process games can be emulated, so hide RPC/console entries.
      if (game.method !== 'process') return false;
      if (!query) return true;
      return (
        game.name.toLowerCase().includes(query) ||
        game.id.includes(query) ||
        (game.rel_path ?? '').toLowerCase().includes(query)
      );
    });
  }, [games, search]);

  const visible = filtered.slice(0, LIMIT);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 pt-4">
      <Card className="shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-accent/20 bg-accent/[0.08]">
              <Database className="h-5 w-5 text-accent-light" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {u('db.total', {
                  total: formatNumber(totalCount || games.length),
                  process: formatNumber(processCount),
                })}
              </p>
              <p className="text-[11px] text-faint">{u('top.sub.database')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onOpenHistory}>
              {u('db.openHistory')}
            </Button>
            <Button variant="soft" size="sm" onClick={onRefresh} disabled={isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              {u('db.refresh')}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            className="min-w-[240px] flex-1"
            value={search}
            onChange={setSearch}
            placeholder={u('db.search')}
            icon={<Search className="h-4 w-4" />}
          />
          <span className="num ml-auto text-[11px] text-faint">
            {u('db.showing', { shown: visible.length, total: filtered.length })}
          </span>
        </div>

        <div className="relative mt-3 min-h-0 flex-1">
          <div className="rule-t rule-b absolute inset-y-0 left-0 -right-3 overflow-y-auto overflow-x-hidden pb-10 pt-2">
            {isFetching && games.length === 0 ? (
              <div className="flex h-64 items-center justify-center gap-2 text-[12px] text-faint">
                <RefreshCw className="h-4 w-4 animate-spin" />
                {u('db.loading')}
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                icon={<Search className="h-5 w-5" />}
                title={u('db.empty')}
                hint={u('db.emptyHint')}
              />
            ) : (
              <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((game) => (
                  <div
                    key={game.id}
                    title={`${game.name} · ${game.id}`}
                    className="flex items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 transition-colors hover:border-white/[0.07] hover:bg-white/[0.03]"
                  >
                    <GameIcon game={game} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-foreground/90">{game.name}</p>
                      <p className="truncate text-[10px] text-faint">{game.rel_path || game.id}</p>
                    </div>
                    {isHistoryGame(game.id) && <Badge tone="mint">{u('db.farmed')}</Badge>}
                    {game.adult && <Badge tone="rose">18+</Badge>}
                    <Badge tone={game.method === 'rpc' ? 'discord' : 'neutral'}>
                      {game.method === 'rpc' ? 'RPC' : 'EXE'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {filtered.length > visible.length && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pb-1">
              <p className="rounded-full bg-surface-200/50 px-3 py-1 text-[11px] text-muted backdrop-blur-xl">
                {u('db.limitNote', { count: visible.length })}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
