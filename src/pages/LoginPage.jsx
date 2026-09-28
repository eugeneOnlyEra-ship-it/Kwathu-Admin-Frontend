import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { adminLogin, logout, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Already signed in — an admin belongs at the dashboard. This app has
  // no other role's home to send anyone else to, so a leftover non-admin
  // session (e.g. a stale token from a shared browser) is just logged out
  // and left on this screen instead of being routed nowhere.
  useEffect(() => {
    if (authLoading) return;
    if (isAdmin) navigate('/dashboard', { replace: true });
    else if (isAuthenticated) logout();
  }, [authLoading, isAdmin, isAuthenticated, navigate, logout]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await adminLogin({ email, password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      // Deliberately the same message the backend gives for a wrong
      // password, an unknown email, or a correct-but-non-admin account —
      // this screen never confirms which one it was.
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || isAuthenticated) return null;

  return (
    <div className="min-h-dvh bg-ink flex items-center justify-center px-6 py-12">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent 0 17px, rgba(255,255,255,.9) 17px 18px), repeating-linear-gradient(-45deg, transparent 0 17px, rgba(255,255,255,.9) 17px 18px)',
        }}
      />

      <div className="relative w-full max-w-[380px]">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-ink-2">
            <Lock size={18} strokeWidth={1.8} className="text-green-pale" />
          </span>
          <div className="mt-4 font-display text-[1.4rem] font-semibold text-text-inverse">
            Kwathu Admin
          </div>
          <p className="mt-1.5 text-[0.82rem] text-text-inverse-muted">
            Restricted access — sign in with your admin account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4 rounded-[var(--radius-lg)] border border-line bg-ink-2 p-6"
          noValidate
        >
          <Field label="Email address">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@kwathu.mw"
              className="admin-input"
            />
          </Field>

          <Field label="Password">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="admin-input pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-inverse-muted hover:text-text-inverse"
              >
                {showPassword ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
              </button>
            </div>
          </Field>

          {error && (
            <div className="text-[0.8rem] text-clay bg-clay/10 border border-clay/20 rounded-lg px-3.5 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-green text-ink font-semibold text-[0.9rem] py-[13px] mt-1 transition hover:bg-green-pale active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-[0.72rem] text-text-inverse-muted">
          Not an admin? This isn't the page you're looking for.
        </p>
      </div>

      {/* Dark-surface input variant — the shared `.input` class assumes a
          light (paper) background, which reads as broken on ink. */}
      <style>{`
        .admin-input {
          width: 100%;
          padding: 13px 15px;
          border-radius: var(--radius-sm);
          border: 1.4px solid var(--color-line);
          font-size: 0.9rem;
          outline: none;
          background: var(--color-ink);
          color: var(--color-text-inverse);
          transition: border-color 0.15s ease;
        }
        .admin-input:focus {
          border-color: var(--color-green);
        }
        .admin-input::placeholder {
          color: var(--color-text-inverse-muted);
        }
        .admin-input.pr-11 {
          padding-right: 2.75rem;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[0.7rem] font-semibold text-text-inverse-muted uppercase tracking-[0.05em] mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
