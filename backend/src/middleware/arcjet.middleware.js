import { aj } from "../config/arcjet.js";

/**
 * Arcjet middleware cho Express / Next.js API
 * - Cho phép request từ React Native / axios / okhttp
 * - Vẫn giữ bảo mật LIVE mode cho production
 */
export const arcjetMiddleware = async (req, res, next) => {
  try {
    const decision = await aj.protect(req, { requested: 1 });

    // Nếu Arcjet từ chối
    if (decision.isDenied()) {
      const ua = req.headers["user-agent"] || "";

      // ✅ Cho phép các UA hợp lệ (mobile app, axios, dev tools)
      const safeUA = ["ReactNative", "axios", "okhttp", "Dalvik", "okhttp/"];
      if (safeUA.some((str) => ua.includes(str))) {
        return next();
      }

      if (decision.reason.isRateLimit()) {
        return res.status(429).json({
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
        });
      }

      if (decision.reason.isBot()) {
        return res.status(403).json({
          error: "Bot access denied",
          message: "Automated requests are not allowed.",
        });
      }

      return res.status(403).json({
        error: "Forbidden",
        message: "Access denied by security policy.",
      });
    }

    // Nếu phát hiện bot spoof
    if (
      decision.results.some((r) => r.reason.isBot() && r.reason.isSpoofed())
    ) {
      return res.status(403).json({
        error: "Spoofed bot detected",
        message: "Malicious bot activity detected.",
      });
    }

    next();
  } catch (error) {
    console.error("Arcjet middleware error:", error);
    next();
  }
};
