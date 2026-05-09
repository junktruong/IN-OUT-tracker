"use client";

import { readUserJsonDocument, writeUserJsonDocument } from "@/lib/offline/opfsJson";
import type {
  BillDTO,
  BillPaymentDTO,
  BudgetAlertDTO,
  BudgetDTO,
  CategoryDTO,
  SettingsDTO,
  TransactionDTO,
} from "@/lib/types";
import type { BudgetPeriod } from "@/lib/domain/budgets";
import type { BudgetInput } from "@/lib/domain/budgets";
import type { SettingsInput } from "@/lib/domain/settings";

const settingsPath = ["settings.json"];
const billsPath = ["bills.json"];
const billPaymentsPath = ["bill-payments.json"];
const categoriesPath = ["categories.json"];
const budgetAlertsPath = ["budget-alerts.json"];

const budgetPeriodPath = (period: BudgetPeriod) => ["budgets", `${period}.json`];
const transactionsYearPath = (year: number) => ["transactions", `${year}.json`];
const settingsQueuePath = ["sync-jobs", "settings.json"];
const budgetsQueuePath = ["sync-jobs", "budgets.json"];

export type SettingsSyncJob = {
  operationId: string;
  mutationType: "upsert";
  payload: SettingsInput;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
};

export type BudgetSyncJob = {
  operationId: string;
  key: string;
  mutationType: "upsert";
  payload: BudgetInput;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
};

const normalizeBillPaymentsSnapshot = (value: unknown): BillPaymentDTO[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    const record = value as {
      occurrences?: unknown;
      payments?: unknown;
    };

    if (Array.isArray(record.occurrences)) {
      return record.occurrences;
    }

    if (Array.isArray(record.payments)) {
      return record.payments;
    }
  }

  return [];
};

export const readSettingsSnapshot = (userId: string) =>
  readUserJsonDocument<SettingsDTO>(userId, settingsPath, {
    paydayDay: 25,
    salaryExpected: 0,
  });

export const writeSettingsSnapshot = (userId: string, settings: SettingsDTO) =>
  writeUserJsonDocument(userId, settingsPath, settings);

export const readBillsSnapshot = (userId: string) =>
  readUserJsonDocument<BillDTO[]>(userId, billsPath, []);

export const writeBillsSnapshot = (userId: string, bills: BillDTO[]) =>
  writeUserJsonDocument(userId, billsPath, bills);

export const readBillPaymentsSnapshot = async (userId: string) =>
  normalizeBillPaymentsSnapshot(
    await readUserJsonDocument<unknown>(userId, billPaymentsPath, [])
  );

export const writeBillPaymentsSnapshot = (userId: string, payments: BillPaymentDTO[]) =>
  writeUserJsonDocument(userId, billPaymentsPath, payments);

export const readCategoriesSnapshot = (userId: string) =>
  readUserJsonDocument<CategoryDTO[]>(userId, categoriesPath, []);

export const writeCategoriesSnapshot = (userId: string, categories: CategoryDTO[]) =>
  writeUserJsonDocument(userId, categoriesPath, categories);

export const readBudgetAlertsSnapshot = (userId: string) =>
  readUserJsonDocument<BudgetAlertDTO[]>(userId, budgetAlertsPath, []);

export const writeBudgetAlertsSnapshot = (userId: string, alerts: BudgetAlertDTO[]) =>
  writeUserJsonDocument(userId, budgetAlertsPath, alerts);

export const readBudgetPeriodSnapshot = (userId: string, period: BudgetPeriod) =>
  readUserJsonDocument<BudgetDTO[]>(userId, budgetPeriodPath(period), []);

export const writeBudgetPeriodSnapshot = (
  userId: string,
  period: BudgetPeriod,
  items: BudgetDTO[]
) => writeUserJsonDocument(userId, budgetPeriodPath(period), items);

export const readTransactionsYearSnapshot = (userId: string, year: number) =>
  readUserJsonDocument<TransactionDTO[]>(userId, transactionsYearPath(year), []);

export const writeTransactionsYearSnapshot = (
  userId: string,
  year: number,
  items: TransactionDTO[]
) => writeUserJsonDocument(userId, transactionsYearPath(year), items);

export const readSettingsSyncQueue = (userId: string) =>
  readUserJsonDocument<SettingsSyncJob[]>(userId, settingsQueuePath, []);

export const writeSettingsSyncQueue = (userId: string, jobs: SettingsSyncJob[]) =>
  writeUserJsonDocument(userId, settingsQueuePath, jobs);

export const readBudgetsSyncQueue = (userId: string) =>
  readUserJsonDocument<BudgetSyncJob[]>(userId, budgetsQueuePath, []);

export const writeBudgetsSyncQueue = (userId: string, jobs: BudgetSyncJob[]) =>
  writeUserJsonDocument(userId, budgetsQueuePath, jobs);
