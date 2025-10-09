// ✅ useCurrentUser.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient, userApi } from "../utils/api";

export const useCurrentUser = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  const {
    data: currentUser,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["authUser"],
    queryFn: () => userApi.getCurrentUser(api),

    // ✅ Bổ sung: gộp cả followersCount và followingCount vào object user
    select: (response) => ({
      ...response.data.user,
      followersCount: response.data.followersCount,
      followingCount: response.data.followingCount,
    }),
  });

  // ✅ Follow / Unfollow + sync lại cache
  const toggleFollow = async (targetUserId: string) => {
    await userApi.followUser(api, targetUserId);
    await queryClient.invalidateQueries({ queryKey: ["authUser"] }); // refetch user
  };

  return { currentUser, isLoading, error, refetch, toggleFollow };
};
