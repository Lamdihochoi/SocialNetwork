import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      // ⚠️ Nếu sau này bạn cho phép gửi ảnh KHÔNG kèm chữ, thì bỏ required: true đi
      required: true,
      maxLength: 1000,
    },
    // 📸 Bổ sung: Hỗ trợ gửi ảnh trong tin nhắn (DEPRECATED - use attachment instead)
    image: {
      type: String,
      default: "",
    },
    // 🏷️ Bổ sung: Loại tin nhắn (text, image, video, file...)
    messageType: {
      type: String,
      enum: ["text", "image", "video", "file"],
      default: "text",
    },
    // 📎 Bổ sung: File attachment (Image, PDF, Word, etc.)
    attachment: {
      url: {
        type: String,
        default: "",
      },
      type: {
        type: String,
        enum: ["image", "video", "file", "text"],
        default: "text",
      },
      fileName: {
        type: String,
        default: "",
      },
      fileSize: {
        type: Number,
        default: 0,
      },
    },
    // 👁️ Bổ sung: Trạng thái đã đọc (QUAN TRỌNG để hiện chấm đỏ)
    isRead: {
      type: Boolean,
      default: false,
    },
    // 🗑️ Bổ sung: Trạng thái thu hồi tin nhắn (Soft delete)
    isDeleted: {
      type: Boolean,
      default: false,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
  },
  { timestamps: true }
);

// Index giúp load lịch sử chat nhanh hơn
messageSchema.index({ conversation: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
