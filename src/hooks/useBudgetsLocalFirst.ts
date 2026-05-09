"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import type { BudgetInput, BudgetPeriod } from "@/lib/domain/budgets";
import type { BudgetDTO, CategoryDTO } from "@/lib/types";
import {
  readBudgetPeriodSnapshot,
  readBudgetsSyncQueue,
  readCategoriesSnapshot,
  writeBudgetPeriodSnapshot,
  writeBudgetsSyncQueue,
  type BudgetSyncJob,
} from "@/lib/offline/userSnapshots";

type SyncState = {
  syncing: boolean;
  pendingCount: number;
  lastError?: string;
};

const isOnline = () => typeof navigator === "undefined" || navigator.onLine;

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const periodLabelMap: Record<BudgetPeriod, string> = {
  weekly: "tuần này",
  monthly: "tháng này",
  yearly: "năm nay",
};

export function useBudgetsLocalFirst(period: BudgetPeriod, categories: CategoryDTO[]) {
  const { user } = useAuth();
  const userId = user?.id;
  const [items, setItems] = useState<BudgetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>({
    syncing: false,
    pendingCount: 0,
  });
  const syncingRef = useRef(false);

  const refreshSyncState = useCallback(async () => {
    if (!userId) {
      setSyncState({ syncing: false, pendingCount: 0 });
      return;
    }

    const jobs = await readBudgetsSyncQueue(userId);
    const userJobs = jobs.filter((job) => job.payload.period === period);
    setSyncState((current) => ({
      ...current,
      pendingCount: userJobs.length,
      lastError: [...userJobs].reverse().find((item) => item.lastError)?.lastError,
    }));
  }, [period, userId]);

  const fetchRemote = useCallback(async () => {
    const response = await fetch(`/api/budgets?period=${period}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Không thể tải dữ liệu ngân sách.");
    }

    const data = (await response.json()) as { items?: BudgetDTO[] };
    return (data.items ?? []).map((item) => ({
      ...item,
      syncStatus: "synced" as const,
      lastSyncError: undefined,
    }));
  }, [period]);

  const loadLocal = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const snapshot = await readBudgetPeriodSnapshot(userId, period);
    setItems(snapshot);
    setLoading(false);
  }, [period, userId]);

  const syncPending = useCallback(async () => {
    if (!userId || !isOnline() || syncingRef.current) {
      return;
    }

    const jobs = await readBudgetsSyncQueue(userId);
    if (jobs.length === 0) {
      await refreshSyncState();
      return;
    }

    const categoriesSnapshot = await readCategoriesSnapshot(userId);
    const mappedJobs = jobs
      .map((job) => {
        const category = categoriesSnapshot.find(
          (item) => item.id === job.payload.categoryId || item.clientId === job.payload.categoryId
        );

        if (!category?.serverId && category?.syncStatus && category.syncStatus !== "synced") {
          return null;
        }

        return {
          ...job,
          payload: {
            ...job.payload,
            categoryId: category?.serverId ?? category?.id ?? job.payload.categoryId,
          },
        };
      })
      .filter((job): job is BudgetSyncJob => job !== null);

    if (mappedJobs.length === 0) {
      await refreshSyncState();
      return;
    }

    syncingRef.current = true;
    setSyncState((current) => ({ ...current, syncing: true }));

    try {
      const response = await fetch("/api/sync/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operations: mappedJobs.map((job) => ({
            operationId: job.operationId,
            type: job.mutationType,
            payload: job.payload,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Server chưa nhận được sync ngân sách.");
      }

      const remaining = jobs.filter(
        (job) => !mappedJobs.some((mapped) => mapped.operationId === job.operationId)
      );
      await writeBudgetsSyncQueue(userId, remaining);

      const remote = await fetchRemote();
      await writeBudgetPeriodSnapshot(userId, period, remote);
      setItems(remote);
      await refreshSyncState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đồng bộ ngân sách.";
      const failedAt = new Date().toISOString();
      const failedIds = new Set(mappedJobs.map((job) => job.operationId));
      const nextJobs = jobs.map((job) =>
        failedIds.has(job.operationId)
          ? {
              ...job,
              attempts: job.attempts + 1,
              updatedAt: failedAt,
              lastError: message,
            }
          : job
      );
      await writeBudgetsSyncQueue(userId, nextJobs);

      const snapshot = await readBudgetPeriodSnapshot(userId, period);
      const nextItems = snapshot.map((item) =>
        nextJobs.some((job) => job.key === `${item.categoryId}:${item.period}`)
          ? {
              ...item,
              syncStatus: "sync_error" as const,
              lastSyncError: message,
            }
          : item
      );
      await writeBudgetPeriodSnapshot(userId, period, nextItems);
      setItems(nextItems);
      await refreshSyncState();
    } finally {
      syncingRef.current = false;
      setSyncState((current) => ({ ...current, syncing: false }));
    }
  }, [fetchRemote, period, refreshSyncState, userId]);

  useEffect(() => {
    let ignore = false;

    const boot = async () => {
      setLoading(true);
      await loadLocal();
      await refreshSyncState();

      if (ignore || !userId || !isOnline()) {
        return;
      }

      await syncPending();
      if (!ignore) {
        try {
          const remote = await fetchRemote();
          await writeBudgetPeriodSnapshot(userId, period, remote);
          setItems(remote);
        } catch {
          // Keep local snapshot.
        }
      }
    };

    void boot();

    const handleOnline = () => {
      void syncPending();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      ignore = true;
      window.removeEventListener("online", handleOnline);
    };
  }, [fetchRemote, loadLocal, period, refreshSyncState, syncPending, userId]);

  const saveBudget = useCallback(
    async (payload: BudgetInput) => {
      if (!userId) {
        throw new Error("Không có thông tin đăng nhập cục bộ.");
      }

      const category = categories.find((item) => item.id === payload.categoryId);
      if (!category) {
        throw new Error("Không tìm thấy danh mục cục bộ.");
      }

      const now = new Date().toISOString();
      const existing = items.find(
        (item) => item.categoryId === payload.categoryId && item.period === payload.period
      );
      const spent = existing?.spent ?? 0;
      const nextItem: BudgetDTO = {
        id: existing?.id ?? `${payload.categoryId}:${payload.period}`,
        categoryId: payload.categoryId,
        categoryName: category.name,
        categoryIcon: category.icon,
        amountLimit: payload.amountLimit,
        spent,
        remaining: payload.amountLimit - spent,
        ratio: payload.amountLimit > 0 ? spent / payload.amountLimit : 0,
        period: payload.period,
        periodLabel: periodLabelMap[payload.period],
        updatedAt: now,
        syncStatus: "pending_upsert",
        lastSyncError: undefined,
      };

      const nextItems = [
        ...items.filter(
          (item) => !(item.categoryId === payload.categoryId && item.period === payload.period)
        ),
        nextItem,
      ].sort((left, right) => left.categoryName.localeCompare(right.categoryName, "vi"));

      const queue = await readBudgetsSyncQueue(userId);
      const key = `${payload.categoryId}:${payload.period}`;
      const nextJobs: BudgetSyncJob[] = [
        ...queue.filter((job) => job.key !== key),
        {
          operationId: createId(),
          key,
          mutationType: "upsert",
          payload,
          attempts: 0,
          createdAt: now,
          updatedAt: now,
        },
      ];

      await writeBudgetPeriodSnapshot(userId, period, nextItems);
      await writeBudgetsSyncQueue(userId, nextJobs);
      setItems(nextItems);
      await refreshSyncState();
      void syncPending();
    },
    [categories, items, period, refreshSyncState, syncPending, userId]
  );

  return {
    items,
    loading,
    syncState,
    saveBudget,
  };
}
