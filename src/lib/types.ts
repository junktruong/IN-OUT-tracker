export type TransactionSyncStatus =
  | "synced"
  | "pending_create"
  | "pending_update"
  | "pending_delete"
  | "sync_error";

export type CategorySyncStatus = "synced" | "pending_create" | "sync_error";
export type BillSyncStatus =
  | "synced"
  | "pending_upsert"
  | "pending_delete"
  | "pending_pay"
  | "pending_unpay"
  | "sync_error";
export type BudgetSyncStatus = "synced" | "pending_upsert" | "sync_error";
export type SettingsSyncStatus = "synced" | "pending_upsert" | "sync_error";

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
  clientId?: string;
  serverId?: string;
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
  updatedAt?: string;
  syncStatus?: BillSyncStatus;
  lastSyncError?: string;
};

export type SettingsDTO = {
  paydayDay: number;
  salaryExpected: number;
  updatedAt?: string;
  syncStatus?: SettingsSyncStatus;
  lastSyncError?: string;
};

export type CategoryDTO = {
  id: string;
  clientId?: string;
  serverId?: string;
  name: string;
  slug?: string;
  icon: string;
  categoryType: "expense" | "income";
  kind: "system" | "custom";
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: CategorySyncStatus;
  lastSyncError?: string;
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
  updatedAt?: string;
  syncStatus?: BudgetSyncStatus;
  lastSyncError?: string;
};
