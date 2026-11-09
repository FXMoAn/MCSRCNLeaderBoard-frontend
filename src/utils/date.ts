/** Calendar dates use YYYY/M/D without changing the recorded day. */
export function formatRunDate(value: string | null | undefined): string {
  if (!value) return '';
  const raw = value.trim();
  if (!raw) return '';
  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(raw);
  if (!match) return value;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return value;
  return `${year}/${month}/${day}`;
}
