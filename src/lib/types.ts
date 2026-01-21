export type TransactionDTO = {
  id: string;
  date: string;
  type: "expense" | "income";
  amount: number;
  category: string;
  desc: string;
  source?: string;
  method?: string;
  account?: string;
  note?: string;
  createdAt: string;
};

export type BillDTO = {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  group?: string;
  start?: string;
  end?: string;
  note?: string;
  paid: boolean;
  paidAt?: string;
};

export type SettingsDTO = {
  paydayDay: number;
  salaryExpected: number;
};
