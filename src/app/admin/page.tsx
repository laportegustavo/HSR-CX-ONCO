"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Users, UserPlus, Trash2, Save, ArrowLeft, 
    Stethoscope, ShieldCheck, Contact, Plus, UserCircle,
    Layers, ArrowUp, ArrowDown
} from 'lucide-react';
import { MedicalStaff, Patient } from '@/types';
import { getStaff, saveStaffAction, deleteStaffAction, getAccessLogsAction } from '../staff-actions';
import { getPatients, deletePatientAction } from '../actions';
import { getConfig, addTeamAction, deleteTeamAction, addSystemAction, deleteSystemAction, updateTeamAction, updateSystemAction } from '../config-actions';
import PatientModal from '@/components/PatientModal';
import Image from 'next/image';

export default function AdminDashboard() {
    const [staff, setStaff] = useState<MedicalStaff[]>([]);
    const [config, setConfig] = useState<{ teams: string[], systems: string[] }>({ teams: [], systems: [] });
    const [loading, setLoading] = useState(true);
    const [newTeam, setNewTeam] = useState("");
    const [newSystem, setNewSystem] = useState("");
    const [activeTab, setActiveTab] = useState<'staff' | 'config' | 'patients' | 'acessos'>('staff');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [accessLogs, setAccessLogs] = useState<{ timestamp: string, username: string, role: string }[]>([]);
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
    const [editValue, setEditValue] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [staffSort, setStaffSort] = useState<{ key: keyof MedicalStaff, dir: 'asc' | 'desc' }>({ key: 'systemName', dir: 'asc' });
    const [patientSort, setPatientSort] = useState<{ key: keyof Patient, dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });
    const [teamSortDir, setTeamSortDir] = useState<'asc' | 'desc'>('asc');
    const [systemSortDir, setSystemSortDir] = useState<'asc' | 'desc'>('asc');
    const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string, type: 'staff' | 'patient' | 'team' | 'system' } | null>(null);
    const router = useRouter();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [staffData, configData, patientsData, logsData] = await Promise.all([
                getStaff(), 
                getConfig(),
                getPatients(),
                getAccessLogsAction()
            ]);
            setStaff(staffData);
            setConfig(configData);
            setPatients(patientsData);
            setAccessLogs(logsData);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        const checkAuth = async () => {
            const isAuth = document.cookie.includes('auth=true');
            const isAdmin = document.cookie.includes('role=Administrador');
            
            if (!isAuth) {
                router.push('/login');
            } else if (!isAdmin) {
                router.push('/');
            } else {
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
        try {
            const result = await saveStaffAction(editingId ? { ...formData, id: editingId } as MedicalStaff : formData);
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
                alert(editingId ? 'Profissional atualizado com sucesso!' : 'Profissional cadastrado com sucesso!');
            }
        } catch (error) {
            console.error('Error saving staff:', error);
            alert('Erro ao salvar profissional.');
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
        
        try {
            if (itemToDelete.type === 'staff') {
                await deleteStaffAction(itemToDelete.id);
            } else if (itemToDelete.type === 'patient') {
                await deletePatientAction(itemToDelete.id);
            } else if (itemToDelete.type === 'team') {
                await deleteTeamAction(itemToDelete.name);
            } else if (itemToDelete.type === 'system') {
                await deleteSystemAction(itemToDelete.name);
            }
            await fetchData();
            setItemToDelete(null);
        } catch (error) {
            console.error("Erro na exclusão:", error);
            alert("Erro ao excluir.");
        }
    };

    const handleUpdateTeam = async (oldName: string) => {
        console.log('Client: handleUpdateTeam', oldName, '->', editValue);
        if (!editValue || editValue === oldName) {
            setEditingTeam(null);
            return;
        }
        if (confirm(`Alterar nome da equipe de "${oldName}" para "${editValue}"? Isso atualizará todos os pacientes desta equipe.`)) {
            setIsUpdating(true);
            try {
                console.log('Client: Calling updateTeamAction...');
                const result = await updateTeamAction(oldName, editValue);
                console.log('Client: updateTeamAction server result:', result);
                setEditingTeam(null);
                setEditValue("");
                await fetchData();
                alert("Equipe atualizada com sucesso!");
                window.location.reload();
            } catch (error) {
                console.error("Client: Error updating team:", error);
                alert("Erro ao atualizar equipe. Verifique os logs.");
            } finally {
                setIsUpdating(false);
            }
        }
    };

    const handleUpdateSystem = async (oldName: string) => {
        console.log('Client: handleUpdateSystem', oldName, '->', editValue);
        if (!editValue || editValue === oldName) {
            setEditingSystem(null);
            return;
        }
        if (confirm(`Alterar nome do sistema de "${oldName}" para "${editValue}"? Isso atualizará todos os pacientes deste sistema.`)) {
            setIsUpdating(true);
            try {
                console.log('Client: Calling updateSystemAction...');
                const result = await updateSystemAction(oldName, editValue);
                console.log('Client: updateSystemAction server result:', result);
                setEditingSystem(null);
                setEditValue("");
                await fetchData();
                alert("Sistema atualizado com sucesso!");
                window.location.reload();
            } catch (error) {
                console.error("Client: Error updating system:", error);
                alert("Erro ao atualizar sistema. Verifique os logs.");
            } finally {
                setIsUpdating(false);
            }
        }
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
                                    alt="Hospital Santa Rita"
                                    fill
                                    className="object-contain p-0.5"
                                    priority
                                />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Painel Administrativo</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => {
                                setFormData(prev => ({ ...prev, type: 'preceptor' }));
                                setActiveTab('staff');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95"
                        >
                            <Stethoscope size={18} />
                            Novo Preceptor
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
                            Novo Residente
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
                            Novo Admin
                        </button>
                        <button 
                            onClick={() => setIsPatientModalOpen(true)}
                            className="flex items-center gap-2 bg-[#d4af37] hover:bg-[#c5a059] text-[#0a1f44] px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95"
                        >
                            <Plus size={18} />
                            Novo Paciente
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-8">
                {/* Tabs */}
                <div className="flex gap-4 mb-8">
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
                        onClick={() => setActiveTab('config')}
                        title="Configurações Gerais de Equipes e Sistemas"
                        className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'config' ? 'bg-[#d4af37] text-[#0a1f44] shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                    >
                        Configurações Gerais
                    </button>
                    <button 
                        onClick={() => setActiveTab('acessos')}
                        title="Visualizar Acessos dos Usuários"
                        className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'acessos' ? 'bg-[#d4af37] text-[#0a1f44] shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                    >
                        Registro de Acessos
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {activeTab === 'staff' ? (
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
                                                required={formData.type === 'admin'}
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
                                    <div className="p-6 border-b flex items-center justify-between"><div className="flex items-center gap-2"><Users className="text-blue-600" size={20} /><h2 className="text-lg font-bold text-slate-800">Equipe Médica</h2></div><span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">{staff.length} CADASTRADOS</span></div>
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
                                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">{patients.length} PACIENTES</span>
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
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-6 border-b font-bold text-slate-800 bg-slate-50 flex items-center justify-between">
                                    Histórico de Acessos Recentes
                                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">{accessLogs.length} REGISTROS</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                                            <tr>
                                                <th className="px-6 py-4">Data e Hora</th>
                                                <th className="px-6 py-4">Usuário</th>
                                                <th className="px-6 py-4">Nível de Acesso</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {loading ? (
                                                <tr><td colSpan={3} className="p-12 text-center">Carregando...</td></tr>
                                            ) : accessLogs.length === 0 ? (
                                                <tr><td colSpan={3} className="p-12 text-center text-slate-500">Nenhum registro encontrado na aba &quot;Acessos&quot;. O primeiro login criará as colunas.</td></tr>
                                            ) : (
                                                accessLogs.map((log, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 text-xs font-mono text-slate-600">{log.timestamp}</td>
                                                        <td className="px-6 py-4 text-sm font-bold text-slate-800">{log.username}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                log.role.includes('CRIOU PACIENTE') ? 'bg-emerald-100 text-emerald-700 font-bold border border-emerald-200' :
                                                                log.role.includes('EDITOU PACIENTE') ? 'bg-amber-100 text-amber-700 font-bold border border-amber-200' :
                                                                log.role.includes('EXCLUIU PACIENTE') ? 'bg-red-100 text-red-700 font-bold border border-red-200' :
                                                                log.role === 'ACEITE LGPD' ? 'bg-rose-100 text-rose-700 font-black' :
                                                                log.role === 'Administrador' ? 'bg-slate-800 text-white' :
                                                                log.role === 'Médico Preceptor' ? 'bg-indigo-100 text-indigo-700' :
                                                                'bg-emerald-100 text-emerald-700'
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
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="lg:col-span-1 space-y-8">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="flex items-center gap-2 mb-6"><Plus className="text-blue-600" size={20} /><h2 className="text-lg font-bold text-slate-800">Nova Equipe</h2></div>
                                    <div className="flex gap-2">
                                        <input 
                                            title="Nome da equipe"
                                            type="text" 
                                            placeholder="Nome da Equipe" 
                                            value={newTeam} 
                                            onChange={(e) => setNewTeam(e.target.value.toUpperCase())} 
                                            className="flex-1 p-2.5 bg-slate-50 border border-slate-200 text-black rounded-lg outline-none" 
                                        />
                                        <button onClick={handleAddTeam} title="Adicionar Equipe" className="bg-[#d4af37] text-[#0a1f44] p-2.5 rounded-lg"><Plus size={20} /></button>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="flex items-center gap-2 mb-6"><Layers className="text-indigo-600" size={20} /><h2 className="text-lg font-bold text-slate-800">Novo Sistema</h2></div>
                                    <div className="flex gap-2">
                                        <input 
                                            title="Nome do sistema"
                                            type="text" 
                                            placeholder="Nome do Sistema" 
                                            value={newSystem} 
                                            onChange={(e) => setNewSystem(e.target.value.toUpperCase())} 
                                            className="flex-1 p-2.5 bg-slate-50 border border-slate-200 text-black rounded-lg outline-none" 
                                        />
                                        <button onClick={handleAddSystem} title="Adicionar Sistema" className="bg-indigo-600 text-white p-2.5 rounded-lg"><Plus size={20} /></button>
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="p-6 border-b font-bold text-slate-800 bg-slate-50 flex items-center justify-between">
                                        Equipes Ativas
                                        <button 
                                            onClick={() => setTeamSortDir(teamSortDir === 'asc' ? 'desc' : 'asc')}
                                            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                                            title="Ordenar Equipes"
                                        >
                                            {teamSortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                        </button>
                                    </div>
                                    <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                                        {[...config.teams].sort((a, b) => teamSortDir === 'asc' ? a.localeCompare(b) : b.localeCompare(a)).map(team => (
                                            <div key={team} className="p-4 flex justify-between items-center hover:bg-slate-50 group">
                                                {editingTeam === team ? (
                                                    <div className="flex gap-2 w-full">
                                                        <input 
                                                            autoFocus
                                                            type="text" 
                                                            value={editValue} 
                                                            onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                                                            title="Editar nome da equipe"
                                                            placeholder="DIGITE O NOVO NOME"
                                                            className="flex-1 p-1.5 bg-white border border-blue-400 text-slate-800 rounded outline-none text-sm font-bold"
                                                            disabled={isUpdating}
                                                        />
                                                        <button 
                                                            onClick={() => handleUpdateTeam(team)} 
                                                            disabled={isUpdating}
                                                            className="text-emerald-600 hover:text-emerald-700 font-bold text-xs uppercase disabled:opacity-50"
                                                        >
                                                            {isUpdating ? "Salvando..." : "Salvar"}
                                                        </button>
                                                        <button onClick={() => setEditingTeam(null)} className="text-slate-400 hover:text-slate-500 font-bold text-xs uppercase">X</button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-sm font-bold text-slate-700">{team}</span>
                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                onClick={() => { setEditingTeam(team); setEditValue(team); }} 
                                                                className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded transition-all opacity-0 group-hover:opacity-100"
                                                                title="Editar nome"
                                                            >
                                                                <Save size={14} className="opacity-70" />
                                                            </button>
                                                            <button onClick={() => handleDeleteTeam(team)} title="Excluir equipe" className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"><Trash2 size={16} /></button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="p-6 border-b font-bold text-slate-800 bg-indigo-50 flex items-center justify-between">
                                        Sistemas Ativos
                                        <button 
                                            onClick={() => setSystemSortDir(systemSortDir === 'asc' ? 'desc' : 'asc')}
                                            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                                            title="Ordenar Sistemas"
                                        >
                                            {systemSortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                        </button>
                                    </div>
                                    <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                                        {[...config.systems].sort((a, b) => systemSortDir === 'asc' ? a.localeCompare(b) : b.localeCompare(a)).map(system => (
                                            <div key={system} className="p-4 flex justify-between items-center hover:bg-slate-50 group">
                                                {editingSystem === system ? (
                                                    <div className="flex gap-2 w-full">
                                                        <input 
                                                            autoFocus
                                                            type="text" 
                                                            value={editValue} 
                                                            onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                                                            title="Editar nome do sistema"
                                                            placeholder="DIGITE O NOVO NOME"
                                                            className="flex-1 p-1.5 bg-white border border-blue-400 text-slate-800 rounded outline-none text-sm font-bold"
                                                            disabled={isUpdating}
                                                        />
                                                        <button 
                                                            onClick={() => handleUpdateSystem(system)} 
                                                            disabled={isUpdating}
                                                            className="text-emerald-600 hover:text-emerald-700 font-bold text-xs uppercase disabled:opacity-50"
                                                        >
                                                            {isUpdating ? "Salvando..." : "Salvar"}
                                                        </button>
                                                        <button onClick={() => setEditingSystem(null)} className="text-slate-400 hover:text-slate-500 font-bold text-xs uppercase">X</button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-sm font-bold text-slate-700">{system}</span>
                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                onClick={() => { setEditingSystem(system); setEditValue(system); }} 
                                                                className="p-1.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded transition-all opacity-0 group-hover:opacity-100"
                                                                title="Editar nome"
                                                            >
                                                                <Save size={14} className="opacity-70" />
                                                            </button>
                                                            <button onClick={() => handleDeleteSystem(system)} title="Excluir sistema" className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"><Trash2 size={16} /></button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Custom Confirm Modal for PWA/iOS explicitly */}
            {itemToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-950/40 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center">
                        <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Confirmar Exclusão</h3>
                        <p className="text-sm font-medium text-slate-500 mb-8">
                            Tem certeza que deseja excluir permanentemente <b>{itemToDelete.name}</b>?
                            Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setItemToDelete(null)}
                                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={executeDeletion}
                                className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-colors shadow-lg shadow-red-600/20"
                            >
                                Sim, Excluir
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
