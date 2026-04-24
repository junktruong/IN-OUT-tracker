import { Card, CardContent } from "@/components/ui/card";

export type SummaryCardsProps = {
  monthSummary: { income: number; expense: number; net: number };
  reserveTotal: number;
  salaryExpected: number;
  payrollLabel: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

const cardClass = "rounded-3xl border border-latte bg-white shadow-[0_10px_32px_rgb(200,150,100,0.12)]";

const labelClass = "text-xs font-semibold uppercase tracking-wide text-caramel";

export function SummaryCards({
  monthSummary,
  reserveTotal,
  salaryExpected,
  payrollLabel,
}: SummaryCardsProps) {
  const expectedBalance = salaryExpected - reserveTotal;

  return (
    <Card className={cardClass}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-mocha">Tổng quan tháng</p>
            <p className="mt-1 text-xs text-caramel">{payrollLabel}</p>
          </div>
          <p className="text-right text-[11px] text-caramel">
            Lương dự kiến
            <span className="mt-1 block text-sm font-semibold text-mocha">
              {formatCurrency(salaryExpected)}
            </span>
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-cream p-3">
            <p className={labelClass}>Thu tháng</p>
            <p className="mt-2 break-words text-lg font-semibold text-status-income sm:text-xl">
              {formatCurrency(monthSummary.income)}
            </p>
          </div>

          <div className="rounded-2xl bg-cream p-3">
            <p className={labelClass}>Chi tháng</p>
            <p className="mt-2 break-words text-lg font-semibold text-status-expense sm:text-xl">
              {formatCurrency(monthSummary.expense)}
            </p>
          </div>

          <div className="rounded-2xl bg-cream p-3">
            <p className={labelClass}>Ròng tháng</p>
            <p
              className={`mt-2 break-words text-2xl font-semibold sm:text-[2rem] ${
                monthSummary.net >= 0 ? "text-mocha" : "text-status-expense"
              }`}
            >
              {formatCurrency(monthSummary.net)}
            </p>
          </div>

          <div className="rounded-2xl bg-cream p-3">
            <p className={labelClass}>Dự trữ</p>
            <p className="mt-2 break-words text-xl font-semibold text-caramel sm:text-2xl">
              {formatCurrency(reserveTotal)}
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs font-medium text-caramel">
          {expectedBalance >= 0 ? "Còn lại" : "Thiếu"} so với lương dự kiến:{" "}
          <span className="text-mocha">{formatCurrency(Math.abs(expectedBalance))}</span>
        </p>
      </CardContent>
    </Card>
  );
}
