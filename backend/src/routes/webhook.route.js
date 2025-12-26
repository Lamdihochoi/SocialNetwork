import express from "express";
import { handleClerkWebhook } from "../controllers/webhook.controller.js";

const router = express.Router();

// Webhook route - bodyParser: false because we need raw body for verification
router.post(
  "/",
  // Note: We will handle body parsing in server.js specifically for this route
  handleClerkWebhook
);

export default router;
