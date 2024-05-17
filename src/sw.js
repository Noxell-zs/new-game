"use strict";

const CACHE = 'v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/index.html'])),
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fromCache(event.request)
      .then((response) => update(event, response))
      .catch(() => fromNetwork(event.request)),
  );
});

function fromNetwork(request) {
  return fetch(request).then((response) => {
    caches.open(CACHE).then((cache) => cache.put(request, response.clone()));

    return response.clone();
  });
}

function fromCache(request) {
  return caches
    .open(CACHE)
    .then((cache) =>
      cache
        .match(request)
        .then((matching) => matching || Promise.reject('no-match')),
    );
}

function update(event, response) {
  event.waitUntil(
    fetch(event.request).then((response2) =>
      caches.open(CACHE).then((cache) => cache.put(event.request, response2)),
    ),
  );

  return response;
}
