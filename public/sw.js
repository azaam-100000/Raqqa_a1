const CACHE_NAME = 'raqqa-market-cache-v17'; // Bump version to force update
const SUPABASE_HOST = 'oxysdlwfjcxypytlkcko.supabase.co';
const APP_SHELL_URLS = [
  '/', // Cache the root URL
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  console.log('Service Worker: Install Event v17');
  self.skipWaiting(); 
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching App Shell v17');
        const requests = APP_SHELL_URLS.map(url => new Request(url, { cache: 'reload' }));
        return cache.addAll(requests);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activate Event v17');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('raqqa-market-cache')) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients v17');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Always go to network for API requests to Supabase, and bypass the browser's HTTP cache.
  if (url.hostname === SUPABASE_HOST) {
    event.respondWith(fetch(request, { cache: 'no-cache' }));
    return;
  }

  // For navigation requests, use a network-first strategy with offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html', { cacheName: CACHE_NAME });
      })
    );
    return;
  }

  // For other assets (CSS, JS, images), use a "cache-first" strategy.
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

// This message listener allows the app to trigger the update flow.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


// --- PUSH NOTIFICATION LOGIC ---
self.addEventListener('push', event => {
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'إشعار جديد',
      body: event.data.text(),
      data: { url: '/#/' }, // Use hash for HashRouter
    };
  }

  const title = data.title || 'سوق محافظة الرقة';
  const options = {
    body: data.body || 'لديك إشعار جديد.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: data.data || { url: '/#/' }, // Default data with hash
    actions: data.actions || [],
  };

  // Special handling for incoming call notifications from Edge Function
  if (data.type === 'incoming_call') {
    options.actions = [
      { action: 'accept-call', title: 'قبول' },
      { action: 'decline-call', title: 'رفض' }
    ];
    // Keep notification open until user interacts
    options.requireInteraction = true; 
    // Pass call data to the notification
    options.data.callerId = data.callerId;
    options.data.callType = data.callType;
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const { action, notification: { data } } = event;

  let urlToOpen;

  if (action === 'accept-call' && data.callType && data.callerId) {
    // Construct the correct URL for accepting a call using HashRouter format
    urlToOpen = new URL(`/#/call/${data.callType}/${data.callerId}`, self.location.origin).href;
  } else if (action === 'decline-call') {
    // For declining, we can't easily send a message back to the caller from the SW.
    // The call request will time out on the caller's side. We just close the notification.
    return;
  } else {
    // Default action: open the URL from the notification data, or fallback to home
    urlToOpen = new URL(data.url || '/#/', self.location.origin).href;
  }
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then(clientList => {
      // Check if a window is already open with the app's origin
      for (const client of clientList) {
        if (new URL(client.url).origin === new URL(urlToOpen).origin && 'focus' in client) {
          // If a window is open, navigate it to the correct URL and focus
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // If no window is found, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});