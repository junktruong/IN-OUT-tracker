import { Card, CardContent } from "@/components/ui/card";

export type SummaryCardsProps = {
  monthSummary: { income: number; expense: number; net: number };
  reserveTotal: number;
  salaryExpected: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

const cardClass =
  "rounded-3xl border border-latte bg-white shadow-[0_10px_32px_rgb(200,150,100,0.12)]";

const labelClass = "text-xs font-semibold uppercase tracking-wide text-caramel";

export function SummaryCards({ monthSummary, reserveTotal, salaryExpected }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className={cardClass}>
        <CardContent className="p-5 sm:p-6">
          <p className={labelClass}>Thu tháng</p>
          <p className="mt-3 break-words text-2xl font-semibold text-status-income sm:text-3xl">
            {formatCurrency(monthSummary.income)}
          </p>
          <p className="mt-2 text-sm text-caramel">Dòng tiền vào</p>
        </CardContent>
      </Card>
      <Card className={cardClass}>
        <CardContent className="p-5 sm:p-6">
          <p className={labelClass}>Chi tháng</p>
          <p className="mt-3 break-words text-2xl font-semibold text-status-expense sm:text-3xl">
            {formatCurrency(monthSummary.expense)}
          </p>
          <p className="mt-2 text-sm text-caramel">Dòng tiền ra</p>
        </CardContent>
      </Card>
      <Card className={cardClass}>
        <CardContent className="p-5 sm:p-6">
          <p className={labelClass}>Ròng tháng</p>
          <p className="mt-3 break-words text-2xl font-semibold text-mocha sm:text-3xl">
            {formatCurrency(monthSummary.net)}
          </p>
          <p className="mt-2 text-sm text-caramel">Thu trừ chi</p>
        </CardContent>
      </Card>
      <Card className={cardClass}>
        <CardContent className="p-5 sm:p-6">
          <p className={labelClass}>Dự trù trước lương tới</p>
          <p className="mt-3 break-words text-2xl font-semibold text-mocha sm:text-3xl">
            {formatCurrency(reserveTotal)}
          </p>
          <p className="mt-2 text-sm font-medium text-caramel">
            Dư/Thiếu: {formatCurrency(salaryExpected - reserveTotal)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
