// 1. Định nghĩa User chuẩn
export interface User {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  email?: string;
  clerkId?: string;
  followers?: any[]; // Để any[] để tránh lỗi type khi populate (lúc là string ID, lúc là Object)
  following?: any[];
  isFollowing?: boolean;
  followersCount?: number;
  followingCount?: number;
}

// 2. Định nghĩa Comment
export interface Comment {
  _id: string;
  content: string;
  createdAt: string;
  user: User;
}

// 3. Định nghĩa Post
export interface Post {
  _id: string;
  content: string;
  image?: string;
  createdAt: string;
  user: User;
  likes: string[];
  comments: Comment[];
  isFollowing?: boolean; // Frontend tự thêm vào để xử lý UI (nút Follow/Unfollow)
}

// 4. Định nghĩa Notification
export interface Notification {
  _id: string;
  from: User;
  to: string; // ID người nhận
  type: "like" | "comment" | "follow";
  post?: {
    _id: string;
    content: string;
    image?: string;
  };
  comment?: {
    _id: string;
    content: string;
  };
  createdAt: string;
  isRead?: boolean; // ✅ Thêm trạng thái đã đọc thông báo
}

// 5. Định nghĩa Message (Cập nhật quan trọng)
export interface Message {
  _id: string;
  sender: User;
  receiver: User;
  content: string;
  createdAt: string;

  // ✅ Bổ sung để khớp với Backend mới
  image?: string; // Link ảnh (nếu có) - DEPRECATED, use attachment instead
  messageType?: "text" | "image" | "video" | "file"; // Loại tin nhắn
  isRead?: boolean; // Trạng thái đã xem
  attachment?: {
    url: string;
    type: "image" | "video" | "file" | "text";
    fileName?: string;
    fileSize?: number;
  };
}

// 6. Định nghĩa Conversation (Cuộc trò chuyện)
export interface Conversation {
  _id: string;

  // Thông tin người chat cùng (đã được format từ backend)
  user: User;

  // 👇 Giữ cái này để tương thích với code cũ trong messages.tsx
  otherUser?: User;

  lastMessage: string; // Nội dung tin nhắn cuối
  lastMessageAt: string; // Thời gian tin nhắn cuối
  updatedAt: string;

  // ✅ Quan trọng: Để hiển thị chấm đỏ hoặc chữ đậm
  isRead?: boolean;
}
