
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
  try {
    const storedSignalsStr = localStorage.getItem('signals');
    console.log('Raw stored signals:', storedSignalsStr); // Debug log

    if (!storedSignalsStr) {
      console.log('No signals found in storage');
      return [];
    }

    const parsedSignals = JSON.parse(storedSignalsStr);
    console.log('Parsed signals:', parsedSignals); // Debug log

    // Ensure all dates are properly converted to Date objects
    const processedSignals = parsedSignals.map((signal: any) => ({
      ...signal,
      createdAt: new Date(signal.createdAt),
      status: signal.status || "active", // Ensure status has a default value
      approved: signal.approved ?? true, // Ensure approved has a default value
    }));

    console.log('Processed signals:', processedSignals); // Debug log
    return processedSignals;
  } catch (error) {
    console.error('Error retrieving signals:', error);
    return [];
  }
}
