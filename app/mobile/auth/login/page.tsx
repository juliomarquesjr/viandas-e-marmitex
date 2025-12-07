"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ChefHat, ArrowRight, Mail, Lock } from "lucide-react";
import Link from "next/link";

export default function MobileLoginPage() {
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/mobile/dashboard";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/mobile/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ login, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Falha no login");
            }

            // Sucesso! O cookie já foi definido pela API
            router.push(callbackUrl);
            router.refresh(); // Atualiza para aplicar o estado de autenticação
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro ao fazer login.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header com visual acolhedor */}
            <div className="bg-gradient-to-b from-orange-500 to-amber-500 px-6 pt-12 pb-24 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/food.png')]"></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl mb-4 shadow-inner">
                        <ChefHat className="h-12 w-12 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo!</h1>
                    <p className="text-orange-100 text-sm max-w-[200px]">
                        Entre para pedir suas refeições favoritas
                    </p>
                </div>
            </div>

            {/* Formulário de Login */}
            <div className="flex-1 px-6 -mt-16 relative z-20">
                <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6 border border-orange-100">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 ml-1">Email ou Telefone</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <input
                                    type="text"
                                    value={login}
                                    onChange={(e) => setLogin(e.target.value)}
                                    placeholder="ex: 11999999999"
                                    className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all text-gray-800 placeholder:text-gray-400"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-medium text-gray-700">Senha</label>
                                <Link
                                    href="/mobile/auth/forgot-password"
                                    className="text-xs text-orange-600 font-medium hover:text-orange-700"
                                >
                                    Esqueceu?
                                </Link>
                            </div>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-14 pl-12 pr-12 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all text-gray-800 placeholder:text-gray-400"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    Entrar
                                    <ArrowRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-100"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-white px-4 text-xs text-gray-400 uppercase tracking-wider">Ou</span>
                        </div>
                    </div>

                    <Link
                        href="/mobile/auth/register"
                        className="w-full h-14 bg-white border-2 border-orange-100 text-orange-600 font-bold rounded-2xl hover:bg-orange-50 transition-colors flex items-center justify-center"
                    >
                        Criar nova conta
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 text-center mt-auto">
                <p className="text-xs text-gray-400">
                    © {new Date().getFullYear()} Viandas & Marmitex
                </p>
            </div>
        </div>
    );
}
