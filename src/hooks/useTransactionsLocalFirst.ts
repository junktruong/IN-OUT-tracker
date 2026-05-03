"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { quickParse } from "@/lib/domain/quickParse";
import type { TransactionInput } from "@/lib/domain/transactions";
import type { TransactionDTO } from "@/lib/types";
import {
  applySuccessfulTransactionSync,
  getPendingTransactionSyncJobs,
  getTransactionSyncOverview,
  listLocalTransactionsByYear,
  markTransactionSyncFailure,
  mergeTransactionsFromServer,
  queueLocalTransactionBulkCreate,
  queueLocalTransactionCreate,
  queueLocalTransactionDelete,
  queueLocalTransactionUpdate,
} from "@/lib/offline/transactionsStore";

type SyncState = {
  syncing: boolean;
  pendingCount: number;
  lastError?: string;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Không thể đồng bộ giao dịch.";

const isOnline = () => typeof navigator === "undefined" || navigator.onLine;

export function useTransactionsLocalFirst(userId: string | undefined, year: number) {
  const [transactions, setTransactions] = useState<TransactionDTO[]>([]);
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

    const overview = await getTransactionSyncOverview(userId);
    setSyncState((current) => ({
      ...current,
      pendingCount: overview.pendingCount,
      lastError: overview.lastError,
    }));
  }, [userId]);

  const loadLocalYear = useCallback(async () => {
    if (!userId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const items = await listLocalTransactionsByYear(userId, year);
    setTransactions(items);
    setLoading(false);
  }, [userId, year]);

  const fetchRemoteYear = useCallback(async () => {
    const response = await fetch(`/api/transactions?year=${year}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Không thể tải giao dịch từ server.");
    }

    const data = (await response.json()) as { items?: TransactionDTO[] };
    return data.items ?? [];
  }, [year]);

  const refreshFromServer = useCallback(async () => {
    if (!userId || !isOnline()) {
      return;
    }

    const remoteItems = await fetchRemoteYear();
    const merged = await mergeTransactionsFromServer(userId, year, remoteItems);
    setTransactions(merged);
    await refreshSyncState();
  }, [fetchRemoteYear, refreshSyncState, userId, year]);

  const syncPending = useCallback(async () => {
    if (!userId || !isOnline() || syncingRef.current) {
      return;
    }

    const jobs = await getPendingTransactionSyncJobs(userId);
    if (jobs.length === 0) {
      await refreshSyncState();
      return;
    }

    syncingRef.current = true;
    setSyncState((current) => ({ ...current, syncing: true }));

    try {
      const response = await fetch("/api/sync/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operations: jobs.map((job) => ({
            operationId: job.operationId,
            type: job.mutationType,
            clientId: job.clientId,
            serverId: job.serverId,
            payload: job.payload,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Server chưa nhận được batch sync.");
      }

      const data = (await response.json()) as {
        results?: Array<{
          operationId: string;
          clientId: string;
          serverId?: string;
          status: "applied" | "duplicate" | "deleted";
        }>;
      };

      await applySuccessfulTransactionSync(userId, data.results ?? []);
      await loadLocalYear();
      await refreshSyncState();
    } catch (error) {
      const message = getErrorMessage(error);
      await markTransactionSyncFailure(userId, jobs, message);
      await loadLocalYear();
      await refreshSyncState();
    } finally {
      syncingRef.current = false;
      setSyncState((current) => ({ ...current, syncing: false }));
    }
  }, [loadLocalYear, refreshSyncState, userId]);

  useEffect(() => {
    let ignore = false;

    const boot = async () => {
      setLoading(true);
      await loadLocalYear();
      await refreshSyncState();

      if (ignore || !userId) {
        return;
      }

      if (isOnline()) {
        await syncPending();
        if (!ignore) {
          await refreshFromServer();
        }
      }
    };

    void boot();

    const handleOnline = () => {
      void syncPending().then(() => refreshFromServer());
    };

    const intervalId = window.setInterval(() => {
      if (!ignore && isOnline()) {
        void syncPending().then(() => refreshFromServer());
      }
    }, 15000);

    window.addEventListener("online", handleOnline);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
    };
  }, [loadLocalYear, refreshFromServer, refreshSyncState, syncPending, userId]);

  const createTransaction = useCallback(
    async (payload: TransactionInput) => {
      if (!userId) {
        throw new Error("Không có thông tin đăng nhập cục bộ.");
      }

      await queueLocalTransactionCreate(userId, payload);
      await loadLocalYear();
      await refreshSyncState();
      void syncPending();
    },
    [loadLocalYear, refreshSyncState, syncPending, userId]
  );

  const createTransactionsFromQuickInput = useCallback(
    async (dayKey: string, raw: string) => {
      if (!userId) {
        throw new Error("Không có thông tin đăng nhập cục bộ.");
      }

      const parsed = quickParse(raw);
      const payloads = parsed.items.map((item) => ({
        date: dayKey,
        type: item.type,
        amount: item.amount,
        category: item.category,
        desc: item.desc,
        source: item.source,
      })) satisfies TransactionInput[];

      if (payloads.length > 0) {
        await queueLocalTransactionBulkCreate(userId, payloads);
        await loadLocalYear();
        await refreshSyncState();
        void syncPending();
      }

      return {
        added: payloads.length,
        skipped: parsed.skipped,
      };
    },
    [loadLocalYear, refreshSyncState, syncPending, userId]
  );

  const updateTransaction = useCallback(
    async (id: string, payload: TransactionInput) => {
      if (!userId) {
        throw new Error("Không có thông tin đăng nhập cục bộ.");
      }

      await queueLocalTransactionUpdate(userId, id, payload);
      await loadLocalYear();
      await refreshSyncState();
      void syncPending();
    },
    [loadLocalYear, refreshSyncState, syncPending, userId]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!userId) {
        throw new Error("Không có thông tin đăng nhập cục bộ.");
      }

      await queueLocalTransactionDelete(userId, id);
      await loadLocalYear();
      await refreshSyncState();
      void syncPending();
    },
    [loadLocalYear, refreshSyncState, syncPending, userId]
  );

  const forceRefresh = useCallback(async () => {
    await syncPending();
    await refreshFromServer();
  }, [refreshFromServer, syncPending]);

  return {
    transactions,
    loading,
    syncState,
    createTransaction,
    createTransactionsFromQuickInput,
    updateTransaction,
    deleteTransaction,
    forceRefresh,
  };
}
