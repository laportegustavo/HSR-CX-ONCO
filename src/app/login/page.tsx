"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    Lock, User, 
    Eye, EyeOff, 
    ChevronRight, Loader2, Info
} from "lucide-react";
import Image from "next/image";
import { validateLoginAction, recoverPasswordAction } from "../staff-actions";

// type UserRole... (removed as it's now database-driven)

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    // const [selectedRole, setSelectedRole] = useState<UserRole>('Médico Preceptor');
    const [isMounted, setIsMounted] = useState(false);
    const [role, setRole] = useState('Residente'); 
    const [isForgotMode, setIsForgotMode] = useState(false); 
    const [recoverUsername, setRecoverUsername] = useState(''); // New state for recovery username
    const [recoverRole, setRecoverRole] = useState('Residente'); // New state for recovery role
    const [recoveryMessage, setRecoveryMessage] = useState(""); // Re-added for recovery messages
    const [recoveryError, setRecoveryError] = useState(""); // Re-added for recovery errors
    const [recoverLoading, setRecoverLoading] = useState(false); // New state for recovery loading

    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const result = await validateLoginAction(username, password, role);
            if (result.success) {
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + 7);
                
                document.cookie = `auth=true; path=/; expires=${expiry.toUTCString()}`;
                document.cookie = `role=${result.user?.role}; path=/; expires=${expiry.toUTCString()}`;
                document.cookie = `username=${encodeURIComponent(username)}; path=/; expires=${expiry.toUTCString()}`;
                document.cookie = `fullname=${encodeURIComponent(result.user?.fullName || "")}; path=/; expires=${expiry.toUTCString()}`;
                document.cookie = `isSuperAdmin=${result.user?.isSuperAdmin}; path=/; expires=${expiry.toUTCString()}`;
                
                if (result.user?.role?.includes("Administrador")) {
                    router.push("/admin");
                } else {
                    router.push("/");
                }
            } else {
                setError(result.error || 'Erro ao entrar');
            }
        } catch (err) {
            console.error(err);
            setError('Erro de conexão');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRecover = async (e: React.FormEvent) => {
        e.preventDefault();
        setRecoverLoading(true);
        setRecoveryMessage('');
        setRecoveryError('');

        try {
            const result = await recoverPasswordAction(recoverUsername, recoverRole);
            if (result.success) {
                setRecoveryMessage(result.message || 'Senha enviada com sucesso');
            } else {
                setRecoveryError(result.error || 'Erro ao recuperar senha');
            }
        } catch (err) {
            console.error(err);
            setRecoveryError('Erro de conexão');
        } finally {
            setRecoverLoading(false);
        }
    };

    /* 
    const roles: { id: UserRole, icon: LucideIcon, label: string, color: string }[] = ...
    */

    if (!isMounted) return null;

    return (
        <div className="min-h-screen bg-[#0a1f44] flex flex-col items-center justify-center p-4 overflow-hidden relative">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#d4af37]/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] pointer-events-none" />
            
            <div className={`w-full max-w-[480px] z-10 transition-all duration-1000 transform ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                <div className="flex flex-col items-center mb-10 text-center scale-90 sm:scale-100">
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] mb-8 transform transition-all hover:scale-105 hover:rotate-2 duration-500 border border-white/20">
                        <div className="flex flex-col items-center mb-8">
                            <div className="relative w-32 h-32 mb-4">
                                <Image
                                    src="/logo-hsr.jpeg"
                                    alt="HSR Logo"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <h1 className="text-3xl font-bold text-[#0a1f44] tracking-tight">
                                HSR - SUS CX-ONCO
                            </h1>
                            <p className="text-slate-500 font-medium">Controle de Fila Cirúrgica</p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <div className="h-px w-8 bg-blue-500/30" />
                            <p className="text-blue-400/60 text-[10px] font-black uppercase tracking-[0.25em]">
                                Surgery Queue Management
                            </p>
                            <div className="h-px w-8 bg-blue-500/30" />
                        </div>
                    </div>
                </div>

                <div className="bg-white/95 backdrop-blur-xl rounded-[3rem] p-8 sm:p-12 shadow-[0_30px_100px_rgba(0,0,0,0.4)] border border-white/40 ring-1 ring-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#0a1f44] via-[#d4af37] to-[#0a1f44]" />
                    
                    <div className="mb-10 text-center sm:text-left">
                        <h2 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-2">
                            {isForgotMode ? "Recuperar Senha" : "Bem-vindo"} <span className="animate-bounce">👋</span>
                        </h2>
                        <p className="text-slate-500 font-semibold text-sm">
                            {isForgotMode ? "Informe seu usuário para receber uma nova senha." : ""}
                        </p>
                    </div>

                    {/* Role Selection removed */}

                    <form onSubmit={isForgotMode ? handleRecover : handleSubmit} className="space-y-6">
                        {!isForgotMode && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Acesso</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full bg-slate-50/50 border-2 border-slate-100 focus:border-blue-500/30 focus:bg-white p-5 rounded-2xl outline-none text-slate-800 font-bold transition-all shadow-sm focus:shadow-[0_0_20px_rgba(37,99,235,0.1)]"
                                    required
                                    disabled={isLoading}
                                >
                                    <option value="Médico Residente">Médico Residente</option>
                                    <option value="Médico Preceptor">Médico Preceptor</option>
                                    <option value="Administrador">Administrador</option>
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="username" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Identificação</label>
                            <div className="relative group/input">
                                <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-all duration-300 ${isForgotMode ? recoverUsername ? 'text-blue-600 scale-110' : 'text-slate-300 group-focus-within/input:text-blue-500' : username ? 'text-blue-600 scale-110' : 'text-slate-300 group-focus-within/input:text-blue-500'}`}>
                                    <User size={20} strokeWidth={2.5} />
                                </div>
                                <input
                                    type="text"
                                    id="username"
                                    value={isForgotMode ? recoverUsername : username}
                                    onChange={(e) => isForgotMode ? setRecoverUsername(e.target.value) : setUsername(e.target.value)}
                                    autoComplete={isForgotMode ? "email" : "username"}
                                    className="w-full bg-slate-50/50 border-2 border-slate-100 focus:border-blue-500/30 focus:bg-white p-5 pl-14 rounded-2xl outline-none text-slate-800 font-bold transition-all shadow-sm focus:shadow-[0_0_20px_rgba(37,99,235,0.1)] placeholder:text-slate-300"
                                    placeholder="Usuário ou E-mail"
                                    required
                                    disabled={isLoading || recoverLoading}
                                />
                            </div>
                        </div>

                        {isForgotMode && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Perfil</label>
                                <select
                                    value={recoverRole}
                                    onChange={(e) => setRecoverRole(e.target.value)}
                                    className="w-full bg-slate-50/50 border-2 border-slate-100 focus:border-blue-500/30 focus:bg-white p-5 rounded-2xl outline-none text-slate-800 font-bold transition-all shadow-sm focus:shadow-[0_0_20px_rgba(37,99,235,0.1)]"
                                    required
                                    disabled={isLoading || recoverLoading}
                                >
                                    <option value="Médico Residente">Médico Residente</option>
                                    <option value="Médico Preceptor">Médico Preceptor</option>
                                    <option value="Administrador">Administrador</option>
                                </select>
                            </div>
                        )}

                        {!isForgotMode && (
                            <div className="space-y-2">
                                <label htmlFor="password" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Chave de Segurança</label>
                                <div className="relative group/input">
                                    <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-all duration-300 ${password ? 'text-blue-600 scale-110' : 'text-slate-300 group-focus-within/input:text-blue-500'}`}>
                                        <Lock size={20} strokeWidth={2.5} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                        className="w-full bg-slate-50/50 border-2 border-slate-100 focus:border-blue-500/30 focus:bg-white p-5 pl-14 pr-14 rounded-2xl outline-none text-slate-800 font-bold transition-all shadow-sm focus:shadow-[0_0_20px_rgba(37,99,235,0.1)] placeholder:text-slate-300 tracking-[0.2em]"
                                        placeholder="••••••••"
                                        required
                                        disabled={isLoading}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors p-1"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && !isForgotMode && (
                            <div className="bg-rose-50 text-rose-600 text-[11px] font-bold p-4 rounded-2xl border border-rose-100 animate-shake flex items-center gap-3">
                                <div className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-pulse shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[#d4af37] hover:bg-[#c5a059] disabled:bg-[#d4af37]/50 text-[#0a1f44] p-5 rounded-[2rem] font-black text-lg transition-all shadow-[0_15px_30px_rgba(212,175,55,0.3)] hover:shadow-[0_20px_40px_rgba(212,175,55,0.4)] active:scale-[0.97] flex items-center justify-center gap-3 group relative overflow-hidden"
                        >
                            {isLoading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                <>
                                    <span>{isForgotMode ? "Solicitar Nova Senha" : "Acessar Dashboard"}</span>
                                    <div className="bg-white/20 p-1 rounded-full group-hover:translate-x-1 group-hover:bg-white/30 transition-all">
                                        <ChevronRight size={18} />
                                    </div>
                                </>
                            )}
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsForgotMode(!isForgotMode);
                                    setError("");
                                    setRecoveryError("");
                                    setRecoveryMessage("");
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-bold transition-colors"
                            >
                                {isForgotMode ? "Voltar ao Login" : "Esqueceu sua senha?"}
                            </button>
                        </div>
                    </form>

                    {isForgotMode && (
                        <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                            <Info size={20} className="text-blue-500 shrink-0" />
                            <p className="text-[10px] text-blue-700 leading-relaxed font-semibold">
                                A nova senha será enviada para o e-mail cadastrado no sistema.
                            </p>
                        </div>
                    )}

                    {(recoveryMessage || recoveryError) && (
                        <div className={`mt-4 p-4 rounded-2xl border flex items-center gap-3 ${recoveryMessage ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'} animate-shake`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${recoveryMessage ? 'bg-emerald-600' : 'bg-rose-600'} shrink-0`} />
                            <p className="text-[11px] font-bold">{recoveryMessage || recoveryError}</p>
                        </div>
                    )}

                    <div className="mt-12 text-center pt-8 border-t border-slate-100/50">
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
                            Gustavo Andreazza Laporte - Todos direitos reservados
                        </p>
                    </div>
                </div>
                
                <div className="mt-12 text-center space-y-2">
                    <p className="text-[#d4af37]/50 text-[10px] font-black uppercase tracking-[0.4em]">
                        HSR - SUS CX-ONCO
                    </p>
                    <div className="flex items-center justify-center gap-4 text-[9px] font-bold text-blue-500/20 uppercase tracking-widest">
                        <span>Segurança SSL</span>
                        <div className="w-1 h-1 bg-current rounded-full" />
                        <span>v2.5.0 (2026) - Atualizado em 21/03/2026 12:15</span>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-4px); }
                    40%, 80% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
                }
                ::placeholder {
                    letter-spacing: normal !important;
                }
            `}</style>
        </div>
    );
}
