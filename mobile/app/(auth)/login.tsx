
import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
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

export default function Login() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Steps: 'email_password' or 'mfa'
  const [currentStep, setCurrentStep] = useState<"email_password" | "mfa">("email_password");

  // Handle Login with Email & Password
  const onSignInPress = async () => {
    if (!isLoaded) return;
    setIsLoading(true);

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      // If mfa is required
      if (signInAttempt.status === "needs_second_factor") {
        setCurrentStep("mfa");
        setIsLoading(false);
      } else if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        // Router will handle navigation via auth group protection
      } else {
        // Handle other statuses if needed
        console.error("Login status:", signInAttempt.status);
        Alert.alert("Đăng nhập thất bại", "Trạng thái không xác định: " + signInAttempt.status);
        setIsLoading(false);
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error("Login error:", err);
      Alert.alert("Lỗi", err.errors ? err.errors[0].message : err.message);
    }
  };

  // Handle MFA Code Verification
  const onVerifyPress = async () => {
    if (!isLoaded) return;
    setIsLoading(true);

    try {
      const signInAttempt = await signIn.attemptSecondFactor({
        strategy: "email_code" as any,
        code,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        // Router will handle navigation
      } else {
        console.error("MFA status:", signInAttempt.status);
        Alert.alert("Xác thực thất bại", "Xác thực chưa hoàn tất. Trạng thái: " + signInAttempt.status);
        setIsLoading(false);
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error("MFA error:", err);
      Alert.alert("Lỗi", err.errors ? err.errors[0].message : err.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 px-8 justify-center"
      >
        <View className="mb-8">
          <Text className="text-3xl font-bold text-black mb-2">
            {currentStep === "email_password" ? "Chào mừng trở lại" : "Xác thực danh tính"}
          </Text>
          <Text className="text-gray-500">
            {currentStep === "email_password"
              ? "Vui lòng đăng nhập vào tài khoản của bạn"
              : "Nhập mã xác thực đã gửi đến email của bạn"}
          </Text>
        </View>

        {currentStep === "email_password" && (
          <View className="gap-4">
            <View>
              <Text className="mb-1 text-gray-700 font-medium">Email</Text>
              <TextInput
                autoCapitalize="none"
                value={emailAddress}
                placeholder="Nhập email của bạn"
                onChangeText={setEmailAddress}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
              />
            </View>

            <View>
              <Text className="mb-1 text-gray-700 font-medium">Mật khẩu</Text>
              <TextInput
                value={password}
                placeholder="Nhập mật khẩu của bạn"
                secureTextEntry={true}
                onChangeText={setPassword}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
              />
            </View>

            <TouchableOpacity
              onPress={onSignInPress}
              disabled={isLoading}
              className="bg-black rounded-full py-4 items-center mt-4 shadow-sm"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-lg">Đăng nhập</Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password Link */}
            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgot-password" as any)}
              className="items-center mt-3"
            >
              <Text className="text-blue-500 font-medium">Quên mật khẩu?</Text>
            </TouchableOpacity>

            <View className="flex-row justify-center mt-4">
               <Link href="/(auth)" asChild>
                  <TouchableOpacity>
                     <Text className="text-gray-500">Quay lại</Text>
                  </TouchableOpacity>
               </Link>
            </View>
          </View>
        )}

        {currentStep === "mfa" && (
          <View className="gap-4">
            <View>
              <Text className="mb-1 text-gray-700 font-medium">Mã xác thực</Text>
              <TextInput
                value={code}
                placeholder="123456"
                keyboardType="numeric"
                onChangeText={setCode}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
              />
            </View>

            <TouchableOpacity
              onPress={onVerifyPress}
              disabled={isLoading}
              className="bg-black rounded-full py-4 items-center mt-4 shadow-sm"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-lg">Xác thực & Đăng nhập</Text>
              )}
            </TouchableOpacity>
          
            <TouchableOpacity 
               onPress={() => {
                  setCurrentStep("email_password");
                  setCode("");
               }}
               className="items-center mt-4"
            >
               <Text className="text-blue-500 font-medium">Quay lại Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
