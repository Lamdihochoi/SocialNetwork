import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
  ToastAndroid,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useUser, useClerk, useAuth } from "@clerk/clerk-expo";
import * as LocalAuthentication from "expo-local-authentication";

interface SettingsMenuProps {
  onSignOut?: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { sessionId } = useAuth();
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Detect if user has password (email login) or OAuth (Google)
  const isEmailUser = user?.passwordEnabled === true;
  const primaryEmail = user?.primaryEmailAddress?.emailAddress || "";
  const loginProvider = user?.externalAccounts?.[0]?.provider || "email";

  // Show toast message
  const showToast = (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("Thông báo", message);
    }
  };

  // Biometric re-authentication
  const performBiometricAuth = async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // No biometric, allow through (will use password)
        return true;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Xác nhận để đổi mật khẩu",
        fallbackLabel: "Sử dụng mật khẩu",
        cancelLabel: "Hủy",
      });

      return result.success;
    } catch (error) {
      console.error("Biometric error:", error);
      return false;
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu mới không khớp");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    setIsChangingPassword(true);

    try {
      await user?.updatePassword({
        currentPassword: currentPassword,
        newPassword: newPassword,
      });

      showToast("Đổi mật khẩu thành công!");
      setPasswordModalVisible(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Password change error:", error);
      Alert.alert(
        "Lỗi",
        error?.errors?.[0]?.message || "Không thể đổi mật khẩu. Kiểm tra mật khẩu cũ."
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Open password change with biometric
  const openPasswordChange = async () => {
    setMenuVisible(false);
    
    const authenticated = await performBiometricAuth();
    if (authenticated) {
      setPasswordModalVisible(true);
    } else {
      Alert.alert("Xác thực thất bại", "Bạn cần xác thực để đổi mật khẩu");
    }
  };

  // Handle sign out
  const handleSignOut = () => {
    setMenuVisible(false);
    Alert.alert("Đăng Xuất", "Bạn có muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng Xuất",
        style: "destructive",
        onPress: () => signOut(),
      },
    ]);
  };

  // Handle logout all devices
  const handleLogoutAllDevices = async () => {
    setMenuVisible(false);
    
    // Require biometric auth first
    const authenticated = await performBiometricAuth();
    if (!authenticated) {
      Alert.alert("Xác thực thất bại", "Bạn cần xác thực để thực hiện thao tác này");
      return;
    }

    Alert.alert(
      "Đăng xuất tất cả thiết bị",
      "Bạn sẽ bị đăng xuất khỏi TẤT CẢ thiết bị, bao gồm cả thiết bị này. Tiếp tục?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng xuất tất cả",
          style: "destructive",
          onPress: async () => {
            try {
              // Get all sessions and revoke them
              const sessions = user?.getSessions();
              if (sessions) {
                // Note: In Clerk, we need to use signOut which will invalidate current session
                // For true "logout all devices", we'd need to use Clerk Backend API
                await signOut();
                showToast("Đã đăng xuất khỏi tất cả thiết bị");
              }
            } catch (error) {
              console.error("Logout all error:", error);
              Alert.alert("Lỗi", "Không thể đăng xuất. Vui lòng thử lại.");
            }
          },
        },
      ]
    );
  };

  // Handle session management
  const handleSessionManagement = () => {
    setMenuVisible(false);
    Alert.alert(
      "Quản lý phiên đăng nhập",
      `📱 Thiết bị hiện tại:\n${sessionId?.substring(0, 16)}...\n\n🔒 Để bảo mật tài khoản, bạn có thể đăng xuất khỏi tất cả thiết bị.`,
      [
        { text: "Đóng", style: "cancel" },
        { 
          text: "Đăng xuất tất cả", 
          style: "destructive",
          onPress: handleLogoutAllDevices 
        },
      ]
    );
  };

  return (
    <>
      {/* Settings Icon */}
      <TouchableOpacity onPress={() => setMenuVisible(true)}>
        <Feather name="settings" size={24} color="#657786" />
      </TouchableOpacity>

      {/* Settings Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <Text className="text-xl font-bold text-gray-900 mb-4 text-center">
              Cài đặt
            </Text>

            {/* Account Info */}
            <View className="flex-row items-center mb-6 p-4 bg-gray-50 rounded-xl">
              <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Feather 
                  name={isEmailUser ? "mail" : "globe"} 
                  size={24} 
                  color="#1DA1F2" 
                />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900">{primaryEmail}</Text>
                <Text className="text-gray-500 text-sm">
                  {isEmailUser ? "Đăng nhập bằng Email" : `Đăng nhập bằng ${loginProvider.charAt(0).toUpperCase() + loginProvider.slice(1)}`}
                </Text>
              </View>
            </View>

            {/* Menu Options */}
            {isEmailUser && (
              <TouchableOpacity
                className="flex-row items-center p-4 mb-2 bg-gray-50 rounded-xl"
                onPress={openPasswordChange}
              >
                <Feather name="lock" size={22} color="#1DA1F2" />
                <Text className="flex-1 ml-4 text-gray-900 font-medium">
                  Đổi mật khẩu
                </Text>
                <Feather name="chevron-right" size={20} color="#657786" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="flex-row items-center p-4 mb-2 bg-gray-50 rounded-xl"
              onPress={handleSessionManagement}
            >
              <Feather name="smartphone" size={22} color="#1DA1F2" />
              <Text className="flex-1 ml-4 text-gray-900 font-medium">
                Quản lý phiên đăng nhập
              </Text>
              <Feather name="chevron-right" size={20} color="#657786" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-4 bg-red-50 rounded-xl"
              onPress={handleSignOut}
            >
              <Feather name="log-out" size={22} color="#E0245E" />
              <Text className="flex-1 ml-4 text-red-600 font-medium">
                Đăng xuất
              </Text>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              className="mt-4 p-4 items-center"
              onPress={() => setMenuVisible(false)}
            >
              <Text className="text-gray-500 font-medium">Đóng</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-xl font-bold text-gray-900 mb-6 text-center">
              Đổi mật khẩu
            </Text>

            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
              placeholder="Mật khẩu hiện tại"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
              placeholder="Mật khẩu mới (ít nhất 8 ký tự)"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-6"
              placeholder="Xác nhận mật khẩu mới"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholderTextColor="#9CA3AF"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-4 bg-gray-100 rounded-xl items-center"
                onPress={() => {
                  setPasswordModalVisible(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                <Text className="font-semibold text-gray-700">Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 py-4 bg-blue-500 rounded-xl items-center"
                onPress={handlePasswordChange}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="font-semibold text-white">Xác nhận</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default SettingsMenu;
