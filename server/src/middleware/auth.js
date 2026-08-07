import { verifyToken } from "../utils/jwt.js";
import { unauthorized, forbidden } from "../utils/apiError.js";
import { get } from "../db/connection.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return next(unauthorized("Please log in to continue."));

  try {
    const payload = verifyToken(token);
    const user    = await get(
      "SELECT id, name, email, role, is_active FROM users WHERE id = ?",
      [payload.id]
    );
    if (!user || !user.is_active) {
      return next(unauthorized("This account is inactive. Contact your administrator."));
    }
    req.user = user;
    next();
  } catch {
    next(unauthorized("Your session has expired. Please sign in again."));
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized("Please log in to continue."));
    if (!roles.includes(req.user.role)) {
      return next(forbidden("You do not have permission to perform this action."));
    }
    next();
  };
}
