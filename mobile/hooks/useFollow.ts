import { useState } from "react";
import { Alert } from "react-native";
import { useApiClient, userApi } from "../utils/api";
import { useQueryClient } from "@tanstack/react-query";

export const useFollow = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  /**
   * Hàm này dùng để Follow hoặc Unfollow một user
   * @param targetUserId ID của người muốn follow/unfollow
   */
  const toggleFollow = async (targetUserId: string) => {
    if (!targetUserId) {
      console.log("[useFollow] No targetUserId provided");
      return false;
    }

    setLoading(true);
    try {
      console.log("[useFollow] Calling follow API for user:", targetUserId);
      
      // Gọi API (Backend đã xử lý logic tự động: chưa follow -> follow, đã follow -> unfollow)
      const response = await userApi.followUser(api, targetUserId);
      console.log("[useFollow] Success:", response.data);

      // Invalidate related queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      await queryClient.invalidateQueries({ queryKey: ["authUser"] });
      
      return true;
    } catch (error: any) {
      console.error("[useFollow] Error:", error?.response?.status, error?.response?.data || error.message);
      
      if (error?.response?.status === 401) {
        Alert.alert("Lỗi xác thực", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      } else if (error?.response?.status === 404) {
        Alert.alert("Lỗi", "Người dùng không tồn tại.");
      } else {
        Alert.alert("Lỗi", "Không thể thực hiện thao tác follow lúc này.");
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { toggleFollow, loading };
};
