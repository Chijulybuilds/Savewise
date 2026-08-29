import type { UserDocument } from '../models/User.js';

/**
 * Augments Express's `Request` with the values our middleware attaches.
 *
 * `auth` is populated *only* by the authenticate middleware, from a verified
 * token — never from the request body or a header a client controls. Every
 * ownership check in the service layer reads `req.auth.userId`, which is why a
 * client-supplied `userId` can never grant access to another user's data.
 */
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        user: UserDocument;
      };
      /** Correlation id, echoed in the `x-request-id` response header and every log line. */
      id?: string;
    }
  }
}

export {};
