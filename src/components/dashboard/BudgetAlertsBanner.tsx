import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { BudgetAlertDTO } from "@/lib/types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.abs(value));

const buildAlertText = (alert: BudgetAlertDTO) => {
  if (alert.remaining >= 0) {
    return `Quỹ '${alert.categoryName}' ${alert.periodLabel} chỉ còn ${formatCurrency(alert.remaining)}đ.`;
  }

  return `Quỹ '${alert.categoryName}' ${alert.periodLabel} đã vượt ${formatCurrency(alert.remaining)}đ.`;
};

export function BudgetAlertsBanner({ alerts }: { alerts: BudgetAlertDTO[] }) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card className="rounded-3xl border border-latte bg-amber-50 shadow-sm shadow-amber-900/5">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-honey/70 p-2 text-mocha">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-mocha">Cảnh báo ngân sách</p>
            <div className="space-y-1.5">
              {alerts.slice(0, 3).map((alert) => (
                <p key={alert.id} className="text-sm text-caramel">
                  <span className="mr-1">{alert.categoryIcon}</span>
                  <span className="font-medium text-mocha">Chú ý:</span> {buildAlertText(alert)}
                </p>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
