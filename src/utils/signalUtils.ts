
import { Signal } from "@/types/signal";

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
  
  // Get signals from localStorage
  try {
    const storedSignalsStr = localStorage.getItem('signals');
    if (storedSignalsStr) {
      const parsedSignals = JSON.parse(storedSignalsStr);
      // Ensure createdAt is a Date object
      const processedSignals = parsedSignals.map((signal: any) => ({
        ...signal,
        createdAt: new Date(signal.createdAt)
      }));
      allSignals = processedSignals;
      console.log('Retrieved signals from storage:', allSignals);
    }
  } catch (error) {
    console.error('Error parsing signals:', error);
  }

  return allSignals;
}
