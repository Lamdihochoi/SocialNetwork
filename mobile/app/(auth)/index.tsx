import { useOAuth } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useState } from "react";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Warm up the browser to improve UX
export const useWarmUpBrowser = () => {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

WebBrowser.maybeCompleteAuthSession();

export default function Index() {
  useWarmUpBrowser();
  const [isLoading, setIsLoading] = useState(false);

  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: "oauth_apple" });

  const onGoogleSignInPress = useCallback(async () => {
    try {
      setIsLoading(true);
      const { createdSessionId, setActive } = await startGoogleOAuth({
        redirectUrl: Linking.createURL("/(auth)/complete-profile", { scheme: "mobile" }),
      });

      if (createdSessionId && setActive) {
        // No biometric here - let _layout.tsx handle the flow
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error("OAuth error", err);
    } finally {
      setIsLoading(false);
    }
  }, [startGoogleOAuth]);

  const onAppleSignInPress = useCallback(async () => {
    try {
      setIsLoading(true);
      const { createdSessionId, setActive } = await startAppleOAuth({
        redirectUrl: Linking.createURL("/(auth)/complete-profile", { scheme: "mobile" }),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error("OAuth error", err);
    } finally {
      setIsLoading(false);
    }
  }, [startAppleOAuth]);

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 px-8 justify-between">
        <View className="flex-1 justify-center">
          {/* DEMO IMAGE */}
          <View className="items-center">
            <Image
              source={require("../../assets/images/auth2.png")}
              className="size-96"
              resizeMode="contain"
            />
          </View>

          <View className="flex-col gap-2">
            {/* GOOGLE SIGNIN BTN */}
            <TouchableOpacity
              className="flex-row items-center justify-center bg-white border border-gray-300 rounded-full py-3 px-6"
              onPress={onGoogleSignInPress}
              disabled={isLoading}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#4285F4" />
              ) : (
                <View className="flex-row items-center justify-center">
                  <Image
                    source={require("../../assets/images/google.png")}
                    className="size-10 mr-3"
                    resizeMode="contain"
                  />
                  <Text className="text-black font-medium text-base">
                    Tiếp tục với Google
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* APPLE SIGNIN ICON */}
            <TouchableOpacity
              className="flex-row items-center justify-center bg-white border border-gray-300 rounded-full py-3 px-6"
              onPress={onAppleSignInPress}
              disabled={isLoading}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <View className="flex-row items-center justify-center">
                  <Image
                    source={require("../../assets/images/apple.png")}
                    className="size-8 mr-3"
                    resizeMode="contain"
                  />
                  <Text className="text-black font-medium text-base">
                    Tiếp tục với Apple
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* EMAIL LOGIN BTN */}
          <Link href={"/(auth)/login" as any} asChild>
            <TouchableOpacity
              className="flex-row items-center justify-center bg-black border border-gray-300 rounded-full py-3 px-6 mt-2"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }}
            >
              <View className="flex-row items-center justify-center">
                <Text className="text-white font-medium text-base">
                  Tiếp tục với Email
                </Text>
              </View>
            </TouchableOpacity>
          </Link>

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-500">Chưa có tài khoản? </Text>
            <Link href={"/(auth)/register" as any} asChild>
              <TouchableOpacity>
                <Text className="text-blue-500 font-medium">Đăng ký</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Terms and Privacy */}
          <Text className="text-center text-gray-500 text-xs leading-4 mt-6 px-2">
            Bằng việc đăng ký, bạn đồng ý với{" "}
            <Text className="text-blue-500">Điều khoản</Text>
            {", "}
            <Text className="text-blue-500">Chính sách bảo mật</Text>
            {", và "}
            <Text className="text-blue-500">Chính sách Cookie</Text>.
          </Text>
        </View>
      </View>
    </View>
  );
}
