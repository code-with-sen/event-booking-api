import { pool } from '../../db/pool';
import { forbidden, notFound } from '../../lib/errors';
import type { CreateEventInput, ListEventsQuery, UpdateEventInput } from './events.schemas';

export interface Event {
  id: number;
  organizerId: number;
  title: string;
  description: string;
  venue: string;
  startsAt: Date;
  capacity: number;
  seatsBooked: number;
  seatsAvailable: number;
  createdAt: Date;
  updatedAt: Date;
}

const EVENT_COLUMNS = `
  id::int AS id,
  organizer_id::int AS "organizerId",
  title, description, venue,
  starts_at AS "startsAt",
  capacity,
  seats_booked AS "seatsBooked",
  capacity - seats_booked AS "seatsAvailable",
  created_at AS "createdAt",
  updated_at AS "updatedAt"`;

// Whitelist mapping from API field names to columns, so dynamic UPDATEs can't inject column names.
const UPDATABLE_COLUMNS: Record<keyof UpdateEventInput, string> = {
  title: 'title',
  description: 'description',
  venue: 'venue',
  startsAt: 'starts_at',
  capacity: 'capacity',
};

export async function createEvent(organizerId: number, input: CreateEventInput): Promise<Event> {
  const { rows } = await pool.query<Event>(
    `INSERT INTO events (organizer_id, title, description, venue, starts_at, capacity)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${EVENT_COLUMNS}`,
    [organizerId, input.title, input.description, input.venue, input.startsAt, input.capacity],
  );
  return rows[0];
}

export async function listEvents(query: ListEventsQuery) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (!query.includePast) conditions.push('starts_at > now()');
  if (query.q) {
    params.push(`%${query.q}%`);
    conditions.push(`(title ILIKE $${params.length} OR venue ILIKE $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(query.limit, query.offset);
  const { rows } = await pool.query<Event & { total: number }>(
    `SELECT ${EVENT_COLUMNS}, COUNT(*) OVER()::int AS total
     FROM events ${where}
     ORDER BY starts_at ASC, id ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const total = rows[0]?.total ?? 0;
  const data = rows.map(({ total: _total, ...event }) => event);
  return { data, pagination: { total, limit: query.limit, offset: query.offset } };
}

export async function getEvent(id: number): Promise<Event> {
  const { rows } = await pool.query<Event>(`SELECT ${EVENT_COLUMNS} FROM events WHERE id = $1`, [id]);
  if (!rows[0]) throw notFound('Event');
  return rows[0];
}

async function assertOrganizer(eventId: number, userId: number) {
  const event = await getEvent(eventId);
  if (event.organizerId !== userId) throw forbidden('Only the organizer can modify this event');
  return event;
}

export async function updateEvent(id: number, userId: number, input: UpdateEventInput): Promise<Event> {
  await assertOrganizer(id, userId);

  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [field, value] of Object.entries(input)) {
    if (value === undefined) continue;
    params.push(value);
    sets.push(`${UPDATABLE_COLUMNS[field as keyof UpdateEventInput]} = $${params.length}`);
  }
  params.push(id);

  // Lowering capacity below seats_booked is rejected by the seats_within_capacity CHECK constraint.
  const { rows } = await pool.query<Event>(
    `UPDATE events SET ${sets.join(', ')}, updated_at = now()
     WHERE id = $${params.length}
     RETURNING ${EVENT_COLUMNS}`,
    params,
  );
  return rows[0];
}

export async function deleteEvent(id: number, userId: number): Promise<void> {
  await assertOrganizer(id, userId);
  await pool.query('DELETE FROM events WHERE id = $1', [id]);
}

export async function listEventBookings(eventId: number, userId: number) {
  await assertOrganizer(eventId, userId);
  const { rows } = await pool.query(
    `SELECT b.id::int AS id, b.seats, b.status, b.created_at AS "createdAt",
            u.id::int AS "userId", u.name AS "userName", u.email AS "userEmail"
     FROM bookings b JOIN users u ON u.id = b.user_id
     WHERE b.event_id = $1
     ORDER BY b.created_at ASC`,
    [eventId],
  );
  return rows;
}
