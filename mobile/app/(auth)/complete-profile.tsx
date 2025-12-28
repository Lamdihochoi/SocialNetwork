import { useUser, useAuth } from "@clerk/clerk-expo";
import axios from "axios";
import { useRouter } from "expo-router";
import { useState, useRef, useCallback } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * CompleteProfile - First-time user onboarding screen
 * 
 * FLOW:
 * 1. User enters firstName and lastName
 * 2. Press Save
 * 3. Update Clerk user with name + set onboardingComplete=true
 * 4. Reload user data
 * 5. Sync to backend
 * 6. Biometric confirmation
 * 7. Navigate to tabs
 */
export default function CompleteProfile() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  // Pre-fill with existing data (e.g., from Google OAuth)
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [isSaving, setIsSaving] = useState(false);
  const isSyncing = useRef(false);

  // Sync user data to backend
  const syncUserToBackend = useCallback(async (fn: string, ln: string): Promise<boolean> => {
    if (isSyncing.current) {
      console.log("[Sync] Already syncing, skipping...");
      return false;
    }
    isSyncing.current = true;

    try {
      // Get fresh token for authentication
      const token = await getToken();
      if (!token) {
        console.log("[Sync] No token available");
        return false;
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://192.168.68.129:5001";
      
      console.log("[Sync] Sending data to backend...");
      const response = await axios.post(
        `${apiUrl}/api/users/sync`,
        { firstName: fn, lastName: ln },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("[Sync] Success:", response.data);
      return true;
    } catch (error: any) {
      console.error("[Sync] Failed:", error?.response?.data || error.message);
      return false;
    } finally {
      isSyncing.current = false;
    }
  }, [getToken]);

  // Handle save button press
  const onSavePress = async () => {
    const fn = firstName.trim();
    const ln = lastName.trim();

    // Validate input
    if (!fn || !ln) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ Họ và Tên.");
      return;
    }

    setIsSaving(true);

    try {
      // ========================================
      // STEP 1: Biometric confirmation FIRST (before setting onboardingComplete)
      // ========================================
      console.log("[Save] Step 1: Biometric confirmation...");
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Xác nhận vân tay để hoàn tất đăng ký",
          fallbackLabel: "Sử dụng mật khẩu",
          cancelLabel: "Hủy",
        });

        if (!result.success) {
          Alert.alert(
            "Xác thực thất bại", 
            "Bạn cần xác thực sinh trắc học để tiếp tục.",
            [{ text: "OK" }]
          );
          setIsSaving(false);
          return;
        }
        console.log("[Save] Biometric authentication successful!");
      } else {
        console.log("[Save] Biometric not available, skipping...");
      }

      // ========================================
      // STEP 2: Update Clerk user with name (but NOT onboardingComplete yet)
      // ========================================
      console.log("[Save] Step 2: Updating Clerk user name...");
      await user?.update({
        firstName: fn,
        lastName: ln,
      });

      // ========================================
      // STEP 3: Sync to backend
      // ========================================
      console.log("[Save] Step 3: Syncing to backend...");
      const synced = await syncUserToBackend(fn, ln);
      
      if (!synced) {
        Alert.alert("Lỗi", "Không thể đồng bộ dữ liệu. Vui lòng thử lại.");
        setIsSaving(false);
        return;
      }

      // ========================================
      // STEP 4: Set onboardingComplete = true (AFTER biometric & sync)
      // ========================================
      console.log("[Save] Step 4: Setting onboardingComplete...");
      await user?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          onboardingComplete: true,
        },
      });

      // ========================================
      // STEP 5: Reload user data to get fresh metadata
      // ========================================
      console.log("[Save] Step 5: Reloading user data...");
      await user?.reload();

      // ========================================
      // STEP 6: Navigate to tabs
      // ========================================
      console.log("[Save] Step 6: Complete! Navigating to tabs...");
      router.replace("/(tabs)");
      
    } catch (err: any) {
      console.error("[Save] Error:", err);
      Alert.alert("Lỗi", "Cập nhật thất bại: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (!isLoaded) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#1DA1F2" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 px-8 justify-center"
      >
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-black mb-2">
            Chào mừng! 👋
          </Text>
          <Text className="text-gray-500 text-base">
            Vui lòng xác nhận họ tên để hoàn tất đăng ký.
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          <View>
            <Text className="mb-1 text-gray-700 font-medium">Họ</Text>
            <TextInput
              value={firstName}
              placeholder="Ví dụ: Nguyễn"
              onChangeText={setFirstName}
              autoCapitalize="words"
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
            />
          </View>

          <View>
            <Text className="mb-1 text-gray-700 font-medium">Tên</Text>
            <TextInput
              value={lastName}
              placeholder="Ví dụ: Văn A"
              onChangeText={setLastName}
              autoCapitalize="words"
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
            />
          </View>

          <TouchableOpacity
            onPress={onSavePress}
            disabled={isSaving}
            className="bg-black rounded-full py-4 items-center mt-6 shadow-sm"
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-lg">Xác nhận & Tiếp tục</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Debug info - only in development */}
        {__DEV__ && (
          <View className="mt-8 p-4 bg-gray-100 rounded-lg">
            <Text className="text-xs text-gray-500">
              [DEV] onboardingComplete: {String(user?.unsafeMetadata?.onboardingComplete ?? "undefined")}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
