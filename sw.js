// Service Worker for Quiz App PWA
const CACHE_NAME = 'quiz-app-v1.0';
const STATIC_CACHE = 'quiz-static-v1.0';
const DYNAMIC_CACHE = 'quiz-dynamic-v1.0';

// Cache files to be cached immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/farm.json',
  '/patfiz.json',
  '/patfiz2.json',
  '/patan1a.json',
  '/patan2a.json',
  '/patandyes.json',
  'https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static files...');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Static files cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (url.pathname.endsWith('.json')) {
    // JSON files - cache first, then network
    event.respondWith(
      caches.open(DYNAMIC_CACHE)
        .then(cache => {
          return cache.match(request)
            .then(response => {
              if (response) {
                // Return cached version and update in background
                fetch(request)
                  .then(fetchResponse => {
                    cache.put(request, fetchResponse.clone());
                  })
                  .catch(() => {
                    console.log('Background update failed for:', request.url);
                  });
                return response;
              }
              // Not in cache, fetch from network
              return fetch(request)
                .then(fetchResponse => {
                  cache.put(request, fetchResponse.clone());
                  return fetchResponse;
                })
                .catch(error => {
                  console.log('Network fetch failed for:', request.url, error);
                  // Return offline fallback if available
                  return new Response(JSON.stringify({ error: 'Offline mode' }), {
                    headers: { 'Content-Type': 'application/json' }
                  });
                });
            });
        })
    );
  } else if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    // HTML files - network first, fallback to cache
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the response
          const responseClone = response.clone();
          caches.open(STATIC_CACHE)
            .then(cache => cache.put(request, responseClone));
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request);
        })
    );
  } else {
    // Other files - cache first, then network
    event.respondWith(
      caches.match(request)
        .then(response => {
          return response || fetch(request);
        })
    );
  }
});

// Background sync for data synchronization
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(
      // Sync data when online
      syncData()
    );
  }
});

// Push notification handling
self.addEventListener('push', event => {
  console.log('Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Yeni məlumat mövcuddur!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Aç',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Bağla',
        icon: '/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Quiz App', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Data synchronization function
async function syncData() {
  try {
    // Get all clients
    const clients = await self.clients.matchAll();
    
    // Send sync message to all clients
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_DATA',
        timestamp: Date.now()
      });
    });
    
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Message handling from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_QUIZ_DATA') {
    // Cache quiz data
    caches.open(DYNAMIC_CACHE)
      .then(cache => {
        return cache.put('/quiz-data', new Response(JSON.stringify(event.data.data)));
      })
      .then(() => {
        console.log('Quiz data cached successfully');
      })
      .catch(error => {
        console.error('Failed to cache quiz data:', error);
      });
  }
}); 