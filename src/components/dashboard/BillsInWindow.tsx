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
    <Card className="rounded-3xl border border-latte bg-white shadow-sm shadow-amber-900/5">
      <CardContent className="p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-mocha">Khoản cần đóng trong kỳ</p>
          <span className="text-sm font-semibold text-caramel sm:text-xs">
            {formatCurrency(reserveTotal)}
          </span>
        </div>
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
                  <p className="break-words text-sm font-medium text-mocha">{bill.name}</p>
                  <p className="text-xs text-caramel">Đến hạn {bill.dueDate}</p>
                </div>
                <p className="break-words text-sm font-semibold text-mocha sm:text-right">
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
