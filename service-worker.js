const CACHE_NAME = 'voiceflow-pro-v1';
const OFFLINE_URL = '/voice-aloud/offline.html';

const ASSETS_TO_CACHE = [
    '/voice-aloud/',
    '/voice-aloud/index.html',
    '/voice-aloud/styles.css',
    '/voice-aloud/manifest.json',
    '/voice-aloud/offline.html',
    '/voice-aloud/icons/icon-192x192.png',
    '/voice-aloud/icons/icon-512x512.png',
    '/voice-aloud/js/config.js',
    '/voice-aloud/js/api.js',
    '/voice-aloud/js/auth.js',
    '/voice-aloud/js/recording.js',
    '/voice-aloud/js/transcription.js',
    '/voice-aloud/js/tts.js',
    '/voice-aloud/js/ui.js',
    '/voice-aloud/js/storage.js',
    '/voice-aloud/js/premium.js',
    '/voice-aloud/js/app.js'
];

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

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }

                return fetch(event.request)
                    .then(response => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        // Cache the response
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // If offline and requesting a page, show offline page
                        if (event.request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                    });
            })
    );
});

// Background sync for offline recordings
self.addEventListener('sync', event => {
    if (event.tag === 'sync-recordings') {
        event.waitUntil(syncRecordings());
    }
});

async function syncRecordings() {
    try {
        const cache = await caches.open('voiceflow-data');
        const response = await cache.match('/data/pending-recordings');
        if (response) {
            const pendingRecordings = await response.json();
            
            // Process each pending recording
            for (const recording of pendingRecordings) {
                try {
                    // Attempt to upload
                    await fetch('/api/recordings', {
                        method: 'POST',
                        body: JSON.stringify(recording),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    // Remove from pending if successful
                    const updatedPending = pendingRecordings
                        .filter(r => r.id !== recording.id);
                    await cache.put(
                        '/data/pending-recordings',
                        new Response(JSON.stringify(updatedPending))
                    );
                } catch (error) {
                    console.error('Error syncing recording:', error);
                }
            }
        }
    } catch (error) {
        console.error('Error in syncRecordings:', error);
    }
}

// Push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data.text(),
        icon: '/voice-aloud/icons/icon-192x192.png',
        badge: '/voice-aloud/icons/badge.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Recording'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('VoiceFlow Pro', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        // Open the app and navigate to the recording
        event.waitUntil(
            clients.openWindow('/voice-aloud/')
        );
    }
});
