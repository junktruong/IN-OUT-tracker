"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { CalendarMonth } from "@/components/dashboard/CalendarMonth";
import { DayPanel } from "@/components/dashboard/DayPanel";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { BillsInWindow } from "@/components/dashboard/BillsInWindow";
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

  const loadMonth = async (targetMonth: string) => {
    const response = await fetch(`/api/transactions?month=${targetMonth}`);
    const data = await response.json();
    setTransactions(data.items ?? []);
  };

  const loadBills = async () => {
    const response = await fetch("/api/bills");
    const data = await response.json();
    setBills(data.items ?? []);
  };

  const loadSettings = async () => {
    const response = await fetch("/api/settings");
    const data = await response.json();
    setSettings(data);
  };

  useEffect(() => {
    loadSettings();
    loadBills();
    loadMonth(month);
  }, []);

  useEffect(() => {
    loadMonth(month);
  }, [month]);

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
    const data = await response.json();
    return data;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Button variant="outline" size="sm" onClick={() => handleMonthChange(-1)}>
              <ChevronLeft className="h-4 w-4" />
              Prev month
            </Button>
            <span className="text-base font-semibold">{month}</span>
            <Button variant="outline" size="sm" onClick={() => handleMonthChange(1)}>
              Next month
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
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
          onReload={() => loadMonth(month)}
        />
      </div>

      <div className="text-xs text-muted-foreground">
        Tổng giao dịch trong tháng: {formatCurrency(monthSummary.expense + monthSummary.income)}
      </div>
    </div>
  );
}
