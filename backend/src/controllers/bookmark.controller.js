import Bookmark from "../models/bookmark.model.js";
import Post from "../models/post.model.js";

// Toggle bookmark (add if not exists, remove if exists)
export const toggleBookmark = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }

    // Check if already bookmarked
    const existingBookmark = await Bookmark.findOne({ user: userId, post: postId });

    if (existingBookmark) {
      // Remove bookmark
      await Bookmark.deleteOne({ _id: existingBookmark._id });
      return res.status(200).json({ 
        message: "Đã bỏ lưu bài viết",
        isBookmarked: false 
      });
    } else {
      // Add bookmark
      await Bookmark.create({ user: userId, post: postId });
      return res.status(201).json({ 
        message: "Đã lưu bài viết",
        isBookmarked: true 
      });
    }
  } catch (error) {
    console.error("Toggle bookmark error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Get user's bookmarks
export const getBookmarks = async (req, res) => {
  try {
    const userId = req.user._id;

    const bookmarks = await Bookmark.find({ user: userId })
      .populate({
        path: "post",
        populate: {
          path: "user",
          select: "firstName lastName username profilePicture",
        },
      })
      .sort({ createdAt: -1 });

    // Filter out null posts (deleted posts)
    const validBookmarks = bookmarks.filter(b => b.post !== null);

    res.status(200).json({ 
      bookmarks: validBookmarks.map(b => ({
        ...b.post.toObject(),
        bookmarkedAt: b.createdAt,
      }))
    });
  } catch (error) {
    console.error("Get bookmarks error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Check if post is bookmarked
export const checkBookmark = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const bookmark = await Bookmark.findOne({ user: userId, post: postId });

    res.status(200).json({ isBookmarked: !!bookmark });
  } catch (error) {
    console.error("Check bookmark error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
