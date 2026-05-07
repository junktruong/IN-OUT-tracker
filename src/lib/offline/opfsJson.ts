"use client";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type SnapshotEnvelope<T> = {
  updatedAt: string;
  data: T;
};

const ROOT_DIR = "inouttracker";

const isOpfsSupported = () =>
  typeof navigator !== "undefined" &&
  "storage" in navigator &&
  typeof navigator.storage?.getDirectory === "function";

const ensureDirectory = async (segments: string[]) => {
  if (!isOpfsSupported()) {
    throw new Error("OPFS is not supported");
  }

  let directory = await navigator.storage.getDirectory();
  const fullPath = [ROOT_DIR, ...segments];

  for (const segment of fullPath) {
    directory = await directory.getDirectoryHandle(segment, { create: true });
  }

  return directory;
};

const getParentDirectory = async (userId: string, segments: string[]) => {
  const parentSegments = [userId, ...segments.slice(0, -1)];
  return ensureDirectory(parentSegments);
};

export const writeUserJsonDocument = async <T extends JsonValue | Record<string, unknown> | unknown[]>(
  userId: string,
  relativePath: string[],
  data: T
) => {
  if (!isOpfsSupported()) {
    return;
  }

  const fileName = relativePath[relativePath.length - 1];
  if (!fileName) {
    throw new Error("relativePath must include a file name");
  }

  const directory = await getParentDirectory(userId, relativePath);
  const fileHandle = await directory.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  const payload: SnapshotEnvelope<T> = {
    updatedAt: new Date().toISOString(),
    data,
  };

  await writable.write(JSON.stringify(payload, null, 2));
  await writable.close();
};

export const readUserJsonDocument = async <T>(
  userId: string,
  relativePath: string[],
  fallback: T
) => {
  if (!isOpfsSupported()) {
    return fallback;
  }

  try {
    const fileName = relativePath[relativePath.length - 1];
    if (!fileName) {
      return fallback;
    }

    const directory = await getParentDirectory(userId, relativePath);
    const fileHandle = await directory.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    const raw = await file.text();

    if (!raw.trim()) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<SnapshotEnvelope<T>>;
    return parsed.data ?? fallback;
  } catch {
    return fallback;
  }
};
