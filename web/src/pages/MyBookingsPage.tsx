import { useCallback, useEffect, useState } from 'react';
import { api, formatDate, type MyBooking } from '../api';
import { useAuth } from '../auth';
import { ErrorNote, Loading, StatusPill } from '../components/ui';
import { loginPath } from '../router';

export function MyBookingsPage() {
  const { user, token } = useAuth();
  const [bookings, setBookings] = useState<MyBooking[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setBookings((await api.myBookings(token)).data);
    } catch (e) {
      setError(e);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return (
      <div className="empty">
        <h1>Sign in to see your bookings</h1>
        <a className="btn btn-primary" href={loginPath()}>
          Sign in
        </a>
      </div>
    );
  }

  async function cancel(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await api.cancel(token, id);
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h1>My bookings</h1>
      <ErrorNote error={error} />
      {!bookings ? (
        <Loading label="Loading bookings" />
      ) : bookings.length === 0 ? (
        <div className="empty">
          <p>You haven't booked anything yet.</p>
          <a className="btn btn-primary" href="#/">
            Browse events
          </a>
        </div>
      ) : (
        <ul className="booking-list">
          {bookings.map((b) => {
            const past = new Date(b.event.startsAt).getTime() <= Date.now();
            return (
              <li key={b.id} className={`card booking-row${b.status === 'cancelled' ? ' is-cancelled' : ''}`}>
                <div>
                  <a href={`#/events/${b.event.id}`} className="booking-title">
                    {b.event.title}
                  </a>
                  <p className="muted">
                    {formatDate(b.event.startsAt)} · {b.event.venue}
                  </p>
                </div>
                <div className="booking-meta">
                  <span>
                    {b.seats} seat{b.seats > 1 ? 's' : ''}
                  </span>
                  <StatusPill status={b.status} />
                  {b.status === 'confirmed' && !past && (
                    <button className="btn btn-sm btn-danger" disabled={busyId === b.id} onClick={() => cancel(b.id)}>
                      {busyId === b.id ? 'Cancelling…' : 'Cancel'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
