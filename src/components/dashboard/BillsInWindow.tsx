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
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Khoản cần đóng trong kỳ</p>
          <span className="text-xs font-semibold text-amber-600">
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
                className="flex items-center justify-between rounded-xl border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{bill.name}</p>
                  <p className="text-xs text-muted-foreground">Đến hạn {bill.dueDate}</p>
                </div>
                <p className="text-sm font-semibold">{formatCurrency(bill.amount)}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
