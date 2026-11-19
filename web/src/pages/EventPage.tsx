import { useCallback, useEffect, useState } from 'react';
import { api, formatDate, type Attendee, type Event, type MyBooking } from '../api';
import { useAuth } from '../auth';
import { Card, ErrorNote, Loading, SeatMeter, StatusPill } from '../components/ui';
import { loginPath, navigate } from '../router';

export function EventPage({ id }: { id: number }) {
  const { user, token } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [myBooking, setMyBooking] = useState<MyBooking | null>(null);
  const [attendees, setAttendees] = useState<Attendee[] | null>(null);

  const [seats, setSeats] = useState(1);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isOrganizer = !!user && event?.organizerId === user.id;
  const started = event ? new Date(event.startsAt).getTime() <= Date.now() : false;

  const refresh = useCallback(async () => {
    try {
      const { event } = await api.getEvent(id);
      setEvent(event);
      setLoadError(null);
      if (token) {
        const { data } = await api.myBookings(token);
        setMyBooking(data.find((b) => b.event.id === id && b.status === 'confirmed') ?? null);
        if (user && event.organizerId === user.id) {
          setAttendees((await api.attendees(token, id)).data);
        }
      }
    } catch (e) {
      setLoadError(e);
    }
  }, [id, token, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function run(action: () => Promise<string>) {
    setBusy(true);
    setActionError(null);
    setSuccess(null);
    try {
      setSuccess(await action());
      await refresh();
    } catch (e) {
      setActionError(e);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const book = () =>
    run(async () => {
      const { booking } = await api.book(token, id, seats);
      return `Booked ${booking.seats} seat${booking.seats > 1 ? 's' : ''}. Booking #${booking.id} is confirmed.`;
    });

  const cancel = () =>
    run(async () => {
      if (!myBooking) return '';
      await api.cancel(token, myBooking.id);
      return 'Your booking was cancelled and the seats were released.';
    });

  async function remove() {
    if (!event || !window.confirm(`Delete “${event.title}”? Its bookings will be deleted too.`)) return;
    setBusy(true);
    try {
      await api.deleteEvent(token, id);
      navigate('/');
    } catch (e) {
      setActionError(e);
      setBusy(false);
    }
  }

  if (loadError && !event) {
    return (
      <>
        <a href="#/" className="back">
          ← All events
        </a>
        <ErrorNote error={loadError} />
      </>
    );
  }
  if (!event) return <Loading label="Loading event" />;

  const maxSeats = Math.max(1, Math.min(10, event.seatsAvailable));

  return (
    <>
      <a href="#/" className="back">
        ← All events
      </a>
      <div className="event-layout">
        <div>
          <p className="event-date">{formatDate(event.startsAt)}</p>
          <h1 className="event-title">{event.title}</h1>
          <p className="event-venue-lg">{event.venue}</p>
          {event.description && <p className="event-description">{event.description}</p>}
          <SeatMeter capacity={event.capacity} booked={event.seatsBooked} />
        </div>

        <Card className="book-card">
          <h2>Book seats</h2>
          {success && (
            <div className="note note-success" role="status">
              {success}
            </div>
          )}
          <ErrorNote error={actionError} />

          {started ? (
            <p className="muted">This event has already started, so bookings are closed.</p>
          ) : !user ? (
            <>
              <p className="muted">Sign in to book seats for this event.</p>
              <a className="btn btn-primary btn-block" href={loginPath()}>
                Sign in to book
              </a>
            </>
          ) : myBooking ? (
            <>
              <p>
                You have <strong>{myBooking.seats}</strong> seat{myBooking.seats > 1 ? 's' : ''} booked.
              </p>
              <button className="btn btn-danger btn-block" disabled={busy} onClick={cancel}>
                {busy ? 'Cancelling…' : 'Cancel my booking'}
              </button>
            </>
          ) : event.seatsAvailable === 0 ? (
            <p className="muted">This event is sold out.</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                book();
              }}
            >
              <label className="field">
                <span>Seats (1–{maxSeats})</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={maxSeats}
                  value={seats}
                  onChange={(e) => setSeats(Math.max(1, Math.min(maxSeats, Number(e.target.value) || 1)))}
                />
              </label>
              <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                {busy ? 'Booking…' : `Book ${seats} seat${seats > 1 ? 's' : ''}`}
              </button>
            </form>
          )}
        </Card>
      </div>

      {isOrganizer && (
        <Card className="organizer">
          <div className="section-head">
            <h2>Attendees</h2>
            <button className="btn btn-danger btn-sm" disabled={busy} onClick={remove}>
              Delete event
            </button>
          </div>
          <p className="muted">Only you can see this because you organize this event.</p>
          {!attendees ? (
            <Loading label="Loading attendees" />
          ) : attendees.length === 0 ? (
            <p className="muted">No bookings yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th className="num">Seats</th>
                    <th>Status</th>
                    <th>Booked</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((a) => (
                    <tr key={a.id}>
                      <td>{a.userName}</td>
                      <td className="muted">{a.userEmail}</td>
                      <td className="num">{a.seats}</td>
                      <td>
                        <StatusPill status={a.status} />
                      </td>
                      <td className="muted">{formatDate(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
