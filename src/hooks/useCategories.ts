"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import type { CategoryInput } from "@/lib/domain/categories";
import type { CategoryDTO } from "@/lib/types";
import {
  applySuccessfulCategorySync,
  getCategorySyncOverview,
  getPendingCategorySyncJobs,
  listLocalCategories,
  markCategorySyncFailure,
  mergeCategoriesFromServer,
  queueLocalCategoryCreate,
} from "@/lib/offline/categoriesStore";
import { writeCategoriesSnapshot } from "@/lib/offline/userSnapshots";

type SyncState = {
  syncing: boolean;
  pendingCount: number;
  lastError?: string;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Không thể đồng bộ danh mục.";

const isOnline = () => typeof navigator === "undefined" || navigator.onLine;

export function useCategories(active = true) {
  const { user } = useAuth();
  const userId = user?.id;
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loading, setLoading] = useState(false);
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

    const overview = await getCategorySyncOverview(userId);
    setSyncState((current) => ({
      ...current,
      pendingCount: overview.pendingCount,
      lastError: overview.lastError,
    }));
  }, [userId]);

  const loadLocalCategories = useCallback(async () => {
    if (!userId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    const items = await listLocalCategories(userId);
    setCategories(items);
    setLoading(false);
  }, [userId]);

  const fetchRemoteCategories = useCallback(async () => {
    const response = await fetch("/api/categories", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Không thể tải danh mục từ server.");
    }

    const data = (await response.json()) as { items?: CategoryDTO[] };
    return data.items ?? [];
  }, []);

  const refreshFromServer = useCallback(async () => {
    if (!userId || !isOnline()) {
      return;
    }

    const remoteItems = await fetchRemoteCategories();
    const merged = await mergeCategoriesFromServer(userId, remoteItems);
    setCategories(merged);
    await refreshSyncState();
  }, [fetchRemoteCategories, refreshSyncState, userId]);

  const syncPending = useCallback(async () => {
    if (!userId || !isOnline() || syncingRef.current) {
      return;
    }

    const jobs = await getPendingCategorySyncJobs(userId);
    if (jobs.length === 0) {
      await refreshSyncState();
      return;
    }

    syncingRef.current = true;
    setSyncState((current) => ({ ...current, syncing: true }));

    try {
      const response = await fetch("/api/sync/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operations: jobs.map((job) => ({
            operationId: job.operationId,
            type: job.mutationType,
            clientId: job.clientId,
            payload: job.payload,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Server chưa nhận được batch sync danh mục.");
      }

      const data = (await response.json()) as {
        results?: Array<{
          operationId: string;
          clientId: string;
          serverId?: string;
          status: "applied" | "duplicate";
        }>;
      };

      await applySuccessfulCategorySync(userId, data.results ?? []);
      await loadLocalCategories();
      await refreshSyncState();
    } catch (error) {
      const message = getErrorMessage(error);
      await markCategorySyncFailure(userId, jobs, message);
      await loadLocalCategories();
      await refreshSyncState();
    } finally {
      syncingRef.current = false;
      setSyncState((current) => ({ ...current, syncing: false }));
    }
  }, [loadLocalCategories, refreshSyncState, userId]);

  useEffect(() => {
    if (!active) {
      return;
    }

    let ignore = false;

    const boot = async () => {
      setLoading(true);
      await loadLocalCategories();
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
  }, [active, loadLocalCategories, refreshFromServer, refreshSyncState, syncPending, userId]);

  const createCategory = useCallback(
    async (payload: CategoryInput) => {
      if (!userId) {
        throw new Error("Không có thông tin đăng nhập cục bộ.");
      }

      const result = await queueLocalCategoryCreate(userId, payload);
      await loadLocalCategories();
      await refreshSyncState();
      void syncPending();
      return result;
    },
    [loadLocalCategories, refreshSyncState, syncPending, userId]
  );

  const reload = useCallback(async () => {
    await loadLocalCategories();
    await syncPending();
    await refreshFromServer();
  }, [loadLocalCategories, refreshFromServer, syncPending]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void writeCategoriesSnapshot(userId, categories);
  }, [categories, userId]);

  return { categories, loading, syncState, reload, createCategory };
}
