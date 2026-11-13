import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ClipboardCopy, Search, TerminalSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUi } from '@/i18n/ui';
import { Badge, Card, EmptyState, SearchInput, Segmented, Toggle } from '@/components/ui/kit';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { SpooferLogEvent } from '@/types/spoofer';

type Level = 'all' | 'info' | 'success' | 'warn' | 'error';

interface ConsoleViewProps {
  logs: SpooferLogEvent[];
  onClear: () => void;
}

const LEVEL_TEXT: Record<SpooferLogEvent['level'], string> = {
  info: 'text-foreground/75',
  success: 'text-mint',
  warn: 'text-amber',
  error: 'text-rose',
};

const LEVEL_BG: Record<SpooferLogEvent['level'], string> = {
  info: 'bg-faint',
  success: 'bg-mint',
  warn: 'bg-amber',
  error: 'bg-rose',
};

const LEVEL_BADGE: Record<SpooferLogEvent['level'], string> = {
  info: 'INFO',
  success: 'OK',
  warn: 'WARN',
  error: 'ERR',
};

export const ConsoleView: React.FC<ConsoleViewProps> = ({ logs, onClear }) => {
  const { u, formatNumber } = useUi();
  const [level, setLevel] = useState<Level>('all');
  const [search, setSearch] = useState('');
  const [autoscroll, setAutoscroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (level !== 'all' && log.level !== level) return false;
      if (!query) return true;
      return log.message.toLowerCase().includes(query);
    });
  }, [logs, level, search]);

  useEffect(() => {
    if (autoscroll) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [filtered.length, autoscroll]);

  const copyAll = async () => {
    const text = filtered
      .map((log) => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable in the webview — nothing to do
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 pt-4">
      <Card className="shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            className="min-w-[220px] flex-1"
            value={search}
            onChange={setSearch}
            placeholder={u('c.search')}
            icon={<Search className="h-4 w-4" />}
          />
          <Segmented<Level>
            className="w-auto"
            size="sm"
            value={level}
            onChange={setLevel}
            options={[
              { value: 'all', label: u('c.all') },
              { value: 'success', label: u('c.success') },
              { value: 'warn', label: u('c.warn') },
              { value: 'error', label: u('c.error') },
              { value: 'info', label: u('c.info') },
            ]}
          />

          <Toggle
            className="w-auto px-2"
            checked={autoscroll}
            onChange={setAutoscroll}
            label={<span className="text-[11px]">{u('c.autoscroll')}</span>}
          />

          <Button variant="secondary" size="sm" onClick={copyAll} disabled={filtered.length === 0}>
            {copied ? <Check className="h-3.5 w-3.5 text-mint" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
            {copied ? u('c.copied') : u('c.copyAll')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)} disabled={logs.length === 0}>
            <Trash2 className="h-3.5 w-3.5" />
            {u('c.clear')}
          </Button>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-faint">
          <span className="flex items-center gap-2">
            <TerminalSquare className="h-3.5 w-3.5" />
            {u('c.entries', { count: formatNumber(logs.length) })}
          </span>
          <span>{u('c.showing', { shown: filtered.length, total: logs.length })}</span>
        </div>
      </Card>

      <Card flush className="min-h-0 flex-1 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              icon={<TerminalSquare className="h-5 w-5" />}
              title={u('c.empty')}
              hint={u('c.emptyHint')}
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto overflow-x-hidden p-3 pb-10 font-mono text-[11.5px] leading-relaxed">
            {filtered.map((log) => (
              <div
                key={log.id}
                className="group flex items-start gap-2.5 rounded-lg px-2 py-1 transition-colors hover:bg-white/[0.03]"
              >
                <span className="mt-[1px] w-[62px] flex-shrink-0 text-faint">{log.timestamp}</span>
                <span
                  className={cn(
                    'mt-[1px] w-8 flex-shrink-0 text-[9px] font-bold tracking-wider',
                    LEVEL_TEXT[log.level]
                  )}
                >
                  {LEVEL_BADGE[log.level]}
                </span>
                <span className={cn('mt-1.5 h-1 w-1 flex-shrink-0 rounded-full', LEVEL_BG[log.level])} />
                <span className={cn('min-w-0 flex-1 select-text break-words', LEVEL_TEXT[log.level])}>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between text-[10px] text-faint">
        <span>Ultra Mimic · local log</span>
        <Badge tone="neutral">{logs.length > 0 ? `+${logs.length}` : '0'}</Badge>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title={u('c.confirmTitle')}
        message={u('c.confirmClear')}
        confirmLabel={u('c.confirm')}
        cancelLabel={u('c.cancel')}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          onClear();
          setConfirmClear(false);
        }}
      />
    </div>
  );
};
