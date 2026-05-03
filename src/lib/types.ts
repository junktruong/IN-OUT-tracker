export type TransactionSyncStatus =
  | "synced"
  | "pending_create"
  | "pending_update"
  | "pending_delete"
  | "sync_error";

export type TransactionDTO = {
  id: string;
  clientId?: string;
  serverId?: string;
  date: string;
  type: "expense" | "income";
  amount: number;
  categoryId?: string;
  category: string;
  desc: string;
  source?: string;
  method?: string;
  account?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
  syncStatus?: TransactionSyncStatus;
  lastSyncError?: string;
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

export type CategoryDTO = {
  id: string;
  name: string;
  icon: string;
  categoryType: "expense" | "income";
  kind: "system" | "custom";
};

export type BudgetAlertDTO = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  spent: number;
  amountLimit: number;
  remaining: number;
  ratio: number;
  period: "weekly" | "monthly" | "yearly";
  periodLabel: string;
};

export type BudgetDTO = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amountLimit: number;
  spent: number;
  remaining: number;
  ratio: number;
  period: "weekly" | "monthly" | "yearly";
  periodLabel: string;
};
