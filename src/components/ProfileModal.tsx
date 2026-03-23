"use client";

import { useState, useEffect, useCallback } from 'react';
import { X, Save, User, Mail, Phone, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { MedicalStaff } from '@/types';
import { getMeAction, updateSelfAction } from '@/app/staff-actions';
import { toast } from 'sonner';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const [user, setUser] = useState<MedicalStaff | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        systemName: '',
        email: '',
        phone: '',
        username: '',
        password: '',
        confirmPassword: ''
    });

    const fetchUser = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getMeAction();
            if (result.success && result.user) {
                setUser(result.user as MedicalStaff);
                setFormData({
                    fullName: result.user.fullName || '',
                    systemName: result.user.systemName || '',
                    email: result.user.email || '',
                    phone: result.user.phone || '',
                    username: result.user.username || '',
                    password: '',
                    confirmPassword: ''
                });
            } else {
                toast.error(result.error || 'Erro ao carregar perfil');
                onClose();
            }
        } catch (error) {
            console.error('Failed to fetch user:', error);
        } finally {
            setLoading(false);
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            fetchUser();
        }
    }, [isOpen, fetchUser]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.password && formData.password !== formData.confirmPassword) {
            toast.error('As senhas não coincidem');
            return;
        }

        setSaving(true);
        try {
            const updateData: Partial<MedicalStaff> = {
                fullName: formData.fullName,
                systemName: formData.systemName,
                email: formData.email,
                phone: formData.phone,
                username: formData.username
            };

            if (formData.password) {
                updateData.password = formData.password;
            }

            const result = await updateSelfAction(updateData);
            if (result.success) {
                toast.success('Perfil atualizado com sucesso!');
                onClose();
            } else {
                toast.error(result.error || 'Erro ao atualizar perfil');
            }
        } catch (error) {
            toast.error('Ocorreu um erro ao salvar');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
            
            <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-[#0a1f44] p-8 text-white relative">
                    <button 
                        onClick={onClose}
                        title="Fechar modal"
                        className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                            <User size={32} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">Meu Perfil</h2>
                            <p className="text-blue-200/60 text-xs font-bold uppercase tracking-widest mt-1">
                                {user?.type === 'admin' ? 'Administrador' : user?.type === 'preceptor' ? 'Médico Preceptor' : 'Médico Residente'}
                            </p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Carregando dados...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {/* Dados Básicos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label htmlFor="fullName" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                                <div className="relative group">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input 
                                        id="fullName"
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        placeholder="Nome completo"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-800"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label htmlFor="systemName" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome de Exibição</label>
                                <input 
                                    id="systemName"
                                    type="text"
                                    name="systemName"
                                    value={formData.systemName}
                                    onChange={handleChange}
                                    placeholder="Ex: DR. SILVA"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-800"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="username" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Usuário / Login</label>
                                <input 
                                    id="username"
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Usuário"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-800"
                                    required
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="email" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-mail</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input 
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="email@exemplo.com"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="phone" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Telefone</label>
                                <div className="relative group">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input 
                                        id="phone"
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="(00) 00000-0000"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-800"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Alterar Senha */}
                        <div className="pt-6 border-t border-slate-100 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Lock size={16} className="text-slate-400" />
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alterar Senha (Opcional)</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative group">
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Nova senha"
                                        title="Nova senha"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-800"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        title={showPassword ? "Esconder senha" : "Mostrar senha"}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirmar nova senha"
                                    title="Confirmar nova senha"
                                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl focus:ring-2 outline-none transition-all font-semibold text-slate-800 ${
                                        formData.confirmPassword 
                                            ? formData.password === formData.confirmPassword 
                                                ? 'border-emerald-200 focus:ring-emerald-500/20 focus:border-emerald-500' 
                                                : 'border-rose-200 focus:ring-rose-500/20 focus:border-rose-500'
                                            : 'border-slate-100 focus:ring-blue-500/20 focus:border-blue-500'
                                    }`}
                                />
                            </div>
                            {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                                    <AlertCircle size={12} /> As senhas não conferem
                                </p>
                            )}
                        </div>

                        {/* Footer Buttons */}
                        <div className="pt-4 flex gap-3">
                            <button 
                                type="button"
                                onClick={onClose}
                                title="Cancelar alterações"
                                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                disabled={saving}
                                title="Salvar alterações de perfil"
                                className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Salvar Alterações
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
