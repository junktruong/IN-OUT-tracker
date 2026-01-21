"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { expenseByCategory, groupByDaySeries, topCategories } from "@/lib/domain/analytics";
import type { TransactionDTO } from "@/lib/types";

type AnalyticsSectionProps = {
  monthKey: string;
  transactions: TransactionDTO[];
  monthSummary: { income: number; expense: number; net: number };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

const COLORS = ["#10b981", "#f43f5e", "#f59e0b", "#3b82f6", "#8b5cf6", "#14b8a6", "#f97316", "#6366f1"];

export function AnalyticsSection({ monthKey, transactions, monthSummary }: AnalyticsSectionProps) {
  const trendSeries = useMemo(() => groupByDaySeries(monthKey, transactions), [monthKey, transactions]);
  const categorySeries = useMemo(
    () => topCategories(expenseByCategory(transactions)),
    [transactions]
  );
  const overviewSeries = useMemo(
    () => [
      { name: "Thu", value: monthSummary.income },
      { name: "Chi", value: monthSummary.expense },
    ],
    [monthSummary]
  );

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">Phân tích tháng</CardTitle>
        <p className="text-xs text-muted-foreground">Theo dõi xu hướng chi/thu của tháng {monthKey}</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trend" className="space-y-4">
          <TabsList className="flex w-full flex-wrap justify-start gap-2 md:w-auto md:gap-0">
            <TabsTrigger value="trend">Xu hướng</TabsTrigger>
            <TabsTrigger value="category">Danh mục</TabsTrigger>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          </TabsList>

          <TabsContent value="trend">
            <div className="h-64 w-full sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Chi"
                    stroke="#f43f5e"
                    fill="url(#expenseGradient)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Thu"
                    stroke="#10b981"
                    fill="url(#incomeGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="category">
            {categorySeries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có giao dịch chi tiêu trong tháng.</p>
            ) : (
              <div className="h-64 w-full sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categorySeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} angle={-20} dy={10} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="amount" name="Chi" radius={[6, 6, 0, 0]}>
                      {categorySeries.map((entry, index) => (
                        <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          <TabsContent value="overview">
            {monthSummary.income === 0 && monthSummary.expense === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu tổng quan trong tháng.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
                <div className="h-64 w-full sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Pie
                        data={overviewSeries}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {overviewSeries.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs uppercase text-muted-foreground">Thu</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-600">
                      {formatCurrency(monthSummary.income)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs uppercase text-muted-foreground">Chi</p>
                    <p className="mt-1 text-lg font-semibold text-rose-600">
                      {formatCurrency(monthSummary.expense)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs uppercase text-muted-foreground">Ròng</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatCurrency(monthSummary.net)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
