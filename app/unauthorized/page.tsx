"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { signOut } from "next-auth/react";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">Acesso Negado</CardTitle>
          <CardDescription>
            Você não tem permissão para acessar esta página
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-red-50 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-700">
                Seu perfil de usuário não tem as permissões necessárias para acessar esta funcionalidade.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => router.back()}
              variant="outline"
            >
              Voltar
            </Button>
            <Button 
              onClick={() => router.push("/admin")}
            >
              Ir para o Dashboard
            </Button>
            <Button 
              variant="ghost"
              onClick={() => signOut()}
            >
              Sair do Sistema
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}