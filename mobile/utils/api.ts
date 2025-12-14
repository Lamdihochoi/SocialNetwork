import axios, { AxiosInstance } from "axios";
import { useAuth } from "@clerk/clerk-expo";

// ⚠️ LƯU Ý: Nếu đổi mạng wifi, nhớ đổi lại IP này nhé
const API_BASE_URL = "http://192.168.68.108:5001/api";

export const createApiClient = (
  getToken: () => Promise<string | null>
): AxiosInstance => {
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "User-Agent": "SocialNetworkApp/1.0 (ReactNative)",
      Accept: "application/json",
    },
  });

  api.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 403) {
        console.warn("⚠️ Request bị Arcjet chặn (403). Kiểm tra User-Agent.");
      }
      return Promise.reject(error);
    }
  );

  return api;
};

export const useApiClient = (): AxiosInstance => {
  const { getToken } = useAuth();
  return createApiClient(getToken);
};

// ======================
// 🔹 API endpoints
// ======================

export const userApi = {
  syncUser: (api: AxiosInstance) => api.post("/users/sync"),
  getCurrentUser: (api: AxiosInstance) => api.get("/users/me"),
  updateProfile: (api: AxiosInstance, data: any) =>
    api.put("/users/profile", data),

  // Get user by ID
  getUserById: (api: AxiosInstance, userId: string) =>
    api.get(`/users/${userId}`),

  // Follow / Unfollow user
  followUser: (api: AxiosInstance, targetUserId: string) =>
    api.post(`/users/${targetUserId}/follow`),

  getFollowList: (
    api: AxiosInstance,
    userId: string,
    type: "followers" | "following"
  ) => api.get(`/users/${userId}/follows?type=${type}`),

  // Get mutual follows (friends)
  getMutualFollows: (api: AxiosInstance) => api.get("/users/mutual-follows"),
};

export const postApi = {
  createPost: (api: AxiosInstance, data: { content: string; image?: string }) =>
    api.post("/posts", data),
  getPosts: (api: AxiosInstance) => api.get("/posts"),
  getUserPosts: (api: AxiosInstance, username: string) =>
    api.get(`/posts/user/${username}`),
  searchPosts: (api: AxiosInstance, query: string) =>
    api.get(`/posts/search?q=${encodeURIComponent(query)}`),
  likePost: (api: AxiosInstance, postId: string) =>
    api.post(`/posts/${postId}/like`),
  deletePost: (api: AxiosInstance, postId: string) =>
    api.delete(`/posts/${postId}`),
  getPostById: (api: AxiosInstance, postId: string) =>
    api.get(`/posts/${postId}`),
};

export const commentApi = {
  createComment: (api: AxiosInstance, postId: string, content: string) =>
    api.post(`/comments/post/${postId}`, { content }),
};

// 🟢 MỚI: API Thông báo (Cần thiết cho màn hình Notifications)
export const notificationApi = {
  getNotifications: (api: AxiosInstance) => api.get("/notifications"),
  markAsRead: (api: AxiosInstance, notificationId: string) =>
    api.put(`/notifications/${notificationId}/read`),
};

// 🟢 CẬP NHẬT: API Nhắn tin (Khớp với backend mới)
export const messageApi = {
  getFriends: (api: AxiosInstance) => api.get("/messages/friends"),
  getConversations: (api: AxiosInstance) => api.get("/messages/conversations"),

  getMessageHistory: (api: AxiosInstance, otherUserId: string) =>
    api.get(`/messages/${otherUserId}`),

  // Gửi tin nhắn (hỗ trợ content và file attachment)
  sendMessage: (
    api: AxiosInstance,
    receiverId: string,
    content: string,
    file?: { uri: string; type: string; name: string }
  ) => {
    const formData = new FormData();
    formData.append("receiverId", receiverId);
    if (content) {
      formData.append("content", content);
    }
    if (file) {
      formData.append("file", {
        uri: file.uri,
        type: file.type,
        name: file.name,
      } as any);
    }
    return api.post("/messages/send", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
