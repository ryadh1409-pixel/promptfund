export function safePercent(value?: number | null) {
  return typeof value === 'number'
    ? `${value.toFixed(2)}%`
    : 'N/A';
}

export function safeCurrency(value?: number | null) {
  return typeof value === 'number'
    ? `$${value.toLocaleString()}`
    : '$0';
}

export function safeDate(value?: unknown) {
  if (!value) {
    return 'Unknown';
  }

  try {
    const date = typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function'
      ? value.toDate()
      : new Date(value as string | number | Date);

    return date.toLocaleDateString();
  } catch {
    return 'Unknown';
  }
}
