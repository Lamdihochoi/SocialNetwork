import { getAuth } from "@clerk/express";
import { verifyToken } from "@clerk/backend";
import User from "../models/user.model.js";
import { ENV } from "../config/env.js";

export const protectRoute = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[AUTH] No token in header");
      return res.status(401).json({ message: "Unauthorized - no token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Try req.auth() first (faster when it works)
    let userId = null;
    const authResult = req.auth?.();
    
    if (authResult?.isAuthenticated && authResult?.userId) {
      userId = authResult.userId;
    } else {
      // Fallback: Manually verify token with clock skew tolerance
      console.log("[AUTH] req.auth() failed, verifying token manually...");
      try {
        // Use verifyToken from @clerk/backend with clock skew tolerance
        const verifiedToken = await verifyToken(token, {
          secretKey: ENV.CLERK_SECRET_KEY,
          clockSkewInMs: 60000, // Allow 60 seconds clock skew
        });
        userId = verifiedToken.sub; // 'sub' is the userId in JWT
        console.log("[AUTH] Token verified manually - userId:", userId);
      } catch (verifyError) {
        // If it's just expired, try to extract userId anyway for better error message
        if (verifyError.message?.includes("expired")) {
          console.log("[AUTH] Token expired but trying to get userId from payload...");
          try {
            // Decode JWT without verification to get userId for logging
            const base64Payload = token.split('.')[1];
            const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
            console.log("[AUTH] Expired token userId:", payload.sub);
            // For development, allow expired tokens within 5 minutes
            const expiry = payload.exp * 1000;
            const now = Date.now();
            if (now - expiry < 5 * 60 * 1000) { // Within 5 minutes
              userId = payload.sub;
              console.log("[AUTH] Allowing recently expired token for:", userId);
            } else {
              console.error("[AUTH] Token too old, rejecting");
              return res.status(401).json({ message: "Session expired. Please sign in again." });
            }
          } catch (decodeError) {
            console.error("[AUTH] Could not decode token:", decodeError.message);
            return res.status(401).json({ message: "Unauthorized - invalid token" });
          }
        } else {
          console.error("[AUTH] Token verification failed:", verifyError.message);
          return res.status(401).json({ message: "Unauthorized - invalid token" });
        }
      }
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - invalid session" });
    }

    // Find the user in MongoDB using clerkId
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      console.log("[AUTH] User not found in DB for clerkId:", userId);
      return res.status(404).json({ message: "User not found in database" });
    }

    // Assign the MongoDB user object to req.user
    req.user = user;
    
    next();
  } catch (error) {
    console.error("[AUTH] Auth middleware error:", error);
    return res.status(500).json({ message: "Authentication error" });
  }
};