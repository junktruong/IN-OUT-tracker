"use client";

import {
  defaultCategorySeeds,
  toCategorySlug,
  type CategoryInput,
} from "@/lib/domain/categories";
import type { CategoryDTO, CategorySyncStatus } from "@/lib/types";
import {
  CATEGORY_SYNC_JOBS_STORE,
  CATEGORIES_STORE,
  openOfflineDatabase,
  toPromise,
  waitForTransaction,
} from "@/lib/offline/offlineDb";

let storeQueue: Promise<unknown> = Promise.resolve();

type StoredCategory = CategoryDTO & {
  userId: string;
  clientId: string;
  slug: string;
  syncStatus: CategorySyncStatus;
  createdAt: string;
  updatedAt: string;
  lastSyncError?: string;
};

export type CategorySyncJob = {
  operationId: string;
  userId: string;
  clientId: string;
  mutationType: "create";
  payload: CategoryInput;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
};

type SyncResult = {
  operationId: string;
  clientId: string;
  serverId?: string;
  status: "applied" | "duplicate";
};

const runWithStoreQueue = <T>(task: () => Promise<T>) => {
  const next = storeQueue.then(task, task);
  storeQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
};

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getAllCategories = async () => {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(CATEGORIES_STORE, "readonly");
  const store = transaction.objectStore(CATEGORIES_STORE);
  const items = await toPromise(store.getAll() as IDBRequest<StoredCategory[]>);
  await waitForTransaction(transaction);
  database.close();
  return items;
};

const getAllSyncJobs = async () => {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(CATEGORY_SYNC_JOBS_STORE, "readonly");
  const store = transaction.objectStore(CATEGORY_SYNC_JOBS_STORE);
  const items = await toPromise(store.getAll() as IDBRequest<CategorySyncJob[]>);
  await waitForTransaction(transaction);
  database.close();
  return items;
};

const writeCategoriesAndJobs = async (
  categories: StoredCategory[],
  jobs: CategorySyncJob[]
) => {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(
    [CATEGORIES_STORE, CATEGORY_SYNC_JOBS_STORE],
    "readwrite"
  );
  const categoriesStore = transaction.objectStore(CATEGORIES_STORE);
  const jobsStore = transaction.objectStore(CATEGORY_SYNC_JOBS_STORE);

  await toPromise(categoriesStore.clear());
  await toPromise(jobsStore.clear());

  categories.forEach((item) => {
    categoriesStore.put(item);
  });

  jobs.forEach((item) => {
    jobsStore.put(item);
  });

  await waitForTransaction(transaction);
  database.close();
};

const sortCategories = (items: StoredCategory[]) =>
  [...items].sort((left, right) => {
    if (left.categoryType !== right.categoryType) {
      return left.categoryType.localeCompare(right.categoryType);
    }

    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }

    return left.name.localeCompare(right.name, "vi");
  });

const toVisibleCategories = (items: StoredCategory[]) =>
  sortCategories(items).map((item) => ({
    id: item.serverId ?? item.id,
    clientId: item.clientId,
    serverId: item.serverId,
    name: item.name,
    slug: item.slug,
    icon: item.icon,
    categoryType: item.categoryType,
    kind: item.kind,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    syncStatus: item.syncStatus,
    lastSyncError: item.lastSyncError,
  }));

const createLocalSeedCategory = (
  userId: string,
  seed: (typeof defaultCategorySeeds)[number]
): StoredCategory => {
  const now = new Date().toISOString();
  const clientId = `system:${userId}:${seed.categoryType}:${seed.slug}`;

  return {
    id: clientId,
    userId,
    clientId,
    serverId: undefined,
    name: seed.name,
    slug: seed.slug,
    icon: seed.icon,
    categoryType: seed.categoryType,
    kind: "system",
    createdAt: now,
    updatedAt: now,
    syncStatus: "synced",
  };
};

const ensureLocalDefaultCategories = (userId: string, items: StoredCategory[]) => {
  const userItems = items.filter((item) => item.userId === userId);
  const nextItems = [...items];
  let changed = false;

  defaultCategorySeeds.forEach((seed) => {
    const exists = userItems.some(
      (item) => item.slug === seed.slug && item.categoryType === seed.categoryType
    );

    if (!exists) {
      nextItems.push(createLocalSeedCategory(userId, seed));
      changed = true;
    }
  });

  return { items: nextItems, changed };
};

const createSyncJob = (userId: string, item: StoredCategory): CategorySyncJob => {
  const now = new Date().toISOString();

  return {
    operationId: createId(),
    userId,
    clientId: item.clientId,
    mutationType: "create",
    payload: {
      name: item.name,
      icon: item.icon,
      categoryType: item.categoryType,
    },
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
};

export const listLocalCategories = async (userId: string) => {
  return runWithStoreQueue(async () => {
    const items = await getAllCategories();
    const ensured = ensureLocalDefaultCategories(userId, items);

    if (ensured.changed) {
      const jobs = await getAllSyncJobs();
      await writeCategoriesAndJobs(ensured.items, jobs);
    }

    return toVisibleCategories(ensured.items.filter((item) => item.userId === userId));
  });
};

export const getCategorySyncOverview = async (userId: string) => {
  return runWithStoreQueue(async () => {
    const jobs = await getAllSyncJobs();
    const userJobs = jobs.filter((item) => item.userId === userId);
    const lastError = [...userJobs].reverse().find((item) => item.lastError)?.lastError;

    return {
      pendingCount: userJobs.length,
      lastError,
    };
  });
};

export const queueLocalCategoryCreate = async (userId: string, payload: CategoryInput) => {
  return runWithStoreQueue(async () => {
    const items = await getAllCategories();
    const jobs = await getAllSyncJobs();
    const ensured = ensureLocalDefaultCategories(userId, items);
    const nextItems = [...ensured.items];
    const slug = toCategorySlug(payload.name);
    const existing = nextItems.find(
      (item) =>
        item.userId === userId &&
        item.slug === slug &&
        item.categoryType === payload.categoryType
    );

    if (existing) {
      return {
        kind: "duplicate" as const,
        category: toVisibleCategories([existing])[0]!,
      };
    }

    const now = new Date().toISOString();
    const clientId = createId();
    const category: StoredCategory = {
      id: clientId,
      userId,
      clientId,
      serverId: undefined,
      name: payload.name.trim(),
      slug,
      icon: payload.icon ?? "✨",
      categoryType: payload.categoryType,
      kind: "custom",
      createdAt: now,
      updatedAt: now,
      syncStatus: "pending_create",
    };

    nextItems.push(category);
    jobs.push(createSyncJob(userId, category));

    await writeCategoriesAndJobs(nextItems, jobs);

    return {
      kind: "created" as const,
      category: toVisibleCategories([category])[0]!,
    };
  });
};

export const getPendingCategorySyncJobs = async (userId: string, limit = 50) => {
  return runWithStoreQueue(async () => {
    const jobs = await getAllSyncJobs();

    return jobs
      .filter((item) => item.userId === userId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(0, limit);
  });
};

export const mergeCategoriesFromServer = async (
  userId: string,
  remoteItems: CategoryDTO[]
) => {
  return runWithStoreQueue(async () => {
    const items = await getAllCategories();
    const jobs = await getAllSyncJobs();
    const ensured = ensureLocalDefaultCategories(userId, items);
    const nextJobs = [...jobs];
    const byId = new Map(ensured.items.map((item) => [item.id, item]));

    remoteItems.forEach((item) => {
      const slug = item.slug ?? toCategorySlug(item.name);
      const serverId = item.serverId ?? item.id;
      const existing = ensured.items.find(
        (current) =>
          current.userId === userId &&
          (current.serverId === serverId ||
            current.id === serverId ||
            (current.slug === slug && current.categoryType === item.categoryType))
      );
      const clientId = existing?.clientId ?? item.clientId ?? serverId;
      const nextItem: StoredCategory = {
        id: existing?.id ?? clientId,
        userId,
        clientId,
        serverId,
        name: item.name,
        slug,
        icon: item.icon,
        categoryType: item.categoryType,
        kind: item.kind,
        createdAt: item.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
        updatedAt: item.updatedAt ?? new Date().toISOString(),
        syncStatus: "synced",
        lastSyncError: undefined,
      };

      if (existing?.syncStatus === "pending_create" || existing?.syncStatus === "sync_error") {
        const jobIndex = nextJobs.findIndex(
          (job) => job.userId === userId && job.clientId === existing.clientId
        );

        if (jobIndex >= 0) {
          nextJobs.splice(jobIndex, 1);
        }
      }

      byId.set(nextItem.id, nextItem);
    });

    const nextItems = [...byId.values()];
    await writeCategoriesAndJobs(nextItems, nextJobs);
    return toVisibleCategories(nextItems.filter((item) => item.userId === userId));
  });
};

export const applySuccessfulCategorySync = async (
  userId: string,
  results: SyncResult[]
) => {
  return runWithStoreQueue(async () => {
    const items = await getAllCategories();
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

      nextJobs.splice(jobIndex, 1);

      const itemIndex = nextItems.findIndex(
        (item) => item.userId === userId && item.id === result.clientId
      );

      if (itemIndex < 0) {
        return;
      }

      nextItems[itemIndex] = {
        ...nextItems[itemIndex],
        serverId: result.serverId ?? nextItems[itemIndex].serverId,
        syncStatus: "synced",
        lastSyncError: undefined,
        updatedAt: new Date().toISOString(),
      };
    });

    await writeCategoriesAndJobs(nextItems, nextJobs);
  });
};

export const markCategorySyncFailure = async (
  userId: string,
  operations: CategorySyncJob[],
  message: string
) => {
  return runWithStoreQueue(async () => {
    const items = await getAllCategories();
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

    const nextItems = items.map((item) => {
      const failed = operations.find(
        (operation) => operation.userId === userId && operation.clientId === item.clientId
      );

      if (!failed) {
        return item;
      }

      return {
        ...item,
        syncStatus: "sync_error" as const,
        lastSyncError: message,
        updatedAt: failedAt,
      };
    });

    await writeCategoriesAndJobs(nextItems, nextJobs);
  });
};
