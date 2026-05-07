import type { TransactionInput } from "@/lib/domain/transactions";
import type { TransactionDTO, TransactionSyncStatus } from "@/lib/types";
import {
  openOfflineDatabase,
  toPromise,
  TRANSACTIONS_STORE,
  TRANSACTION_SYNC_JOBS_STORE,
  waitForTransaction,
} from "@/lib/offline/offlineDb";

let storeQueue: Promise<unknown> = Promise.resolve();
const SYNC_JOBS_STORE = TRANSACTION_SYNC_JOBS_STORE;

type StoredTransaction = TransactionDTO & {
  userId: string;
  clientId: string;
  serverId?: string;
  syncStatus: TransactionSyncStatus;
  deletedAt?: string;
  lastSyncError?: string;
};

type MutationType = "create" | "update" | "delete";

export type TransactionSyncJob = {
  operationId: string;
  userId: string;
  clientId: string;
  serverId?: string;
  mutationType: MutationType;
  payload?: TransactionInput;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
};

type SyncResult = {
  operationId: string;
  clientId: string;
  serverId?: string;
  status: "applied" | "duplicate" | "deleted";
};

const runWithStoreQueue = <T>(task: () => Promise<T>) => {
  const next = storeQueue.then(task, task);
  storeQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
};

const getAllTransactions = async () => {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(TRANSACTIONS_STORE, "readonly");
  const store = transaction.objectStore(TRANSACTIONS_STORE);
  const items = await toPromise(store.getAll() as IDBRequest<StoredTransaction[]>);
  await waitForTransaction(transaction);
  database.close();
  return items;
};

const getAllSyncJobs = async () => {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(SYNC_JOBS_STORE, "readonly");
  const store = transaction.objectStore(SYNC_JOBS_STORE);
  const items = await toPromise(store.getAll() as IDBRequest<TransactionSyncJob[]>);
  await waitForTransaction(transaction);
  database.close();
  return items;
};

const writeTransactionsAndJobs = async (
  transactions: StoredTransaction[],
  jobs: TransactionSyncJob[]
) => {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(
    [TRANSACTIONS_STORE, SYNC_JOBS_STORE],
    "readwrite"
  );
  const transactionsStore = transaction.objectStore(TRANSACTIONS_STORE);
  const jobsStore = transaction.objectStore(SYNC_JOBS_STORE);

  await toPromise(transactionsStore.clear());
  await toPromise(jobsStore.clear());

  transactions.forEach((item) => {
    transactionsStore.put(item);
  });

  jobs.forEach((item) => {
    jobsStore.put(item);
  });

  await waitForTransaction(transaction);
  database.close();
};

const sortTransactions = (items: StoredTransaction[]) =>
  [...items].sort((left, right) => left.createdAt.localeCompare(right.createdAt));

const toVisibleTransactions = (items: StoredTransaction[]) =>
  sortTransactions(items)
    .filter((item) => !item.deletedAt)
    .map((item) => ({
      id: item.id,
      clientId: item.clientId,
      serverId: item.serverId,
      date: item.date,
      type: item.type,
      amount: item.amount,
      categoryId: item.categoryId,
      category: item.category,
      desc: item.desc,
      source: item.source,
      method: item.method,
      account: item.account,
      note: item.note,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      syncStatus: item.syncStatus,
      lastSyncError: item.lastSyncError,
    }));

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toStoredTransaction = (userId: string, payload: TransactionInput): StoredTransaction => {
  const now = new Date().toISOString();
  const clientId = createId();

  return {
    id: clientId,
    userId,
    clientId,
    date: payload.date,
    type: payload.type,
    amount: payload.amount,
    categoryId: payload.categoryId,
    category: payload.category,
    desc: payload.desc,
    source: payload.source,
    method: payload.method,
    account: payload.account,
    note: payload.note,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending_create",
  };
};

const toTransactionPayload = (item: StoredTransaction): TransactionInput => ({
  date: item.date,
  type: item.type,
  amount: item.amount,
  categoryId: item.categoryId,
  category: item.category,
  desc: item.desc,
  source: item.source,
  method: item.method,
  account: item.account,
  note: item.note,
});

const createSyncJob = (
  userId: string,
  item: StoredTransaction,
  mutationType: MutationType,
  payload?: TransactionInput
): TransactionSyncJob => {
  const now = new Date().toISOString();

  return {
    operationId: createId(),
    userId,
    clientId: item.clientId,
    serverId: item.serverId,
    mutationType,
    payload,
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
};

const replaceJob = (
  jobs: TransactionSyncJob[],
  nextJob: TransactionSyncJob,
  mutationType: MutationType
) => {
  const filtered = jobs.filter(
    (item) =>
      !(
        item.userId === nextJob.userId &&
        item.clientId === nextJob.clientId &&
        item.mutationType === mutationType
      )
  );

  filtered.push(nextJob);
  return filtered;
};

export const listLocalTransactionsByYear = async (userId: string, year: number) => {
  return runWithStoreQueue(async () => {
    const items = await getAllTransactions();
    return toVisibleTransactions(
      items.filter((item) => item.userId === userId && item.date.startsWith(String(year)))
    );
  });
};

export const getTransactionSyncOverview = async (userId: string) => {
  return runWithStoreQueue(async () => {
    const jobs = await getAllSyncJobs();
    const userJobs = jobs.filter((item) => item.userId === userId);
    const lastError = [...userJobs]
      .reverse()
      .find((item) => item.lastError)?.lastError;

    return {
      pendingCount: userJobs.length,
      lastError,
    };
  });
};

export const queueLocalTransactionCreate = async (userId: string, payload: TransactionInput) => {
  return runWithStoreQueue(async () => {
    const items = await getAllTransactions();
    const jobs = await getAllSyncJobs();
    const nextItem = toStoredTransaction(userId, payload);
    const nextJob = createSyncJob(userId, nextItem, "create", toTransactionPayload(nextItem));

    items.push(nextItem);
    jobs.push(nextJob);

    await writeTransactionsAndJobs(items, jobs);
    return nextItem;
  });
};

export const queueLocalTransactionBulkCreate = async (
  userId: string,
  payloads: TransactionInput[]
) => {
  return runWithStoreQueue(async () => {
    const items = await getAllTransactions();
    const jobs = await getAllSyncJobs();
    const createdItems = payloads.map((payload) => toStoredTransaction(userId, payload));

    createdItems.forEach((item) => {
      items.push(item);
      jobs.push(createSyncJob(userId, item, "create", toTransactionPayload(item)));
    });

    await writeTransactionsAndJobs(items, jobs);
    return createdItems;
  });
};

export const queueLocalTransactionUpdate = async (
  userId: string,
  id: string,
  payload: TransactionInput
) => {
  return runWithStoreQueue(async () => {
    const items = await getAllTransactions();
    const jobs = await getAllSyncJobs();
    const index = items.findIndex((item) => item.userId === userId && item.id === id);

    if (index < 0) {
      throw new Error("Transaction not found in local store");
    }

    const current = items[index];
    const nextUpdatedAt = new Date().toISOString();
    const nextItem: StoredTransaction = {
      ...current,
      ...payload,
      updatedAt: nextUpdatedAt,
      syncStatus: current.syncStatus === "pending_create" ? "pending_create" : "pending_update",
      deletedAt: undefined,
      lastSyncError: undefined,
    };

    items[index] = nextItem;

    if (current.syncStatus === "pending_create") {
      const createJob = jobs.find(
        (item) =>
          item.userId === userId &&
          item.clientId === current.clientId &&
          item.mutationType === "create"
      );

      if (createJob) {
        createJob.payload = toTransactionPayload(nextItem);
        createJob.updatedAt = nextUpdatedAt;
        createJob.lastError = undefined;
      } else {
        jobs.push(createSyncJob(userId, nextItem, "create", toTransactionPayload(nextItem)));
      }
    } else {
      const updateJob = createSyncJob(
        userId,
        nextItem,
        "update",
        toTransactionPayload(nextItem)
      );
      const nextJobs = replaceJob(jobs, updateJob, "update").filter(
        (item) =>
          !(
            item.userId === userId &&
            item.clientId === current.clientId &&
            item.mutationType === "delete"
          )
      );

      await writeTransactionsAndJobs(items, nextJobs);
      return nextItem;
    }

    await writeTransactionsAndJobs(items, jobs);
    return nextItem;
  });
};

export const queueLocalTransactionDelete = async (userId: string, id: string) => {
  return runWithStoreQueue(async () => {
    const items = await getAllTransactions();
    const jobs = await getAllSyncJobs();
    const index = items.findIndex((item) => item.userId === userId && item.id === id);

    if (index < 0) {
      throw new Error("Transaction not found in local store");
    }

    const current = items[index];

    if (current.syncStatus === "pending_create") {
      const nextItems = items.filter((item) => !(item.userId === userId && item.id === id));
      const nextJobs = jobs.filter(
        (item) => !(item.userId === userId && item.clientId === current.clientId)
      );
      await writeTransactionsAndJobs(nextItems, nextJobs);
      return;
    }

    const nextUpdatedAt = new Date().toISOString();
    items[index] = {
      ...current,
      updatedAt: nextUpdatedAt,
      syncStatus: "pending_delete",
      deletedAt: nextUpdatedAt,
      lastSyncError: undefined,
    };

    const nextJob = createSyncJob(userId, items[index], "delete");
    const nextJobs = replaceJob(
      jobs.filter(
        (item) =>
          !(
            item.userId === userId &&
            item.clientId === current.clientId &&
            item.mutationType === "update"
          )
      ),
      nextJob,
      "delete"
    );

    await writeTransactionsAndJobs(items, nextJobs);
  });
};

export const getPendingTransactionSyncJobs = async (userId: string, limit = 50) => {
  return runWithStoreQueue(async () => {
    const jobs = await getAllSyncJobs();

    return jobs
      .filter((item) => item.userId === userId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(0, limit);
  });
};

export const mergeTransactionsFromServer = async (
  userId: string,
  year: number,
  remoteItems: TransactionDTO[]
) => {
  return runWithStoreQueue(async () => {
    const items = await getAllTransactions();
    const jobs = await getAllSyncJobs();
    const byId = new Map(items.map((item) => [item.id, item]));
    const remoteIds = new Set<string>();

    remoteItems.forEach((item) => {
      const clientId = item.clientId ?? item.id;
      const existing = byId.get(clientId);
      remoteIds.add(clientId);

      const nextItem: StoredTransaction = {
        id: clientId,
        userId,
        clientId,
        serverId: item.serverId ?? item.id,
        date: item.date,
        type: item.type,
        amount: item.amount,
        categoryId: item.categoryId,
        category: item.category,
        desc: item.desc,
        source: item.source,
        method: item.method,
        account: item.account,
        note: item.note,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt ?? item.createdAt,
        syncStatus: "synced",
        lastSyncError: undefined,
      };

      if (existing?.syncStatus === "pending_create" || existing?.syncStatus === "pending_update") {
        byId.set(clientId, {
          ...existing,
          serverId: item.serverId ?? existing.serverId ?? item.id,
        });
        return;
      }

      if (existing?.syncStatus === "pending_delete") {
        byId.set(clientId, {
          ...existing,
          serverId: item.serverId ?? existing.serverId ?? item.id,
        });
        return;
      }

      byId.set(clientId, nextItem);
    });

    for (const item of byId.values()) {
      if (
        item.userId === userId &&
        item.date.startsWith(String(year)) &&
        item.syncStatus === "synced" &&
        !remoteIds.has(item.id)
      ) {
        byId.delete(item.id);
      }
    }

    const nextItems = [...byId.values()];
    await writeTransactionsAndJobs(nextItems, jobs);
    return toVisibleTransactions(
      nextItems.filter((item) => item.userId === userId && item.date.startsWith(String(year)))
    );
  });
};

export const mergeTransactionsFromServerMonth = async (
  userId: string,
  year: number,
  monthKey: string,
  remoteItems: TransactionDTO[]
) => {
  return runWithStoreQueue(async () => {
    const items = await getAllTransactions();
    const jobs = await getAllSyncJobs();
    const byId = new Map(items.map((item) => [item.id, item]));
    const remoteIds = new Set<string>();

    remoteItems.forEach((item) => {
      const clientId = item.clientId ?? item.id;
      const existing = byId.get(clientId);
      remoteIds.add(clientId);

      const nextItem: StoredTransaction = {
        id: clientId,
        userId,
        clientId,
        serverId: item.serverId ?? item.id,
        date: item.date,
        type: item.type,
        amount: item.amount,
        categoryId: item.categoryId,
        category: item.category,
        desc: item.desc,
        source: item.source,
        method: item.method,
        account: item.account,
        note: item.note,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt ?? item.createdAt,
        syncStatus: "synced",
        lastSyncError: undefined,
      };

      if (existing?.syncStatus === "pending_create" || existing?.syncStatus === "pending_update") {
        byId.set(clientId, {
          ...existing,
          serverId: item.serverId ?? existing.serverId ?? item.id,
        });
        return;
      }

      if (existing?.syncStatus === "pending_delete") {
        byId.set(clientId, {
          ...existing,
          serverId: item.serverId ?? existing.serverId ?? item.id,
        });
        return;
      }

      byId.set(clientId, nextItem);
    });

    for (const item of byId.values()) {
      if (
        item.userId === userId &&
        item.date.startsWith(monthKey) &&
        item.syncStatus === "synced" &&
        !remoteIds.has(item.id)
      ) {
        byId.delete(item.id);
      }
    }

    const nextItems = [...byId.values()];
    await writeTransactionsAndJobs(nextItems, jobs);
    return toVisibleTransactions(
      nextItems.filter((item) => item.userId === userId && item.date.startsWith(String(year)))
    );
  });
};

export const applySuccessfulTransactionSync = async (
  userId: string,
  results: SyncResult[]
) => {
  return runWithStoreQueue(async () => {
    const items = await getAllTransactions();
    const jobs = await getAllSyncJobs();
    const nextJobs = [...jobs];
    const nextItems = [...items];

    results.forEach((result) => {
      const jobIndex = nextJobs.findIndex(
        (item) => item.userId === userId && item.operationId === result.operationId
      );

      if (jobIndex < 0) {
        return;
      }

      const job = nextJobs[jobIndex];
      nextJobs.splice(jobIndex, 1);

      const remainingJobsForClient = nextJobs.filter(
        (item) => item.userId === userId && item.clientId === result.clientId
      );
      const itemIndex = nextItems.findIndex(
        (item) => item.userId === userId && item.id === result.clientId
      );

      if (job.mutationType === "delete") {
        if (itemIndex >= 0) {
          nextItems.splice(itemIndex, 1);
        }
        return;
      }

      if (itemIndex < 0) {
        return;
      }

      const nextSyncStatus: TransactionSyncStatus =
        remainingJobsForClient.find((item) => item.mutationType === "delete")
          ? "pending_delete"
          : remainingJobsForClient.find((item) => item.mutationType === "update")
            ? "pending_update"
            : remainingJobsForClient.find((item) => item.mutationType === "create")
              ? "pending_create"
              : "synced";

      nextItems[itemIndex] = {
        ...nextItems[itemIndex],
        serverId: result.serverId ?? nextItems[itemIndex].serverId,
        syncStatus: nextSyncStatus,
        lastSyncError: undefined,
      };
    });

    await writeTransactionsAndJobs(nextItems, nextJobs);
  });
};

export const markTransactionSyncFailure = async (
  userId: string,
  operations: TransactionSyncJob[],
  message: string
) => {
  return runWithStoreQueue(async () => {
    const items = await getAllTransactions();
    const jobs = await getAllSyncJobs();
    const failedAt = new Date().toISOString();

    const nextJobs = jobs.map((item) => {
      const failed = operations.find(
        (operation) => operation.userId === userId && operation.operationId === item.operationId
      );

      if (!failed) {
        return item;
      }

      return {
        ...item,
        attempts: item.attempts + 1,
        updatedAt: failedAt,
        lastError: message,
      };
    });

    const nextItems: StoredTransaction[] = items.map((item) => {
      const failed = operations.find(
        (operation) => operation.userId === userId && operation.clientId === item.clientId
      );

      if (!failed) {
        return item;
      }

      return {
        ...item,
        syncStatus:
          item.syncStatus === "pending_delete" ? "pending_delete" : "sync_error",
        lastSyncError: message,
      };
    });

    await writeTransactionsAndJobs(nextItems, nextJobs);
  });
};
