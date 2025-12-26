
import { useSignUp } from "@clerk/clerk-expo";
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

export default function Register() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Validate inputs
  const validateInputs = () => {
    if (!emailAddress || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return false;
    }
    // Basic regex for email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }
    return true;
  };

  // Handle Sign Up
  const onSignUpPress = async () => {
    if (!isLoaded || !validateInputs()) return;
    setIsLoading(true);

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      // Prepare email verification
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" as any });

      setPendingVerification(true);
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      console.error("Sign up error:", err);
      Alert.alert("Error", err.errors ? err.errors[0].message : err.message);
    }
  };

  // Handle Verify Email
  const onVerifyPress = async () => {
    if (!isLoaded) return;
    setIsLoading(true);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        // Router handles navigation
      } else {
        console.error("Verification status:", completeSignUp.status);
        Alert.alert("Error", "Verification incomplete. Status: " + completeSignUp.status);
        setIsLoading(false);
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error("Verification error:", err);
      Alert.alert("Error", err.errors ? err.errors[0].message : err.message);
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
            {pendingVerification ? "Verify Email" : "Create Account"}
          </Text>
          <Text className="text-gray-500">
            {pendingVerification
              ? "Enter the code sent to your email"
              : "Sign up to get started"}
          </Text>
        </View>

        {!pendingVerification && (
          <View className="gap-4">
            <View>
              <Text className="mb-1 text-gray-700 font-medium">Email</Text>
              <TextInput
                autoCapitalize="none"
                value={emailAddress}
                placeholder="Enter your email"
                onChangeText={setEmailAddress}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
              />
            </View>

            <View>
              <Text className="mb-1 text-gray-700 font-medium">Password</Text>
              <TextInput
                value={password}
                placeholder="Enter your password"
                secureTextEntry={true}
                onChangeText={setPassword}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base"
              />
            </View>

            <TouchableOpacity
              onPress={onSignUpPress}
              disabled={isLoading}
              className="bg-black rounded-full py-4 items-center mt-4 shadow-sm"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-lg">Sign Up</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-4">
              <Text className="text-gray-500">Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                   <Text className="text-blue-500 font-medium">Login</Text>
                </TouchableOpacity>
              </Link>
            </View>
            
            <View className="flex-row justify-center mt-2">
               <Link href="/(auth)" asChild>
                  <TouchableOpacity>
                     <Text className="text-gray-500">Go back</Text>
                  </TouchableOpacity>
               </Link>
            </View>
          </View>
        )}

        {pendingVerification && (
          <View className="gap-4">
            <View>
              <Text className="mb-1 text-gray-700 font-medium">Verification Code</Text>
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
                <Text className="text-white font-bold text-lg">Verify Email</Text>
              )}
            </TouchableOpacity>
             
             <TouchableOpacity 
               onPress={() => setPendingVerification(false)}
               className="items-center mt-4"
            >
               <Text className="text-blue-500 font-medium">Back to Sign Up</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
