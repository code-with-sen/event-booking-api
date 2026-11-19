import { useEffect, useState } from 'react';
import { api, formatDate, type Event, type Paginated } from '../api';
import { useAuth } from '../auth';
import { ErrorNote, Loading, SeatMeter } from '../components/ui';

const PAGE_SIZE = 12;

export function HomePage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<Paginated<Event> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listEvents({ q: debounced || undefined, limit: PAGE_SIZE, offset })
      .then((r) => !cancelled && (setResult(r), setError(null)))
      .catch((e) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced, offset]);

  const total = result?.pagination.total ?? 0;

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Live demo</p>
          <h1>Book seats without ever overbooking</h1>
          <p className="lead">
            A frontend for a REST API that keeps seat counts correct even when many people book the last seats at the
            same moment. Every booking runs in a Postgres transaction with a row lock.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#/race">
              Watch the race demo
            </a>
            <a className="btn" href={user ? '#/events/new' : '#/login?next=%2Fevents%2Fnew'}>
              Create an event
            </a>
          </div>
        </div>
      </section>

      <div className="section-head">
        <h2>Upcoming events</h2>
        <input
          className="input search"
          type="search"
          placeholder="Search by title or venue"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search events"
        />
      </div>

      <ErrorNote error={error} />
      {loading && !result ? (
        <Loading label="Loading events" />
      ) : result && result.data.length === 0 ? (
        <div className="empty">
          <p>{debounced ? `No upcoming events match “${debounced}”.` : 'No upcoming events yet.'}</p>
          <a className="btn btn-primary" href={user ? '#/events/new' : '#/login?next=%2Fevents%2Fnew'}>
            Create the first one
          </a>
        </div>
      ) : (
        <div className={`grid${loading ? ' is-loading' : ''}`}>
          {result?.data.map((e) => (
            <a key={e.id} href={`#/events/${e.id}`} className="card event-card">
              <p className="event-date">{formatDate(e.startsAt)}</p>
              <h3>{e.title}</h3>
              <p className="muted event-venue">{e.venue}</p>
              <SeatMeter capacity={e.capacity} booked={e.seatsBooked} compact />
            </a>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="pager">
          <button className="btn btn-sm" disabled={offset === 0} onClick={() => setOffset(offset - PAGE_SIZE)}>
            Previous
          </button>
          <span className="muted">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <button
            className="btn btn-sm"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
