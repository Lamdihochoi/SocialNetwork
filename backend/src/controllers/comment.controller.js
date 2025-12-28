import asyncHandler from "express-async-handler";
import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";

export const getComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const comments = await Comment.find({ post: postId })
    .sort({ createdAt: -1 })
    .populate("user", "username firstName lastName profilePicture");

  res.status(200).json({ comments });
});

export const createComment = asyncHandler(async (req, res) => {
  // Use req.user from protectRoute middleware instead of getAuth
  const user = req.user;
  const { postId } = req.params;
  const { content } = req.body;

  console.log("[COMMENT] Creating comment:", { postId, content, user: user?._id });

  if (!content || content.trim() === "") {
    console.log("[COMMENT] Error: Empty content");
    return res.status(400).json({ error: "Comment content is required" });
  }

  if (!user) {
    console.log("[COMMENT] Error: User not authenticated");
    return res.status(401).json({ error: "User not authenticated" });
  }

  const post = await Post.findById(postId);

  if (!post) {
    console.log("[COMMENT] Error: Post not found");
    return res.status(404).json({ error: "Post not found" });
  }

  const comment = await Comment.create({
    user: user._id,
    post: postId,
    content,
  });

  // link the comment to the post
  await Post.findByIdAndUpdate(postId, {
    $push: { comments: comment._id },
  });

  // create notification if not commenting on own post
  if (post.user.toString() !== user._id.toString()) {
    const notification = await Notification.create({
      from: user._id,
      to: post.user,
      type: "comment",
      post: postId,
      comment: comment._id,
    });

    // ⚡ REALTIME: Emit notification to post owner
    if (req.io) {
      const populatedNotification = await Notification.findById(notification._id)
        .populate("from", "username firstName lastName profilePicture")
        .populate("post", "content image")
        .lean();
      req.io.to(`user_${post.user}`).emit("new_notification", populatedNotification);
    }
  }

  // ⚡ REALTIME: Emit new comment to all clients viewing this post
  if (req.io) {
    const populatedComment = await Comment.findById(comment._id)
      .populate("user", "username firstName lastName profilePicture")
      .lean();
    req.io.emit("new_comment", { postId, comment: populatedComment });
  }

  res.status(201).json({ comment });
});

export const deleteComment = asyncHandler(async (req, res) => {
  // Use req.user from protectRoute middleware
  const user = req.user;
  const { commentId } = req.params;

  if (!user) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    return res.status(404).json({ error: "Comment not found" });
  }

  if (comment.user.toString() !== user._id.toString()) {
    return res.status(403).json({ error: "You can only delete your own comments" });
  }

  // remove comment from post
  await Post.findByIdAndUpdate(comment.post, {
    $pull: { comments: commentId },
  });

  // delete the comment
  await Comment.findByIdAndDelete(commentId);

  res.status(200).json({ message: "Comment deleted successfully" });
});