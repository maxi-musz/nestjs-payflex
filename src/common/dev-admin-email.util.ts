/**
 * Set `DEV_EMAILS` on the backend (same list as web `.env` → `next.config` → `NEXT_PUBLIC_DEV_EMAILS`).
 * Comma, newline, or semicolon separated.
 */
function parseDevEmails(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(/[,\n;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isDevAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  const allowed = parseDevEmails(process.env.DEV_EMAILS);
  return allowed.has(email.trim().toLowerCase());
}
