"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import type { BillInput, BillPayInput } from "@/lib/domain/bills";
import type { BillDTO } from "@/lib/types";
import {
  readBillsSnapshot,
  readBillsSyncQueue,
  writeBillsSnapshot,
  writeBillsSyncQueue,
  type BillSyncJob,
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

const getBillKey = (bill: Pick<BillDTO, "id" | "clientId" | "serverId">) =>
  bill.clientId ?? bill.serverId ?? bill.id;

const isSameBill = (bill: Pick<BillDTO, "id" | "clientId" | "serverId">, key: string) =>
  bill.id === key || bill.clientId === key || bill.serverId === key;

const markFailedBills = (items: BillDTO[], jobs: BillSyncJob[], message: string) => {
  const failedKeys = new Set(jobs.map((job) => job.clientId));
  return items.map((item) =>
    failedKeys.has(getBillKey(item))
      ? {
          ...item,
          syncStatus: "sync_error" as const,
          lastSyncError: message,
        }
      : item
  );
};

export function useBillsLocalFirst() {
  const { user } = useAuth();
  const userId = user?.id;
  const [items, setItems] = useState<BillDTO[]>([]);
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

    const jobs = await readBillsSyncQueue(userId);
    setSyncState((current) => ({
      ...current,
      pendingCount: jobs.length,
      lastError: [...jobs].reverse().find((item) => item.lastError)?.lastError,
    }));
  }, [userId]);

  const fetchRemote = useCallback(async () => {
    const response = await fetch("/api/bills", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Không thể tải khoản đóng.");
    }

    const data = (await response.json()) as { items?: BillDTO[] };
    return (data.items ?? []).map((item) => ({
      ...item,
      syncStatus: "synced" as const,
      lastSyncError: undefined,
    }));
  }, []);

  const loadLocal = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const snapshot = await readBillsSnapshot(userId);
    setItems(snapshot);
    setLoading(false);
  }, [userId]);

  const syncPending = useCallback(async () => {
    if (!userId || !isOnline() || syncingRef.current) {
      return;
    }

    const jobs = await readBillsSyncQueue(userId);
    if (jobs.length === 0) {
      await refreshSyncState();
      return;
    }

    syncingRef.current = true;
    setSyncState((current) => ({ ...current, syncing: true }));

    try {
      const response = await fetch("/api/sync/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operations: [...jobs]
            .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
            .map((job) => ({
              operationId: job.operationId,
              type: job.mutationType,
              clientId: job.clientId,
              serverId: job.serverId,
              payload: job.payload,
            })),
        }),
      });

      if (!response.ok) {
        throw new Error("Server chưa nhận được sync khoản đóng.");
      }

      await writeBillsSyncQueue(userId, []);
      const remote = await fetchRemote();
      await writeBillsSnapshot(userId, remote);
      setItems(remote);
      await refreshSyncState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đồng bộ khoản đóng.";
      const failedAt = new Date().toISOString();
      const nextJobs = jobs.map((job) => ({
        ...job,
        attempts: job.attempts + 1,
        updatedAt: failedAt,
        lastError: message,
      }));
      await writeBillsSyncQueue(userId, nextJobs);

      const snapshot = await readBillsSnapshot(userId);
      const nextItems = markFailedBills(snapshot, jobs, message);
      await writeBillsSnapshot(userId, nextItems);
      setItems(nextItems);
      await refreshSyncState();
    } finally {
      syncingRef.current = false;
      setSyncState((current) => ({ ...current, syncing: false }));
    }
  }, [fetchRemote, refreshSyncState, userId]);

  useEffect(() => {
    let ignore = false;

    const boot = async () => {
      setLoading(true);
      await loadLocal();
      await refreshSyncState();

      if (ignore || !userId) {
        return;
      }

      if (isOnline()) {
        await syncPending();
        if (!ignore) {
          try {
            const remote = await fetchRemote();
            await writeBillsSnapshot(userId, remote);
            setItems(remote);
          } catch {
            // Keep local snapshot while offline.
          }
        }
      }
    };

    void boot();

    const handleOnline = () => {
      void syncPending();
    };

    const intervalId = window.setInterval(() => {
      if (!ignore && isOnline()) {
        void syncPending();
      }
    }, 15000);

    window.addEventListener("online", handleOnline);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
    };
  }, [fetchRemote, loadLocal, refreshSyncState, syncPending, userId]);

  const saveBill = useCallback(
    async (payload: BillInput, billId?: string) => {
      if (!userId) {
        throw new Error("Không có thông tin đăng nhập cục bộ.");
      }

      const existing = billId
        ? items.find((item) => isSameBill(item, billId))
        : undefined;
      const clientId = existing?.clientId ?? existing?.id ?? createId();
      const serverId = existing?.serverId;
      const now = new Date().toISOString();

      const nextItem: BillDTO = {
        id: clientId,
        clientId,
        serverId,
        name: payload.name,
        amount: payload.amount,
        cycleType: payload.cycleType,
        cycleValue: payload.cycleValue,
        group: payload.group,
        start: payload.start,
        end: payload.end,
        note: payload.note,
        paid: existing?.paid ?? false,
        paidAt: existing?.paidAt,
        paidAmount: existing?.paidAmount,
        paidNote: existing?.paidNote,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        syncStatus: "pending_upsert",
        lastSyncError: undefined,
      };

      const nextItems = [
        ...items.filter((item) => !isSameBill(item, clientId)),
        nextItem,
      ];

      const queue = await readBillsSyncQueue(userId);
      const nextJobs: BillSyncJob[] = [
        ...queue.filter(
          (job) =>
            !(
              job.clientId === clientId &&
              (job.mutationType === "upsert" || job.mutationType === "delete")
            )
        ),
        {
          operationId: createId(),
          clientId,
          serverId,
          mutationType: "upsert",
          payload,
          attempts: 0,
          createdAt: now,
          updatedAt: now,
        },
      ];

      await writeBillsSnapshot(userId, nextItems);
      await writeBillsSyncQueue(userId, nextJobs);
      setItems(nextItems);
      await refreshSyncState();
      void syncPending();
    },
    [items, refreshSyncState, syncPending, userId]
  );

  const removeBill = useCallback(
    async (bill: BillDTO) => {
      if (!userId) {
        throw new Error("Không có thông tin đăng nhập cục bộ.");
      }

      const clientId = bill.clientId ?? bill.id;
      const now = new Date().toISOString();
      const queue = await readBillsSyncQueue(userId);
      const hasServerRecord = Boolean(bill.serverId);

      const nextJobs = hasServerRecord
        ? [
            ...queue.filter((job) => job.clientId !== clientId),
            {
              operationId: createId(),
              clientId,
              serverId: bill.serverId,
              mutationType: "delete" as const,
              attempts: 0,
              createdAt: now,
              updatedAt: now,
            },
          ]
        : queue.filter((job) => job.clientId !== clientId);

      const nextItems = items.filter((item) => !isSameBill(item, clientId));
      await writeBillsSnapshot(userId, nextItems);
      await writeBillsSyncQueue(userId, nextJobs);
      setItems(nextItems);
      await refreshSyncState();
      void syncPending();
    },
    [items, refreshSyncState, syncPending, userId]
  );

  const confirmBillPaid = useCallback(
    async (bill: BillDTO, payload: BillPayInput) => {
      if (!userId) {
        throw new Error("Không có thông tin đăng nhập cục bộ.");
      }

      const clientId = bill.clientId ?? bill.id;
      const now = new Date().toISOString();
      const nextItems = items.map((item) =>
        isSameBill(item, clientId)
          ? {
              ...item,
              paid: true,
              paidAt: payload.paidAt,
              paidAmount: payload.paidAmount,
              paidNote: payload.paidNote,
              updatedAt: now,
              syncStatus: "pending_pay" as const,
              lastSyncError: undefined,
            }
          : item
      );

      const queue = await readBillsSyncQueue(userId);
      const nextJobs: BillSyncJob[] = [
        ...queue.filter(
          (job) =>
            !(job.clientId === clientId && (job.mutationType === "pay" || job.mutationType === "unpay"))
        ),
        {
          operationId: createId(),
          clientId,
          serverId: bill.serverId,
          mutationType: "pay",
          payload,
          attempts: 0,
          createdAt: now,
          updatedAt: now,
        },
      ];

      await writeBillsSnapshot(userId, nextItems);
      await writeBillsSyncQueue(userId, nextJobs);
      setItems(nextItems);
      await refreshSyncState();
      void syncPending();
    },
    [items, refreshSyncState, syncPending, userId]
  );

  const undoBillPaid = useCallback(
    async (bill: BillDTO) => {
      if (!userId) {
        throw new Error("Không có thông tin đăng nhập cục bộ.");
      }

      const clientId = bill.clientId ?? bill.id;
      const now = new Date().toISOString();
      const nextItems = items.map((item) =>
        isSameBill(item, clientId)
          ? {
              ...item,
              paid: false,
              paidAt: undefined,
              paidAmount: undefined,
              paidNote: undefined,
              updatedAt: now,
              syncStatus: "pending_unpay" as const,
              lastSyncError: undefined,
            }
          : item
      );

      const queue = await readBillsSyncQueue(userId);
      const nextJobs: BillSyncJob[] = [
        ...queue.filter(
          (job) =>
            !(job.clientId === clientId && (job.mutationType === "pay" || job.mutationType === "unpay"))
        ),
        {
          operationId: createId(),
          clientId,
          serverId: bill.serverId,
          mutationType: "unpay",
          attempts: 0,
          createdAt: now,
          updatedAt: now,
        },
      ];

      await writeBillsSnapshot(userId, nextItems);
      await writeBillsSyncQueue(userId, nextJobs);
      setItems(nextItems);
      await refreshSyncState();
      void syncPending();
    },
    [items, refreshSyncState, syncPending, userId]
  );

  return {
    items,
    loading,
    syncState,
    saveBill,
    removeBill,
    confirmBillPaid,
    undoBillPaid,
  };
}
