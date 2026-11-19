import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Card, ErrorNote } from '../components/ui';
import { navigate } from '../router';

export function LoginPage({ next }: { next?: string }) {
  const { user, signIn } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Only follow in-app paths, never an arbitrary URL from the query string.
  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';

  useEffect(() => {
    if (user) navigate(destination);
  }, [user, destination]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = mode === 'login' ? await api.login({ email, password }) : await api.register({ email, name, password });
      signIn(session);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <div className="narrow auth">
      <Card>
        <div className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={mode === 'login'}
            className={mode === 'login' ? 'tab active' : 'tab'}
            onClick={() => (setMode('login'), setError(null))}
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected={mode === 'register'}
            className={mode === 'register' ? 'tab active' : 'tab'}
            onClick={() => (setMode('register'), setError(null))}
          >
            Create account
          </button>
        </div>
        <form onSubmit={submit} className="form">
          <ErrorNote error={error} />
          {mode === 'register' && (
            <label className="field">
              <span>Name</span>
              <input className="input" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              className="input"
              type="password"
              required
              minLength={mode === 'register' ? 8 : 1}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
            {mode === 'register' && <small className="muted">At least 8 characters.</small>}
          </label>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </Card>
      <p className="muted center small">This is a public demo. Don't reuse a real password here.</p>
    </div>
  );
}
