"use client";

import { motion } from "framer-motion";
import { Loader2, Shield } from "lucide-react";
import Image from "next/image";

export default function RedirectPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50/90 overflow-hidden relative">
      {/* Background decorativo - blobs animados */}
      <div
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-[0.08] animate-blob"
        style={{
          background: "radial-gradient(circle, #3b82f6, #60a5fa)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-[480px] h-[480px] rounded-full opacity-[0.06] animate-blob animation-delay-4000"
        style={{
          background: "radial-gradient(circle, #38bdf8, #60a5fa)",
        }}
      />
      <div
        className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-[0.05] animate-blob animation-delay-2000"
        style={{
          background: "radial-gradient(circle, #60a5fa, #818cf8)",
        }}
      />

      {/* Padrão de grade sutil */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Conteúdo central */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4">
        {/* Logo com halo e animação */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="relative inline-block">
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-40"
              style={{
                background: "radial-gradient(circle, #3b82f6, #6366f1)",
              }}
            />
            <Image
              src="/img/icon.png"
              alt="Comida Caseira"
              width={96}
              height={96}
              className="relative rounded-full shadow-2xl"
              priority
            />
          </div>
        </motion.div>

        {/* Título e descrição */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
            style={{
              background: "linear-gradient(90deg, #0f172a 0%, #2563eb 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Comida Caseira
          </h1>
          <p className="text-slate-500 text-sm italic font-medium">
            Sabor que aquece o coração
          </p>
        </motion.div>

        {/* Card de redirecionamento */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-sm"
        >
          <div className="rounded-2xl border border-slate-200/90 bg-white/95 shadow-xl shadow-slate-200/50 backdrop-blur-sm p-6 sm:p-8">
            {/* Loader animado */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                {/* Anéis concêntricos animados */}
                <motion.div
                  animate={{ scale: [1, 1.4, 1.8], opacity: [0.8, 0.4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full bg-blue-100"
                />
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.3, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full bg-blue-200"
                />
                <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              </div>

              {/* Texto de redirecionamento */}
              <div className="text-center space-y-1.5">
                <p className="text-slate-700 font-semibold text-base">
                  Redirecionando para o login...
                </p>
                <p className="text-slate-400 text-xs">
                  Aguarde um momento
                </p>
              </div>

              {/* Barra de progresso animada */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer com status de segurança */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="mt-6 flex items-center gap-2 text-slate-400 text-xs"
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Conexão segura e criptografada</span>
        </motion.div>

        {/* Indicador de status online */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="mt-2 flex items-center gap-1.5 text-slate-400 text-xs"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Sistema online</span>
        </motion.div>
      </div>
    </div>
  );
}
