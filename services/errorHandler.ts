export class AppError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

function getErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: unknown }).code ?? '');
  }

  return '';
}

function getRawMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error ?? '');
}

export function getFriendlyErrorMessage(error: unknown) {
  if (error instanceof AppError) {
    return error.message;
  }

  const code = getErrorCode(error);
  const rawMessage = getRawMessage(error).toLowerCase();
  const key = `${code} ${rawMessage}`.toLowerCase();

  if (key.includes('auth/invalid-credential') || key.includes('auth/wrong-password')) {
    return 'Invalid email or password.';
  }

  if (key.includes('auth/user-not-found')) {
    return 'This account does not exist.';
  }

  if (key.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists.';
  }

  if (key.includes('auth/invalid-email')) {
    return 'Enter a valid email address.';
  }

  if (key.includes('auth/weak-password')) {
    return 'Use a stronger password.';
  }

  if (key.includes('auth/requires-recent-login')) {
    return 'Please sign in again before continuing.';
  }

  if (
    key.includes('permission-denied') ||
    key.includes('missing or insufficient permissions') ||
    key.includes('missing-or-insufficient-permissions')
  ) {
    return 'Unable to access this information.';
  }

  if (key.includes('network-request-failed') || key.includes('unavailable') || key.includes('network')) {
    return 'Connection issue. Please try again.';
  }

  return 'Something went wrong. Please try again.';
}

export function toAppError(error: unknown) {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError(getFriendlyErrorMessage(error), getErrorCode(error));
}

export async function withFriendlyErrors<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    throw toAppError(error);
  }
}
