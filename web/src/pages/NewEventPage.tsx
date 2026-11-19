import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Card, ErrorNote } from '../components/ui';
import { loginPath, navigate } from '../router';

/** Value for a datetime-local input, in the browser's local time. */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewEventPage() {
  const { user, token } = useAuth();
  const nextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  nextWeek.setHours(18, 0, 0, 0);

  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [startsAt, setStartsAt] = useState(toLocalInput(nextWeek));
  const [capacity, setCapacity] = useState(50);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  if (!user) {
    return (
      <div className="empty">
        <h1>Sign in to create an event</h1>
        <a className="btn btn-primary" href={loginPath()}>
          Sign in
        </a>
      </div>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { event } = await api.createEvent(token, {
        title,
        venue,
        description,
        capacity,
        startsAt: new Date(startsAt).toISOString(),
      });
      navigate(`/events/${event.id}`);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <div className="narrow">
      <a href="#/" className="back">
        ← All events
      </a>
      <h1>Create an event</h1>
      <p className="muted">You'll be the organizer, so you can see the attendee list and delete it later.</p>
      <Card>
        <form onSubmit={submit} className="form">
          <ErrorNote error={error} />
          <label className="field">
            <span>Title</span>
            <input
              className="input"
              required
              minLength={3}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="TypeScript Meetup"
            />
          </label>
          <label className="field">
            <span>Venue</span>
            <input
              className="input"
              required
              maxLength={200}
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Bengaluru"
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Starts at</span>
              <input
                className="input"
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Capacity</span>
              <input
                className="input"
                type="number"
                required
                min={1}
                max={100000}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </label>
          </div>
          <label className="field">
            <span>
              Description <span className="muted">(optional)</span>
            </span>
            <textarea
              className="input"
              rows={4}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create event'}
          </button>
        </form>
      </Card>
    </div>
  );
}
