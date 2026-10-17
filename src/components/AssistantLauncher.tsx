import React, { useState } from 'react';

type AuthMode = 'login' | 'signup';
type AssistantResult = {
  answer: string;
  webSearch?: { performed?: boolean; sources?: { title: string; url: string }[] };
  taskMode?: { performed?: boolean; steps?: { title: string; completed: boolean }[] };
};

export function AssistantLauncher({ onAuthed, isAuthenticated }: { onAuthed: (token: string) => void; isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'ask' | 'auth'>('ask');
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState<AssistantResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [webSearch, setWebSearch] = useState(true);
  const [taskMode, setTaskMode] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    const question = message.trim();
    if (!question || busy) return;
    setBusy(true);
    setError('');
    setAnswer(null);
    try {
      const documentId = window.localStorage.getItem('studypdf_doc_id') || undefined;
      const response = await fetch('/api/assistant/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, webSearch, taskMode, ...(documentId ? { documentId } : {}) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The AI assistant could not answer this request.');
      setAnswer(data as AssistantResult);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The AI assistant could not answer this request.');
    } finally {
      setBusy(false);
    }
  }

  async function authenticate(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const signup = authMode === 'signup';
      const response = await fetch(signup ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signup
          ? { name, username, email: emailOrUsername, password }
          : { emailOrUsername, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.token !== 'string') throw new Error(data.error || 'Could not authenticate.');
      const guestId = window.localStorage.getItem('smart_quiz_guest_id');
      if (guestId) {
        try {
          await fetch('/api/core/guest/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` },
            body: JSON.stringify({ guestId }),
          });
        } catch {}
        window.localStorage.removeItem('smart_quiz_guest_id');
      }
      setPassword('');
      onAuthed(data.token);
      setTab('ask');
      setError('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  const launcherStyle: React.CSSProperties = {
    position: 'fixed', right: 20, bottom: 20, zIndex: 2000,
    border: 0, borderRadius: 999, padding: '13px 18px',
    background: '#4338ca', color: '#fff', fontWeight: 700,
    boxShadow: '0 10px 30px rgba(15,23,42,.25)', cursor: 'pointer',
  };
  const panelStyle: React.CSSProperties = {
    position: 'fixed', right: 20, bottom: 78, zIndex: 1999,
    width: 'min(420px, calc(100vw - 28px))', maxHeight: 'min(78vh, 720px)',
    overflowY: 'auto', background: '#fff', color: '#0f172a',
    border: '1px solid #e2e8f0', borderRadius: 18, padding: 18,
    boxShadow: '0 18px 60px rgba(15,23,42,.24)',
  };
  const tabStyle = (active: boolean): React.CSSProperties => ({
    border: '1px solid ' + (active ? '#4338ca' : '#e2e8f0'),
    background: active ? '#eef2ff' : '#fff', color: active ? '#3730a3' : '#475569',
    borderRadius: 9, padding: '8px 10px', cursor: 'pointer', fontWeight: 600,
  });
  const fieldStyle: React.CSSProperties = {
    display: 'block', width: '100%', boxSizing: 'border-box',
    border: '1px solid #cbd5e1', borderRadius: 9, padding: '10px 11px',
    marginTop: 5, color: '#0f172a', background: '#fff',
  };

  return (
    <>
      {open && (
        <section style={panelStyle} role="dialog" aria-modal="false" aria-label="AI assistant and account">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div>
              <strong style={{ fontSize: 17 }}>Ask IIA</strong>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>General answers, web research, study help and multi-step tasks</div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" style={{ border: 0, background: 'transparent', fontSize: 23, cursor: 'pointer', color: '#475569' }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button type="button" style={tabStyle(tab === 'ask')} onClick={() => { setTab('ask'); setError(''); }}>Ask IIA</button>
            <button type="button" style={tabStyle(tab === 'auth')} onClick={() => { setTab('auth'); setError(''); }}>{isAuthenticated ? 'Account' : 'Login / Sign up'}</button>
          </div>

          {tab === 'ask' ? (
            <form onSubmit={ask}>
              <label htmlFor="assistant-question" style={{ fontSize: 13, fontWeight: 600 }}>What would you like help with?</label>
              <textarea id="assistant-question" value={message} onChange={(event) => setMessage(event.target.value)} rows={4} maxLength={6000} required placeholder="Ask anything: explain, research, compare, calculate, write, or plan…" style={{ ...fieldStyle, resize: 'vertical', font: 'inherit' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 10 }}>
                <input type="checkbox" checked={webSearch} onChange={(event) => setWebSearch(event.target.checked)} /> Search the web and show sources
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 8 }}>
                <input type="checkbox" checked={taskMode} onChange={(event) => setTaskMode(event.target.checked)} /> Use multi-step task mode
              </label>
              <button type="submit" disabled={busy || !message.trim()} style={{ ...launcherStyle, position: 'static', marginTop: 12, boxShadow: 'none', opacity: busy || !message.trim() ? .65 : 1 }}>
                {busy ? 'Working…' : 'Send to IIA'}
              </button>
              {busy && <p role="status" style={{ fontSize: 13, color: '#64748b' }}>Researching and preparing your answer…</p>}
              {answer && (
                <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 16, paddingTop: 14 }}>
                  <strong>Answer</strong>
                  {answer.taskMode?.steps?.length ? <ol style={{ paddingLeft: 20, fontSize: 13 }}>{answer.taskMode.steps.map((step, i) => <li key={i}>{step.title}</li>)}</ol> : null}
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55, fontSize: 14 }}>{answer.answer}</p>
                  {answer.webSearch?.sources?.length ? <div style={{ fontSize: 13 }}><strong>Sources</strong><ul style={{ paddingLeft: 20 }}>{answer.webSearch.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" style={{ color: '#4338ca', overflowWrap: 'anywhere' }}>{source.title}</a></li>)}</ul></div> : null}
                </div>
              )}
            </form>
          ) : (
            isAuthenticated ? (
              <div style={{ fontSize: 14, color: '#475569' }}>You are signed in. Your account controls and study workflow remain available on the main page.</div>
            ) : (
              <form onSubmit={authenticate}>
                <p style={{ marginTop: 0, color: '#64748b', fontSize: 13 }}>{authMode === 'signup' ? 'Create an account to keep your study work associated with you.' : 'Welcome back. Sign in to continue.'}</p>
                {authMode === 'signup' && <>
                  <label style={{ fontSize: 13 }}>Full name<input style={fieldStyle} value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} /></label>
                  <label style={{ display: 'block', fontSize: 13, marginTop: 10 }}>Username<input style={fieldStyle} value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} maxLength={40} /></label>
                </>}
                <label style={{ display: 'block', fontSize: 13, marginTop: 10 }}>{authMode === 'signup' ? 'Email' : 'Email or username'}<input style={fieldStyle} value={emailOrUsername} onChange={(event) => setEmailOrUsername(event.target.value)} required maxLength={254} /></label>
                <label style={{ display: 'block', fontSize: 13, marginTop: 10 }}>Password<input style={fieldStyle} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={128} /></label>
                <button type="submit" disabled={busy} style={{ ...launcherStyle, position: 'static', marginTop: 12, boxShadow: 'none', opacity: busy ? .65 : 1 }}>{busy ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'}</button>
                <button type="button" onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setError(''); }} style={{ border: 0, background: 'transparent', color: '#4338ca', textDecoration: 'underline', cursor: 'pointer', marginLeft: 10, padding: 8 }}>
                  {authMode === 'signup' ? 'Already have an account? Log in' : 'New here? Sign up'}
                </button>
              </form>
            )
          )}
          {error && <p role="alert" style={{ color: '#b91c1c', fontSize: 13, marginBottom: 0 }}>{error}</p>}
          <p style={{ fontSize: 11, color: '#64748b', marginBottom: 0, marginTop: 12 }}>AI answers depend on available model access and source quality. Verify important information.</p>
        </section>
      )}
      <button type="button" onClick={() => setOpen(!open)} style={launcherStyle} aria-expanded={open}>
        {open ? 'Close' : isAuthenticated ? 'Ask AI' : 'Ask IIA · Login / Sign up'}
      </button>
    </>
  );
}
