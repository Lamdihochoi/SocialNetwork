import { ClerkProvider, useUser, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Slot } from "expo-router";
import React, { useState, useRef, useCallback, useEffect } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import { Alert, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import "../global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SocketProvider } from "@/context/SocketContext";
import { UnreadProvider } from "@/context/UnreadContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ⚡ OPTIMIZED: Data fresh hơn cho realtime feel
      staleTime: 1000 * 30, // 30 giây - ngắn hơn để data always fresh
      // Giữ cache trong 10 phút sau khi không còn sử dụng
      gcTime: 1000 * 60 * 10,
      // Retry 1 lần nếu lỗi
      retry: 1,
      // Không refetch khi focus lại window (mobile không cần)
      refetchOnWindowFocus: false,
      // ⚡ BẬT: Sync data khi reconnect mạng
      refetchOnReconnect: true,
      // ⚡ Offline-first: Load cache trước, fetch sau
      networkMode: "offlineFirst",
    },
    mutations: {
      // Retry 1 lần cho mutations
      retry: 1,
      // ⚡ Mutations vẫn hoạt động khi offline
      networkMode: "offlineFirst",
    },
  },
});

/**
 * MINIMAL AUTH GATE
 * 
 * Không dùng router.replace - để tránh infinite loop
 * Chỉ render Lock Screen khi cần
 * Navigation được xử lý bởi (auth)/_layout và (tabs)/_layout
 */
const AuthGate = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useAuth();
  
  const [isUnlocked, setIsUnlocked] = useState(false);
  const biometricTriggered = useRef(false);

  const onboardingComplete = user?.unsafeMetadata?.onboardingComplete === true;

  // Biometric function
  const performBiometricAuth = useCallback(async () => {
    console.log("[BIO] Starting...");
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        console.log("[BIO] Not available");
        setIsUnlocked(true);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Xác nhận vân tay để mở khóa",
        fallbackLabel: "Sử dụng mật khẩu",
        cancelLabel: "Hủy",
      });

      if (result.success) {
        console.log("[BIO] Success!");
        setIsUnlocked(true);
      } else {
        Alert.alert(
          "Xác thực thất bại",
          "Bạn cần xác thực để tiếp tục.",
          [
            { text: "Thử lại", onPress: () => { biometricTriggered.current = false; performBiometricAuth(); }},
            { text: "Đăng xuất", style: "destructive", onPress: () => signOut() },
          ],
          { cancelable: false }
        );
      }
    } catch (error) {
      console.log("[BIO] Error, allowing through");
      setIsUnlocked(true);
    }
  }, [signOut]);

  // Trigger biometric khi cần
  useEffect(() => {
    // Chỉ trigger khi: đã load + đã đăng nhập + đã onboarding + chưa unlock
    if (isLoaded && isSignedIn && onboardingComplete && !isUnlocked) {
      if (!biometricTriggered.current) {
        biometricTriggered.current = true;
        performBiometricAuth();
      }
    }
  }, [isLoaded, isSignedIn, onboardingComplete, isUnlocked, performBiometricAuth]);

  // Reset khi đăng xuất
  useEffect(() => {
    if (!isSignedIn) {
      setIsUnlocked(false);
      biometricTriggered.current = false;
    }
  }, [isSignedIn]);

  // Debug log (chỉ log 1 lần khi state thay đổi thực sự)
  useEffect(() => {
    console.log("[AUTH]", { isLoaded, isSignedIn, onboardingComplete, isUnlocked });
  }, [isLoaded, isSignedIn, onboardingComplete, isUnlocked]);

  // === Loading ===
  if (!isLoaded) {
    return (
      <View className="flex-1 bg-blue-500 items-center justify-center">
        <Text className="text-white text-4xl font-bold mb-2">🐦</Text>
        <Text className="text-white text-2xl font-bold">Social Network</Text>
        <ActivityIndicator color="white" className="mt-4" />
      </View>
    );
  }

  // === Lock Screen: Chỉ hiện khi đã login + đã onboarding + chưa unlock ===
  if (isSignedIn && onboardingComplete && !isUnlocked) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center">
        <Text className="text-6xl mb-6">🔒</Text>
        <Text className="text-white text-2xl font-bold mb-2">Xác thực để tiếp tục</Text>
        <Text className="text-gray-400 text-center px-8 mb-8">
          Vui lòng xác thực sinh trắc học
        </Text>
        <TouchableOpacity 
          onPress={() => { biometricTriggered.current = false; performBiometricAuth(); }}
          className="bg-blue-500 px-10 py-4 rounded-full"
        >
          <Text className="text-white font-bold text-lg">🔓 Mở khóa</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // === Normal: Cho Expo Router xử lý navigation ===
  return <Slot />;
};

export default function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <UnreadProvider>
            <AuthGate />
            <StatusBar style="auto" />
          </UnreadProvider>
        </SocketProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
