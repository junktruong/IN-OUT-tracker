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
  cycleType: "monthly" | "weekly" | "custom_days";
  cycleValue: number;
  group?: string;
  start?: string;
  end?: string;
  note?: string;
  paid: boolean;
  paidAt?: string;
  paidAmount?: number;
  paidNote?: string;
  createdAt?: string;
};

export type SettingsDTO = {
  paydayDay: number;
  salaryExpected: number;
};
