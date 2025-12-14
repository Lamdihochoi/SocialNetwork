import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure participants array has exactly 2 users
conversationSchema.pre("save", function (next) {
  if (this.participants.length !== 2) {
    return next(new Error("Conversation must have exactly 2 participants"));
  }
  // Sort participants to ensure uniqueness
  this.participants.sort();
  next();
});

// Create unique index on participants to prevent duplicate conversations
conversationSchema.index({ participants: 1 }, { unique: true });

// Index for faster queries
conversationSchema.index({ "participants": 1, "lastMessageAt": -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;

