import { getAuth } from "@clerk/express";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    if (!req.auth().isAuthenticated) {
      return res.status(401).json({ message: "Unauthorized - you must be logged in" });
    }

    // Get userId (clerkId) from Clerk
    const { userId } = getAuth(req);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - invalid session" });
    }

    // Find the user in MongoDB using clerkId
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({ message: "User not found in database" });
    }

    // Assign the MongoDB user object to req.user
    req.user = user;
    
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Authentication error" });
  }
};