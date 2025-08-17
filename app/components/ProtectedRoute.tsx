"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useProtectedRoute(allowedRoles?: string[]) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (status === "loading" || !isClient) return;

    if (!session) {
      router.push("/auth/login");
      return;
    }

    if (allowedRoles && !allowedRoles.includes(session.user.role)) {
      router.push("/unauthorized");
    }
  }, [session, status, router, allowedRoles, isClient]);

  return { session, loading: status === "loading" || !isClient };
}

export function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles?: string[]; 
}) {
  const { loading } = useProtectedRoute(allowedRoles);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
      </div>
    );
  }

  return <>{children}</>;
}