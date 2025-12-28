import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["follow", "like", "comment"],
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ⚡ PERFORMANCE INDEXES - Fetch và count notifications nhanh hơn
notificationSchema.index({ to: 1, createdAt: -1 }); // Sort theo thời gian
notificationSchema.index({ to: 1, isRead: 1 });     // Count unread nhanh

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;