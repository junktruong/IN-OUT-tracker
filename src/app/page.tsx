"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { CalendarMonth } from "@/components/dashboard/CalendarMonth";
import { DayPanel } from "@/components/dashboard/DayPanel";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { BillsInWindow } from "@/components/dashboard/BillsInWindow";
import { AnalyticsSection } from "@/components/dashboard/AnalyticsSection";
import { BudgetAlertsBanner } from "@/components/dashboard/BudgetAlertsBanner";
import { TransactionComposer } from "@/components/dashboard/TransactionComposer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTransactionsLocalFirst } from "@/hooks/useTransactionsLocalFirst";
import { addMonths, monthKey, toYmd } from "@/lib/domain/date";
import { payrollWindow } from "@/lib/domain/payroll";
import { reserveInWindow } from "@/lib/domain/reserve";
import type { TransactionInput } from "@/lib/domain/transactions";
import type { BillDTO, BudgetAlertDTO, SettingsDTO, TransactionDTO } from "@/lib/types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

const formatMonthLabel = (value: string) => {
  const [yearValue, monthValue] = value.split("-");
  return `Tháng ${monthValue}/${yearValue}`;
};

export default function HomePage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => toYmd(new Date()));
  const [bills, setBills] = useState<BillDTO[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlertDTO[]>([]);
  const [settings, setSettings] = useState<SettingsDTO>({ paydayDay: 25, salaryExpected: 0 });
  const year = Number(month.slice(0, 4));
  const {
    transactions,
    syncState,
    createTransaction,
    createTransactionsFromQuickInput,
    updateTransaction,
    deleteTransaction,
  } = useTransactionsLocalFirst(user?.id, year);

  const fetchBills = useCallback(async () => {
    const response = await fetch("/api/bills");
    if (!response.ok) {
      throw new Error("Không thể tải khoản đóng.");
    }
    const data = await response.json();
    return (data.items ?? []) as BillDTO[];
  }, []);

  const fetchSettings = useCallback(async () => {
    const response = await fetch("/api/settings");
    if (!response.ok) {
      throw new Error("Không thể tải cài đặt.");
    }
    const data = await response.json();
    return data as SettingsDTO;
  }, []);

  const fetchBudgetAlerts = useCallback(async () => {
    const response = await fetch("/api/budgets/alerts", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Không thể tải cảnh báo ngân sách.");
    }
    const data = await response.json();
    return (data.items ?? []) as BudgetAlertDTO[];
  }, []);

  const refreshBudgetAlerts = useCallback(async () => {
    try {
      const alerts = await fetchBudgetAlerts();
      setBudgetAlerts(alerts);
    } catch {
      setBudgetAlerts([]);
    }
  }, [fetchBudgetAlerts]);

  useEffect(() => {
    let ignore = false;

    const loadInitialData = async () => {
      const [settingsResult, billsResult, alertsResult] = await Promise.allSettled([
        fetchSettings(),
        fetchBills(),
        fetchBudgetAlerts(),
      ]);

      if (ignore) {
        return;
      }

      if (settingsResult.status === "fulfilled") {
        setSettings(settingsResult.value);
      }
      if (billsResult.status === "fulfilled") {
        setBills(billsResult.value);
      }
      if (alertsResult.status === "fulfilled") {
        setBudgetAlerts(alertsResult.value);
      }
    };

    void loadInitialData();

    return () => {
      ignore = true;
    };
  }, [fetchBills, fetchBudgetAlerts, fetchSettings]);

  const monthTransactions = useMemo(
    () => transactions.filter((item) => item.date.startsWith(month)),
    [month, transactions]
  );

  const byDay = useMemo(() => {
    const map = new Map<string, TransactionDTO[]>();
    transactions.forEach((item) => {
      const current = map.get(item.date) ?? [];
      current.push(item);
      map.set(item.date, current);
    });
    return map;
  }, [transactions]);

  const monthSummary = useMemo(() => {
    return monthTransactions.reduce(
      (acc, item) => {
        if (item.type === "income") {
          acc.income += item.amount;
        } else {
          acc.expense += item.amount;
        }
        acc.net = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, net: 0 }
    );
  }, [monthTransactions]);

  const dayItems = byDay.get(selectedDay) ?? [];
  const daySummary = dayItems.reduce(
    (acc, item) => {
      if (item.type === "income") {
        acc.income += item.amount;
      } else {
        acc.expense += item.amount;
      }
      acc.net = acc.income - acc.expense;
      return acc;
    },
    { income: 0, expense: 0, net: 0 }
  );

  const payroll = payrollWindow(new Date(), settings.paydayDay);
  const reserve = reserveInWindow(
    bills.map((bill) => ({
      id: bill.id,
      name: bill.name,
      amount: bill.amount,
      cycleType: bill.cycleType,
      cycleValue: bill.cycleValue,
      paid: bill.paid,
      start: bill.start ? new Date(bill.start) : null,
      end: bill.end ? new Date(bill.end) : null,
      createdAt: bill.createdAt ? new Date(bill.createdAt) : null,
    })),
    payroll
  );

  const payrollLabel = `${toYmd(payroll.lastPay)} → ${toYmd(payroll.nextPay)}`;
  const monthLabel = formatMonthLabel(month);

  const handleMonthChange = (delta: number) => {
    const next = addMonths(month, delta);
    setMonth(next);
    if (!selectedDay.startsWith(next)) {
      setSelectedDay(`${next}-01`);
    }
  };

  const handleSelectDay = (dayKey: string) => {
    setSelectedDay(dayKey);
    const selectedMonth = dayKey.slice(0, 7);
    if (selectedMonth !== month) {
      setMonth(selectedMonth);
    }
  };

  const handleQuickAdd = async (raw: string) => {
    const result = await createTransactionsFromQuickInput(selectedDay, raw);
    void refreshBudgetAlerts();
    return result;
  };

  const handleManualAdd = async (payload: TransactionInput) => {
    await createTransaction(payload);
    void refreshBudgetAlerts();
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-mocha sm:text-xl">IN-OUT Tracker</p>
          <p className="mt-1 text-xs text-caramel">
            {syncState.syncing
              ? "Đang đồng bộ giao dịch..."
              : syncState.pendingCount > 0
                ? `${syncState.pendingCount} thay đổi chờ đồng bộ`
                : "Dữ liệu giao dịch đã đồng bộ"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-full border border-latte bg-white px-1.5 py-1 shadow-sm shadow-amber-900/5">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-caramel transition-colors hover:bg-cream"
            onClick={() => handleMonthChange(-1)}
            aria-label="Tháng trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[112px] text-center text-sm font-semibold text-mocha tabular-nums sm:min-w-[132px]">
            {monthLabel}
          </span>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-caramel transition-colors hover:bg-cream"
            onClick={() => handleMonthChange(1)}
            aria-label="Tháng sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <BudgetAlertsBanner alerts={budgetAlerts} />

      <SummaryCards
        monthSummary={monthSummary}
        reserveTotal={reserve.total}
        salaryExpected={settings.salaryExpected}
        payrollLabel={payrollLabel}
      />

      <Tabs defaultValue="calendar" className="space-y-3">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-amber-100/80 p-1">
          <TabsTrigger value="calendar">Lịch</TabsTrigger>
          <TabsTrigger value="analytics">Phân tích</TabsTrigger>
          <TabsTrigger value="bills">Sắp đến hạn</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <CalendarMonth
              monthKey={month}
              byDay={byDay}
              selectedDay={selectedDay}
              onSelectDay={handleSelectDay}
            />
            <DayPanel
              dayKey={selectedDay}
              items={dayItems}
              daySummary={daySummary}
              onUpdateItem={async (id, payload) => {
                await updateTransaction(id, payload);
                void refreshBudgetAlerts();
              }}
              onDeleteItem={async (id) => {
                await deleteTransaction(id);
                void refreshBudgetAlerts();
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsSection
            monthKey={month}
            transactions={monthTransactions}
            monthSummary={monthSummary}
          />
        </TabsContent>

        <TabsContent value="bills">
          <BillsInWindow bills={reserve.items} reserveTotal={reserve.total} />
        </TabsContent>
      </Tabs>

      <div className="text-xs text-muted-foreground">
        Tổng giao dịch trong tháng: {formatCurrency(monthSummary.expense + monthSummary.income)}
      </div>

      <TransactionComposer
        dayKey={selectedDay}
        onQuickAdd={handleQuickAdd}
        onManualAdd={handleManualAdd}
        onReload={() => {
          void refreshBudgetAlerts();
        }}
        variant="fab"
      />
    </div>
  );
}
