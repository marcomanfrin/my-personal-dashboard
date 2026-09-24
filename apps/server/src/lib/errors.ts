/** An error that maps to an HTTP status. Thrown by services, rendered by the error handler. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly issues?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, 'not_found', `${what} not found`);
export const forbidden = (message: string) => new HttpError(403, 'forbidden', message);
export const unauthorized = (message = 'Missing or invalid token') => new HttpError(401, 'unauthorized', message);
export const badRequest = (message: string, issues?: { path: string; message: string }[]) =>
  new HttpError(400, 'bad_request', message, issues);
export const conflict = (message: string) => new HttpError(409, 'conflict', message);
