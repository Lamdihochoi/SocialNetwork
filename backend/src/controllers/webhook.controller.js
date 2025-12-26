import { Webhook } from "svix";
import User from "../models/user.model.js";
import { ENV } from "../config/env.js";

export const handleClerkWebhook = async (req, res) => {
  const SIGNING_SECRET = ENV.CLERK_WEBHOOK_SECRET;

  if (!SIGNING_SECRET) {
    console.error("Error: Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env");
    return res.status(500).json({
      success: false,
      message: "Error: Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env",
    });
  }

  // Create new Svix instance with secret
  const wh = new Webhook(SIGNING_SECRET);

  // Get headers
  const svix_id = req.headers["svix-id"];
  const svix_timestamp = req.headers["svix-timestamp"];
  const svix_signature = req.headers["svix-signature"];

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({
      success: false,
      message: "Error: Missing svix headers",
    });
  }

  let evt;

  // Attempt to verify the incoming webhook
  try {
    evt = wh.verify(req.body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.log("Error: Could not verify webhook:", err.message);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  // Handle the event
  const eventType = evt.type;
  
  console.log(`Webhook received: ${eventType}`);

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url, username } =
      evt.data;

    const email = email_addresses[0]?.email_address;
    const userData = {
      clerkId: id,
      email: email,
      firstName: first_name || "",
      lastName: last_name || "",
      username: username || email?.split("@")[0] || id,
      profilePicture: image_url,
    };

    try {
      // Upsert: Create or Update
      await User.findOneAndUpdate({ clerkId: id }, userData, {
        upsert: true,
        new: true,
      });
      console.log(`User ${id} synced to MongoDB`);
    } catch (err) {
      console.error("Error syncing user to MongoDB:", err);
      return res.status(500).json({
        success: false,
        message: "Error syncing user to DB",
      });
    }
  } else if (eventType === "user.deleted") {
    const { id } = evt.data;
    try {
      await User.findOneAndDelete({ clerkId: id });
       console.log(`User ${id} deleted from MongoDB`);
    } catch (err) {
      console.error("Error deleting user from MongoDB:", err);
       return res.status(500).json({
        success: false,
        message: "Error deleting user",
      });
    }
  }

  return res.status(200).json({
    success: true,
    message: "Webhook received",
  });
};
