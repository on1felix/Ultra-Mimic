import React from 'react';
import type { MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { isTauriRuntime } from '@/lib/tauri';

/**
 * Frameless window title bar, structurally identical to the servo app:
 * icon + name + subtitle + version on the left, language toggle and
 * minimize / maximize / close on the right. The whole strip is draggable.
 */
export const TitleBar: React.FC = () => {
  const win = isTauriRuntime() ? getCurrentWindow() : null;
  const { language, setLanguage } = useI18n();

  const isControl = (target: EventTarget | null) =>
    target instanceof Element && !!target.closest('button, a, input, select');

  const startDrag = (event: MouseEvent<HTMLElement>) => {
    if (isControl(event.target)) return;
    event.preventDefault();
    void win?.startDragging().catch(() => undefined);
  };

  const toggleMaximize = () => void win?.toggleMaximize().catch(() => undefined);

  const onDoubleClick = (event: MouseEvent<HTMLElement>) => {
    if (isControl(event.target)) return;
    toggleMaximize();
  };

  return (
    <header
      onMouseDown={startDrag}
      onDoubleClick={onDoubleClick}
      className="relative z-30 flex h-10 shrink-0 select-none items-center justify-between bg-[#121317]/80 pl-3 pr-4 backdrop-blur"
    >
      <div className="pointer-events-none flex min-w-0 items-center gap-2">
        <img
          src="/logo.png"
          alt="Ultra Mimic"
          className="h-5 w-5 rounded-[5px] object-cover ring-1 ring-white/15"
          draggable={false}
        />
        <span className="text-[13px] font-semibold tracking-wide text-foreground">Ultra Mimic</span>
        <span className="hidden text-[11.5px] text-faint sm:inline">Discord booster</span>
        <span className="rounded border border-border bg-white/[0.03] px-1.5 py-[1px] font-mono text-[10.5px] text-faint">
          v2.0.0
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="relative flex select-none items-center rounded-md border border-white/[0.06] bg-white/[0.04] p-0.5 backdrop-blur-xl"
          aria-label="Language"
        >
          <motion.span
            initial={false}
            animate={{ x: language === 'en' ? 32 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute bottom-[2px] left-[2px] top-[2px] w-8 rounded-[5px] border-2 border-accent/40 bg-black/20"
          />
          {(['ru', 'en'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              aria-pressed={language === lang}
              className={`relative z-10 grid h-6 w-8 cursor-pointer place-items-center rounded-[5px] text-[11px] font-bold uppercase tracking-wide transition-[color,background-color,transform] duration-150 active:scale-[0.94] ${
                language === lang ? 'text-accent-soft' : 'text-muted hover:bg-white/[0.05] hover:text-foreground'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void win?.minimize().catch(() => undefined)}
            aria-label="Minimize"
            className="flex h-8 w-8 items-center justify-center rounded transition-[background-color,transform] duration-150 hover:bg-white/10 active:scale-[0.92]"
          >
            <Minus size={16} className="text-[#6E6779]" />
          </button>
          <button
            type="button"
            onClick={toggleMaximize}
            aria-label="Maximize"
            className="flex h-8 w-8 items-center justify-center rounded transition-[background-color,transform] duration-150 hover:bg-white/10 active:scale-[0.92]"
          >
            <Square size={14} className="text-[#6E6779]" />
          </button>
          <button
            type="button"
            onClick={() => void win?.close().catch(() => undefined)}
            aria-label="Close"
            className="group flex h-8 w-8 items-center justify-center rounded transition-[background-color,transform] duration-150 hover:bg-[#ff3b30]/30 active:scale-[0.92]"
          >
            <X
              size={16}
              className="text-[#6E6779] transition-colors duration-150 group-hover:text-[#ff6666]"
            />
          </button>
        </div>
      </div>
    </header>
  );
};
