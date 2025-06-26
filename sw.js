const CACHE_NAME = 'quiz-app-v1.0.1';
const urlsToCache = [
  './',
  './index1.html',
  './manifest.json',
  './icon-16x16.png',
  './icon-32x32.png',
  './icon-72x72.png',
  './icon-96x96.png',
  './icon-128x128.png',
  './icon-144x144.png',
  './icon-152x152.png',
  './icon-192x192.png',
  './icon-384x384.png',
  './icon-512x512.png',
  './favicon.ico',
  './farm.json',
  './patfiz2.json',
  './mama.json',
  './aile.json',
  './ofto1.json',
  './patan1a.json',
  './patan2a.json',
  './patandyes.json',
  './patandyes1.json',
  './patfiz.json',
  './psixbaza.json',
  './Psixiatriya2.json',
  './AETS.json',
  './5.2.json'
];

// Service Worker quraşdırılması
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker quraşdırılır...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cache açıldı');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Bütün fayllar cache-də saxlanıldı');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Cache xətası:', error);
      })
  );
});

// Service Worker aktivləşməsi
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker aktivləşdirilir...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Köhnə cache silinir:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker aktivləşdirildi');
      return self.clients.claim();
    })
  );
});

// Fetch hadisəsi - offline dəstəyi
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache-də varsa onu qaytar
        if (response) {
          console.log('📦 Cache-dən yüklənir:', event.request.url);
          return response;
        }

        // Cache-də yoxdursa şəbəkədən yüklə
        console.log('🌐 Şəbəkədən yüklənir:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Yalnız uğurlu cavabları cache et
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Response-nu clone et (bir dəfə istifadə olunur)
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Yalnız http və https sorğularını cache-lə
                if (event.request.url.startsWith('http://') || event.request.url.startsWith('https://')) {
                  cache.put(event.request, responseToCache);
                  console.log('💾 Cache-ə əlavə edildi:', event.request.url);
                }
              });

            return response;
          })
          .catch(() => {
            // Şəbəkə xətası zamanı offline səhifə göstər
            if (event.request.destination === 'document') {
              return caches.match('./index1.html');
            }
          });
      })
  );
});

// Background sync (gələcək üçün)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Background sync başladıldı');
    event.waitUntil(doBackgroundSync());
  }
});

// Push bildirişləri (gələcək üçün)
self.addEventListener('push', (event) => {
  console.log('🔔 Push bildirişi alındı');
  const options = {
    body: event.data ? event.data.text() : 'Yeni sual əlavə edildi!',
    icon: './icon-192x192.png',
    badge: './icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Aç',
        icon: './icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Bağla',
        icon: './icon-72x72.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('REZİDENTURA Quiz', options)
  );
});

// Background sync funksiyası
async function doBackgroundSync() {
  try {
    console.log('🔄 Məlumatlar sinxronlaşdırılır...');
    // Burada Firebase sinxronlaşması əlavə edilə bilər
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Background sync xətası:', error);
    return Promise.reject(error);
  }
}

// Notification klik hadisəsi
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
}); 
