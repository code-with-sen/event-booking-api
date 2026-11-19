import { useState } from 'react';
import { api, ApiError, type Event } from '../api';
import { Card, ErrorNote, SeatMeter } from '../components/ui';

type Phase = 'idle' | 'setup' | 'racing' | 'done' | 'error';

interface Attempt {
  buyer: number;
  state: 'waiting' | 'pending' | 'won' | 'lost' | 'error';
  ms?: number;
  order?: number;
  message?: string;
}

const PASSWORD = 'race-demo-password';

function randomId() {
  return Math.random().toString(36).slice(2, 8);
}

export function RacePage() {
  const [capacity, setCapacity] = useState(5);
  const [buyers, setBuyers] = useState(20);
  const [keepEvent, setKeepEvent] = useState(false);

  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState('');
  const [registered, setRegistered] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [finalEvent, setFinalEvent] = useState<Event | null>(null);
  const [eventId, setEventId] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [elapsed, setElapsed] = useState(0);

  const running = phase === 'setup' || phase === 'racing';

  async function start() {
    const runId = randomId();
    setPhase('setup');
    setError(null);
    setFinalEvent(null);
    setEventId(null);
    setRegistered(0);
    setAttempts(Array.from({ length: buyers }, (_, i) => ({ buyer: i + 1, state: 'waiting' })));

    try {
      // 1. An organizer and a small event.
      setStep('Creating an event');
      const organizer = await api.register({
        email: `race-${runId}-organizer@example.com`,
        name: `Race organizer ${runId}`,
        password: PASSWORD,
      });
      const { event } = await api.createEvent(organizer.token, {
        title: `Race demo ${runId}`,
        venue: 'The race demo page',
        description: `${buyers} buyers tried to book ${capacity} seats at the same moment.`,
        startsAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        capacity,
      });
      setEventId(event.id);

      // 2. One account per buyer, because each user can hold only one active booking per event.
      setStep(`Signing up ${buyers} buyers`);
      const tokens = await Promise.all(
        Array.from({ length: buyers }, async (_, i) => {
          const { token } = await api.register({
            email: `race-${runId}-buyer${i + 1}@example.com`,
            name: `Buyer ${i + 1}`,
            password: PASSWORD,
          });
          setRegistered((n) => n + 1);
          return token;
        }),
      );

      // 3. Fire every booking request in the same tick.
      setStep(`Firing ${buyers} booking requests at once`);
      setPhase('racing');
      setAttempts((prev) => prev.map((a) => ({ ...a, state: 'pending' })));
      let finished = 0;
      const t0 = performance.now();
      await Promise.all(
        tokens.map(async (token, i) => {
          let result: Partial<Attempt>;
          try {
            await api.book(token, event.id, 1);
            result = { state: 'won', message: 'Got a seat' };
          } catch (e) {
            const sold = e instanceof ApiError && e.status === 409;
            result = { state: sold ? 'lost' : 'error', message: e instanceof Error ? e.message : 'Failed' };
          }
          finished += 1;
          const done = { ...result, ms: Math.round(performance.now() - t0), order: finished };
          setAttempts((prev) => prev.map((a, j) => (j === i ? { ...a, ...done } : a)));
        }),
      );
      setElapsed(Math.round(performance.now() - t0));

      // 4. Read back the event to check the database's view.
      setStep('Checking the final seat count');
      const { event: after } = await api.getEvent(event.id);
      setFinalEvent(after);

      if (!keepEvent) {
        await api.deleteEvent(organizer.token, event.id).catch(() => undefined);
        setEventId(null);
      }
      setPhase('done');
      setStep('');
    } catch (e) {
      setError(e);
      setPhase('error');
      setStep('');
    }
  }

  const won = attempts.filter((a) => a.state === 'won').length;
  const lost = attempts.filter((a) => a.state === 'lost').length;
  const failed = attempts.filter((a) => a.state === 'error').length;
  const expected = Math.min(capacity, buyers);
  const correct = finalEvent !== null && won === expected && finalEvent.seatsBooked === expected && failed === 0;

  return (
    <>
      <div className="race-head">
        <div>
          <p className="eyebrow">Concurrency demo</p>
          <h1>Many buyers, few seats, one moment</h1>
          <p className="lead">
            This page signs up {buyers} buyers, then sends all {buyers} booking requests to the live API at the same
            instant for an event with only {capacity} seats. A naive system would sell more seats than exist. This one
            shouldn't.
          </p>
        </div>
      </div>

      <Card className="race-controls">
        <div className="field-row">
          <label className="field">
            <span>Seats</span>
            <input
              className="input"
              type="number"
              min={1}
              max={20}
              value={capacity}
              disabled={running}
              onChange={(e) => setCapacity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            />
          </label>
          <label className="field">
            <span>Buyers</span>
            <input
              className="input"
              type="number"
              min={2}
              max={30}
              value={buyers}
              disabled={running}
              onChange={(e) => setBuyers(Math.max(2, Math.min(30, Number(e.target.value) || 2)))}
            />
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={keepEvent} disabled={running} onChange={(e) => setKeepEvent(e.target.checked)} />
          Keep the demo event afterwards (otherwise it's deleted when the race ends)
        </label>
        <button className="btn btn-primary btn-lg" onClick={start} disabled={running}>
          {running ? (
            <>
              <span className="spinner" aria-hidden="true" /> {step}
              {phase === 'setup' && step.startsWith('Signing') ? ` (${registered}/${buyers})` : ''}
            </>
          ) : phase === 'done' || phase === 'error' ? (
            'Run it again'
          ) : (
            'Start the race'
          )}
        </button>
      </Card>

      <ErrorNote error={error} />

      {attempts.length > 0 && (
        <>
          <div className="race-stats" aria-live="polite">
            <div className="stat">
              <span className="stat-value stat-won">{won}</span>
              <span className="stat-label">got a seat</span>
            </div>
            <div className="stat">
              <span className="stat-value stat-lost">{lost}</span>
              <span className="stat-label">turned away (409)</span>
            </div>
            <div className="stat">
              <span className="stat-value">{finalEvent ? `${finalEvent.seatsBooked} / ${finalEvent.capacity}` : '–'}</span>
              <span className="stat-label">seats booked in the database</span>
            </div>
            <div className="stat">
              <span className="stat-value">{phase === 'done' ? `${elapsed} ms` : '–'}</span>
              <span className="stat-label">for all requests</span>
            </div>
          </div>

          {finalEvent && (
            <div className={`verdict ${correct ? 'verdict-ok' : 'verdict-bad'}`} role="status">
              {correct ? (
                <>
                  <strong>No overbooking.</strong> Exactly {expected} of {buyers} requests won, and the database shows{' '}
                  {finalEvent.seatsBooked} of {finalEvent.capacity} seats booked.
                </>
              ) : failed > 0 ? (
                <>
                  <strong>{failed} request{failed > 1 ? 's' : ''} failed</strong> for a reason other than a sold-out
                  event (see the red tiles). The seat count is still {finalEvent.seatsBooked} of {finalEvent.capacity}.
                </>
              ) : (
                <>
                  <strong>Unexpected result:</strong> {won} won and the database shows {finalEvent.seatsBooked} of{' '}
                  {finalEvent.capacity} booked.
                </>
              )}
              {finalEvent && <SeatMeter capacity={finalEvent.capacity} booked={finalEvent.seatsBooked} compact />}
              {eventId && (
                <a href={`#/events/${eventId}`} className="verdict-link">
                  Open the event →
                </a>
              )}
            </div>
          )}

          <ol className="tiles" aria-label="Booking requests">
            {attempts.map((a) => (
              <li key={a.buyer} className={`tile tile-${a.state}`} title={a.message}>
                <span className="tile-buyer">Buyer {a.buyer}</span>
                <span className="tile-result">
                  {a.state === 'waiting' && 'Signing up'}
                  {a.state === 'pending' && 'Booking…'}
                  {a.state === 'won' && '201 Seat'}
                  {a.state === 'lost' && '409 Sold out'}
                  {a.state === 'error' && 'Error'}
                </span>
                {a.ms !== undefined && (
                  <span className="tile-ms">
                    #{a.order} · {a.ms} ms
                  </span>
                )}
              </li>
            ))}
          </ol>
        </>
      )}

      <Card className="explain">
        <h2>What happens on the server</h2>
        <p>
          Each booking runs in its own transaction. The first statement locks the event's row, so the other requests
          for that event wait in line. Each one then reads the seat count left by the one before it:
        </p>
        <pre>
          <code>{`BEGIN;
SELECT capacity, seats_booked FROM events
 WHERE id = $1 FOR UPDATE;          -- others wait here
-- if seats_booked + 1 > capacity: ROLLBACK → 409 Sold out
INSERT INTO bookings (event_id, user_id, seats) VALUES (...);
UPDATE events SET seats_booked = seats_booked + 1 WHERE id = $1;
COMMIT;                              -- lock released, next in line runs`}</code>
        </pre>
        <p className="muted">
          A <code>CHECK (seats_booked &lt;= capacity)</code> constraint backs this up, so even a buggy code path couldn't
          overbook. Bookings for other events lock other rows and never wait on this one.
        </p>
      </Card>
    </>
  );
}
