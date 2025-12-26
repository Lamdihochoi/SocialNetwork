import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import userRoutes from "./routes/user.route.js";
import postRoutes from "./routes/post.route.js";
import commentRoutes from "./routes/comment.route.js";
import notificationRoutes from "./routes/notification.route.js";
import messageRoutes from "./routes/message.route.js";
import bookmarkRoutes from "./routes/bookmark.route.js";
import { ENV } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { arcjetMiddleware } from "./middleware/arcjet.middleware.js";
import { initializeSocketHandlers } from "./socket/socket.handler.js";

const app = express();
const httpServer = createServer(app);

// 1. Cấu hình Socket.IO trước
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

initializeSocketHandlers(io);

// ==========================================
// 🔒 SECURITY MIDDLEWARE
// ==========================================

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for mobile app compatibility
}));

// Rate Limiting - Brute-force protection
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Stricter limit for auth-related endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Only 10 attempts per 15 min
  message: { error: "Quá nhiều lần thử. Vui lòng thử lại sau 15 phút." },
});
// Apply to sensitive routes later if needed

// ==========================================
// 🚀 QUAN TRỌNG: Gắn io vào req để dùng ở Controller
// ==========================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Input Sanitization - XSS Prevention
app.use((req, res, next) => {
  // Sanitize body
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === "string") {
        // Remove potential script tags
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<[^>]*on\w+="[^"]*"[^>]*>/gi, "");
      }
    });
  }
  next();
});

// Attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(clerkMiddleware());
app.use(arcjetMiddleware);

app.get("/", (req, res) => res.send("Hello from server"));

app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/bookmarks", bookmarkRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// Không cần export io nữa để tránh lỗi vòng lặp
// export { io };

const startServer = async () => {
  try {
    await connectDB();
    if (ENV.NODE_ENV !== "production") {
      httpServer.listen(ENV.PORT, () =>
        console.log(`Server is up and running on PORT: ${ENV.PORT}`)
      );
    }
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

export default app;
