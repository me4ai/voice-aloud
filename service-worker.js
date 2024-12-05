const CACHE_NAME = 'voiceflow-pro-v1';
const OFFLINE_URL = '/offline.html';

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/manifest.json',
    '/offline.html',
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-512x512.png',
    '/js/config.js',
    '/js/services/firebase.js',
    '/js/recording.js',
    '/js/transcription.js',
    '/js/tts.js',
    '/js/auth.js',
    '/js/storage.js',
    '/js/ui.js',
    '/js/app.js'
];

// Cache strategies
const CACHE_STRATEGIES = {
    CACHE_FIRST: async (request) => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        const networkResponse = await fetch(request);
        await cache.put(request, networkResponse.clone());
        return networkResponse;
    },
    NETWORK_FIRST: async (request) => {
        try {
            const networkResponse = await fetch(request);
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, networkResponse.clone());
            return networkResponse;
        } catch (error) {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }
            throw error;
        }
    },
    STALE_WHILE_REVALIDATE: async (request) => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        const networkResponsePromise = fetch(request).then(response => {
            cache.put(request, response.clone());
            return response;
        });
        return cachedResponse || networkResponsePromise;
    }
};

// Install event - cache assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // Cache offline page first
                return cache.add(new Request(OFFLINE_URL, { cache: 'reload' }))
                    .then(() => cache.addAll(ASSETS_TO_CACHE));
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => cacheName !== CACHE_NAME)
                        .map(cacheName => caches.delete(cacheName))
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event with improved routing
self.addEventListener('fetch', event => {
    // Skip non-GET requests and Firebase API requests
    if (
        event.request.method !== 'GET' ||
        event.request.url.includes('firebaseapp.com') ||
        event.request.url.includes('googleapis.com')
    ) {
        return;
    }

    const url = new URL(event.request.url);

    // Handle different types of requests
    if (ASSETS_TO_CACHE.includes(url.pathname)) {
        // Static assets - Cache First
        event.respondWith(CACHE_STRATEGIES.CACHE_FIRST(event.request));
    } else if (url.pathname.startsWith('/api/')) {
        // API requests - Network First
        event.respondWith(CACHE_STRATEGIES.NETWORK_FIRST(event.request));
    } else if (event.request.headers.get('accept').includes('text/html')) {
        // HTML navigation - Network First with offline fallback
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match(OFFLINE_URL))
        );
    } else {
        // Everything else - Stale While Revalidate
        event.respondWith(CACHE_STRATEGIES.STALE_WHILE_REVALIDATE(event.request));
    }
});

// Background sync for offline recordings
self.addEventListener('sync', event => {
    if (event.tag === 'sync-recordings') {
        event.waitUntil(syncPendingRecordings());
    }
});

async function syncPendingRecordings() {
    const pendingRecordings = await getPendingRecordings();
    if (!pendingRecordings.length) return;

    for (const recording of pendingRecordings) {
        try {
            // Get the recording file from IndexedDB
            const recordingBlob = await getRecordingFromIndexedDB(recording.id);
            if (!recordingBlob) continue;

            // Upload to Firebase Storage
            const formData = new FormData();
            formData.append('file', recordingBlob, recording.filename);
            formData.append('metadata', JSON.stringify(recording.metadata));

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                // Remove from pending queue
                await removePendingRecording(recording.id);
                // Remove from IndexedDB
                await deleteRecordingFromIndexedDB(recording.id);
            }
        } catch (error) {
            console.error('Error syncing recording:', error);
        }
    }
}

// Push notification handler
self.addEventListener('push', event => {
    const data = event.data.json();
    
    const options = {
        body: data.body,
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/badge.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url,
            dateOfArrival: Date.now()
        },
        actions: [
            {
                action: 'open',
                title: 'Open App'
            },
            {
                action: 'close',
                title: 'Dismiss'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'VoiceFlow Pro', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'open') {
        const urlToOpen = event.notification.data.url || '/';
        event.waitUntil(
            clients.matchAll({ type: 'window' })
                .then(windowClients => {
                    // Check if there is already a window/tab open with the target URL
                    for (const client of windowClients) {
                        if (client.url === urlToOpen && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    // If no window/tab is open, open a new one
                    if (clients.openWindow) {
                        return clients.openWindow(urlToOpen);
                    }
                })
        );
    }
});
