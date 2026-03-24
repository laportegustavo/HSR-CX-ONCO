"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Users, UserPlus, Trash2, Save, ArrowLeft, 
    Stethoscope, ShieldCheck, Contact, Plus, UserCircle,
    Layers, ArrowUp, ArrowDown, TrendingUp, Loader2,
    Cloud, Lock, Database, CheckCircle2, AlertCircle, X
} from 'lucide-react';
import { MedicalStaff, Patient } from '@/types';
import { getStaffAction, createStaffAction, updateStaffAction, deleteStaffAction, getAccessLogsAction } from '../staff-actions';
import { getPatientChangeLogsAction, getPatientsAction, deletePatientAction, recalculateAllPositionsAction } from "../actions";
import DashboardStats from "@/components/DashboardStats";
import { getConfig, addTeamAction, deleteTeamAction, addSystemAction, deleteSystemAction, updateTeamAction, updateSystemAction, addHospitalAction, deleteHospitalAction, updateHospitalAction } from '../config-actions';
import PatientModal from '@/components/PatientModal';
import FieldManager from '@/components/FieldManager';
import Image from 'next/image';
import { exportPatientsToExcel, downloadBackupAsJson, downloadBackupAsExcel } from '@/utils/export-utils';

export default function AdminDashboard() {
    const [staff, setStaff] = useState<MedicalStaff[]>([]);
    const [config, setConfig] = useState<{ teams: string[], systems: string[], hospitals: string[] }>({ teams: [], systems: [], hospitals: [] });
    const [loading, setLoading] = useState(true);
    const [newTeam, setNewTeam] = useState("");
    const [newSystem, setNewSystem] = useState("");
    const [newHospital, setNewHospital] = useState("");
    const [activeTab, setActiveTab] = useState<'staff' | 'config' | 'patients' | 'acessos' | 'fields' | 'stats' | 'settings'>('stats');
    const [userRole, setUserRole] = useState<string>('');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [accessLogs, setAccessLogs] = useState<{ timestamp: string, username: string, role: string }[]>([]);
    const [changeLogs, setChangeLogs] = useState<{ timestamp: string, user: string, patientId: string, patientName: string, field: string, oldValue: string, newValue: string }[]>([]);
    const [auditSubTab, setAuditSubTab] = useState<'access' | 'changes'>('access');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
    const [formData, setFormData] = useState<Omit<MedicalStaff, 'id'>>({
        fullName: '',
        crm: '',
        systemName: '',
        phone: '',
        email: '',
        type: 'preceptor',
        username: '',
        password: ''
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingTeam, setEditingTeam] = useState<string | null>(null);
    const [editingSystem, setEditingSystem] = useState<string | null>(null);
    const [editingHospital, setEditingHospital] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [staffSort, setStaffSort] = useState<{ key: keyof MedicalStaff, dir: 'asc' | 'desc' }>({ key: 'systemName', dir: 'asc' });
    const [patientSort, setPatientSort] = useState<{ key: keyof Patient, dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });
    const [teamSortDir, setTeamSortDir] = useState<'asc' | 'desc'>('asc');
    const [systemSortDir, setSystemSortDir] = useState<'asc' | 'desc'>('asc');
    const [hospitalSortDir, setHospitalSortDir] = useState<'asc' | 'desc'>('asc');
    const [itemToDelete, setItemToDelete] = useState<{ 
        id: string, 
        name: string, 
        type: 'staff' | 'patient' | 'team' | 'system' | 'hospital' | 'recalculate' | 'update_team' | 'update_system' | 'update_hospital',
        actionValue?: string
    } | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const router = useRouter();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [staffData, configData, patientsData, logsData, changeLogsData] = await Promise.all([
                getStaffAction(), 
                getConfig(),
                getPatientsAction(), // Changed from getPatients() to getPatientsAction()
                getAccessLogsAction(),
                getPatientChangeLogsAction()
            ]);
            setStaff(staffData);
            setConfig(configData);
            setPatients(patientsData);
            setAccessLogs(logsData);
            setChangeLogs(changeLogsData);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        const checkAuth = async () => {
            const isAuth = document.cookie.includes('auth=true');
            const decodedCookie = decodeURIComponent(document.cookie);
            const isAdmin = decodedCookie.includes('role=Administrador');
            const isPreceptor = decodedCookie.includes('role=Médico Preceptor');
            
            if (!isAuth) {
                router.push('/login');
            } else if (!isAdmin && !isPreceptor) {
                router.push('/');
            } else {
                setUserRole(isAdmin ? 'Administrador' : 'Médico Preceptor');
                if (!isAdmin) {
                    setActiveTab('stats');
                } else {
                    setActiveTab('staff');
                }
                await fetchData();
            }
        };
        checkAuth();
    }, [router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let finalValue = value;

        if (name === 'phone') {
            const digits = value.replace(/\D/g, '').slice(0, 11);
            if (digits.length > 2) {
                finalValue = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}${digits.length > 7 ? `-${digits.slice(7)}` : ''}`;
            } else if (digits.length > 0) {
                finalValue = `(${digits}`;
            }
        }

        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.password && formData.password.trim() !== '' && (!formData.email || formData.email.trim() === '')) {
            alert('É obrigatório informar o e-mail quando uma senha é registrada (necessário para recuperação).');
            return;
        }

        try {
            const result = editingId 
                ? await updateStaffAction({ ...formData, id: editingId } as MedicalStaff)
                : await createStaffAction(formData);
                
            if (result.success) {
                // Clear form data first
                setFormData({
                    fullName: '',
                    crm: '',
                    systemName: '',
                    phone: '',
                    email: '',
                    type: 'preceptor',
                    username: '',
                    password: ''
                });
                setEditingId(null);
                
                // Refresh data
                await fetchData();
                
                // Notify user
                setMessage({ type: 'success', text: editingId ? 'Profissional atualizado com sucesso!' : 'Profissional cadastrado com sucesso!' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: result.error || 'Erro ao salvar profissional.' });
                setTimeout(() => setMessage(null), 5000);
            }
        } catch (error) {
            console.error('Error saving staff:', error);
            setMessage({ type: 'error', text: 'Erro ao salvar profissional.' });
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const handleAddTeam = async () => {
        if (!newTeam) return;
        await addTeamAction(newTeam);
        setNewTeam("");
        fetchData();
    };

    const handleAddSystem = async () => {
        if (!newSystem) return;
        await addSystemAction(newSystem);
        setNewSystem("");
        fetchData();
    };

    const handleDeleteTeam = async (team: string) => {
        setItemToDelete({ id: team, name: team, type: 'team' });
    };

    const handleDeleteSystem = async (system: string) => {
        setItemToDelete({ id: system, name: system, type: 'system' });
    };

    const handleAddHospital = async () => {
        if (newHospital.trim()) {
            await addHospitalAction(newHospital.trim());
            setNewHospital("");
            fetchData();
        }
    };

    const handleDeleteHospital = (hospital: string) => {
        setItemToDelete({ id: hospital, name: hospital, type: 'hospital' });
    };

    const handleEdit = (member: MedicalStaff) => {
        setFormData({
            fullName: member.fullName,
            crm: member.crm,
            systemName: member.systemName,
            phone: member.phone,
            email: member.email,
            type: member.type,
            username: member.username || '',
            password: member.password || ''
        });
        setEditingId(member.id);
        setActiveTab('staff');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string, name: string) => {
        setItemToDelete({ id, name, type: 'staff' });
    };

    const handleDeletePatient = async (id: string, name: string) => {
        setItemToDelete({ id, name, type: 'patient' });
    };

    const executeDeletion = async () => {
        if (!itemToDelete) return;
        setIsUpdating(true); // Bloqueia botões
        
        try {
            if (itemToDelete.type === 'staff') {
                await deleteStaffAction(itemToDelete.id);
            } else if (itemToDelete.type === 'patient') {
                await deletePatientAction(itemToDelete.id);
            } else if (itemToDelete.type === 'team') {
                await deleteTeamAction(itemToDelete.name);
            } else if (itemToDelete.type === 'system') {
                await deleteSystemAction(itemToDelete.name);
            } else if (itemToDelete.type === 'hospital') {
                await deleteHospitalAction(itemToDelete.name);
            } else if (itemToDelete.type === 'recalculate') {
                const result = await recalculateAllPositionsAction();
                if (!result.success) throw new Error("Erro ao recalcular");
            } else if (itemToDelete.type === 'update_team' && itemToDelete.actionValue) {
                await updateTeamAction(itemToDelete.id, itemToDelete.actionValue);
                setEditingTeam(null);
                setEditValue("");
                window.location.reload();
                return;
            } else if (itemToDelete.type === 'update_system' && itemToDelete.actionValue) {
                await updateSystemAction(itemToDelete.id, itemToDelete.actionValue);
                setEditingSystem(null);
                setEditValue("");
                window.location.reload();
                return;
            } else if (itemToDelete.type === 'update_hospital' && itemToDelete.actionValue) {
                await updateHospitalAction(itemToDelete.id, itemToDelete.actionValue);
                setEditingHospital(null);
                setEditValue("");
                window.location.reload();
                return;
            }
            
            await fetchData();
            setItemToDelete(null);
        } catch (error) {
            console.error("Erro na ação:", error);
            alert("Erro ao processar solicitação.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdateTeam = async (oldName: string) => {
        if (!editValue || editValue === oldName) {
            setEditingTeam(null);
            return;
        }
        setItemToDelete({ id: oldName, name: oldName, type: 'update_team', actionValue: editValue });
    };

    const handleUpdateSystem = async (oldName: string) => {
        console.log('Client: handleUpdateSystem', oldName, '->', editValue);
        if (!editValue || editValue === oldName) {
            setEditingSystem(null);
            return;
        }
        setItemToDelete({ id: oldName, name: oldName, type: 'update_system', actionValue: editValue });
    };


    const handleUpdateHospital = async (oldName: string) => {
        if (!editValue || editValue === oldName) {
            setEditingHospital(null);
            return;
        }
        setItemToDelete({ id: oldName, name: oldName, type: 'update_hospital', actionValue: editValue });
    };

    const handleRecalculatePositions = async () => {
        setItemToDelete({ id: 'recalc', name: 'TODAS as posições', type: 'recalculate' });
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-[#0a1f44] text-white p-6 shadow-lg">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => router.push('/')} 
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Voltar ao Dashboard"
                            aria-label="Voltar"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-1.5 rounded-xl shadow-lg w-10 h-10 sm:w-12 sm:h-12 relative flex-shrink-0">
                                <Image 
                                    src="/logo-hsr.jpeg"
                                    alt="HSR"
                                    fill
                                    className="object-contain p-0.5"
                                    priority
                                />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Painel Administrativo</h1>
                        </div>
                    </div>
                    {userRole === 'Administrador' && (
                        <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
                            <button 
                                onClick={() => {
                                    setFormData(prev => ({ ...prev, type: 'preceptor' }));
                                    setActiveTab('staff');
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95"
                            >
                                <Stethoscope size={18} />
                                <span className="hidden sm:inline">Novo Preceptor</span>
                            </button>
                            <button 
                                onClick={() => {
                                    setFormData(prev => ({ ...prev, type: 'resident' }));
                                    setActiveTab('staff');
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95"
                            >
                                <UserCircle size={18} />
                                <span className="hidden sm:inline">Novo Residente</span>
                            </button>
                            <button 
                                onClick={() => {
                                    setFormData(prev => ({ ...prev, type: 'admin' }));
                                    setActiveTab('staff');
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95"
                            >
                                <ShieldCheck size={18} />
                                <span className="hidden sm:inline">Novo Admin</span>
                            </button>
                            <button 
                                onClick={() => setIsPatientModalOpen(true)}
                                className="flex items-center gap-2 bg-[#d4af37] hover:bg-[#c5a059] text-[#0a1f44] px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95"
                            >
                                <Plus size={18} />
                                <span className="hidden sm:inline">Novo Paciente</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-8">
                {/* Tabs */}
                <div className="flex flex-wrap gap-4 mb-8">
                    {userRole === 'Administrador' && (
                        <>
                            <button 
                                onClick={() => setActiveTab('staff')}
                                title="Gerenciar Equipe Médica"
                                className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'staff' ? 'bg-[#d4af37] text-[#0a1f44] shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                            >
                                Equipe Médica
                            </button>
                            <button 
                                onClick={() => setActiveTab('patients')}
                                title="Gerenciar Todos os Pacientes"
                                className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'patients' ? 'bg-[#d4af37] text-[#0a1f44] shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                            >
                                Pacientes
                            </button>
                            <button 
                                onClick={() => setActiveTab('acessos')} 
                                className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'acessos' ? 'bg-[#d4af37] text-[#0a1f44] shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                            >
                                Auditoria
                            </button>
                            <button 
                                onClick={() => setActiveTab('settings')} 
                                className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'settings' ? 'bg-[#d4af37] text-[#0a1f44] shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                            >
                                Configurações
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'stats' ? 'bg-[#d4af37] text-[#0a1f44] shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                    >
                        Estatísticas
                    </button>
                </div>

                {message && (
                    <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
                        message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}>
                        {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <p className="text-xs font-black uppercase tracking-widest">{message.text}</p>
                        <button onClick={() => setMessage(null)} title="Fechar" className="ml-auto opacity-50 hover:opacity-100"><X size={18} /></button>
                    </div>
                )}

                <div className={activeTab === 'settings' ? "flex flex-col gap-8 max-w-4xl mx-auto w-full" : "grid grid-cols-1 lg:grid-cols-3 gap-8"}>
                    {loading ? (
                        <div className="lg:col-span-3 flex flex-col items-center justify-center py-20 animate-pulse">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                <Loader2 className="text-blue-600 animate-spin" size={24} />
                            </div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Carregando painel...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'stats' ? (
                                <div className="lg:col-span-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <DashboardStats patients={patients} activeTeams={config.teams} />
                                </div>
                            ) : activeTab === 'staff' ? (
                                <>
                                    <div className="lg:col-span-1">
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                            <div className="flex items-center gap-2 mb-6">
                                                <UserPlus className="text-blue-600" size={20} />
                                                <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Editar Profissional' : 'Novo Cadastro'}</h2>
                                            </div>
                                            <div className="flex gap-2 mb-6">
                                                <button 
                                                    onClick={() => setFormData(prev => ({ ...prev, type: 'preceptor' }))} 
                                                    title="Tipo: Preceptor"
                                                    className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${formData.type === 'preceptor' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                                                >
                                                    <Stethoscope size={24} />
                                                    <span className="text-[10px] font-bold uppercase">Preceptor</span>
                                                </button>
                                                <button 
                                                    onClick={() => setFormData(prev => ({ ...prev, type: 'resident' }))} 
                                                    title="Tipo: Residente"
                                                    className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${formData.type === 'resident' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                                                >
                                                    <UserCircle size={24} />
                                                    <span className="text-[10px] font-bold uppercase">Residente</span>
                                                </button>
                                                <button 
                                                    onClick={() => setFormData(prev => ({ ...prev, type: 'admin' }))} 
                                                    title="Tipo: Administrador"
                                                    className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${formData.type === 'admin' ? 'border-slate-800 bg-slate-100 text-slate-900' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                                                >
                                                    <ShieldCheck size={24} />
                                                    <span className="text-[10px] font-bold uppercase">Admin</span>
                                                </button>
                                            </div>
                                            <form onSubmit={handleSubmit} className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                                                    <input 
                                                        title="Nome completo"
                                                        type="text" 
                                                        name="fullName" 
                                                        value={formData.fullName} 
                                                        onChange={handleChange} 
                                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900" 
                                                        required 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label>
                                                    <input 
                                                        title="E-mail"
                                                        type="email" 
                                                        name="email" 
                                                        value={formData.email || ''} 
                                                        onChange={handleChange} 
                                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900" 
                                                        placeholder="email@exemplo.com"
                                                        required={formData.type === 'admin' || (formData.password?.length || 0) > 0}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome no Dashboard (Rótulo)</label>
                                                    <input 
                                                        title="Nome no sistema"
                                                        type="text" 
                                                        name="systemName" 
                                                        value={formData.systemName} 
                                                        onChange={handleChange} 
                                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900 font-semibold" 
                                                        placeholder="Ex: DR. SILVA"
                                                        required 
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CRM/RS (Opcional)</label>
                                                        <input 
                                                            title="CRM"
                                                            type="text" 
                                                            name="crm" 
                                                            value={formData.crm || ''} 
                                                            onChange={handleChange} 
                                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone (Opcional)</label>
                                                        <input 
                                                            title="Telefone"
                                                            type="tel" 
                                                            name="phone" 
                                                            value={formData.phone || ''} 
                                                            onChange={handleChange} 
                                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900" 
                                                        />
                                                    </div>
                                                </div>
                                                <div className="pt-4 border-t border-slate-100">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Acesso ao Sistema (Opcional)</p>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usuário</label>
                                                            <input 
                                                                title="Usuário"
                                                                type="text" 
                                                                name="username" 
                                                                value={formData.username || ''} 
                                                                onChange={handleChange} 
                                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900" 
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label>
                                                            <input 
                                                                title="Senha"
                                                                type="password" 
                                                                name="password" 
                                                                value={formData.password || ''} 
                                                                onChange={handleChange} 
                                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900" 
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    type="submit" 
                                                    title="Salvar profissional"
                                                    className={`w-full mt-4 flex items-center justify-center gap-2 text-[#0a1f44] py-3 rounded-xl font-bold shadow-md active:scale-95 ${editingId ? 'bg-[#c5a059]' : 'bg-[#d4af37]'}`}
                                                >
                                                    <Save size={18} />
                                                    {editingId ? 'Atualizar Dados' : 'Salvar Profissional'}
                                                </button>
                                                {editingId && (
                                                    <button 
                                                        type="button" 
                                                        title="Cancelar edição"
                                                        onClick={() => { setEditingId(null); setFormData({ fullName: '', crm: '', systemName: '', phone: '', email: '', type: 'preceptor', username: '', password: '' }); }} 
                                                        className="w-full mt-2 text-[10px] font-bold text-slate-400 uppercase"
                                                    >
                                                        Cancelar Edição
                                                    </button>
                                                )}
                                            </form>
                                        </div>
                                    </div>
                                    <div className="lg:col-span-2">
                                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="h-14 flex items-center justify-between px-4 lg:px-8 bg-slate-50/30">
                                        <div className="flex items-center gap-2">
                                            <Users className="text-blue-600" size={20} />
                                            <h2 className="text-lg font-bold text-slate-800">Equipe Médica</h2>
                                        </div>
                                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">{staff.length} CADASTRADOS</span>
                                    </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                                                        <tr>
                                                            <th 
                                                                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                                                onClick={() => setStaffSort({ key: 'systemName', dir: staffSort.key === 'systemName' && staffSort.dir === 'asc' ? 'desc' : 'asc' })}
                                                            >
                                                                <div className="flex items-center gap-1">
                                                                    Profissional
                                                                    {staffSort.key === 'systemName' && (staffSort.dir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                                                                </div>
                                                            </th>
                                                            <th 
                                                                className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                                                onClick={() => setStaffSort({ key: 'crm', dir: staffSort.key === 'crm' && staffSort.dir === 'asc' ? 'desc' : 'asc' })}
                                                            >
                                                                <div className="flex items-center gap-1">
                                                                    CRM
                                                                    {staffSort.key === 'crm' && (staffSort.dir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                                                                </div>
                                                            </th>
                                                            <th className="px-6 py-4 text-center">Ações</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {loading ? <tr><td colSpan={3} className="p-12 text-center">Carregando...</td></tr> : [...staff].sort((a, b) => {
                                                            const valA = String(a[staffSort.key] || "").toLowerCase();
                                                            const valB = String(b[staffSort.key] || "").toLowerCase();
                                                            return staffSort.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                                                        }).map((member) => (
                                                            <tr 
                                                                key={member.id} 
                                                                className="hover:bg-slate-50 cursor-pointer"
                                                                onClick={() => handleEdit(member)}
                                                            >
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`p-2 rounded-lg ${
                                                                            member.type === 'preceptor' ? 'bg-indigo-100 text-indigo-600' : 
                                                                            member.type === 'resident' ? 'bg-emerald-100 text-emerald-600' :
                                                                            'bg-slate-100 text-slate-600'
                                                                        }`}>
                                                                            {member.type === 'preceptor' ? <Stethoscope size={18} /> : 
                                                                             member.type === 'resident' ? <Contact size={18} /> :
                                                                             <ShieldCheck size={18} />}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-bold text-slate-800">{member.systemName}</p>
                                                                            <p className="text-[10px] text-slate-500 uppercase">{member.fullName}</p>
                                                                            {member.email && <p className="text-[9px] text-blue-500 lowercase mt-0.5">{member.email}</p>}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-sm">{member.crm}</td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                        <button onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleEdit(member);
                                                                        }} title="Editar" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><UserCircle size={18} /></button>
                                                                        <button onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDelete(member.id, member.systemName);
                                                                        }} title="Excluir" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : activeTab === 'patients' ? (
                                <div className="lg:col-span-3">
                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                        <div className="p-6 border-b flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Users className="text-blue-600" size={20} />
                                                <h2 className="text-lg font-bold text-slate-800">Gerenciamento de Pacientes</h2>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => exportPatientsToExcel(patients)}
                                                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
                                                    title="Baixar lista completa em Excel"
                                                >
                                                    <Layers size={16} />
                                                    Exportar Excel
                                                </button>
                                                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">{patients.length} PACIENTES</span>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                                                    <tr>
                                                        <th 
                                                            className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                                            onClick={() => setPatientSort({ key: 'name', dir: patientSort.key === 'name' && patientSort.dir === 'asc' ? 'desc' : 'asc' })}
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                Nome do Paciente
                                                                {patientSort.key === 'name' && (patientSort.dir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                                                            </div>
                                                        </th>
                                                        <th 
                                                            className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                                            onClick={() => setPatientSort({ key: 'medicalRecord', dir: patientSort.key === 'medicalRecord' && patientSort.dir === 'asc' ? 'desc' : 'asc' })}
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                Prontuário
                                                                {patientSort.key === 'medicalRecord' && (patientSort.dir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                                                            </div>
                                                        </th>
                                                        <th 
                                                            className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                                            onClick={() => setPatientSort({ key: 'team', dir: patientSort.key === 'team' && patientSort.dir === 'asc' ? 'desc' : 'asc' })}
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                Equipe
                                                                {patientSort.key === 'team' && (patientSort.dir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                                                            </div>
                                                        </th>
                                                        <th className="px-6 py-4 text-center">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {loading ? (
                                                        <tr><td colSpan={4} className="p-12 text-center">Carregando...</td></tr>
                                                    ) : (
                                                        [...patients].sort((a, b) => {
                                                            const valA = String(a[patientSort.key] || "").toLowerCase();
                                                            const valB = String(b[patientSort.key] || "").toLowerCase();
                                                            return patientSort.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                                                        }).map((p) => (
                                                            <tr 
                                                                key={p.id} 
                                                                className="hover:bg-slate-50 transition-colors cursor-pointer"
                                                                onClick={() => {
                                                                    setSelectedPatient(p);
                                                                    setIsPatientModalOpen(true);
                                                                }}
                                                            >
                                                                <td className="px-6 py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-bold text-slate-800">{p.name}</span>
                                                                        <span className="text-[10px] text-slate-400 font-mono italic">{p.cpf}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-sm text-slate-600">{p.medicalRecord}</td>
                                                                <td className="px-6 py-4 text-xs font-bold text-blue-600 uppercase">{p.team}</td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeletePatient(p.id, p.name);
                                                                        }} 
                                                                        title="Excluir Paciente" 
                                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : activeTab === 'acessos' ? (
                                <div className="lg:col-span-3 space-y-4">
                                    <div className="flex gap-2 mb-2">
                                        <button 
                                            onClick={() => setAuditSubTab('access')}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${auditSubTab === 'access' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            Logins e Ações Gerais
                                        </button>
                                        <button 
                                            onClick={() => setAuditSubTab('changes')}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${auditSubTab === 'changes' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            Alterações de Pacientes (Detalhado)
                                        </button>
                                    </div>

                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                        {auditSubTab === 'access' ? (
                                            <>
                                                <div className="p-6 border-b font-bold text-slate-800 bg-slate-50 flex items-center justify-between">
                                                    Histórico de Acessos e Ações
                                                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">{accessLogs.length} REGISTROS</span>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                                                            <tr>
                                                                <th className="px-6 py-4">Data e Hora</th>
                                                                <th className="px-6 py-4">Usuário</th>
                                                                <th className="px-6 py-4">Ação / Nível</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {loading ? (
                                                                <tr><td colSpan={3} className="p-12 text-center">Carregando...</td></tr>
                                                            ) : accessLogs.length === 0 ? (
                                                                <tr><td colSpan={3} className="p-12 text-center text-slate-500">Nenhum registro encontrado.</td></tr>
                                                            ) : (
                                                                accessLogs.map((log, i) => (
                                                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                                        <td className="px-6 py-4 text-xs font-mono text-slate-600">{log.timestamp}</td>
                                                                        <td className="px-6 py-4 text-sm font-bold text-slate-800">{log.username}</td>
                                                                        <td className="px-6 py-4">
                                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                                log.role.includes('CRIOU PACIENTE') ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                                                                log.role.includes('EDITOU PACIENTE') ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                                                log.role.includes('EXCLUIU PACIENTE') ? 'bg-red-100 text-red-700 border border-red-200' :
                                                                                log.role === 'ACEITE LGPD' ? 'bg-rose-100 text-rose-700' :
                                                                                log.role === 'Administrador' ? 'bg-slate-800 text-white' :
                                                                                'bg-indigo-100 text-indigo-700'
                                                                            }`}>
                                                                                {log.role}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-6 border-b font-bold text-slate-800 bg-slate-50 flex items-center justify-between">
                                                    Histórico Detalhado de Alterações
                                                    <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-bold">{changeLogs.length} ALTERAÇÕES</span>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                                                            <tr>
                                                                <th className="px-6 py-4">Data/Hora</th>
                                                                <th className="px-6 py-4">Usuário</th>
                                                                <th className="px-6 py-4">Paciente</th>
                                                                <th className="px-6 py-4">Campo</th>
                                                                <th className="px-6 py-4">De</th>
                                                                <th className="px-6 py-4">Para</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {loading ? (
                                                                <tr><td colSpan={6} className="p-12 text-center">Carregando...</td></tr>
                                                            ) : changeLogs.length === 0 ? (
                                                                <tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhuma alteração detalhada registrada.</td></tr>
                                                            ) : (
                                                                changeLogs.map((log, i) => (
                                                                    <tr key={i} className="hover:bg-slate-50 transition-colors text-xs">
                                                                        <td className="px-6 py-4 font-mono text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                                                                        <td className="px-6 py-4 font-bold text-slate-700">{log.user}</td>
                                                                        <td className="px-6 py-4 text-blue-600 font-semibold">{log.patientName}</td>
                                                                        <td className="px-6 py-4 uppercase font-bold text-[10px] text-slate-500">{log.field}</td>
                                                                        <td className="px-6 py-4 text-rose-500 line-through max-w-[150px] truncate" title={log.oldValue}>{log.oldValue || '-'}</td>
                                                                        <td className="px-6 py-4 text-emerald-600 font-bold max-w-[150px] truncate" title={log.newValue}>{log.newValue || '-'}</td>
                                                                    </tr>
                                                                ))
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : activeTab === 'settings' ? (
                                <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Header da Aba */}
                                    <div className="flex flex-col gap-2">
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Configurações do Sistema</h2>
                                        <p className="text-sm text-slate-500 font-medium">Gerencie a infraestrutura, membros da equipe e campos personalizados.</p>
                                    </div>

                                    <div className="flex flex-col gap-6">
                                        {/* Card: Status da Conexão */}
                                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between group hover:shadow-md transition-all gap-4">
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                                                    <Cloud size={32} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Google Sheets API</h3>
                                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Online</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">Sincronização em tempo real ativa. Todos os dados estão protegidos na nuvem.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card: Segurança & Backup */}
                                        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700 rotate-12">
                                                <Lock size={120} className="text-white" />
                                            </div>
                                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
                                                            <ShieldCheck size={22} />
                                                        </div>
                                                        <h3 className="text-xl font-black text-white tracking-tight">Cloud Backup (Snapshot)</h3>
                                                    </div>
                                                    <p className="text-sm text-slate-400 font-medium max-w-md">Gere um arquivo com 100% dos dados para segurança redundante ou migrações.</p>
                                                    
                                                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 bg-white/5 p-3 rounded-2xl border border-white/5 inline-flex w-fit">
                                                        <span className="flex items-center gap-1.5"><Database size={12} /> {patients.length} Pacientes</span>
                                                        <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                                        <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Criptografia SSL</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    <button 
                                                        onClick={() => downloadBackupAsJson(patients)}
                                                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-6 py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 group/btn whitespace-nowrap"
                                                    >
                                                        <Save size={20} className="group-hover/btn:rotate-12 transition-transform" />
                                                        Backup JSON
                                                    </button>
                                                    <button 
                                                        onClick={() => downloadBackupAsExcel(patients)}
                                                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-3 group/btn whitespace-nowrap"
                                                    >
                                                        <Save size={20} className="group-hover/btn:rotate-12 transition-transform" />
                                                        Backup Excel (.xls)
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Configurações em Fluxo Vertical (Coluna Única) */}
                                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                                                <Plus size={20} />
                                            </div>
                                            <h2 className="text-xl font-bold text-slate-800">Cadastrar Nova Equipe</h2>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input 
                                                title="Nome da equipe"
                                                type="text" 
                                                placeholder="DIGITE O NOME DA EQUIPE" 
                                                value={newTeam} 
                                                onChange={(e) => setNewTeam(e.target.value.toUpperCase())} 
                                                className="flex-1 p-4 bg-slate-50 border border-slate-200 text-black rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold tracking-wide" 
                                            />
                                            <button 
                                                onClick={handleAddTeam} 
                                                title="Adicionar Equipe" 
                                                className="bg-[#d4af37] text-[#0a1f44] px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#d4af37]/20 active:scale-95 transition-all"
                                            >
                                                Adicionar
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                        <div className="p-6 border-b font-black text-slate-800 bg-slate-50/50 flex items-center justify-between uppercase tracking-[0.1em] text-xs">
                                            <span>Equipes Ativas</span>
                                            <button 
                                                onClick={() => setTeamSortDir(teamSortDir === 'asc' ? 'desc' : 'asc')}
                                                className="p-2 hover:bg-slate-200 rounded-xl transition-colors bg-white border border-slate-200 shadow-sm"
                                                title="Ordenar Equipes"
                                            >
                                                {teamSortDir === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />}
                                            </button>
                                        </div>
                                        <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {[...config.teams].sort((a, b) => teamSortDir === 'asc' ? a.localeCompare(b) : b.localeCompare(a)).map(team => (
                                                <div key={team} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                                                    {editingTeam === team ? (
                                                        <div className="flex gap-3 w-full">
                                                            <input 
                                                                autoFocus
                                                                type="text" 
                                                                value={editValue} 
                                                                onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                                                                title="Editar nome da equipe"
                                                                className="flex-1 p-2 bg-white border-2 border-blue-400 text-slate-800 rounded-xl outline-none text-sm font-bold"
                                                                disabled={isUpdating}
                                                            />
                                                            <button onClick={() => handleUpdateTeam(team)} disabled={isUpdating} className="px-4 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase">Salvar</button>
                                                            <button onClick={() => setEditingTeam(null)} className="p-2 text-slate-400">X</button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span className="text-sm font-bold text-slate-700 tracking-wide uppercase">{team}</span>
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    onClick={() => { setEditingTeam(team); setEditValue(team); }} 
                                                                    title="Editar Equipe"
                                                                    aria-label="Editar Equipe"
                                                                    className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                                >
                                                                    <Save size={16} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteTeam(team)} 
                                                                    title="Excluir Equipe"
                                                                    aria-label="Excluir Equipe"
                                                                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                                                <Layers size={20} />
                                            </div>
                                            <h2 className="text-xl font-bold text-slate-800">Cadastrar Novo Local (Hospital)</h2>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input 
                                                title="Nome do local"
                                                type="text" 
                                                placeholder="DIGITE O NOME DO HOSPITAL" 
                                                value={newHospital} 
                                                onChange={(e) => setNewHospital(e.target.value.toUpperCase())} 
                                                className="flex-1 p-4 bg-slate-50 border border-slate-200 text-black rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold tracking-wide" 
                                            />
                                            <button 
                                                onClick={handleAddHospital} 
                                                title="Adicionar Local" 
                                                className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                                            >
                                                Adicionar
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                        <div className="p-6 border-b font-black text-slate-800 bg-slate-50/50 flex items-center justify-between uppercase tracking-[0.1em] text-xs">
                                            <span>Locais de Cirurgia Ativos</span>
                                            <button 
                                                onClick={() => setHospitalSortDir(hospitalSortDir === 'asc' ? 'desc' : 'asc')}
                                                className="p-2 hover:bg-slate-200 rounded-xl transition-colors bg-white border border-slate-200 shadow-sm"
                                                title="Ordenar Locais"
                                            >
                                                {hospitalSortDir === 'asc' ? <ArrowUp size={14} className="text-emerald-600" /> : <ArrowDown size={14} className="text-emerald-600" />}
                                            </button>
                                        </div>
                                        <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {config.hospitals && [...config.hospitals].sort((a, b) => hospitalSortDir === 'asc' ? a.localeCompare(b) : b.localeCompare(a)).map(hospital => (
                                                <div key={hospital} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                                                    {editingHospital === hospital ? (
                                                        <div className="flex gap-3 w-full">
                                                            <input 
                                                                autoFocus
                                                                type="text" 
                                                                value={editValue} 
                                                                onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                                                                title="Editar nome do local"
                                                                className="flex-1 p-2 bg-white border-2 border-blue-400 text-slate-800 rounded-xl outline-none text-sm font-bold"
                                                                disabled={isUpdating}
                                                            />
                                                            <button onClick={() => handleUpdateHospital(hospital)} disabled={isUpdating} className="px-4 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase">Salvar</button>
                                                            <button onClick={() => setEditingHospital(null)} className="p-2 text-slate-400">X</button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span className="text-sm font-bold text-slate-700 tracking-wide uppercase">{hospital}</span>
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    onClick={() => { setEditingHospital(hospital); setEditValue(hospital); }} 
                                                                    title="Editar Local"
                                                                    aria-label="Editar Local"
                                                                    className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                                >
                                                                    <Save size={16} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteHospital(hospital)} 
                                                                    title="Excluir Local"
                                                                    aria-label="Excluir Local"
                                                                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                                <Layers size={20} />
                                            </div>
                                            <h2 className="text-xl font-bold text-slate-800">Cadastrar Novo Sistema</h2>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input 
                                                title="Nome do sistema"
                                                type="text" 
                                                placeholder="DIGITE O NOME DO SISTEMA" 
                                                value={newSystem} 
                                                onChange={(e) => setNewSystem(e.target.value.toUpperCase())} 
                                                className="flex-1 p-4 bg-slate-50 border border-slate-200 text-black rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold tracking-wide" 
                                            />
                                            <button 
                                                onClick={handleAddSystem} 
                                                title="Adicionar Sistema" 
                                                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                                            >
                                                Adicionar
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                        <div className="p-6 border-b font-black text-slate-800 bg-slate-50/50 flex items-center justify-between uppercase tracking-[0.1em] text-xs">
                                            <span>Sistemas Ativos</span>
                                            <button 
                                                onClick={() => setSystemSortDir(systemSortDir === 'asc' ? 'desc' : 'asc')}
                                                className="p-2 hover:bg-slate-200 rounded-xl transition-colors bg-white border border-slate-200 shadow-sm"
                                                title="Ordenar Sistemas"
                                            >
                                                {systemSortDir === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />}
                                            </button>
                                        </div>
                                        <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {[...config.systems].sort((a, b) => systemSortDir === 'asc' ? a.localeCompare(b) : b.localeCompare(a)).map(system => (
                                                <div key={system} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                                                    {editingSystem === system ? (
                                                        <div className="flex gap-3 w-full">
                                                            <input 
                                                                autoFocus
                                                                type="text" 
                                                                value={editValue} 
                                                                onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                                                                title="Editar nome do sistema"
                                                                className="flex-1 p-2 bg-white border-2 border-blue-400 text-slate-800 rounded-xl outline-none text-sm font-bold"
                                                                disabled={isUpdating}
                                                            />
                                                            <button onClick={() => handleUpdateSystem(system)} disabled={isUpdating} className="px-4 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase">Salvar</button>
                                                            <button onClick={() => setEditingSystem(null)} className="p-2 text-slate-400">X</button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span className="text-sm font-bold text-slate-700 tracking-wide uppercase">{system}</span>
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    onClick={() => { setEditingSystem(system); setEditValue(system); }} 
                                                                    title="Editar Sistema"
                                                                    aria-label="Editar Sistema"
                                                                    className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                                >
                                                                    <Save size={16} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteSystem(system)} 
                                                                    title="Excluir Sistema"
                                                                    aria-label="Excluir Sistema"
                                                                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Ferramentas do Sistema */}
                                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-2 bg-orange-50 rounded-xl text-orange-600">
                                                <TrendingUp size={20} />
                                            </div>
                                            <h2 className="text-xl font-bold text-slate-800">Ferramentas do Sistema</h2>
                                        </div>
                                        
                                        <div className="flex flex-col gap-4">
                                            <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-sm">Recalcular Posições (Geral e Equipe)</h3>
                                                    <p className="text-xs text-slate-500 mt-1">Reordena as Posições (Geral e Equipe) de todos os pacientes ativos baseado na ordem cronológica da Data da AIH.</p>
                                                </div>
                                                <button
                                                    onClick={handleRecalculatePositions}
                                                    disabled={isUpdating}
                                                    className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-600/20 transition-all disabled:opacity-50"
                                                >
                                                    {isUpdating ? 'Processando...' : 'Recalcular Posições'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* FieldManager no final do fluxo */}
                                    <div className="pt-8">
                                        <FieldManager />
                                    </div>
                                </div>
                            ) : (
                                <div className="lg:col-span-3 py-12 text-center text-slate-400 font-bold uppercase tracking-widest">
                                    Selecione uma aba válida.
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Custom Confirm Modal for PWA/iOS explicitly */}
            {itemToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-950/40 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center">
                        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                            ['recalculate', 'update_team', 'update_system', 'update_hospital'].includes(itemToDelete.type) 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-red-100 text-red-600'
                        }`}>
                            {['recalculate', 'update_team', 'update_system', 'update_hospital'].includes(itemToDelete.type) 
                                ? <Save size={32} /> 
                                : <Trash2 size={32} />
                            }
                        </div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">
                            {['recalculate', 'update_team', 'update_system', 'update_hospital'].includes(itemToDelete.type) ? 'Confirmar Alteração' : 'Confirmar Exclusão'}
                        </h3>
                        <p className="text-sm font-medium text-slate-500 mb-8">
                            {itemToDelete.type === 'recalculate' ? (
                                <>Isso irá recalcular a Posição Geral e Posição Equipe de <b>TODOS</b> os pacientes com base na Data da AIH. Deseja continuar?</>
                            ) : ['update_team', 'update_system', 'update_hospital'].includes(itemToDelete.type) ? (
                                <>Deseja alterar o nome de <b>{itemToDelete.name}</b> para <b>{itemToDelete.actionValue}</b>? Todos os pacientes serão atualizados.</>
                            ) : (
                                <>Tem certeza que deseja excluir permanentemente <b>{itemToDelete.name}</b>? Esta ação não pode ser desfeita.</>
                            )}
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setItemToDelete(null)}
                                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={executeDeletion}
                                disabled={isUpdating}
                                className={`flex-1 py-3.5 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg disabled:opacity-50 ${
                                    ['recalculate', 'update_team', 'update_system', 'update_hospital'].includes(itemToDelete.type)
                                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                                }`}
                            >
                                {isUpdating ? 'Processando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PatientModal 
                patient={selectedPatient} 
                isOpen={isPatientModalOpen} 
                onClose={() => {
                    setIsPatientModalOpen(false);
                    setSelectedPatient(null);
                }} 
                onSave={async () => { 
                    setIsPatientModalOpen(false); 
                    setSelectedPatient(null);
                    await fetchData(); 
                }} 
            />
        </div>
    );
}
