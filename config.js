'use strict';

(function () {
  const encoded =
    'eyJhcGlLZXkiOiJBSXphU3lCRHhXazFKXzY2dThzNGp3UW50clg0Vk9iZDB5Y2ZPYzAiLCJhdXRoRG9tYWluIjoia290YW5lby5maXJlYmFzZWFwcC5jb20iLCJkYXRhYmFzZVVSTCI6Imh0dHBzOi8va290YW5lby1kZWZhdWx0LXJ0ZGIuZmlyZWJhc2Vpby5jb20iLCJwcm9qZWN0SWQiOiJrb3RhbmVvIiwic3RvcmFnZUJ1Y2tldCI6ImtvdGFuZW8uZmlyZWJhc2VzdG9yYWdlLmFwcCIsIm1lc3NhZ2luZ1NlbmRlcklkIjoiNjk2MzMyMjE1NzU4IiwiYXBwSWQiOiIxOjY5NjMzMjIxNTc4OndlYjo3NmYwYWExYjU1ZGY5NGIzYjU3NzlmIiwibWVhc3VyZW1lbnRJZCI6IkctTVpQMk1aQkVENyJ9';

  const config = JSON.parse(atob(encoded));

  globalThis.firebaseConfig = config;
  globalThis.FIREBASE_CONFIG = config;
  globalThis.DATA_BASE = 'data/';
})();
