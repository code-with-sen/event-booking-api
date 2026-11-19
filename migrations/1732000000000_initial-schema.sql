-- Up Migration

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         CITEXT      NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id              BIGSERIAL PRIMARY KEY,
  organizer_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  description     TEXT        NOT NULL DEFAULT '',
  venue           TEXT        NOT NULL,
  starts_at       TIMESTAMPTZ NOT NULL,
  capacity        INTEGER     NOT NULL CHECK (capacity > 0),
  -- Denormalised counter, updated in the same transaction as bookings.
  -- The CHECK constraint is a last line of defence against overbooking.
  seats_booked    INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT seats_within_capacity CHECK (seats_booked >= 0 AND seats_booked <= capacity)
);

CREATE INDEX events_starts_at_idx ON events (starts_at);
CREATE INDEX events_organizer_id_idx ON events (organizer_id);

CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled');

CREATE TABLE bookings (
  id           BIGSERIAL PRIMARY KEY,
  event_id     BIGINT         NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  user_id      BIGINT         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  seats        INTEGER        NOT NULL CHECK (seats BETWEEN 1 AND 10),
  status       booking_status NOT NULL DEFAULT 'confirmed',
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ
);

-- A user can hold at most one active booking per event.
CREATE UNIQUE INDEX bookings_one_active_per_user_event
  ON bookings (event_id, user_id)
  WHERE status = 'confirmed';

CREATE INDEX bookings_user_id_idx ON bookings (user_id);

-- Down Migration

DROP TABLE IF EXISTS bookings;
DROP TYPE IF EXISTS booking_status;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;
