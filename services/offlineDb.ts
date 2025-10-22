


// Fix: Add missing import
import { Sale } from '../types';

const DB_NAME = 'stocksys-offline-db';
const STORE_NAME = 'pending-sales';

// The 'idb' library would simplify this, but using native APIs to avoid dependencies.
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject(new Error('Failed to open IndexedDB.'));
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

export async function addPendingSale(sale: Sale): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(sale);
    // Fix: IDBTransaction doesn't have a `.done` property. We wrap it in a Promise.
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getPendingSales(): Promise<Sale[]> {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    // Fix: `store.getAll()` returns an IDBRequest, not the data directly. We wrap it in a promise to await the result.
    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function clearPendingSales(syncedSaleIds: string[]): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const id of syncedSaleIds) {
        store.delete(id);
    }
    // Fix: IDBTransaction doesn't have a `.done` property. We wrap it in a Promise.
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}