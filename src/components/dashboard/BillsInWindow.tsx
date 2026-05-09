import { Card, CardContent } from "@/components/ui/card";

export type ReserveBill = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: "paid" | "unpaid";
  paidAt?: string;
  nextDueDate?: string;
};

export function BillsInWindow({
  bills,
  reserveTotal,
  plannedTotal,
  paidTotal,
  payrollLabel,
}: {
  bills: ReserveBill[];
  reserveTotal: number;
  plannedTotal: number;
  paidTotal: number;
  payrollLabel: string;
}) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN").format(value);

  const unpaidCount = bills.filter((bill) => bill.status === "unpaid").length;
  const paidCount = bills.length - unpaidCount;

  return (
    <Card className="rounded-3xl border border-latte bg-white shadow-sm shadow-amber-900/5">
      <CardContent className="p-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-mocha">Khoản cần đóng trước kỳ lương kế tiếp</p>
          <p className="text-xs text-caramel">{payrollLabel}</p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-cream px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-caramel">
              Tổng cần đóng
            </p>
            <p className="mt-1 text-sm font-semibold text-mocha">{formatCurrency(plannedTotal)}</p>
          </div>
          <div className="rounded-2xl bg-cream px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-caramel">
              Đã đóng
            </p>
            <p className="mt-1 text-sm font-semibold text-status-income">{formatCurrency(paidTotal)}</p>
          </div>
          <div className="rounded-2xl bg-cream px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-caramel">
              Còn phải giữ
            </p>
            <p className="mt-1 text-sm font-semibold text-status-expense">{formatCurrency(reserveTotal)}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-caramel">
          Đã đóng {paidCount} khoản, còn {unpaidCount} khoản chưa đóng trong kỳ này.
        </p>
        <div className="mt-3 space-y-2">
          {bills.length === 0 ? (
            <p className="rounded-2xl bg-cream px-3 py-4 text-xs text-caramel">
              Không có khoản cần đóng.
            </p>
          ) : (
            bills.map((bill) => (
              <div
                key={`${bill.id}-${bill.dueDate}`}
                className="flex flex-col gap-2 rounded-2xl bg-cream px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words text-sm font-medium text-mocha">{bill.name}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        bill.status === "paid"
                          ? "bg-status-income/25 text-mocha"
                          : "bg-status-expense/20 text-mocha"
                      }`}
                    >
                      {bill.status === "paid" ? "Đã đóng" : "Chưa đóng"}
                    </span>
                  </div>
                  <p className="text-xs text-caramel">
                    Đến hạn {bill.dueDate}
                    {bill.status === "paid" && bill.paidAt ? ` • Đã đóng ${bill.paidAt}` : ""}
                    {bill.status === "paid" && bill.nextDueDate ? ` • Kỳ sau ${bill.nextDueDate}` : ""}
                  </p>
                </div>
                <p
                  className={`break-words text-sm font-semibold sm:text-right ${
                    bill.status === "paid" ? "text-status-income" : "text-mocha"
                  }`}
                >
                  {formatCurrency(bill.amount)}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
