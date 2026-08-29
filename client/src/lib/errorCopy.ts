import { ApiError } from '@/services/api';

/**
 * Error copy.
 *
 * Turns an unknown thrown value into a heading, a message and whether retrying
 * could plausibly help. The message shown is always one we wrote — a server's
 * internal error text never reaches the screen.
 *
 * Kept out of the component module so both `ErrorState` and any caller that
 * wants the wording without the markup can use it.
 */
export function describeError(
  error: unknown,
  overrideHeading?: string,
): { heading: string; message: string; retryable: boolean } {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return {
          heading: overrideHeading ?? 'No connection',
          message: 'We could not reach Savewise. Check your connection and try again.',
          retryable: true,
        };
      case 'UNAUTHENTICATED':
      case 'INVALID_CREDENTIALS':
        return {
          heading: overrideHeading ?? 'Session expired',
          message: 'Please sign in again to continue.',
          retryable: false,
        };
      case 'FORBIDDEN':
        return {
          heading: overrideHeading ?? 'Not available',
          message: 'You do not have access to that.',
          retryable: false,
        };
      case 'NOT_FOUND':
        return {
          heading: overrideHeading ?? 'Not found',
          message: 'That no longer exists, or was never here.',
          retryable: false,
        };
      case 'RATE_LIMITED':
        return {
          heading: overrideHeading ?? 'Slow down a moment',
          message: 'Too many requests. Please wait a little and try again.',
          retryable: true,
        };
      default:
        return {
          heading: overrideHeading ?? 'Something went wrong',
          // A server-side failure's message is never echoed, even though the
          // API client already replaced it. Two gates, because a stack frame
          // or a driver error reaching the screen is both useless to the user
          // and a small disclosure.
          message:
            error.status >= 500
              ? 'Something went wrong on our end. Please try again in a moment.'
              : error.message,
          retryable: error.status >= 500 || error.status === 0,
        };
    }
  }

  return {
    heading: overrideHeading ?? 'Something went wrong',
    message: 'An unexpected problem stopped that from loading. Please try again.',
    retryable: true,
  };
}
