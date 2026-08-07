export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status  = status;
    this.details = details;
  }
}

export const notFound    = (msg = "Not found.")                          => new ApiError(404, msg);
export const badRequest  = (msg = "Bad request.", details = null)        => new ApiError(400, msg, details);
export const unauthorized= (msg = "Authentication required.")            => new ApiError(401, msg);
export const forbidden   = (msg = "You don't have permission.")          => new ApiError(403, msg);
export const conflict    = (msg = "This resource already exists.")       => new ApiError(409, msg);
