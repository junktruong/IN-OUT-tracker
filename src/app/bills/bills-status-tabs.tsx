"use client";

import { CheckCircle2, Clock3, Pencil, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BillDTO, BillPaymentDTO } from "@/lib/types";

export const billTabConfig = [
  {
    value: "unpaid",
    label: "Chưa đóng",
    loadingMessage: "Đang tải khoản đóng...",
    emptyMessage: "Không còn khoản nào chưa đóng.",
  },
  {
    value: "paid",
    label: "Lịch sử đóng",
    loadingMessage: "Đang tải lịch sử đã đóng...",
    emptyMessage: "Chưa có khoản nào đã đóng.",
  },
] as const;

export type BillsFilter = (typeof billTabConfig)[number]["value"];

export type UpcomingBillCard = {
  template: BillDTO;
  occurrence: BillPaymentDTO;
};

type BillsStatusTabsProps = {
  filter: BillsFilter;
  loading: boolean;
  upcomingBills: UpcomingBillCard[];
  paidHistory: BillPaymentDTO[];
  onFilterChange: (value: BillsFilter) => void;
  onEdit: (bill: BillDTO) => void;
  onDelete: (bill: BillDTO) => void;
  onConfirmPay: (bill: UpcomingBillCard) => void;
  onUnpay: (payment: BillPaymentDTO) => void;
  cycleLabel: (bill: Pick<BillDTO, "cycleType" | "cycleValue">) => string;
  formatCurrency: (value: number) => string;
  formatDueTag: (bill: Pick<BillDTO, "cycleType">, dueDate: string) => string;
};

const unpaidTab = billTabConfig[0];
const paidTab = billTabConfig[1];
const cardClass =
  "rounded-3xl border border-latte bg-white shadow-[0_10px_32px_rgb(200,150,100,0.12)]";

export function BillsStatusTabs({
  filter,
  loading,
  upcomingBills,
  paidHistory,
  onFilterChange,
  onEdit,
  onDelete,
  onConfirmPay,
  onUnpay,
  cycleLabel,
  formatCurrency,
  formatDueTag,
}: BillsStatusTabsProps) {
  return (
    <Tabs
      value={filter}
      onValueChange={(value) => onFilterChange(value as BillsFilter)}
      className="space-y-4"
    >
      <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-amber-100/80 p-1">
        {billTabConfig.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value={unpaidTab.value} className="mt-0">
        <div className="space-y-3">
          {loading ? (
            <Card className={cardClass}>
              <CardContent className="p-4 text-sm text-muted-foreground">
                {unpaidTab.loadingMessage}
              </CardContent>
            </Card>
          ) : upcomingBills.length === 0 ? (
            <Card className={cardClass}>
              <CardContent className="p-5 text-sm text-muted-foreground">
                <p className="font-semibold text-mocha">Danh sách trống</p>
                <p className="mt-1">{unpaidTab.emptyMessage}</p>
              </CardContent>
            </Card>
          ) : (
            upcomingBills.map((bill) => (
              <Card key={`${bill.template.id}:${bill.occurrence.dueDate}`} className={cardClass}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-status-expense/15 px-2.5 py-1 text-[11px] font-semibold text-mocha">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDueTag(bill.template, bill.occurrence.dueDate)}
                        </span>
                        <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-medium text-caramel">
                          {cycleLabel(bill.template)}
                        </span>
                      </div>

                      <div className="mt-3 rounded-2xl bg-cream p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words text-base font-semibold text-mocha">
                              {bill.template.name}
                            </p>
                            <p className="mt-1 text-xs text-caramel">
                              Kỳ cần đóng {bill.occurrence.dueDate}
                            </p>
                          </div>
                          <p className="text-lg font-semibold text-status-expense sm:text-right">
                            {formatCurrency(bill.template.amount)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 lg:min-w-[240px]">
                      <Button
                        className="w-full rounded-full"
                        size="sm"
                        onClick={() => onConfirmPay(bill)}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Xác nhận đã đóng
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          className="w-full rounded-full"
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(bill.template)}
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Sửa
                        </Button>
                        <Button
                          className="w-full rounded-full"
                          variant="outline"
                          size="sm"
                          onClick={() => onDelete(bill.template)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Xoá
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </TabsContent>

      <TabsContent value={paidTab.value} className="mt-0">
        <div className="space-y-3">
          {loading ? (
            <Card className={cardClass}>
              <CardContent className="p-4 text-sm text-muted-foreground">
                {paidTab.loadingMessage}
              </CardContent>
            </Card>
          ) : paidHistory.length === 0 ? (
            <Card className={cardClass}>
              <CardContent className="p-5 text-sm text-muted-foreground">
                <p className="font-semibold text-mocha">Chưa có lịch sử</p>
                <p className="mt-1">{paidTab.emptyMessage}</p>
              </CardContent>
            </Card>
          ) : (
            paidHistory.map((payment) => (
              <Card key={payment.id} className={cardClass}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-status-income/20 px-2.5 py-1 text-[11px] font-semibold text-mocha">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Đã đóng {payment.paidAt}
                        </span>
                        <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-medium text-caramel">
                          {cycleLabel(payment)}
                        </span>
                      </div>

                      <div className="mt-3 rounded-2xl bg-cream p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words text-base font-semibold text-mocha">
                              {payment.name}
                            </p>
                            <p className="mt-1 text-xs text-caramel">Kỳ {payment.dueDate}</p>
                          </div>
                          <p className="text-lg font-semibold text-status-income sm:text-right">
                            {formatCurrency(payment.paidAmount ?? payment.amount)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="lg:min-w-[220px]">
                      <Button
                        className="w-full rounded-full"
                        size="sm"
                        variant="outline"
                        onClick={() => onUnpay(payment)}
                      >
                        <RotateCcw className="mr-2 h-3.5 w-3.5" />
                        Hoàn tác khoản đã đóng
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
