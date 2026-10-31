// "YYYY-MM-DD" for a date in the user's own timezone. toISOString() would
// give the UTC date, which is still yesterday shortly after midnight in
// UTC+ timezones.
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function todayLocalDate(): string {
  return toLocalDateString(new Date());
}
