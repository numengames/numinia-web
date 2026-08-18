/**
 * What the session endpoint says about you, in plain words (MISSION-002).
 * Split out of LoginSpike so each file stays inside the 200-line rule.
 */

export interface SessionState {
  status: 'loading' | 'anonymous' | 'authenticated' | 'error';
  address?: string;
  rank?: string;
}

export async function fetchSession(): Promise<SessionState> {
  const response = await fetch('/api/auth/session');
  if (response.status === 401) return { status: 'anonymous' };
  if (!response.ok) return { status: 'error' };
  const data = (await response.json()) as { address: string; rank: string };
  return { status: 'authenticated', address: data.address, rank: data.rank };
}

export function SessionPanel({
  session,
  onLogout,
}: {
  session: SessionState;
  onLogout: () => void;
}) {
  if (session.status === 'loading') return <p>Checking session…</p>;
  if (session.status === 'error') return <p role="alert">Session endpoint unreachable.</p>;
  if (session.status === 'anonymous') return <p>No session — you are browsing as an outsider.</p>;
  return (
    <div>
      <p data-spike-session-rank={session.rank}>
        Session verified: rank <strong>{session.rank}</strong>
        <br />
        <code>{session.address}</code>
      </p>
      <button type="button" data-metric="auth-logout" onClick={onLogout}>
        Log out
      </button>
    </div>
  );
}
