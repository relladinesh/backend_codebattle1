import { verifyToken } from "../utils/jwt.js";

export function socketAuth(io) {
  io.use((socket, next) => {
    try {
      // token can come from:
      // 1) socket.handshake.auth.token
      // 2) Authorization header: "Bearer <token>"
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("AUTH_REQUIRED"));
      }

      const payload = verifyToken(token);
      // attach user to socket
      socket.user = {
        userId: payload.userId,
        email: payload.email,
      };

      return next();
    } catch (e) {
      return next(new Error("INVALID_TOKEN"));
    }
  });
}