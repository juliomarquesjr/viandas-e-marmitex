"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useProtectedCustomer() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (status === "loading" || !isClient) return;

    if (!session) {
      router.push("/customer/login");
      return;
    }

    // Verificar se é uma sessão de cliente (tem customerId)
    const user = session.user as any;
    if (!user || !user.customerId) {
      router.push("/unauthorized");
    }
  }, [session, status, router, isClient]);

  return { 
    session, 
    loading: status === "loading" || !isClient,
    isCustomer: session && (session.user as any)?.customerId
  };
}

export function ProtectedCustomerRoute({ 
  children 
}: { 
  children: React.ReactNode; 
}) {
  const { loading } = useProtectedCustomer();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
      </div>
    );
  }

  return <>{children}</>;
}

