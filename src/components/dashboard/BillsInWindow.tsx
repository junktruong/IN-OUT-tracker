import { Card, CardContent } from "@/components/ui/card";

export type ReserveBill = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
};

export function BillsInWindow({ bills, reserveTotal }: { bills: ReserveBill[]; reserveTotal: number }) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN").format(value);

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold">Khoản cần đóng trong kỳ</p>
          <span className="text-sm font-semibold text-amber-600 sm:text-xs">
            {formatCurrency(reserveTotal)}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {bills.length === 0 ? (
            <p className="text-xs text-muted-foreground">Không có khoản cần đóng.</p>
          ) : (
            bills.map((bill) => (
              <div
                key={bill.id}
                className="flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">{bill.name}</p>
                  <p className="text-xs text-muted-foreground">Đến hạn {bill.dueDate}</p>
                </div>
                <p className="break-words text-sm font-semibold sm:text-right">
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
