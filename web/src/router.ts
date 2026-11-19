import { useEffect, useState } from 'react';

// Hash-based routing keeps the app deployable as plain static files (no server rewrites needed).

export type Route =
  | { name: 'home' }
  | { name: 'event'; id: number }
  | { name: 'new-event' }
  | { name: 'bookings' }
  | { name: 'login'; next?: string }
  | { name: 'race' }
  | { name: 'not-found' };

export function parseRoute(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query);

  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'events' && parts.length === 1) return { name: 'home' };
  if (parts[0] === 'events' && parts[1] === 'new') return { name: 'new-event' };
  if (parts[0] === 'events' && /^\d+$/.test(parts[1] ?? '')) return { name: 'event', id: Number(parts[1]) };
  if (parts[0] === 'bookings') return { name: 'bookings' };
  if (parts[0] === 'login') return { name: 'login', next: params.get('next') ?? undefined };
  if (parts[0] === 'race') return { name: 'race' };
  return { name: 'not-found' };
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function loginPath() {
  const current = window.location.hash.replace(/^#/, '') || '/';
  return `#/login?next=${encodeURIComponent(current)}`;
}
