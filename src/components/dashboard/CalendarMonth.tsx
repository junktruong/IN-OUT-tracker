import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { TransactionDTO } from "@/lib/types";

const weekdayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

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

const buildCalendarCells = (key: string): CalendarCell[] => {
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function CalendarMonth({ monthKey, byDay, selectedDay, onSelectDay }: CalendarMonthProps) {
  const cells = buildCalendarCells(monthKey);

  return (
    <Card className="overflow-hidden p-3 sm:p-4">
      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="min-w-[620px] px-1 sm:min-w-0 sm:px-0">
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-muted-foreground sm:gap-2 sm:text-xs">
            {weekdayLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1.5 sm:mt-3 sm:gap-2">
            {cells.map((cell, index) => {
              if (!cell.dayKey) {
                return (
                  <div key={`empty-${index}`} className="h-20 rounded-md sm:h-24" />
                );
              }

              const totals = sumDay(byDay.get(cell.dayKey) ?? []);
              const hasActivity = totals.income > 0 || totals.expense > 0;
              const isSelected = cell.dayKey === selectedDay;

              return (
                <button
                  key={cell.dayKey}
                  onClick={() => onSelectDay(cell.dayKey!)}
                  className={cn(
                    "flex h-20 min-w-0 flex-col justify-between rounded-md border px-2 py-1.5 text-left text-[10px] transition sm:h-24 sm:px-3 sm:py-2 sm:text-xs",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background",
                    hasActivity && !isSelected && "bg-emerald-50/60"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-semibold sm:text-sm",
                      isSelected ? "text-primary-foreground" : "text-foreground"
                    )}
                  >
                    {String(cell.label).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p
                      className={cn(
                        "truncate text-[10px] tabular-nums sm:text-[11px]",
                        isSelected ? "text-rose-100" : "text-rose-500"
                      )}
                    >
                      Ra: {formatCurrency(totals.expense)}
                    </p>
                    <p
                      className={cn(
                        "truncate text-[10px] tabular-nums sm:text-[11px]",
                        isSelected ? "text-emerald-100" : "text-emerald-600"
                      )}
                    >
                      Vào: {formatCurrency(totals.income)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
