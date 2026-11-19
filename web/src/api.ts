// Thin typed client for the Event Booking API.

export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Event {
  id: number;
  organizerId: number;
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  capacity: number;
  seatsBooked: number;
  seatsAvailable: number;
}

export interface Booking {
  id: number;
  eventId: number;
  userId: number;
  seats: number;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
  cancelledAt: string | null;
}

export interface MyBooking {
  id: number;
  seats: number;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
  cancelledAt: string | null;
  event: { id: number; title: string; venue: string; startsAt: string };
}

export interface Attendee {
  id: number;
  seats: number;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
  userId: number;
  userName: string;
  userEmail: string;
}

export interface Paginated<T> {
  data: T[];
  pagination: { total: number; limit: number; offset: number };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the API. It may be waking up, try again in a moment.');
  }

  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = json?.error;
    throw new ApiError(res.status, err?.code ?? 'ERROR', err?.message ?? `Request failed (${res.status})`, err?.details);
  }
  return json as T;
}

type Token = string | null;

export const api = {
  // Used to detect a sleeping server. Render's edge doesn't serve the health-check path to
  // cross-origin browser requests, so ping a cheap public API route instead.
  ping: () => request<Paginated<Event>>('/api/v1/events?limit=1'),

  register: (body: { email: string; name: string; password: string }) =>
    request<{ user: User; token: string }>('/api/v1/auth/register', { method: 'POST', body }),
  login: (body: { email: string; password: string }) =>
    request<{ user: User; token: string }>('/api/v1/auth/login', { method: 'POST', body }),
  me: (token: Token) => request<{ user: User }>('/api/v1/auth/me', { token }),

  listEvents: (params: { q?: string; limit?: number; offset?: number; includePast?: boolean }) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));
    if (params.includePast) qs.set('includePast', 'true');
    return request<Paginated<Event>>(`/api/v1/events?${qs}`);
  },
  getEvent: (id: number) => request<{ event: Event }>(`/api/v1/events/${id}`),
  createEvent: (
    token: Token,
    body: { title: string; description: string; venue: string; startsAt: string; capacity: number },
  ) => request<{ event: Event }>('/api/v1/events', { method: 'POST', body, token }),
  deleteEvent: (token: Token, id: number) => request<void>(`/api/v1/events/${id}`, { method: 'DELETE', token }),
  attendees: (token: Token, id: number) => request<{ data: Attendee[] }>(`/api/v1/events/${id}/bookings`, { token }),

  book: (token: Token, eventId: number, seats: number) =>
    request<{ booking: Booking }>(`/api/v1/events/${eventId}/bookings`, { method: 'POST', body: { seats }, token }),
  myBookings: (token: Token) => request<{ data: MyBooking[] }>('/api/v1/bookings/me', { token }),
  cancel: (token: Token, bookingId: number) =>
    request<{ booking: Booking }>(`/api/v1/bookings/${bookingId}/cancel`, { method: 'POST', token }),
};

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
