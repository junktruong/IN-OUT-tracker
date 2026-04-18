import { Card, CardContent } from "@/components/ui/card";

export type SummaryCardsProps = {
  monthSummary: { income: number; expense: number; net: number };
  reserveTotal: number;
  salaryExpected: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function SummaryCards({ monthSummary, reserveTotal, salaryExpected }: SummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardContent className="p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Thu tháng
          </p>
          <p className="mt-2 break-words text-xl font-semibold text-emerald-600 sm:text-2xl">
            {formatCurrency(monthSummary.income)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Chi tháng
          </p>
          <p className="mt-2 break-words text-xl font-semibold text-rose-600 sm:text-2xl">
            {formatCurrency(monthSummary.expense)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Ròng tháng
          </p>
          <p className="mt-2 break-words text-xl font-semibold text-foreground sm:text-2xl">
            {formatCurrency(monthSummary.net)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Dự trù trước lương tới
          </p>
          <p className="mt-2 break-words text-xl font-semibold text-amber-600 sm:text-2xl">
            {formatCurrency(reserveTotal)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Dư/Thiếu: {formatCurrency(salaryExpected - reserveTotal)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
