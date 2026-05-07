"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import type { SettingsInput } from "@/lib/domain/settings";
import type { SettingsDTO } from "@/lib/types";
import {
  readSettingsSnapshot,
  readSettingsSyncQueue,
  writeSettingsSnapshot,
  writeSettingsSyncQueue,
  type SettingsSyncJob,
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

export function useSettingsLocalFirst() {
  const { user } = useAuth();
  const userId = user?.id;
  const [settings, setSettings] = useState<SettingsDTO>({
    paydayDay: 25,
    salaryExpected: 0,
  });
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

    const jobs = await readSettingsSyncQueue(userId);
    setSyncState((current) => ({
      ...current,
      pendingCount: jobs.length,
      lastError: [...jobs].reverse().find((item) => item.lastError)?.lastError,
    }));
  }, [userId]);

  const fetchRemote = useCallback(async () => {
    const response = await fetch("/api/settings", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Không thể tải cài đặt.");
    }

    return (await response.json()) as SettingsDTO;
  }, []);

  const loadLocal = useCallback(async () => {
    if (!userId) {
      setSettings({ paydayDay: 25, salaryExpected: 0 });
      setLoading(false);
      return;
    }

    const snapshot = await readSettingsSnapshot(userId);
    setSettings(snapshot);
    setLoading(false);
  }, [userId]);

  const syncPending = useCallback(async () => {
    if (!userId || !isOnline() || syncingRef.current) {
      return;
    }

    const jobs = await readSettingsSyncQueue(userId);
    if (jobs.length === 0) {
      await refreshSyncState();
      return;
    }

    syncingRef.current = true;
    setSyncState((current) => ({ ...current, syncing: true }));

    try {
      const response = await fetch("/api/sync/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operations: jobs.map((job) => ({
            operationId: job.operationId,
            type: job.mutationType,
            payload: job.payload,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Server chưa nhận được sync cài đặt.");
      }

      await writeSettingsSyncQueue(userId, []);
      const remote = await fetchRemote();
      await writeSettingsSnapshot(userId, {
        ...remote,
        syncStatus: "synced",
        lastSyncError: undefined,
      });
      setSettings({
        ...remote,
        syncStatus: "synced",
        lastSyncError: undefined,
      });
      await refreshSyncState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đồng bộ cài đặt.";
      const failedAt = new Date().toISOString();
      const nextJobs = jobs.map((job) => ({
        ...job,
        attempts: job.attempts + 1,
        updatedAt: failedAt,
        lastError: message,
      }));
      await writeSettingsSyncQueue(userId, nextJobs);
      const snapshot = await readSettingsSnapshot(userId);
      const nextSettings = {
        ...snapshot,
        syncStatus: "sync_error" as const,
        lastSyncError: message,
      };
      await writeSettingsSnapshot(userId, nextSettings);
      setSettings(nextSettings);
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

      if (ignore || !userId || !isOnline()) {
        return;
      }

      await syncPending();
      if (!ignore) {
        try {
          const remote = await fetchRemote();
          const nextSettings = {
            ...remote,
            syncStatus: "synced" as const,
            lastSyncError: undefined,
          };
          await writeSettingsSnapshot(userId, nextSettings);
          setSettings(nextSettings);
        } catch {
          // Keep local snapshot while offline.
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

  const saveSettings = useCallback(
    async (payload: SettingsInput) => {
      if (!userId) {
        throw new Error("Không có thông tin đăng nhập cục bộ.");
      }

      const now = new Date().toISOString();
      const nextSettings: SettingsDTO = {
        paydayDay: payload.paydayDay,
        salaryExpected: payload.salaryExpected,
        updatedAt: now,
        syncStatus: "pending_upsert",
        lastSyncError: undefined,
      };

      const nextJobs: SettingsSyncJob[] = [
        {
          operationId: createId(),
          mutationType: "upsert",
          payload,
          attempts: 0,
          createdAt: now,
          updatedAt: now,
        },
      ];

      await writeSettingsSnapshot(userId, nextSettings);
      await writeSettingsSyncQueue(userId, nextJobs);
      setSettings(nextSettings);
      await refreshSyncState();
      void syncPending();
    },
    [refreshSyncState, syncPending, userId]
  );

  return {
    settings,
    loading,
    syncState,
    saveSettings,
  };
}
