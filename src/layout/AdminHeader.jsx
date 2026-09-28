import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AdminHeader() {
  const { user, logout, setIsLoggingOut } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.fullName?.split(' ')[0];

  async function handleLogout() {
    setIsLoggingOut?.(true);
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line-dark bg-paper">
      <div className="mx-auto flex h-[76px] w-full max-w-[1240px] items-center justify-between px-5 sm:px-8">
        <div>
          <div className="font-display text-[28px] leading-none tracking-[-0.045em] text-ink">
            Kwathu
          </div>
          <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.25em] text-text-muted">
            Admin console
          </div>
        </div>

        <div className="flex items-center gap-3">
          {firstName && (
            <span className="hidden sm:inline text-[13px] font-semibold text-text-muted">
              {firstName}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-[11px] bg-ink px-5 py-2.5 text-[13px] font-semibold text-text-inverse transition-colors duration-200 hover:bg-green-dark"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
