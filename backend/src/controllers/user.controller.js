import asyncHandler from "express-async-handler";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { getAuth } from "@clerk/express";
import { clerkClient } from "@clerk/express";

// ==============================
// 🧩 Lấy thông tin profile user
// ==============================
export const getUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ username })
    .populate("followers", "username profilePicture")
    .populate("following", "username profilePicture");

  if (!user) return res.status(404).json({ error: "User not found" });

  res.status(200).json({
    user,
    followersCount: user.followers?.length || 0,
    followingCount: user.following?.length || 0,
  });
});

// ==============================
// ✏️ Cập nhật hồ sơ user
// ==============================
export const updateProfile = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);

  const user = await User.findOneAndUpdate({ clerkId: userId }, req.body, {
    new: true,
  });

  if (!user) return res.status(404).json({ error: "User not found" });

  res.status(200).json({ user });
});

// ==============================
// 🔄 Đồng bộ user từ Clerk
// ==============================
export const syncUser = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);

  const existingUser = await User.findOne({ clerkId: userId });
  if (existingUser) {
    return res
      .status(200)
      .json({ user: existingUser, message: "User already exists" });
  }

  const clerkUser = await clerkClient.users.getUser(userId);

  const userData = {
    clerkId: userId,
    email: clerkUser.emailAddresses[0].emailAddress,
    firstName: clerkUser.firstName || "",
    lastName: clerkUser.lastName || "",
    username: clerkUser.emailAddresses[0].emailAddress.split("@")[0],
    profilePicture: clerkUser.imageUrl || "",
  };

  const user = await User.create(userData);
  res.status(201).json({ user, message: "User created successfully" });
});

// ==============================
// 👤 Lấy thông tin user hiện tại
// ==============================
export const getCurrentUser = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const user = await User.findOne({ clerkId: userId })
    .populate("followers", "username profilePicture")
    .populate("following", "username profilePicture");

  if (!user) return res.status(404).json({ error: "User not found" });

  res.status(200).json({
    user,
    followersCount: user.followers?.length || 0,
    followingCount: user.following?.length || 0,
  });
});

// ==============================
// ➕ Follow / Unfollow User
// ==============================
export const followUser = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req); // Clerk userId của người đang đăng nhập
  const { userId: targetUserId } = req.params; // ID của người cần follow

  // 🧩 Ghi log để debug
  console.log("======== FOLLOW DEBUG ========");
  console.log("👤 Clerk userId:", userId);
  console.log("🎯 Target userId (từ frontend):", targetUserId);

  // ✅ Tìm user hiện tại theo clerkId
  const user = await User.findOne({ clerkId: userId });

  // ✅ Tìm người bị follow: thử bằng _id, nếu không thấy thì thử clerkId
  let targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    console.log("❌ Không tìm thấy bằng _id, thử tìm theo clerkId...");
    targetUser = await User.findOne({ clerkId: targetUserId });
  }

  // ❌ Nếu vẫn không thấy, in toàn bộ user trong DB ra để kiểm tra
  if (!targetUser) {
    console.log("⚠️ Không tìm thấy targetUser. Danh sách user hiện có:");
    const allUsers = await User.find({}, "_id username clerkId email");
    console.table(allUsers);
    return res.status(404).json({ error: "Target user not found" });
  }

  if (!user) {
    console.error("❌ Current user not found for clerkId:", userId);
    return res.status(404).json({ error: "Current user not found" });
  }

  console.log("✅ Current user _id:", user._id);
  console.log("✅ Target user _id:", targetUser._id);

  const isFollowing = user.following.includes(targetUser._id.toString());

  if (isFollowing) {
    console.log("🔄 Đang unfollow...");
    await User.updateOne(
      { _id: user._id },
      { $pull: { following: targetUser._id } }
    );
    await User.updateOne(
      { _id: targetUser._id },
      { $pull: { followers: user._id } }
    );
  } else {
    console.log("➕ Đang follow...");
    await User.updateOne(
      { _id: user._id },
      { $push: { following: targetUser._id } }
    );
    await User.updateOne(
      { _id: targetUser._id },
      { $push: { followers: user._id } }
    );

    await Notification.create({
      from: user._id,
      to: targetUser._id,
      type: "follow",
    });
  }

  console.log("✅ Follow xử lý xong.");
  console.log("=============================");

  res.status(200).json({
    message: isFollowing ? "Unfollowed successfully" : "Followed successfully",
  });
});

// ✅ Get followers or following list
export const getFollowList = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { type } = req.query; // "followers" hoặc "following"

  if (!["followers", "following"].includes(type)) {
    return res.status(400).json({ error: "Invalid type parameter" });
  }

  const user = await User.findById(userId).populate(
    type,
    "firstName lastName username profilePicture"
  );

  if (!user) return res.status(404).json({ error: "User not found" });

  res.status(200).json({ users: user[type] });
});
