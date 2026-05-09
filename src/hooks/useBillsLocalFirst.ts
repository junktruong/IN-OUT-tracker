"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import type { BillInput, BillPayInput } from "@/lib/domain/bills";
import type { BillDTO, BillPaymentDTO } from "@/lib/types";
import {
  readBillPaymentsSnapshot,
  readBillsSnapshot,
  writeBillPaymentsSnapshot,
  writeBillsSnapshot,
} from "@/lib/offline/userSnapshots";

type RequestState = {
  syncing: boolean;
  pendingCount: number;
  lastError?: string;
};

type RemoteBillsPayload = {
  items: BillDTO[];
  occurrences: BillPaymentDTO[];
};

const normalizeBills = (value: unknown): BillDTO[] => (Array.isArray(value) ? value : []);

const withOccurrenceStatus = (occurrence: BillPaymentDTO): BillPaymentDTO => ({
  ...occurrence,
  status: occurrence.status === "paid" || occurrence.paidAt ? "paid" : "unpaid",
});

const normalizeOccurrences = (value: unknown): BillPaymentDTO[] => {
  if (Array.isArray(value)) {
    return value.map(withOccurrenceStatus);
  }

  if (value && typeof value === "object") {
    const record = value as {
      occurrences?: unknown;
      payments?: unknown;
    };

    if (Array.isArray(record.occurrences)) {
      return record.occurrences.map(withOccurrenceStatus);
    }

    if (Array.isArray(record.payments)) {
      return record.payments.map(withOccurrenceStatus);
    }
  }

  return [];
};

const isOnline = () => typeof navigator === "undefined" || navigator.onLine;

const getBillRequestId = (bill: Pick<BillDTO, "id" | "clientId" | "serverId">) =>
  bill.serverId ?? bill.clientId ?? bill.id;

const getOccurrenceTemplateRequestId = (
  occurrence: Pick<BillPaymentDTO, "templateId" | "templateClientId">
) => occurrence.templateId ?? occurrence.templateClientId;

export function useBillsLocalFirst() {
  const { user } = useAuth();
  const userId = user?.id;
  const [items, setItems] = useState<BillDTO[]>([]);
  const [occurrences, setOccurrences] = useState<BillPaymentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestState, setRequestState] = useState<RequestState>({
    syncing: false,
    pendingCount: 0,
  });

  const writeLocal = useCallback(
    async (nextItems: BillDTO[], nextOccurrences: BillPaymentDTO[]) => {
      if (!userId) {
        return;
      }

      await writeBillsSnapshot(userId, nextItems);
      await writeBillPaymentsSnapshot(userId, nextOccurrences);
    },
    [userId]
  );

  const fetchRemote = useCallback(async (): Promise<RemoteBillsPayload> => {
    const response = await fetch("/api/bills", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Không thể tải khoản đóng.");
    }

    const data = (await response.json()) as {
      items?: BillDTO[];
      occurrences?: BillPaymentDTO[];
      payments?: BillPaymentDTO[];
    };

    return {
      items: normalizeBills(data.items),
      occurrences: normalizeOccurrences(data.occurrences ?? data.payments),
    };
  }, []);

  const refreshRemote = useCallback(async () => {
    if (!userId || !isOnline()) {
      return;
    }

    setRequestState({ syncing: true, pendingCount: 0 });
    try {
      const remote = await fetchRemote();
      await writeLocal(remote.items, remote.occurrences);
      setItems(remote.items);
      setOccurrences(remote.occurrences);
      setRequestState({ syncing: false, pendingCount: 0 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể cập nhật khoản đóng.";
      setRequestState({ syncing: false, pendingCount: 0, lastError: message });
    }
  }, [fetchRemote, userId, writeLocal]);

  const loadLocal = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setOccurrences([]);
      setLoading(false);
      return;
    }

    const [templatesSnapshot, occurrencesSnapshot] = await Promise.all([
      readBillsSnapshot(userId),
      readBillPaymentsSnapshot(userId),
    ]);

    setItems(normalizeBills(templatesSnapshot));
    setOccurrences(normalizeOccurrences(occurrencesSnapshot));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    let ignore = false;

    const boot = async () => {
      setLoading(true);
      await loadLocal();
      if (!ignore) {
        await refreshRemote();
      }
    };

    void boot();

    const handleOnline = () => {
      void refreshRemote();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      ignore = true;
      window.removeEventListener("online", handleOnline);
    };
  }, [loadLocal, refreshRemote]);

  const saveBill = useCallback(
    async (payload: BillInput, billId?: string) => {
      if (!userId) {
        throw new Error("Không có thông tin đăng nhập cục bộ.");
      }
      if (!isOnline()) {
        throw new Error("Cần có mạng để lưu khoản đóng.");
      }

      const response = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          id: billId ?? payload.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Không thể lưu khoản đóng.");
      }

      await refreshRemote();
    },
    [refreshRemote, userId]
  );

  const removeBill = useCallback(
    async (bill: BillDTO) => {
      if (!userId) {
        throw new Error("Không có thông tin đăng nhập cục bộ.");
      }
      if (!isOnline()) {
        throw new Error("Cần có mạng để xoá khoản đóng.");
      }

      const response = await fetch(`/api/bills/${encodeURIComponent(getBillRequestId(bill))}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Không thể xoá khoản đóng.");
      }

      await refreshRemote();
    },
    [refreshRemote, userId]
  );

  const confirmBillPaid = useCallback(
    async (bill: BillDTO, payload: BillPayInput) => {
      if (!userId) {
        throw new Error("Không có thông tin đăng nhập cục bộ.");
      }
      if (!isOnline()) {
        throw new Error("Cần có mạng để xác nhận khoản đóng.");
      }

      const response = await fetch(
        `/api/bills/${encodeURIComponent(getBillRequestId(bill))}/pay`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Không thể xác nhận đã đóng.");
      }

      await refreshRemote();
    },
    [refreshRemote, userId]
  );

  const undoBillPaid = useCallback(
    async (occurrence: BillPaymentDTO) => {
      if (!userId) {
        throw new Error("Không có thông tin đăng nhập cục bộ.");
      }
      if (!isOnline()) {
        throw new Error("Cần có mạng để hoàn tác khoản đóng.");
      }

      const response = await fetch(
        `/api/bills/${encodeURIComponent(getOccurrenceTemplateRequestId(occurrence))}/unpay`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dueDate: occurrence.dueDate }),
        }
      );

      if (!response.ok) {
        throw new Error("Không thể hoàn tác khoản đã đóng.");
      }

      await refreshRemote();
    },
    [refreshRemote, userId]
  );

  return {
    items,
    occurrences,
    loading,
    requestState,
    saveBill,
    removeBill,
    confirmBillPaid,
    undoBillPaid,
  };
}
