// Every /api/core/* call needs either a Bearer token (logged-in user) or an
// x-guest-id header (anonymous guest) - see middleware/auth.ts identifyOwner.

export function getOrCreateGuestId(): string {
  let id = localStorage.getItem('smart_quiz_guest_id');
  if (!id) {
    id = (crypto as any).randomUUID ? crypto.randomUUID() : 'guest_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    localStorage.setItem('smart_quiz_guest_id', id);
  }
  return id;
}

export function ownerHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem('smart_quiz_token');
  if (token) {
    return { ...extra, Authorization: `Bearer ${token}` };
  }
  return { ...extra, 'x-guest-id': getOrCreateGuestId() };
}
