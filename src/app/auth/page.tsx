import { Suspense } from "react";
import { AuthScreen } from "@/components/auth/auth-screen";

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthScreen />
    </Suspense>
  );
}
