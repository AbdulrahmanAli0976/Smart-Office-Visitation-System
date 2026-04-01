export function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDateOnly(date);
}
