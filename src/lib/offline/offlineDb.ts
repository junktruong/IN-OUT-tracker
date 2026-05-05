"use client";

export const OFFLINE_DB_NAME = "inout-tracker-offline";
export const OFFLINE_DB_VERSION = 2;

export const TRANSACTIONS_STORE = "transactions";
export const TRANSACTION_SYNC_JOBS_STORE = "transaction_sync_jobs";
export const CATEGORIES_STORE = "categories";
export const CATEGORY_SYNC_JOBS_STORE = "category_sync_jobs";

export const isOfflineDatabaseAvailable = () =>
  typeof window !== "undefined" && "indexedDB" in window;

export const toPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const waitForTransaction = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

export const openOfflineDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (!isOfflineDatabaseAvailable()) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = window.indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(TRANSACTIONS_STORE)) {
        database.createObjectStore(TRANSACTIONS_STORE, { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains(TRANSACTION_SYNC_JOBS_STORE)) {
        database.createObjectStore(TRANSACTION_SYNC_JOBS_STORE, { keyPath: "operationId" });
      }

      if (!database.objectStoreNames.contains(CATEGORIES_STORE)) {
        database.createObjectStore(CATEGORIES_STORE, { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains(CATEGORY_SYNC_JOBS_STORE)) {
        database.createObjectStore(CATEGORY_SYNC_JOBS_STORE, { keyPath: "operationId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
