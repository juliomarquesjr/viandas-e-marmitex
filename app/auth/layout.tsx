import { Suspense } from "react";
import { AuthThemeProvider } from "@/app/components/AuthThemeProvider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthThemeProvider>
      <Suspense>
        {children}
      </Suspense>
    </AuthThemeProvider>
  );
}
