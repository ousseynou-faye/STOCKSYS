
const CACHE_NAME = 'stocksys-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // On ne met pas les scripts en cache car ils sont injectés dynamiquement
  // et peuvent changer. Le service worker les interceptera quand même.
];

// Installation: Mise en cache de l'application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activation: Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch: Servir depuis le cache en priorité
self.addEventListener('fetch', (event) => {
  // On ne met pas en cache les requêtes de l'API mock pour l'instant,
  // sauf si on veut une stratégie de cache plus complexe.
  if (event.request.url.includes('api')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Background Sync: synchroniser les ventes en attente
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-sales') {
    event.waitUntil(syncPendingSales());
  }
});

async function syncPendingSales() {
  const db = await openSalesDB();
  const tx = db.transaction('pending-sales', 'readonly');
  const store = tx.objectStore('pending-sales');
  const pendingSales = await store.getAll();
  await tx.done;

  if (pendingSales.length > 0) {
    // Dans une vraie app, on enverrait ça à un vrai serveur
    // Ici, on va simuler l'envoi en le passant au client
    // pour qu'il utilise le mockApi
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_SALES',
        payload: pendingSales
      });
    });
  }
}

// Helper pour IndexedDB (simplifié)
function openSalesDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('stocksys-offline-db', 1);
        request.onerror = () => reject("Error opening DB");
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('pending-sales')) {
                db.createObjectStore('pending-sales', { keyPath: 'id' });
            }
        };
    });
}
