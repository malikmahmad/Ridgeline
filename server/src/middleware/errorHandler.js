import { ApiError } from "../utils/apiError.js";

export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Route not found." });
}

export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    const body = { error: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
}
