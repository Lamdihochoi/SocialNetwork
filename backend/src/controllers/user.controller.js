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
// 🧩 Lấy thông tin profile user by ID
// ==============================
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id)
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
  // Use req.user from middleware
  const user = await User.findByIdAndUpdate(req.user._id, req.body, {
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
  // Use req.user from middleware and populate it
  const user = await User.findById(req.user._id)
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
// ➕ Follow / Unfollow User (ĐÃ SỬA FIX BUG)
// ==============================
export const followUser = asyncHandler(async (req, res) => {
  // ✅ SỬA: Lấy id hoặc userId đều được (phòng trường hợp route đặt tên khác nhau)
  let targetUserId = req.params.userId || req.params.id;

  // Kiểm tra nếu không có ID thì báo lỗi ngay thay vì crash
  if (!targetUserId) {
    return res.status(400).json({ error: "Missing user ID in URL" });
  }

  // Bây giờ mới trim() an toàn
  targetUserId = targetUserId.trim();

  // 🧩 Ghi log để debug
  console.log("======== FOLLOW DEBUG ========");
  console.log("👤 Current User ID:", req.user._id);
  console.log("🎯 Target User ID (from params):", targetUserId);

  // Use req.user from middleware
  const currentUser = req.user;

  // 2. Kiểm tra không cho phép tự follow chính mình
  if (currentUser._id.toString() === targetUserId) {
    return res.status(400).json({ error: "You cannot follow yourself" });
  }

  // 3. Tìm người bị follow
  let targetUser = await User.findById(targetUserId);

  // Fallback: Tìm bằng clerkId nếu tìm bằng _id thất bại
  if (!targetUser) {
    console.log("⚠️ Không tìm thấy bằng _id, đang thử tìm bằng clerkId...");
    targetUser = await User.findOne({ clerkId: targetUserId });
  }

  // ❌ Nếu vẫn không thấy => CHẮC CHẮN LÀ USER MA
  if (!targetUser) {
    console.log("❌ LỖI: Target user hoàn toàn không tồn tại trong DB Users.");
    console.log(
      "👉 Gợi ý: Hãy xóa bài Post chứa ID này đi vì tác giả đã bị xóa."
    );
    return res.status(404).json({ error: "Target user not found" });
  }

  console.log(
    "✅ Tìm thấy Target User:",
    targetUser.username,
    "| ID:",
    targetUser._id
  );

  // 4. Kiểm tra xem đã follow chưa (Sửa lỗi logic .includes cũ)
  // Dùng .some để so sánh ObjectId an toàn hơn
  const isFollowing = currentUser.following.some(
    (id) => id.toString() === targetUser._id.toString()
  );

  if (isFollowing) {
    console.log("🔄 Đang Unfollow...");
    // Unfollow
    await User.findByIdAndUpdate(currentUser._id, {
      $pull: { following: targetUser._id },
    });
    await User.findByIdAndUpdate(targetUser._id, {
      $pull: { followers: currentUser._id },
    });
  } else {
    console.log("➕ Đang Follow...");
    // Follow
    await User.findByIdAndUpdate(currentUser._id, {
      $push: { following: targetUser._id },
    });
    await User.findByIdAndUpdate(targetUser._id, {
      $push: { followers: currentUser._id },
    });

    // Gửi thông báo (chỉ tạo nếu không phải là unfollow)
    await Notification.create({
      from: currentUser._id,
      to: targetUser._id,
      type: "follow",
    });
  }

  console.log("✅ Xử lý xong thành công!");
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

// ==============================
// 👥 Get Mutual Follows (Friends)
// ==============================
export const getMutualFollows = asyncHandler(async (req, res) => {
  const currentUser = req.user;

  // Get current user (don't populate to get raw ObjectIds for better performance)
  const currentUserDoc = await User.findById(currentUser._id).select(
    "following followers"
  );

  if (!currentUserDoc) {
    return res.status(404).json({ error: "User not found" });
  }

  // Convert to string arrays for comparison
  const followingIds = (currentUserDoc.following || []).map((id) =>
    id.toString()
  );
  const followersIds = (currentUserDoc.followers || []).map((id) =>
    id.toString()
  );

  // Find intersection: users who are in BOTH following AND followers
  // This means: A follows B AND B follows A (mutual follow)
  const mutualFollowIds = followingIds.filter((id) =>
    followersIds.includes(id)
  );

  if (mutualFollowIds.length === 0) {
    return res.status(200).json({ friends: [] });
  }

  // Fetch full user details for mutual follows
  const friends = await User.find({
    _id: { $in: mutualFollowIds },
  }).select("username firstName lastName profilePicture _id");

  // Return as "friends" to match frontend expectation
  res.status(200).json({ friends });
});
