import axios, { AxiosInstance } from "axios";
import { useAuth } from "@clerk/clerk-expo";

const API_BASE_URL = "https://social-network-five-gules.vercel.app/api";

/**
 * Tạo Axios instance với:
 * - Token từ Clerk
 * - Custom User-Agent giúp Arcjet không nhầm là bot
 * - Xử lý tự động lỗi 403 (Arcjet chặn nhầm)
 */
export const createApiClient = (
  getToken: () => Promise<string | null>
): AxiosInstance => {
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      // ✅ Thêm User-Agent để Arcjet nhận diện là app hợp lệ
      "User-Agent": "SocialNetworkApp/1.0 (ReactNative)",
      Accept: "application/json",
    },
  });

  // ✅ Gắn token Clerk vào header
  api.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // ✅ Xử lý lỗi Arcjet (403 bot detection)
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 403) {
        console.warn(
          "⚠️ Request bị Arcjet chặn (403) — có thể do bot detection. Kiểm tra User-Agent hoặc whitelist UA trên backend."
        );
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

  // 🟢 NEW: Follow / Unfollow user
  followUser: (api: AxiosInstance, targetUserId: string) =>
    api.post(`/users/${targetUserId}/follow`),

  getFollowList: (
    api: AxiosInstance,
    userId: string,
    type: "followers" | "following"
  ) => api.get(`/users/${userId}/follows?type=${type}`),
};

export const postApi = {
  createPost: (api: AxiosInstance, data: { content: string; image?: string }) =>
    api.post("/posts", data),
  getPosts: (api: AxiosInstance) => api.get("/posts"),
  getUserPosts: (api: AxiosInstance, username: string) =>
    api.get(`/posts/user/${username}`),
  likePost: (api: AxiosInstance, postId: string) =>
    api.post(`/posts/${postId}/like`),
  deletePost: (api: AxiosInstance, postId: string) =>
    api.delete(`/posts/${postId}`),
};

export const commentApi = {
  createComment: (api: AxiosInstance, postId: string, content: string) =>
    api.post(`/comments/post/${postId}`, { content }),
};
