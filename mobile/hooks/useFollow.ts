import { useState } from "react";
import { Alert } from "react-native";
import { useApiClient, userApi } from "../utils/api";

export const useFollow = () => {
  const api = useApiClient();
  const [loading, setLoading] = useState(false);

  /**
   * Hàm này dùng để Follow hoặc Unfollow một user
   * @param targetUserId ID của người muốn follow/unfollow
   */
  const toggleFollow = async (targetUserId: string) => {
    if (!targetUserId) return;

    setLoading(true);
    try {
      // Gọi API (Backend đã xử lý logic tự động: chưa follow -> follow, đã follow -> unfollow)
      await userApi.followUser(api, targetUserId);

      // Bạn có thể return true để component biết là thành công
      return true;
    } catch (error: any) {
      console.error("Follow error:", error);
      Alert.alert("Lỗi", "Không thể thực hiện thao tác follow lúc này.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { toggleFollow, loading };
};
