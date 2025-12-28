import asyncHandler from "express-async-handler";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js";

import Notification from "../models/notification.model.js";
import Comment from "../models/comment.model.js";

export const getPosts = async (req, res) => {
  try {
    // ✅ Tối ưu: lean() để trả về plain object, limit để không load quá nhiều
    const posts = await Post.find()
      .populate("user", "username firstName lastName profilePicture followers clerkId")
      .populate("comments", "_id") // 📝 Populate comments để đếm số lượng
      .sort({ createdAt: -1 })
      .limit(50) // Chỉ load 50 bài viết mới nhất
      .lean(); // Trả về plain object, nhanh hơn 3-5x

    // ✅ Thêm trường isFollowing (không cần toObject vì đã dùng lean)
    const userId = req.user?._id?.toString();
    const formatted = posts.map((post) => {
      const followers = post.user?.followers || [];
      post.isFollowing = followers.some((f) => f.toString() === userId);
      return post;
    });

    res.status(200).json(formatted);
  } catch (error) {
    console.error("getPosts error:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};
export const getPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findById(postId)
    .populate("user", "username firstName lastName profilePicture")
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "username firstName lastName profilePicture",
      },
    });

  if (!post) return res.status(404).json({ error: "Post not found" });

  res.status(200).json({ post });
});

export const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username }).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    // ✅ Tối ưu với lean() và limit
    const posts = await Post.find({ user: user._id })
      .populate("user", "username firstName lastName profilePicture followers clerkId")
      .populate("comments", "_id") // 📝 Populate comments để đếm số lượng
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const currentUserId = req.user?._id?.toString();
    const formatted = posts.map((post) => {
      const followers = post.user?.followers || [];
      post.isFollowing = followers.some((f) => f.toString() === currentUserId);
      return post;
    });

    res.status(200).json(formatted);
  } catch (error) {
    console.error("getUserPosts error:", error);
    res.status(500).json({ error: "Failed to fetch user posts" });
  }
};
export const createPost = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const imageFile = req.file;

  if (!content && !imageFile) {
    return res
      .status(400)
      .json({ error: "Post must contain either text or image" });
  }

  // Use req.user from middleware
  const user = req.user;
  if (!user) return res.status(404).json({ error: "User not found" });

  let imageUrl = "";

  // upload image to Cloudinary if provided
  if (imageFile) {
    try {
      // convert buffer to base64 for cloudinary
      const base64Image = `data:${
        imageFile.mimetype
      };base64,${imageFile.buffer.toString("base64")}`;

      const uploadResponse = await cloudinary.uploader.upload(base64Image, {
        folder: "social_media_posts",
        resource_type: "image",
        transformation: [
          { width: 800, height: 600, crop: "limit" },
          { quality: "auto" },
          { format: "auto" },
        ],
      });
      imageUrl = uploadResponse.secure_url;
    } catch (uploadError) {
      console.error("Cloudinary upload error:", uploadError);
      return res.status(400).json({ error: "Failed to upload image" });
    }
  }

  const post = await Post.create({
    user: user._id,
    content: content || "",
    image: imageUrl,
  });

  // ⚡ REALTIME: Emit new_post event to all clients
  if (req.io) {
    const populatedPost = await Post.findById(post._id)
      .populate("user", "username firstName lastName profilePicture followers")
      .lean();
    req.io.emit("new_post", populatedPost);
  }

  res.status(201).json({ post });
});

export const likePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  // Use req.user from middleware
  const user = req.user;
  const post = await Post.findById(postId);

  if (!user || !post)
    return res.status(404).json({ error: "User or post not found" });

  const isLiked = post.likes.includes(user._id);

  if (isLiked) {
    // unlike
    await Post.findByIdAndUpdate(postId, {
      $pull: { likes: user._id },
    });
  } else {
    // like
    await Post.findByIdAndUpdate(postId, {
      $push: { likes: user._id },
    });

    // create notification if not liking own post
    if (post.user.toString() !== user._id.toString()) {
      const notification = await Notification.create({
        from: user._id,
        to: post.user,
        type: "like",
        post: postId,
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
  }

  // ⚡ REALTIME: Emit like update to all clients
  if (req.io) {
    req.io.emit("post_liked", { 
      postId, 
      userId: user._id.toString(), 
      isLiked: !isLiked,
      likesCount: isLiked ? post.likes.length - 1 : post.likes.length + 1
    });
  }

  res.status(200).json({
    message: isLiked ? "Post unliked successfully" : "Post liked successfully",
  });
});

export const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  // Use req.user from middleware
  const user = req.user;
  const post = await Post.findById(postId);

  if (!user || !post)
    return res.status(404).json({ error: "User or post not found" });

  if (post.user.toString() !== user._id.toString()) {
    return res
      .status(403)
      .json({ error: "You can only delete your own posts" });
  }

  // delete all comments on this post
  await Comment.deleteMany({ post: postId });

  // delete the post
  await Post.findByIdAndDelete(postId);

  // ⚡ REALTIME: Emit post deleted to all clients
  if (req.io) {
    req.io.emit("post_deleted", { postId });
  }

  res.status(200).json({ message: "Post deleted successfully" });
});

// ==============================
// 🔍 Universal Search (Posts & Users)
// ==============================
// Helper to escape regex special characters
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export const searchPosts = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: "Search query is required" });
  }

  try {
    const query = q.trim();
    const isUserSearch = query.startsWith("@");
    const rawSearchTerm = isUserSearch ? query.substring(1) : query;
    const searchTerm = escapeRegex(rawSearchTerm);

    if (isUserSearch && searchTerm.length > 0) {
      // Search for Users by username, firstName, or lastName
      const users = await User.find({
        $or: [
          { username: { $regex: searchTerm, $options: "i" } },
          { firstName: { $regex: searchTerm, $options: "i" } },
          { lastName: { $regex: searchTerm, $options: "i" } },
        ],
      })
        .select("username firstName lastName profilePicture followers")
        .limit(50);

      // Add isFollowing field if user is authenticated
      const userId = req.user?._id?.toString();
      const formatted = users.map((user) => {
        const userObj = user.toObject();
        const followers = userObj.followers || [];
        userObj.isFollowing = followers.some((f) => {
          const followerId = typeof f === "string" ? f : f._id?.toString();
          return followerId === userId;
        });
        return userObj;
      });

      return res.status(200).json({ type: "users", results: formatted });
    } else {
      // Search for Posts by content
      const posts = await Post.find({
        content: { $regex: searchTerm, $options: "i" },
      })
        .populate("user", "username firstName lastName profilePicture followers")
        .populate({
          path: "comments",
          populate: { path: "user", select: "username profilePicture" },
        })
        .sort({ createdAt: -1 });

      // Add isFollowing field if user is authenticated
      const userId = req.user?._id?.toString();
      const formatted = posts.map((post) => {
        const postObj = post.toObject();
        const followers = postObj.user.followers || [];
        postObj.isFollowing = followers.some((f) => {
          const followerId = typeof f === "string" ? f : f._id?.toString();
          return followerId === userId;
        });
        return postObj;
      });

      return res.status(200).json({ type: "posts", results: formatted });
    }
  } catch (error) {
    console.error("searchPosts error:", error);
    res.status(500).json({ error: "Failed to search" });
  }
});

// ==============================
// 🔍 Lấy chi tiết 1 bài viết (kèm comment)
// ==============================
export const getPostById = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate("user", "username firstName lastName profilePicture") // Lấy thông tin tác giả
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "username firstName lastName profilePicture", // Lấy thông tin người cmt
      },
      options: { sort: { createdAt: -1 } }, // Comment mới nhất lên đầu
    });

  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  res.status(200).json(post);
});
