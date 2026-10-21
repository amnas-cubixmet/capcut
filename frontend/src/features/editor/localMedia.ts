const DATABASE = 'cutcraft-local-media-v1';
const STORE = 'media';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported by this browser.'));
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Cannot open local media storage.'));
  });
}

export async function saveMedia(id: string, file: File): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(file, id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Cannot save local media.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Saving media was aborted.'));
    });
  } finally {
    db.close();
  }
}

export async function readMedia(id: string): Promise<Blob | undefined> {
  const db = await openDatabase();
  try {
    return await new Promise<Blob | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result as Blob | undefined);
      request.onerror = () => reject(request.error ?? new Error('Cannot read local media.'));
    });
  } finally {
    db.close();
  }
}

export async function removeMedia(id: string): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Cannot delete local media.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Deleting media was aborted.'));
    });
  } finally {
    db.close();
  }
}

export type MediaKind = 'video' | 'audio' | 'image';
export type MediaAsset = {
  id: string;
  name: string;
  kind: MediaKind;
  duration: number;
  mime: string;
  size: number;
};

export function identifyKind(file: File): MediaKind | null {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('image/')) return 'image';
  return null;
}

export async function inspectDuration(file: File, kind: MediaKind): Promise<number> {
  if (kind === 'image') return 5;
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve, reject) => {
      const element = document.createElement(kind);
      element.preload = 'metadata';
      const timeout = window.setTimeout(() => { cleanup(); reject(new Error('Media metadata timed out.')); }, 15000);
      function cleanup() {
        window.clearTimeout(timeout);
        element.onloadedmetadata = null;
        element.onerror = null;
        element.removeAttribute('src');
        element.load();
      }
      element.onloadedmetadata = () => {
        const duration = element.duration;
        cleanup();
        if (Number.isFinite(duration) && duration > 0) resolve(duration);
        else reject(new Error('Media has no usable duration.'));
      };
      element.onerror = () => { cleanup(); reject(new Error('Browser cannot decode this file.')); };
      element.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
