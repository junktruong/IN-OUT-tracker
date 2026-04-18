"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { CalendarMonth } from "@/components/dashboard/CalendarMonth";
import { DayPanel } from "@/components/dashboard/DayPanel";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { BillsInWindow } from "@/components/dashboard/BillsInWindow";
import { AnalyticsSection } from "@/components/dashboard/AnalyticsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { addMonths, monthKey, toYmd } from "@/lib/domain/date";
import { payrollWindow } from "@/lib/domain/payroll";
import { reserveInWindow } from "@/lib/domain/reserve";
import type { BillDTO, SettingsDTO, TransactionDTO } from "@/lib/types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export default function HomePage() {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => toYmd(new Date()));
  const [transactions, setTransactions] = useState<TransactionDTO[]>([]);
  const [bills, setBills] = useState<BillDTO[]>([]);
  const [settings, setSettings] = useState<SettingsDTO>({ paydayDay: 25, salaryExpected: 0 });

  const fetchMonth = useCallback(async (targetMonth: string) => {
    const response = await fetch(`/api/transactions?month=${targetMonth}`);
    if (!response.ok) {
      throw new Error("Không thể tải giao dịch.");
    }
    const data = await response.json();
    return (data.items ?? []) as TransactionDTO[];
  }, []);

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

  const loadMonth = useCallback(async (targetMonth: string) => {
    setTransactions(await fetchMonth(targetMonth));
  }, [fetchMonth]);

  useEffect(() => {
    let ignore = false;

    const loadInitialData = async () => {
      const [settingsData, billsData] = await Promise.all([fetchSettings(), fetchBills()]);
      if (ignore) {
        return;
      }
      setSettings(settingsData);
      setBills(billsData);
    };

    void loadInitialData();

    return () => {
      ignore = true;
    };
  }, [fetchBills, fetchSettings]);

  useEffect(() => {
    let ignore = false;

    const loadSelectedMonth = async () => {
      const items = await fetchMonth(month);
      if (!ignore) {
        setTransactions(items);
      }
    };

    void loadSelectedMonth();

    return () => {
      ignore = true;
    };
  }, [fetchMonth, month]);

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
    return transactions.reduce(
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
  }, [transactions]);

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
      dueDay: bill.dueDay,
      paid: bill.paid,
      start: bill.start ? new Date(bill.start) : null,
      end: bill.end ? new Date(bill.end) : null,
    })),
    payroll
  );

  const payrollLabel = `${toYmd(payroll.lastPay)} → ${toYmd(payroll.nextPay)}`;

  const handleMonthChange = (delta: number) => {
    const next = addMonths(month, delta);
    setMonth(next);
    if (!selectedDay.startsWith(next)) {
      setSelectedDay(`${next}-01`);
    }
  };

  const handleQuickAdd = async (raw: string) => {
    const response = await fetch("/api/transactions/quick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDay, raw }),
    });
    if (!response.ok) {
      throw new Error("Không thể thêm giao dịch.");
    }
    const data = await response.json();
    return data;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm font-semibold lg:w-auto">
            <Button
              className="w-full px-2 sm:px-3"
              variant="outline"
              size="sm"
              onClick={() => handleMonthChange(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Trước
            </Button>
            <span className="px-2 text-center text-base font-semibold tabular-nums">{month}</span>
            <Button
              className="w-full px-2 sm:px-3"
              variant="outline"
              size="sm"
              onClick={() => handleMonthChange(1)}
            >
              Sau
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground lg:text-right">
            <span className="font-semibold text-foreground">Kỳ lương:</span> {payrollLabel}
          </div>
        </CardContent>
      </Card>

      <SummaryCards
        monthSummary={monthSummary}
        reserveTotal={reserve.total}
        salaryExpected={settings.salaryExpected}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <CalendarMonth
            monthKey={month}
            byDay={byDay}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
          <BillsInWindow bills={reserve.items} reserveTotal={reserve.total} />
        </div>
        <DayPanel
          dayKey={selectedDay}
          items={dayItems}
          daySummary={daySummary}
          onQuickAdd={handleQuickAdd}
          onReload={() => {
            void loadMonth(month);
          }}
        />
      </div>

      <AnalyticsSection monthKey={month} transactions={transactions} monthSummary={monthSummary} />

      <div className="text-xs text-muted-foreground">
        Tổng giao dịch trong tháng: {formatCurrency(monthSummary.expense + monthSummary.income)}
      </div>
    </div>
  );
}
