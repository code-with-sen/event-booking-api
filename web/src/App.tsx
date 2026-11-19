import { useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import { useAuth } from './auth';
import { EventPage } from './pages/EventPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { NewEventPage } from './pages/NewEventPage';
import { RacePage } from './pages/RacePage';
import { loginPath, useRoute, type Route } from './router';

const REPO_URL = 'https://github.com/code-with-sen/event-booking-api';

type ServerState = 'checking' | 'waking' | 'up' | 'down';

/** The demo API sleeps on Render's free tier, so tell visitors when the first request is slow. */
function useServerState() {
  const [state, setState] = useState<ServerState>('checking');
  useEffect(() => {
    let done = false;
    const slow = setTimeout(() => !done && setState('waking'), 2500);
    const attempt = async (triesLeft: number): Promise<void> => {
      try {
        await api.health();
        done = true;
        setState('up');
      } catch {
        if (triesLeft > 0) {
          setState('waking');
          await new Promise((r) => setTimeout(r, 5000));
          return attempt(triesLeft - 1);
        }
        done = true;
        setState('down');
      }
    };
    attempt(12);
    return () => clearTimeout(slow);
  }, []);
  return state;
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <a href={href} className={active ? 'nav-link active' : 'nav-link'} aria-current={active ? 'page' : undefined}>
      {children}
    </a>
  );
}

function Header({ route }: { route: Route }) {
  const { user, signOut } = useAuth();
  return (
    <header className="header">
      <div className="container header-inner">
        <a href="#/" className="brand">
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="currentColor" />
            <path d="M8 11h16v3a2 2 0 0 0 0 4v3H8v-3a2 2 0 0 0 0-4z" fill="var(--bg)" />
          </svg>
          <span>Event Booking</span>
        </a>
        <nav className="nav">
          <NavLink href="#/" active={route.name === 'home' || route.name === 'event'}>
            Events
          </NavLink>
          <NavLink href="#/race" active={route.name === 'race'}>
            Race demo
          </NavLink>
          {user && (
            <>
              <NavLink href="#/bookings" active={route.name === 'bookings'}>
                My bookings
              </NavLink>
              <NavLink href="#/events/new" active={route.name === 'new-event'}>
                New event
              </NavLink>
            </>
          )}
        </nav>
        <div className="header-user">
          {user ? (
            <>
              <span className="user-name" title={user.email}>
                {user.name}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            route.name !== 'login' && (
              <a className="btn btn-primary btn-sm" href={loginPath()}>
                Sign in
              </a>
            )
          )}
        </div>
      </div>
    </header>
  );
}

function ServerBanner({ state }: { state: ServerState }) {
  if (state === 'waking')
    return (
      <div className="banner banner-warn" role="status">
        <span className="spinner" aria-hidden="true" /> Waking up the API server. On the free tier this can take up to a
        minute after a quiet spell.
      </div>
    );
  if (state === 'down')
    return (
      <div className="banner banner-error" role="alert">
        The API isn't responding right now. Try refreshing in a minute.
      </div>
    );
  return null;
}

export function App() {
  const route = useRoute();
  const server = useServerState();

  let page: ReactNode;
  switch (route.name) {
    case 'home':
      page = <HomePage />;
      break;
    case 'event':
      page = <EventPage key={route.id} id={route.id} />;
      break;
    case 'new-event':
      page = <NewEventPage />;
      break;
    case 'bookings':
      page = <MyBookingsPage />;
      break;
    case 'login':
      page = <LoginPage next={route.next} />;
      break;
    case 'race':
      page = <RacePage />;
      break;
    default:
      page = (
        <div className="empty">
          <h1>Page not found</h1>
          <a href="#/">Back to events</a>
        </div>
      );
  }

  return (
    <>
      <Header route={route} />
      <ServerBanner state={server} />
      <main className="container main">{page}</main>
      <footer className="footer container">
        <span>
          Frontend for the{' '}
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            event-booking-api
          </a>{' '}
          (TypeScript, Express, PostgreSQL)
        </span>
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          View source
        </a>
      </footer>
    </>
  );
}
