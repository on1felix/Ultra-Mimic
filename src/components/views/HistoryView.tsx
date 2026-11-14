import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckSquare,
  History,
  RotateCcw,
  Search,
  Square,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUi } from '@/i18n/ui';
import {
  Badge,
  Card,
  EmptyState,
  GameIcon,
  SearchInput,
  StatTile,
} from '@/components/ui/kit';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { HistoryGame } from '@/types/spoofer';

interface HistoryViewProps {
  games: HistoryGame[];
  historyCount: number;
  historyProcessCount: number;
  onRemove: (ids: string[]) => Promise<number>;
  onClear: () => Promise<void>;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  games,
  historyCount,
  historyProcessCount,
  onRemove,
  onClear,
}) => {
  const { u } = useUi();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReturn, setConfirmReturn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelected((prev) => prev.filter((id) => games.some((game) => game.id === id)));
  }, [games]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return games.filter((game) => {
      if (!query) return true;
      return (
        game.name.toLowerCase().includes(query) ||
        game.id.includes(query) ||
        (game.executable ?? '').toLowerCase().includes(query)
      );
    });
  }, [games, search]);

  const visible = filtered.slice(0, 400);
  const allVisibleSelected = visible.length > 0 && visible.every((game) => selected.includes(game.id));

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelected((prev) => prev.filter((id) => !visible.some((game) => game.id === id)));
    } else {
      setSelected((prev) => Array.from(new Set([...prev, ...visible.map((game) => game.id)])));
    }
  };

  const returnSelected = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      await onRemove(selected);
      setSelected([]);
    } finally {
      setBusy(false);
    }
  };

  const confirmClearAction = async () => {
    setBusy(true);
    try {
      await onClear();
      setSelected([]);
      setConfirmClear(false);
    } finally {
      setBusy(false);
    }
  };

  const confirmReturnAction = async () => {
    await returnSelected();
    setConfirmReturn(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 pt-4">
      {/* Stats */}
      <div className="grid shrink-0 grid-cols-2 gap-3">
        <StatTile
          label={u('nav.history')}
          value={historyCount}
          hint={u('h.farmedCount', { count: historyCount })}
          tone="accent"
        />
        <StatTile
          label={u('h.process')}
          value={historyProcessCount}
          hint=".exe"
        />
      </div>

      {/* Toolbar */}
      <Card className="shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            className="min-w-[220px] flex-1"
            value={search}
            onChange={setSearch}
            placeholder={u('h.search')}
            icon={<Search className="h-4 w-4" />}
          />

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleAll}
              disabled={visible.length === 0}
            >
              {allVisibleSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
              {u(allVisibleSelected ? 'h.deselectAll' : 'h.selectAll')}
            </Button>
            <Button
              variant="soft"
              size="sm"
              onClick={() => setConfirmReturn(true)}
              disabled={selected.length === 0 || busy}
              title={u('h.returnHint')}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {u('h.returnSelected', { count: selected.length })}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmClear(true)}
              disabled={games.length === 0 || busy}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {u('h.clear')}
            </Button>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-faint">
          <span>{u('h.showing', { shown: visible.length, total: games.length })}</span>
          <span>{u('h.note')}</span>
        </div>
      </Card>

      {/* List */}
      <div className="relative min-h-0 flex-1">
        <div className="rule-t rule-b absolute -left-2 -right-2 bottom-0 top-0 overflow-y-auto overflow-x-hidden pb-10 pl-2 pt-2">
          {games.length === 0 ? (
            <Card>
              <EmptyState
                icon={<History className="h-5 w-5" />}
                title={u('h.empty')}
                hint={u('h.emptyHint')}
              />
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <EmptyState compact icon={<Search className="h-4 w-4" />} title={u('h.searchEmpty')} />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((game) => {
                const isSelected = selected.includes(game.id);
                return (
                  <motion.button
                    layout
                    key={game.id}
                    type="button"
                    onClick={() => toggle(game.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 active:scale-[0.99]',
                      isSelected
                        ? 'border-accent/35 bg-accent/[0.08]'
                        : 'border-border bg-surface-200/60 hover:border-accent/20 hover:bg-surface-200'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors',
                        isSelected ? 'border-accent/50 bg-accent text-white' : 'border-white/15 bg-white/[0.03]'
                      )}
                    >
                      {isSelected && <span className="text-[10px] font-bold">✓</span>}
                    </span>
                    <GameIcon game={game} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-foreground/90">{game.name}</p>
                      <p className="truncate text-[10px] text-faint">
                        {game.known ? game.executable || game.id : u('h.unknown')}
                      </p>
                    </div>
                    {game.adult && <Badge tone="rose">{u('h.adult')}</Badge>}
                    {!game.known && <Badge tone="amber">?</Badge>}
                    <Badge tone={game.method === 'rpc' ? 'discord' : 'neutral'}>
                      {game.method === 'rpc' ? 'RPC' : 'EXE'}
                    </Badge>
                  </motion.button>
                );
              })}
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

      {/* Confirmations */}
      <ConfirmDialog
        open={confirmClear}
        title={u('h.confirmTitle')}
        message={u('h.confirmClear')}
        confirmLabel={u('h.confirm')}
        cancelLabel={u('h.cancel')}
        busy={busy}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => void confirmClearAction()}
      />

      <ConfirmDialog
        open={confirmReturn}
        title={u('h.returnTitle')}
        message={u('h.returnConfirm', { count: selected.length })}
        confirmLabel={u('h.returnConfirmAction')}
        cancelLabel={u('h.cancel')}
        tone="accent"
        busy={busy}
        onCancel={() => setConfirmReturn(false)}
        onConfirm={() => void confirmReturnAction()}
      />
    </div>
  );
};
