"use client";

import { useMemo, useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { addDays, monthKey, startOfWeek, toYmd } from "@/lib/domain/date";
import type { TransactionDTO } from "@/lib/types";

const weekdayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const monthLabels = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

type CalendarView = "week" | "month" | "year";

type CalendarCell = {
  dayKey?: string;
  label?: number;
};

type CalendarMonthProps = {
  monthKey: string;
  byDay: Map<string, TransactionDTO[]>;
  selectedDay: string;
  onSelectDay: (dayKey: string) => void;
};

const buildMonthCells = (key: string): CalendarCell[] => {
  const [year, month] = key.split("-").map(Number);
  const monthIndex = month - 1;
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < startOffset; i += 1) {
    cells.push({});
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayKey = `${key}-${String(day).padStart(2, "0")}`;
    cells.push({ dayKey, label: day });
  }

  return cells;
};

const buildWeekCells = (selectedDay: string): CalendarCell[] => {
  const start = startOfWeek(new Date(`${selectedDay}T00:00:00`));
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return { dayKey: toYmd(date), label: date.getDate() };
  });
};

const sumDay = (items: TransactionDTO[]) =>
  items.reduce(
    (acc, item) => {
      if (item.type === "income") {
        acc.income += item.amount;
      } else {
        acc.expense += item.amount;
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

const compactCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

function ActivityDots({ income, expense }: { income: number; expense: number }) {
  if (income <= 0 && expense <= 0) {
    return <span className="h-1.5 sm:h-2" />;
  }

  return (
    <span className="flex items-center gap-1">
      {expense > 0 ? <span className="h-1 w-1 rounded-full bg-rose-500 sm:h-1.5 sm:w-1.5" /> : null}
      {income > 0 ? <span className="h-1 w-1 rounded-full bg-emerald-500 sm:h-1.5 sm:w-1.5" /> : null}
    </span>
  );
}

function DayCell({
  cell,
  byDay,
  selectedDay,
  onSelectDay,
  compact = false,
}: {
  cell: CalendarCell;
  byDay: Map<string, TransactionDTO[]>;
  selectedDay: string;
  onSelectDay: (dayKey: string) => void;
  compact?: boolean;
}) {
  if (!cell.dayKey) {
    return <div className={compact ? "h-8" : "h-11 sm:h-20"} />;
  }

  const totals = sumDay(byDay.get(cell.dayKey) ?? []);
  const hasActivity = totals.income > 0 || totals.expense > 0;
  const isSelected = cell.dayKey === selectedDay;
  const net = totals.income - totals.expense;

  return (
    <button
      type="button"
      onClick={() => onSelectDay(cell.dayKey!)}
      className={cn(
        "flex min-w-0 flex-col items-start justify-between rounded-xl px-1 py-1 text-left transition hover:bg-muted sm:px-2 sm:py-2",
        compact ? "h-8 text-[10px]" : "h-11 text-[11px] sm:h-20 sm:text-xs",
        isSelected && "bg-foreground text-background hover:bg-foreground",
        !isSelected && hasActivity && "bg-background"
      )}
    >
      <span className={cn("font-semibold", compact ? "text-[10px]" : "text-xs sm:text-sm")}>
        {cell.label}
      </span>
      <span className="flex w-full min-w-0 items-center justify-between gap-1">
        <ActivityDots income={totals.income} expense={totals.expense} />
        {!compact && hasActivity ? (
          <span
            className={cn(
              "hidden truncate text-[10px] tabular-nums sm:inline",
              isSelected ? "text-background/80" : net >= 0 ? "text-emerald-600" : "text-rose-600"
            )}
          >
            {compactCurrency(Math.abs(net))}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function WeekView({
  selectedDay,
  byDay,
  onSelectDay,
}: {
  selectedDay: string;
  byDay: Map<string, TransactionDTO[]>;
  onSelectDay: (dayKey: string) => void;
}) {
  const cells = buildWeekCells(selectedDay);

  return (
    <div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-muted-foreground sm:gap-1 sm:text-xs">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-1.5">
        {cells.map((cell) => (
          <DayCell
            key={cell.dayKey}
            cell={cell}
            byDay={byDay}
            selectedDay={selectedDay}
            onSelectDay={onSelectDay}
          />
        ))}
      </div>
    </div>
  );
}

function MonthView({
  activeMonth,
  selectedDay,
  byDay,
  onSelectDay,
}: {
  activeMonth: string;
  selectedDay: string;
  byDay: Map<string, TransactionDTO[]>;
  onSelectDay: (dayKey: string) => void;
}) {
  const cells = buildMonthCells(activeMonth);

  return (
    <div className="pb-1">
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-muted-foreground sm:gap-1 sm:text-xs">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
        {cells.map((cell, index) => (
          <DayCell
            key={cell.dayKey ?? `empty-${index}`}
            cell={cell}
            byDay={byDay}
            selectedDay={selectedDay}
            onSelectDay={onSelectDay}
          />
        ))}
      </div>
    </div>
  );
}

function YearView({
  year,
  selectedDay,
  byDay,
  onSelectDay,
}: {
  year: number;
  selectedDay: string;
  byDay: Map<string, TransactionDTO[]>;
  onSelectDay: (dayKey: string) => void;
}) {
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const date = new Date(year, index, 1);
        return monthKey(date);
      }),
    [year]
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {months.map((key, index) => (
        <div key={key} className="space-y-2 rounded-lg bg-background/70 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{monthLabels[index]}</p>
            <p className="text-xs text-muted-foreground">{year}</p>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-muted-foreground">
            {weekdayLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {buildMonthCells(key).map((cell, cellIndex) => (
              <DayCell
                key={cell.dayKey ?? `${key}-${cellIndex}`}
                cell={cell}
                byDay={byDay}
                selectedDay={selectedDay}
                onSelectDay={onSelectDay}
                compact
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CalendarMonth({ monthKey, byDay, selectedDay, onSelectDay }: CalendarMonthProps) {
  const [view, setView] = useState<CalendarView>("month");
  const year = Number(monthKey.slice(0, 4));

  return (
    <section className="rounded-3xl border border-latte bg-white p-3 shadow-sm shadow-amber-900/5 sm:p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-semibold text-mocha">Lịch giao dịch</p>
          <p className="text-xs text-caramel">
            Chấm đỏ là chi, chấm xanh là thu.
          </p>
        </div>
        <Tabs value={view} onValueChange={(value) => setView(value as CalendarView)}>
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-amber-100/80 p-1 sm:w-auto">
            <TabsTrigger value="week">Tuần</TabsTrigger>
            <TabsTrigger value="month">Tháng</TabsTrigger>
            <TabsTrigger value="year">Năm</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "week" ? (
        <WeekView selectedDay={selectedDay} byDay={byDay} onSelectDay={onSelectDay} />
      ) : null}
      {view === "month" ? (
        <MonthView
          activeMonth={monthKey}
          selectedDay={selectedDay}
          byDay={byDay}
          onSelectDay={onSelectDay}
        />
      ) : null}
      {view === "year" ? (
        <YearView year={year} selectedDay={selectedDay} byDay={byDay} onSelectDay={onSelectDay} />
      ) : null}
    </section>
  );
}
