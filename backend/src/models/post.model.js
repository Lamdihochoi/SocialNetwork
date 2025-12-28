import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      maxLength: 280,
    },
    image: {
      type: String,
      default: "",
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
  },
  { timestamps: true }
);

// ⚡ PERFORMANCE INDEXES - Tăng tốc query 5-10x
postSchema.index({ user: 1, createdAt: -1 }); // Query posts theo user
postSchema.index({ createdAt: -1 });           // Sort posts mới nhất

const Post = mongoose.model("Post", postSchema);

export default Post;