
export function generateSignalId(): string {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `SIG-${timestamp}-${random}`;
}

export function getSignalStoragePath(date: Date): string {
  const year = date.getFullYear();
  const month = date.toLocaleString('default', { month: 'long' });
  const day = date.toISOString().split('T')[0];
  return `storedSignal/${year}/${month}/${day}`;
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('default', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
