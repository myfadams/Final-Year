import { Stack } from "expo-router";
import { useEffect } from "react";

export default function AuthLayout() {
  useEffect(() => {
    // getCurrentUser()
    //   .then((user) => {
    //     console.log(user);
    //   })
    //   .catch((error) => {
    //     console.log(error);
    //   });
  }, []);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="mainPage" options={{ title: "mainPge" }} />
      <Stack.Screen name="login" options={{ title: "Login" }} />
      <Stack.Screen name="register" options={{ title: "Register" }} />
      <Stack.Screen name="waitingVerify" options={{ title: "waitingVerify" }} />
      <Stack.Screen name="verify" options={{ title: "Verify" }} />
    </Stack>
  );
}
