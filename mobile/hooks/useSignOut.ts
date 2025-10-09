import { useClerk } from "@clerk/clerk-expo";
import { Alert } from "react-native";

export const useSignOut = () => {
  const { signOut } = useClerk();

  const handleSignOut = () => {
    Alert.alert("Đăng Xuất", "Bạn có muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng Xuất",
        style: "destructive",
        onPress: () => signOut(),
      },
    ]);
  };
  return { handleSignOut };
};
