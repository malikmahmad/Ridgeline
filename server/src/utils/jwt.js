import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-only-secret-change-before-deploy";

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
