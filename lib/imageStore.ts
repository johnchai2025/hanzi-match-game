'use client'

const DB_NAME = 'hanzi-match-images';
const STORE_NAME = 'card-images';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

export async function saveImage(id: string, dataUrl: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(dataUrl, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllImages(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const results = new Map<string, string>();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    let pending = ids.length;

    for (const id of ids) {
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) results.set(id, req.result as string);
        if (--pending === 0) resolve(results);
      };
      req.onerror = () => {
        if (--pending === 0) resolve(results);
      };
    }

    tx.onerror = () => reject(tx.error);
  });
}
