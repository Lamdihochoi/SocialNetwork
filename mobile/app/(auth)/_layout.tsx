import { useAuth, useUser } from "@clerk/clerk-expo";
import { Redirect, Stack, useSegments } from "expo-router";

export default function AuthRoutesLayout() {
  const { isSignedIn } = useAuth();
  const { user, isLoaded } = useUser();
  const segments = useSegments();

  // Chờ load xong
  if (!isLoaded) return null;

  const onboardingComplete = user?.unsafeMetadata?.onboardingComplete === true;
  const currentPath = segments.join("/");
  const isOnCompleteProfile = currentPath.includes("complete-profile");

  // Nếu đã login + đã onboarding → chuyển về tabs
  if (isSignedIn && onboardingComplete) {
    return <Redirect href={"/(tabs)" as any} />;
  }

  // Nếu đã login + chưa onboarding + không ở complete-profile → chuyển đến complete-profile
  if (isSignedIn && !onboardingComplete && !isOnCompleteProfile) {
    return <Redirect href={"/(auth)/complete-profile" as any} />;
  }

  // Còn lại: render Stack bình thường
  return <Stack screenOptions={{ headerShown: false }} />;
}
