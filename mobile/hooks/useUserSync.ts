import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";

/**
 * useUserSync - Đã được xử lý trong complete-profile.tsx
 * 
 * Hook này giờ chỉ để reset state khi đăng xuất
 * Không tự động sync nữa để tránh duplicate calls
 */
export const useUserSync = () => {
  const { isSignedIn } = useAuth();
  const hasSynced = useRef(false);

  // Reset khi đăng xuất
  useEffect(() => {
    if (!isSignedIn) {
      hasSynced.current = false;
    }
  }, [isSignedIn]);

  return null;
};
