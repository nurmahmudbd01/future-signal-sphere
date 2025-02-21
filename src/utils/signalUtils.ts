
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

export function getAllStoredSignals(): Signal[] {
  let allSignals: Signal[] = [];
  
  // Get all signals from the main signals storage
  const mainStorageSignals = localStorage.getItem('signals');
  if (mainStorageSignals) {
    try {
      const parsedSignals = JSON.parse(mainStorageSignals);
      allSignals = allSignals.concat(parsedSignals);
    } catch (error) {
      console.error('Error parsing main signals:', error);
    }
  }

  // Get current date for folder structure
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.toLocaleString('default', { month: 'long' });
  const day = currentDate.toISOString().split('T')[0];
  
  // Try to get signals from today's storage
  const todayPath = `storedSignal/${year}/${month}/${day}`;
  const todaySignals = localStorage.getItem(todayPath);
  if (todaySignals) {
    try {
      const parsedTodaySignals = JSON.parse(todaySignals);
      allSignals = allSignals.concat(parsedTodaySignals);
    } catch (error) {
      console.error('Error parsing today signals:', error);
    }
  }

  // Remove duplicates based on signal ID
  const uniqueSignals = Array.from(
    new Map(allSignals.map(signal => [signal.id, signal])).values()
  );

  console.log('All retrieved signals:', uniqueSignals); // Debug log
  return uniqueSignals;
}
