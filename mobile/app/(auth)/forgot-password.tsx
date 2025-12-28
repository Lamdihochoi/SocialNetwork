import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
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
import { Ionicons } from "@expo/vector-icons";

export default function ForgotPassword() {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Steps: 'email' → 'reset'
  const [currentStep, setCurrentStep] = useState<"email" | "reset">("email");

  // Step 1: Send reset code to email
  const onSendCodePress = async () => {
    if (!isLoaded) return;
    
    if (!email) {
      Alert.alert("Lỗi", "Vui lòng nhập địa chỉ email");
      return;
    }

    setIsLoading(true);

    try {
      // Use Clerk's resetPassword method
      const resetAttempt = await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });

      // Prepare email verification
      const { supportedFirstFactors } = resetAttempt;
      const emailCodeFactor = supportedFirstFactors?.find(
        (factor: any) => factor.strategy === "reset_password_email_code"
      );

      if (emailCodeFactor) {
        await signIn.prepareFirstFactor({
          strategy: "reset_password_email_code",
          emailAddressId: (emailCodeFactor as any).emailAddressId,
        });

        setCurrentStep("reset");
        setIsLoading(false);
        Alert.alert(
          "Mã đã gửi", 
          "Vui lòng kiểm tra email để lấy mã xác thực"
        );
      } else {
        throw new Error("Email không hợp lệ hoặc chưa đăng ký");
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error("Send code error:", err);
      Alert.alert("Lỗi", err.errors ? err.errors[0].message : err.message);
    }
  };

  // Step 2: Reset password with code
  const onResetPasswordPress = async () => {
    if (!isLoaded) return;

    if (!code || !newPassword) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ mã xác thực và mật khẩu mới");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    setIsLoading(true);

    try {
      // Attempt to reset password
      const resetAttempt = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });

      if (resetAttempt.status === "complete") {
        Alert.alert(
          "Thành công", 
          "Mật khẩu đã được đặt lại. Vui lòng đăng nhập.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/(auth)/login"),
            },
          ]
        );
      } else {
        console.error("Reset status:", resetAttempt.status);
        Alert.alert("Lỗi", "Đặt lại mật khẩu chưa hoàn tất");
        setIsLoading(false);
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error("Reset password error:", err);
      Alert.alert("Lỗi", err.errors ? err.errors[0].message : err.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 px-8 justify-center"
      >
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute top-12 left-8 z-10"
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <View className="mb-8">
          <Text className="text-3xl font-bold text-black mb-2">
            {currentStep === "email" ? "Quên mật khẩu?" : "Đặt lại mật khẩu"}
          </Text>
          <Text className="text-gray-500">
            {currentStep === "email"
              ? "Nhập email để nhận mã xác thực"
              : "Nhập mã xác thực và mật khẩu mới"}
          </Text>
        </View>

        {currentStep === "email" && (
          <View className="gap-4">
            <View>
              <Text className="mb-1 text-gray-700 font-medium">Email</Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                placeholder="Nhập email của bạn"
                onChangeText={setEmail}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
              />
            </View>

            <TouchableOpacity
              onPress={onSendCodePress}
              disabled={isLoading}
              className="w-full bg-blue-500 rounded-xl py-4 items-center mt-2"
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">
                  Gửi mã xác thực
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {currentStep === "reset" && (
          <View className="gap-4">
            <View>
              <Text className="mb-1 text-gray-700 font-medium">
                Mã xác thực
              </Text>
              <TextInput
                keyboardType="number-pad"
                value={code}
                placeholder="Nhập mã 6 chữ số"
                onChangeText={setCode}
                maxLength={6}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
              />
            </View>

            <View>
              <Text className="mb-1 text-gray-700 font-medium">
                Mật khẩu mới
              </Text>
              <TextInput
                secureTextEntry
                value={newPassword}
                placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                onChangeText={setNewPassword}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
              />
            </View>

            <TouchableOpacity
              onPress={onResetPasswordPress}
              disabled={isLoading}
              className="w-full bg-blue-500 rounded-xl py-4 items-center mt-2"
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">
                  Đặt lại mật khẩu
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCurrentStep("email")}
              className="items-center mt-2"
            >
              <Text className="text-blue-500 font-medium">
                Gửi lại mã xác thực
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
