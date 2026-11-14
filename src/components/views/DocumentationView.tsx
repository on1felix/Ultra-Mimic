import React from 'react';
import {
  BookOpen,
  Clock3,
  Database,
  Gamepad2,
  History,
  Layers,
  ListChecks,
  MonitorPlay,
  ShieldAlert,
  ShieldCheck,
  Smile,
  Sparkles,
  TerminalSquare,
  Timer,
} from 'lucide-react';
import { useUi } from '@/i18n/ui';
import { Badge, Card, SectionLabel } from '@/components/ui/kit';


interface Step {
  title: string;
  text: string;
}

interface SectionDoc {
  icon: React.ReactNode;
  name: string;
  text: string;
}

interface Copy {
  title: string;
  subtitle: string;
  chips: string[];
  warnTitle: string;
  warnText: string;
  howTitle: string;
  howHint: string;
  steps: Step[];
  startTitle: string;
  startText: string;
  plan: Array<{ label: string; value: string }>;
  sectionsTitle: string;
  sectionsHint: string;
  sections: SectionDoc[];
  underTitle: string;
  under: string[];
  notesTitle: string;
  notes: string[];
  footer: string;
}

const RU: Copy = {
  title: 'Ultra Mimic',
  subtitle:
    'Локальный клиент для эмуляции игровой активности Discord. Запускает игры из базы, держит их нужное время и ведёт историю — без RPC, телеметрии и лишних настроек.',
  chips: ['process-only', 'локально', 'без телеметрии', 'история'],
  warnTitle: 'Не запускайте во время настоящей игры',
  warnText:
    'Ultra Mimic не обходит античиты и не рассчитан на работу параллельно с реальной игрой. Эмуляцию активности, подмену процесса и запуск игры «рядом» античит может расценить как вмешательство — вплоть до бана аккаунта, блокировки по железу или потери прогресса. Используйте приложение только вне игры и на свой риск.',
  howTitle: 'Как это работает',
  howHint: 'Один цикл занимает несколько минут: игра → удержание → пауза 20 секунд → следующая игра.',
  steps: [
    {
      title: 'Discord видит процесс',
      text: 'Ultra Mimic берёт игру из базы Discord и запускает её .exe так, как это делает обычный запуск. Discord показывает «Играет в …».',
    },
    {
      title: 'Удержание',
      text: 'Игра остаётся активной заданное время. По умолчанию 3 минуты — этого достаточно, чтобы активность засчиталась.',
    },
    {
      title: 'Смена игры',
      text: 'Процесс закрывается, выдерживается пауза 20 секунд, затем запускается следующая игра. Уже прогнанные игры пропускаются, поэтому повторов нет.',
    },
    {
      title: 'История',
      text: 'Каждая завершённая игра сразу попадает в историю. Она хранится локально и не даёт запускать одну и ту же игру дважды.',
    },
  ],
  startTitle: 'Быстрый старт',
  startText:
    'Откройте «Фарм игр», проверьте удержание и лимит, нажмите «Запустить». Сессию можно завершить в любой момент кнопкой «Завершить» — уже пройденные игры останутся в истории.',
  plan: [
    { label: 'Игр за сессию', value: '100' },
    { label: 'Удержание', value: '3 мин' },
    { label: 'Пауза после игры', value: '20 сек' },
  ],
  sectionsTitle: 'Разделы приложения',
  sectionsHint: 'Что делает каждая вкладка и когда её открывать.',
  sections: [
    {
      icon: <MonitorPlay className="h-4 w-4" />,
      name: 'Обзор',
      text: 'Живая сводка: таймер текущей игры, прогресс и следующая игра. Во время встроенной паузы кольцо стоит полным и подсвечивается жёлтым. Отсюда удобно запускать быстрый прогон.',
    },
    {
      icon: <Gamepad2 className="h-4 w-4" />,
      name: 'Фарм игр',
      text: 'Основной режим. Настройте удержание, лимит игр и фильтры: пропуск прогнанных, 18+ и джиттер. Пауза 20 секунд после каждой игры встроена и учитывается в оценке времени.',
    },
    {
      icon: <Clock3 className="h-4 w-4" />,
      name: 'Фарм часов',
      text: 'Выберите одну игру и держите её выбранное время. Слева — выбранная игра и длительность, справа — поиск по базе.',
    },
    {
      icon: <History className="h-4 w-4" />,
      name: 'История',
      text: 'Список всех прогнанных игр. Отсюда можно вернуть игру в пул или полностью очистить историю.',
    },
    {
      icon: <Database className="h-4 w-4" />,
      name: 'База игр',
      text: 'Игры с .exe, которые видит Discord. Поиск по названию или пути, отметка «фармлено» и обновление базы.',
    },
    {
      icon: <Smile className="h-4 w-4" />,
      name: 'Фейк-статус',
      text: 'Показывает одну выбранную игру или свой текст в статусе Discord — без запуска полноценной сессии.',
    },
    {
      icon: <TerminalSquare className="h-4 w-4" />,
      name: 'Консоль',
      text: 'Технический журнал: что запустилось, сколько держится, какие ошибки были. Полезно, если игра не появилась в Discord.',
    },
  ],
  underTitle: 'Под капотом',
  under: [
    'Режим process-only: эмулируется только запуск .exe. RPC- и консольные режимы удалены, чтобы поведение было предсказуемым.',
    'Одна игра за раз: одновременно запускается только один процесс — Discord всё равно засчитывает только одну игру.',
    'После каждой игры процесс закрывается, выдерживается пауза 20 секунд, и только потом стартует следующая игра. Эта пауза всегда включена и входит в общую оценку времени.',
    'Джиттер добавляет случайные 4–10 секунд к удержанию, чтобы интервалы не были одинаковыми.',
    'База Discord кэшируется локально и обновляется по кнопке. История и кэш лежат в %APPDATA%\\Ultra Mimic.',
    'Все данные остаются на компьютере: приложение не отправляет статистику и не требует аккаунта.',
  ],
  notesTitle: 'Важно знать',
  notes: [
    'Discord должен быть запущен до старта сессии.',
    'Удержание можно задать от 15 секунд до 1 часа; ползунок двигается шагом 30 секунд.',
    'История не доказывает, что Discord засчитал игру, — она фиксирует только завершённый запуск.',
    'Сессию можно завершить кнопкой «Завершить»: текущий прогон остановится, а история сохранится.',
    'Игры 18+ можно исключить одним переключателем в фильтрах.',
    'В «Фарме часов» можно выбрать только одну игру — этого достаточно, Discord засчитывает одну активность.',
  ],
  footer:
    'Ultra Mimic — локальный инструмент. Он не связан с Discord и не изменяет клиент игры. Используйте его ответственно.',
};

const EN: Copy = {
  title: 'Ultra Mimic',
  subtitle:
    'A local client for emulating Discord game activity. It launches games from the database, holds them for the right time and keeps a history — no RPC, no telemetry, no clutter.',
  chips: ['process-only', 'local', 'no telemetry', 'history'],
  warnTitle: 'Do not run it during a real game',
  warnText:
    'Ultra Mimic does not bypass anti-cheat and is not meant to run alongside a real game. Activity emulation, process spoofing and launching a game in parallel can be treated as tampering by anti-cheat — up to an account ban, a hardware block or lost progress. Use the app only outside a game and at your own risk.',
  howTitle: 'How it works',
  howHint: 'One cycle takes a few minutes: launch → hold → 20 s pause → next game.',
  steps: [
    {
      title: 'Discord sees the process',
      text: 'Ultra Mimic picks a game from the Discord database and launches its .exe the same way a normal launch does. Discord shows “Playing …”.',
    },
    {
      title: 'Hold',
      text: 'The game stays active for the configured time. The default is 3 minutes — enough for the activity to count.',
    },
    {
      title: 'Switch game',
      text: 'The process closes, a 20 second pause follows, then the next game starts. Games already in history are skipped, so nothing repeats.',
    },
    {
      title: 'History',
      text: 'Every completed game goes to history right away and is never launched twice.',
    },
  ],
  startTitle: 'Quick start',
  startText:
    'Open “Game farm”, check hold and limit, then press Start. You can finish the session at any time with the “Finish” button — games already completed stay in history.',
  plan: [
    { label: 'Games per session', value: '100' },
    { label: 'Hold', value: '3 min' },
    { label: 'Pause after game', value: '20 s' },
  ],
  sectionsTitle: 'App sections',
  sectionsHint: 'What each tab does and when to open it.',
  sections: [
    {
      icon: <MonitorPlay className="h-4 w-4" />,
      name: 'Overview',
      text: 'Live snapshot: current game timer, progress and the next game. During the built-in pause the ring stays full in amber. Start a quick run from here.',
    },
    {
      icon: <Gamepad2 className="h-4 w-4" />,
      name: 'Game farm',
      text: 'The main mode. Set hold, game limit and filters: skip played, 18+ and jitter. A 20 second pause after every game is built in and included in the time estimate.',
    },
    {
      icon: <Clock3 className="h-4 w-4" />,
      name: 'Hour farm',
      text: 'Pick one game and hold it for the chosen duration. Selection is on the left, database search on the right.',
    },
    {
      icon: <History className="h-4 w-4" />,
      name: 'History',
      text: 'Every farmed game. Return a game to the pool or clear the whole history.',
    },
    {
      icon: <Database className="h-4 w-4" />,
      name: 'Game database',
      text: 'Executable games Discord can detect. Search by name or path, see farmed marks and refresh the cache.',
    },
    {
      icon: <Smile className="h-4 w-4" />,
      name: 'Fake status',
      text: 'Shows one selected game or custom text in your Discord status without a full farming session.',
    },
    {
      icon: <TerminalSquare className="h-4 w-4" />,
      name: 'Console',
      text: 'Technical log: what launched, how long it was held, what failed. Useful when a game does not appear in Discord.',
    },
  ],
  underTitle: 'Under the hood',
  under: [
    'Process-only mode: only the .exe launch is emulated. RPC and console modes were removed to keep behaviour predictable.',
    'One game at a time: only a single process runs at once — Discord counts only one game anyway.',
    'After every game the process closes, a 20 second pause follows, and only then the next game starts. The pause is always on and is included in the total estimate.',
    'Jitter adds a random 4–10 seconds to the hold so intervals are not identical.',
    'The Discord database is cached locally and refreshed on demand. History and cache live in %APPDATA%\\Ultra Mimic.',
    'Everything stays on your PC: no statistics are sent and no account is required.',
  ],
  notesTitle: 'Good to know',
  notes: [
    'Discord must be running before a session starts.',
    'Hold can be set from 15 seconds up to 1 hour; the slider moves in 30 second steps.',
    'History does not prove Discord counted a game — it only records a completed launch.',
    'A session can be finished with the “Finish” button: the current run stops and history is kept.',
    'Adult games can be excluded with a single filter toggle.',
    'Hour farm takes exactly one game — that is enough, since Discord counts a single activity.',
  ],
  footer:
    'Ultra Mimic is a local tool. It is not affiliated with Discord and does not modify game clients. Use it responsibly.',
};

/** Documentation tab: a calm, readable explanation of every part of the app. */
export const DocumentationView: React.FC = () => {
  const { language } = useUi();
  const c = language === 'ru' ? RU : EN;

  return (
    <div
      data-docs-root
      className="h-full -mr-2 space-y-4 overflow-y-auto pb-8 pt-4 rule-b"
    >
      {/* Hero */}
      <Card className="border-accent/25">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <img
            src="/logo.png"
            alt={c.title}
            className="h-14 w-14 flex-shrink-0 rounded-2xl object-cover ring-1 ring-white/15"
            draggable={false}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-white">{c.title}</h2>
              <Badge tone="accent">v2.0.0</Badge>
            </div>
            <p className="mt-1.5 max-w-3xl break-words text-[12px] leading-relaxed text-muted">{c.subtitle}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {c.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-faint"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-rose/40 bg-rose/[0.07]">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 border-rose/35 bg-rose/10">
            <ShieldAlert className="h-4 w-4 text-rose" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-rose">{c.warnTitle}</h3>
            <p className="mt-1.5 break-words text-[12px] leading-relaxed text-rose/90">{c.warnText}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent-light" />
            <h3 className="text-sm font-semibold text-white">{c.howTitle}</h3>
          </div>
          <p className="mt-1 text-[11px] text-faint">{c.howHint}</p>

          <div className="mt-4 space-y-3">
            {c.steps.map((step, index) => (
              <div key={step.title} className="flex items-start gap-3">
                <span className="num mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border-2 border-accent/30 bg-accent/[0.08] font-mono text-[11px] font-semibold text-accent-soft">
                  {index + 1}
                </span>
                <div className="min-w-0 pb-3 last:pb-0">
                  <p className="text-[12.5px] font-medium text-foreground/90">{step.title}</p>
                  <p className="mt-0.5 break-words text-[11.5px] leading-relaxed text-faint">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick start + plan */}
        <div className="col-span-12 space-y-4 lg:col-span-5">
          <Card>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-light" />
              <h3 className="text-sm font-semibold text-white">{c.startTitle}</h3>
            </div>
            <p className="mt-2 break-words text-[11.5px] leading-relaxed text-muted">{c.startText}</p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {c.plan.map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-surface-300/50 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                    {item.label}
                  </p>
                  <p className="num mt-1 font-mono text-sm font-semibold text-accent-soft">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent-light" />
              <h3 className="text-sm font-semibold text-white">{c.notesTitle}</h3>
            </div>
            <ul className="mt-2.5 space-y-2">
              {c.notes.map((note) => (
                <li key={note} className="flex min-w-0 items-start gap-2 break-words text-[11.5px] leading-relaxed text-faint">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent-light/70" />
                  {note}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* App sections */}
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Layers className="h-4 w-4 flex-shrink-0 text-accent-light" />
            <h3 className="min-w-0 text-sm font-semibold text-white">{c.sectionsTitle}</h3>
          </div>
          <span className="min-w-0 break-words text-[11px] text-faint">{c.sectionsHint}</span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {c.sections.map((section) => (
            <div
              key={section.name}
              className="min-w-0 overflow-visible rounded-xl border-2 border-border bg-surface-300/40 p-3 transition-colors hover:border-accent/25 hover:bg-surface-300/60"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/[0.08] text-accent-light">
                  {section.icon}
                </span>
                <p className="min-w-0 break-words text-[12.5px] font-semibold text-foreground/90">{section.name}</p>
              </div>
              <p className="mt-2 break-words text-[11px] leading-relaxed text-faint">{section.text}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-4">
        {/* Under the hood */}
        <Card className="col-span-12 lg:col-span-7">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-accent-light" />
            <h3 className="text-sm font-semibold text-white">{c.underTitle}</h3>
          </div>
          <ul className="mt-3 space-y-2.5">
            {c.under.map((line) => (
              <li key={line} className="flex min-w-0 items-start gap-2 break-words text-[11.5px] leading-relaxed text-muted">
                <ListChecks className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-faint" />
                {line}
              </li>
            ))}
          </ul>
        </Card>

        {/* Local-first summary */}
        <Card className="col-span-12 flex flex-col lg:col-span-5">
          <SectionLabel>local-first</SectionLabel>
          <p className="mt-2 break-words text-[12px] leading-relaxed text-muted">{c.footer}</p>
          <div className="mt-auto space-y-2 pt-4">
            <div className="flex items-center justify-between pt-3 text-[10.5px] text-faint">
              <span>data folder</span>
              <span className="min-w-0 break-all text-right font-mono text-foreground/70">%APPDATA%\Ultra Mimic</span>
            </div>
            <div className="flex items-center justify-between text-[10.5px] text-faint">
              <span>mode</span>
              <span className="min-w-0 break-all text-right font-mono text-foreground/70">process_only</span>
            </div>
            <div className="flex items-center justify-between text-[10.5px] text-faint">
              <span>hold range</span>
              <span className="min-w-0 break-all text-right font-mono text-foreground/70">5–3600 s</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};


