import React, { useState } from 'react';

interface LoginPageProps {
  onAuthed: (token: string) => void;
  onContinueAsGuest: () => void;
}

export function LoginPage({ onAuthed, onContinueAsGuest }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        mode === 'login' ? { emailOrUsername: email, password } : { name, username, email, password };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      // If this browser had a guest session, fold its data into the new account.
      const guestId = localStorage.getItem('smart_quiz_guest_id');
      if (guestId) {
        try {
          await fetch('/api/core/guest/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` },
            body: JSON.stringify({ guestId }),
          });
        } catch {}
        localStorage.removeItem('smart_quiz_guest_id');
      }

      onAuthed(data.token);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1">Smart Quiz AI</h1>
        <p className="text-slate-600 text-center mb-6 text-sm">
          {mode === 'login' ? 'Log in to continue' : 'Create your account'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <>
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </>
          )}
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            placeholder={mode === 'login' ? 'Email or username' : 'Email'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-lg py-2 font-medium"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <button
          className="w-full text-center text-sm text-slate-600 mt-3 underline"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? "New here? Create an account" : 'Already have an account? Log in'}
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-slate-100 flex-1" />
          <span className="text-slate-500 text-xs">or</span>
          <div className="h-px bg-slate-100 flex-1" />
        </div>

        <button
          onClick={onContinueAsGuest}
          className="w-full border border-slate-300 hover:border-slate-500 rounded-lg py-2 text-sm"
        >
          Continue as Guest
        </button>
        <p className="text-slate-500 text-xs text-center mt-2">
          Your guest data stays private to you and can be merged in later if you sign up.
        </p>
      </div>
    </div>
  );
}
