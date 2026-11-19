import type { ReactNode } from 'react';
import { ApiError } from '../api';

export function SeatMeter({ capacity, booked, compact }: { capacity: number; booked: number; compact?: boolean }) {
  const pct = capacity > 0 ? Math.min(100, (booked / capacity) * 100) : 0;
  const left = capacity - booked;
  const tone = left === 0 ? 'full' : pct >= 80 ? 'low' : 'ok';
  return (
    <div className={`meter meter-${tone}${compact ? ' meter-compact' : ''}`}>
      <div
        className="meter-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={booked}
        aria-label="Seats booked"
      >
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="meter-label">
        <span>{left === 0 ? 'Sold out' : `${left} of ${capacity} seats left`}</span>
        {!compact && <span className="muted">{booked} booked</span>}
      </div>
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  const details = error instanceof ApiError ? error.details : undefined;
  return (
    <div className="note note-error" role="alert">
      <strong>{message}</strong>
      {details && details.length > 0 && (
        <ul>
          {details.map((d) => (
            <li key={d.path}>
              <code>{d.path.replace(/^body\./, '')}</code>: {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden="true" /> {label}…
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function StatusPill({ status }: { status: 'confirmed' | 'cancelled' }) {
  return <span className={`pill pill-${status}`}>{status}</span>;
}
