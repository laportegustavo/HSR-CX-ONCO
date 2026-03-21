"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    Search, Activity, RefreshCw, LayoutList, LayoutGrid, Plus, Users, 
    ArrowUpDown, ArrowUp, ArrowDown, FileText, Menu, X as CloseIcon,
    Stethoscope, Heart, Scissors, Brain, Sparkles, User, FlaskConical, 
    Bone, HeartPulse, Microscope, Printer
} from "lucide-react";
import Image from "next/image";
import PatientModal from "@/components/PatientModal";
import ReportModal from "@/components/ReportModal";
import LgpdModal from "@/components/LgpdModal";
import { Patient, PatientStatus } from "../types";
import { getPatients } from "./actions";
import { logLgpdConsentAction } from "./staff-actions";

type SortConfig = {
    key: keyof Patient | 'none';
    direction: 'asc' | 'desc';
};

export default function Dashboard() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<"lista" | "kanban">("lista");
    const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<PatientStatus[]>([]);
    const [utiFilter, setUtiFilter] = useState<'Todos' | 'Sim' | 'Não'>('Todos');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'none', direction: 'asc' });
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userRole, setUserRole] = useState<string>("");
    const [userName, setUserName] = useState<string>("");
    const [showLgpdModal, setShowLgpdModal] = useState<boolean>(false);

    const teamIcons: Record<string, React.ElementType> = {
        "Geral (Todas)": Activity,
        "Gastroenterologia": Heart,
        "Ortopedia": Bone,
        "Urologia": FlaskConical,
        "Ginecologia": User,
        "Cirurgia Geral": Scissors,
        "Neurocirurgia": Brain,
        "Cirurgia Plástica": Sparkles,
        "Cardiologia": HeartPulse,
        "Otorrinolaringologia": Microscope,
        "Oncologia": Microscope,
        "N/A": Stethoscope
    };

    const [config, setConfig] = useState<{ teams: string[], systems: string[] }>({ teams: [], systems: [] });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [patientsData, configData] = await Promise.all([
                getPatients(),
                import('./config-actions').then(m => m.getConfig())
            ]);
            setPatients(patientsData);
            setConfig(configData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Get role from cookies
        const roleMatch = document.cookie.match(/role=([^;]+)/);
        if (roleMatch) {
            setUserRole(decodeURIComponent(roleMatch[1]));
        }
        
        const nameMatch = document.cookie.match(/username=([^;]+)/);
        if (nameMatch) {
            const decodedName = decodeURIComponent(nameMatch[1]);
            setUserName(decodedName);
            
            // LGPD Check
            const lgpdAccepted = localStorage.getItem(`lgpd_accepted_${decodedName}`);
            if (!lgpdAccepted) {
                setShowLgpdModal(true);
            }
        }
    }, []);

    const handleSort = (key: keyof Patient) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleLgpdAccept = async () => {
        try {
            await logLgpdConsentAction(userName);
            localStorage.setItem(`lgpd_accepted_${userName}`, 'true');
            setShowLgpdModal(false);
        } catch (error) {
            console.error("Failed to log LGPD consent:", error);
            localStorage.setItem(`lgpd_accepted_${userName}`, 'true');
            setShowLgpdModal(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, patientId: string) => {
        e.dataTransfer.setData("patientId", patientId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Allow drop
    };

    const handleDrop = async (e: React.DragEvent, newStatus: PatientStatus) => {
        const patientId = e.dataTransfer.getData("patientId");
        const patient = patients.find(p => p.id === patientId);
        
        if (patient && patient.status !== newStatus) {
            const updatedPatient = { ...patient, status: newStatus };
            // Update local state for immediate feedback
            setPatients(prev => prev.map(p => p.id === patientId ? updatedPatient : p));
            console.log(`Moved patient ${patientId} to ${newStatus}`);
        }
    };

    const filteredPatients = useMemo(() => {
        const result = patients.filter((p) => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.medicalRecord.includes(searchTerm);
            const matchesTeam = selectedTeams.length === 0 || selectedTeams.includes(p.team);
            const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(p.status);
            const matchesUti = utiFilter === 'Todos' || p.needsICU === utiFilter;
            return matchesSearch && matchesTeam && matchesStatus && matchesUti;
        });

        // Always prioritize Priority 1, then 2, then 3
        result.sort((a, b) => {
            const prioA = a.priority || '3';
            const prioB = b.priority || '3';
            
            // Force Priority 1 > 2 > 3
            if (prioA !== prioB) {
                return prioA.localeCompare(prioB);
            }
            
            // Secondary sort by sortConfig if active
            if (sortConfig.key !== 'none') {
                const key = sortConfig.key as keyof Patient;
                const aVal = String(a[key] || "");
                const bVal = String(b[key] || "");
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return result;
    }, [searchTerm, selectedTeams, selectedStatuses, utiFilter, sortConfig, patients]);

    const stats = useMemo(() => {
        const base = patients.filter(p => {
             const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.medicalRecord.includes(searchTerm);
            const matchesTeam = selectedTeams.length === 0 || selectedTeams.includes(p.team);
            return matchesSearch && matchesTeam;
        });
        
        return [
            { label: "(TODOS)", type: 'Todas' as PatientStatus | 'Todas', count: base.length, utiCount: base.filter(p => p.needsICU === 'Sim').length, color: "text-white", bg: "bg-[#0a1f44]", border: 'border-blue-900', isSummary: true },
            { label: "SEM STATUS", type: 'SEM STATUS' as PatientStatus, count: base.filter(p => p.status === 'SEM STATUS').length, utiCount: base.filter(p => p.status === 'SEM STATUS' && p.needsICU === 'Sim').length, color: "text-slate-800", bg: "bg-slate-50", border: 'border-slate-300' },
            { label: "AGENDADOS", type: 'AGENDADOS' as PatientStatus, count: base.filter(p => p.status === 'AGENDADOS').length, utiCount: base.filter(p => p.status === 'AGENDADOS' && p.needsICU === 'Sim').length, color: "text-blue-600", bg: "bg-blue-50", border: 'border-blue-400' },
            { label: "OBSERVAÇÕES/PENDÊNCIAS", type: 'OBSERVAÇÕES/PENDÊNCIAS' as PatientStatus, count: base.filter(p => p.status === 'OBSERVAÇÕES/PENDÊNCIAS').length, utiCount: base.filter(p => p.status === 'OBSERVAÇÕES/PENDÊNCIAS' && p.needsICU === 'Sim').length, color: "text-rose-600", bg: "bg-rose-50", border: 'border-rose-400' },
            { label: "PRONTOS", type: 'PRONTOS' as PatientStatus, count: base.filter(p => p.status === 'PRONTOS').length, utiCount: base.filter(p => p.status === 'PRONTOS' && p.needsICU === 'Sim').length, color: "text-emerald-600", bg: "bg-emerald-50", border: 'border-emerald-400' },
            { label: "CIRURGIA REALIZADA", type: 'CIRURGIA REALIZADA' as PatientStatus, count: base.filter(p => p.status === 'CIRURGIA REALIZADA').length, utiCount: base.filter(p => p.status === 'CIRURGIA REALIZADA' && p.needsICU === 'Sim').length, color: "text-orange-500", bg: "bg-orange-50", border: 'border-orange-400' },
            { label: "PERDA DE SEGMENTO", type: 'PERDA DE SEGMENTO' as PatientStatus, count: base.filter(p => p.status === 'PERDA DE SEGMENTO').length, utiCount: base.filter(p => p.status === 'PERDA DE SEGMENTO' && p.needsICU === 'Sim').length, color: "text-[#78350f]", bg: "bg-[#fef3c7]", border: 'border-[#78350f]' },
        ];
    }, [patients, searchTerm, selectedTeams]);

    const getStatusStyle = (status: PatientStatus) => {
        switch (status) {
            case "PRONTOS": return "bg-emerald-500 text-white";
            case "OBSERVAÇÕES/PENDÊNCIAS": return "bg-rose-500 text-white";
            case "AGENDADOS": return "bg-blue-500 text-white";
            case "CIRURGIA REALIZADA": return "bg-orange-500 text-white";
            case "PERDA DE SEGMENTO": return "bg-[#78350f] text-white";
            case "SEM STATUS": return "bg-slate-400 text-white";
            default: return "bg-slate-400 text-white";
        }
    };

    const getPriorityStyle = (priority?: string) => {
        switch (priority) {
            case "1": return "text-red-700 font-bold";
            case "2": return "text-amber-700 font-bold";
            case "3": return "text-emerald-700 font-bold";
            default: return "text-slate-900";
        }
    };

    const getRowPriorityClass = (priority?: string) => {
    switch(priority) {
        case '1': return 'bg-red-100/80 hover:bg-red-200/80 text-black';
        case '2': return 'bg-yellow-100/80 hover:bg-yellow-200/80 text-black';
        case '3': return 'bg-green-100/80 hover:bg-green-200/80 text-black';
        default: return 'bg-white hover:bg-slate-50 text-slate-700';
    }
};

const renderDate = (dateStr: string | undefined) => {
    if (!dateStr || dateStr === '--' || dateStr.trim() === '') return '--';
    
    // If it's in YYYY-MM-DD format (ISO), convert to DD/MM/YYYY
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    }
    
    return dateStr;
};

    const SortIcon = ({ column }: { column: keyof Patient }) => {
        if (sortConfig.key !== column) return <ArrowUpDown size={12} className="ml-1 opacity-20 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="ml-1 text-blue-600" /> : <ArrowDown size={12} className="ml-1 text-blue-600" />;
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden relative">
            {/* Sidebar Overlay (Mobile) */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 w-64 bg-[#0a1f44] text-white flex flex-col shrink-0 overflow-y-auto z-50 transition-transform duration-300 lg:translate-x-0 lg:static ${
                sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
            }`}>
                <div className="p-6 pb-2">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col items-center mt-2 mb-4 relative">
                            <button 
                                onClick={() => setSidebarOpen(false)} 
                                title="Fechar menu" 
                                className="lg:hidden absolute -top-4 -right-2 text-slate-400 hover:text-white p-2 bg-white/5 rounded-full z-10"
                            >
                                <CloseIcon size={24} />
                            </button>
                            <div className="bg-white p-3 rounded-2xl shadow-lg w-24 h-24 mb-4 relative flex-shrink-0">
                                <Image 
                                    src="/logo-hsr.jpeg"
                                    alt="Hospital Santa Rita"
                                    fill
                                    className="object-contain p-1"
                                    priority
                                    onError={() => {
                                        console.log("Logo failed to load");
                                    }}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between -mt-2">
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">CX ONCO HSR</h2>
                                <div className="flex flex-col mt-1">
                                    <h3 className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest leading-none">Serviço de Cirurgia Oncológica</h3>
                                    <h4 className="text-[10px] font-black text-white/70 uppercase tracking-widest">Hospital Santa Rita</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="px-6 mb-6">
                    <div className="px-3 py-1 bg-white/10 rounded-lg inline-block w-full">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Total: </span>
                        <span className="text-sm font-bold text-white">{patients.length} Pacientes</span>
                    </div>
                </div>
                <nav className="flex-1 px-3 space-y-1">
                    <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Filtrar por Equipe</span>
                        {selectedTeams.length > 0 && (
                            <button 
                                onClick={() => setSelectedTeams([])}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                Limpar
                            </button>
                        )}
                    </div>
                    {config.teams.map((team) => {
                        const Icon = teamIcons[team] || Stethoscope;
                        const isSelected = selectedTeams.includes(team);
                        return (
                            <button
                                key={team}
                                onClick={() => {
                                    setSelectedTeams(prev => 
                                        prev.includes(team) 
                                            ? prev.filter(t => t !== team)
                                            : [...prev, team]
                                    );
                                }}
                                title={`Filtrar por ${team}`}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                                    isSelected ? "bg-[#d4af37] text-[#0a1f44] shadow-md font-bold" : "text-slate-300 hover:bg-white/5"
                                }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <Icon size={16} className={isSelected ? "text-[#0a1f44]" : "text-slate-400"} />
                                    <span className="truncate">{team}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    isSelected ? "bg-[#0a1f44]/10" : "bg-white/10 text-slate-400"
                                }`}>
                                    {patients.filter(p => p.team === team).length}
                                </span>
                            </button>
                        );
                    })}

                </nav>
                
                <div className="p-4 mt-auto border-t border-white/5 space-y-1">
                    <button 
                        onClick={fetchData} 
                        aria-label="Sincronizar dados"
                        title="Sincronizar dados"
                        className="w-full flex items-center gap-2 text-slate-400 hover:text-white text-xs py-2 px-3 rounded-lg hover:bg-white/5 transition-all"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        <span className="font-medium">{loading ? "Sincronizando..." : "Sincronizar CSV"}</span>
                    </button>
                    
                    <button 
                        onClick={() => {
                            document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                            document.cookie = "role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                            window.location.href = "/login";
                        }}
                        className="w-full flex items-center gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs py-2 px-3 rounded-lg transition-all mt-2"
                        title="Sair do sistema"
                    >
                        <CloseIcon size={14} className="rotate-45" />
                        <span className="font-bold uppercase tracking-wider">Sair do Sistema</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden mt-6 sm:mt-0">
                {/* Topbar */}
                {/* Topbar */}
                <header className="bg-white border-b border-slate-200 flex flex-col shrink-0">
                    {/* Linha 1: Principal */}
                    <div className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-slate-100/50">
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setSidebarOpen(true)}
                                aria-label="Abrir menu"
                                title="Abrir menu"
                                className="p-2 lg:hidden text-slate-500 hover:bg-slate-100 rounded-lg"
                            >
                                <Menu size={20} />
                            </button>
                            <div className="flex flex-col lg:flex-row lg:items-center lg:gap-2 overflow-hidden">
                                <span className="text-xs sm:text-sm lg:text-lg font-black text-slate-900 uppercase lg:pr-3 lg:border-r border-slate-200">
                                    OLÁ, {userName || userRole || 'NOME'}
                                </span>
                                <h2 className="text-xs sm:text-sm lg:text-lg font-bold text-slate-800 truncate max-w-[150px] sm:max-w-[200px] lg:max-w-none">
                                    {selectedTeams.length === 0 ? "Geral (Todas)" : selectedTeams.join(", ")}
                                </h2>
                                {selectedStatuses.length > 0 && (
                                    <div className="flex gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                                        {selectedStatuses.map(status => (
                                            <span key={status} className={`shrink-0 w-fit px-2 py-0.5 rounded text-[8px] lg:text-[10px] font-bold ${getStatusStyle(status)}`}>
                                                {status}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar paciente..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-slate-100 border-none rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 w-full transition-all text-black font-semibold"
                                />
                            </div>

                            {userRole === 'Administrador' && (
                                <button 
                                    onClick={() => window.location.href = '/admin'}
                                    className="flex items-center justify-center gap-1 sm:gap-2 bg-slate-800 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold shadow-md hover:bg-slate-700 transition-all"
                                    title="Ir para Painel Administrativo"
                                >
                                    <Users className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" />
                                    <span className="hidden lg:inline">Painel Admin</span>
                                </button>
                            )}

                            <button 
                                onClick={() => { setSelectedPatient(null); setIsModalOpen(true); }}
                                className="flex items-center justify-center gap-1.5 sm:gap-2 bg-[#d4af37] text-[#0a1f44] px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-[#d4af37]/20 hover:bg-[#c5a059] transition-all active:scale-95"
                                aria-label="Adicionar novo paciente"
                                title="Novo Paciente"
                            >
                                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="hidden sm:inline">Novo</span>
                            </button>
                        </div>
                    </div>

                    {/* Linha 2: Filtros e Visualização */}
                    <div className="h-14 flex items-center justify-between px-4 lg:px-8 bg-slate-50/30 overflow-x-auto no-scrollbar gap-4">
                        <div className="flex items-center gap-4">
                            {/* UTI Filter */}
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-sm">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">UTI</span>
                                <div className="flex bg-slate-100/50 rounded-lg p-0.5">
                                    {(['Todos', 'Sim', 'Não'] as const).map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => setUtiFilter(opt)}
                                            className={`px-4 py-1 rounded-md text-[10px] font-black transition-all ${
                                                utiFilter === opt ? 'bg-[#0a1f44] text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            {opt.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* View Toggle */}
                            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200/60 shadow-sm">
                                <button 
                                    onClick={() => setViewMode("lista")}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        viewMode === "lista" ? "bg-[#0a1f44] text-white shadow-md" : "text-slate-500 hover:text-slate-700"
                                    }`}
                                >
                                    <LayoutList size={14} />
                                    <span>Lista</span>
                                </button>
                                <button 
                                    onClick={() => setViewMode("kanban")}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        viewMode === "kanban" ? "bg-[#0a1f44] text-white shadow-md" : "text-slate-500 hover:text-slate-700"
                                    }`}
                                >
                                    <LayoutGrid size={14} />
                                    <span>Kanban</span>
                                </button>
                            </div>
                        </div>

                        {/* Report Button */}
                        <button 
                            onClick={() => setIsReportOpen(true)}
                            className="flex items-center gap-2 bg-white border border-slate-200/80 text-slate-700 px-6 py-2 rounded-xl text-sm font-black shadow-sm hover:border-blue-400 hover:text-blue-600 transition-all active:scale-95 group"
                            title="Gerar Relatório Personalizado"
                        >
                            <Printer size={18} className="group-hover:scale-110 transition-transform" />
                            <span>Relatório</span>
                        </button>
                    </div>
                </header>

                {/* Dashboard Area */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50 pb-24 sm:pb-8">
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-nowrap lg:overflow-x-auto gap-3 sm:gap-4 mb-6 sm:mb-8 pb-2 no-scrollbar">
                        {stats.map((stat) => {
                            const isSelected = stat.isSummary ? selectedStatuses.length === 0 : selectedStatuses.includes(stat.type as PatientStatus);
                            return (
                                <div 
                                    key={stat.label} 
                                    onClick={() => {
                                        if (stat.isSummary) {
                                            setSelectedStatuses([]);
                                        } else {
                                            const status = stat.type as PatientStatus;
                                            setSelectedStatuses(prev => 
                                                prev.includes(status) 
                                                    ? prev.filter(s => s !== status)
                                                    : [...prev, status]
                                            );
                                        }
                                    }}
                                    className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl border-2 shadow-sm flex flex-col gap-0.5 sm:gap-1 items-start cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${
                                        stat.isSummary ? (isSelected ? 'border-sky-500 bg-[#0a1f44] ring-4 ring-sky-500/10' : 'bg-[#0a1f44] border-transparent') : 
                                        (isSelected ? stat.border + ' ' + stat.bg + ' ring-4 ring-slate-200/50' : "bg-white border-transparent")
                                    }`}
                                >
                                    <span className={`text-lg sm:text-xl lg:text-2xl font-bold ${stat.isSummary ? 'text-white' : (stat.label === 'CIRURGIA REALIZADA' ? 'text-orange-500' : stat.label === 'PERDA DE SEGMENTO' ? 'text-[#78350f]' : stat.label === 'PRONTOS' ? 'text-emerald-600' : stat.label === 'OBSERVAÇÕES/PENDÊNCIAS' ? 'text-rose-600' : 'text-slate-900')}`}>{stat.count}</span>
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        {!stat.isSummary && <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${stat.label === 'CIRURGIA REALIZADA' ? 'bg-orange-500' : stat.label === 'PERDA DE SEGMENTO' ? 'bg-[#78350f]' : stat.label === 'PRONTOS' ? 'bg-emerald-500' : stat.label === 'OBSERVAÇÕES/PENDÊNCIAS' ? 'bg-rose-500' : (stat.color === 'text-slate-800' ? 'bg-slate-400' : stat.bg.replace('50', '500'))}`} />}
                                        <span className={`text-[7px] sm:text-[8px] lg:text-[10px] font-bold uppercase tracking-wider ${stat.isSummary ? 'text-slate-300' : stat.color}`}>{stat.label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Table View (Desktop) / Card View (Mobile) */}
                    {viewMode === "lista" ? (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px] lg:min-w-0">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th onClick={() => handleSort('status')} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center">Status <SortIcon column="status" /></div>
                                            </th>
                                            <th onClick={() => handleSort('team')} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer group hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center">Equipe <SortIcon column="team" /></div>
                                            </th>
                                            <th onClick={() => handleSort('sistema')} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer group hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center">Sistema <SortIcon column="sistema" /></div>
                                            </th>
                                            <th onClick={() => handleSort('preceptor')} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer group hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center">Preceptor <SortIcon column="preceptor" /></div>
                                            </th>
                                            <th onClick={() => handleSort('name')} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer group hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center">Nome <SortIcon column="name" /></div>
                                            </th>
                                            <th onClick={() => handleSort('aihDate')} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer group hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center">AIH <SortIcon column="aihDate" /></div>
                                            </th>
                                            <th onClick={() => handleSort('surgeryDate')} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer group hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center">Cirurgia <SortIcon column="surgeryDate" /></div>
                                            </th>
                                            <th onClick={() => handleSort('resident')} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer group hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center">Residente <SortIcon column="resident" /></div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loading ? (
                                            Array.from({ length: 10 }).map((_, i) => (
                                                <tr key={i} className="animate-pulse">
                                                    <td colSpan={7} className="px-6 py-4 h-14 bg-slate-50/50" />
                                                </tr>
                                            ))
                                        ) : (
                                            filteredPatients.map((patient) => (
                                                <tr 
                                                    key={patient.id} 
                                                    onClick={() => { setSelectedPatient(patient); setIsModalOpen(true); }}
                                                    className={`transition-colors cursor-pointer group ${getRowPriorityClass(patient.priority)}`}
                                                >
                                                    <td className="px-6 py-4">
                                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-wide inline-block min-w-[100px] text-center ${getStatusStyle(patient.status)}`}>
                                                            {patient.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-black uppercase">
                                                        {patient.team}
                                                    </td>
                                                    <td className="px-6 py-4 text-[10px] text-black uppercase">
                                                        {patient.sistema}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-black uppercase">
                                                        {patient.preceptor || '--'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm transition-colors text-black">
                                                                {patient.name}
                                                            </span>
                                                            <span className="text-[10px] text-slate-500 font-mono">{patient.medicalRecord}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-[10px] text-black uppercase">
                                                        {renderDate(patient.aihDate)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-black">
                                                        {renderDate(patient.surgeryDate)}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-black uppercase">
                                                        {patient.resident || '--'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="lg:hidden space-y-2 sm:space-y-4">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="bg-white p-4 sm:p-6 rounded-2xl animate-pulse h-32 w-full shadow-sm" />
                                    ))
                                ) : (
                                    filteredPatients.map((patient) => (
                                        <div 
                                            key={patient.id}
                                            onClick={() => { setSelectedPatient(patient); setIsModalOpen(true); }}
                                            className={`bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl border-2 transition-all active:scale-[0.98] ${
                                                patient.priority === '1' ? 'border-red-100' :
                                                patient.priority === '2' ? 'border-yellow-100' :
                                                'border-slate-100'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-2 sm:mb-4">
                                                <span className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black tracking-wide ${getStatusStyle(patient.status)}`}>
                                                    {patient.status}
                                                </span>
                                                <div className={`p-1 sm:p-1.5 rounded-lg ${patient.priority === '1' ? 'bg-red-50 text-red-600' : patient.priority === '2' ? 'bg-yellow-50 text-yellow-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    <Activity size={14} className="sm:hidden" />
                                                    <Activity size={16} className="hidden sm:block" />
                                                </div>
                                            </div>
                                            
                                            <div className="mb-2 sm:mb-4">
                                                <h4 className="text-sm sm:text-base font-bold text-slate-800 leading-tight mb-0.5 sm:mb-1">{patient.name}</h4>
                                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prontuário: {patient.medicalRecord}</p>
                                            </div>

                                            <div className="flex flex-col gap-1 sm:gap-2 pt-2 sm:pt-4 border-t border-slate-50">
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-1 sm:pb-2">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe / Sistema</span>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 text-right">{patient.team} <span className="text-slate-300 mx-1">•</span> {patient.sistema}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-1 sm:pb-2">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Data AIH</span>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 text-right">{renderDate(patient.aihDate)}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-1 sm:pb-2">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Cirurgia</span>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 text-right">{renderDate(patient.surgeryDate)}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-1 sm:pb-2">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Preceptor</span>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 text-right">{patient.preceptor || '--'}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Residente</span>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 text-right">{patient.resident || '--'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {!loading && filteredPatients.length === 0 && (
                                <div className="p-12 text-center">
                                    <Users size={40} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-500 font-medium">Nenhum paciente encontrado para esta seleção.</p>
                                </div>
                             )}
                        </>
                    ) : (
                        <div className="flex gap-4 sm:gap-6 min-w-full pb-4">
                            {(selectedStatuses.length > 0
                                ? ["SEM STATUS", "AGENDADOS", "OBSERVAÇÕES/PENDÊNCIAS", "PRONTOS", "CIRURGIA REALIZADA", "PERDA DE SEGMENTO"].filter(s => selectedStatuses.includes(s as PatientStatus))
                                : ["SEM STATUS", "AGENDADOS", "OBSERVAÇÕES/PENDÊNCIAS", "PRONTOS", "CIRURGIA REALIZADA", "PERDA DE SEGMENTO"]
                            ).map((status) => {
                                const colPatients = filteredPatients.filter(p => p.status === status);
                                return (
                                <div 
                                    key={status} 
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, status as PatientStatus)}
                                    className="w-80 flex-shrink-0 bg-slate-100 rounded-xl p-4 flex flex-col gap-4 border-2 border-transparent transition-colors hover:border-blue-200"
                                >
                                    <div className="flex items-center justify-between px-1">
                                        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">{status}</h3>
                                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                            {colPatients.length}
                                        </span>
                                    </div>
                                    <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                                        {colPatients.map((p) => (
                                            <div 
                                                key={p.id} 
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, p.id)}
                                                onClick={() => { setSelectedPatient(p); setIsModalOpen(true); }}
                                                className={`bg-white p-4 rounded-lg shadow-sm border-l-4 border-y border-r border-slate-200 cursor-grab active:cursor-grabbing hover:border-blue-400 transition-colors group ${
                                                    p.priority === '1' ? 'border-l-red-500' :
                                                    p.priority === '2' ? 'border-l-yellow-500' :
                                                    'border-l-emerald-500'
                                                }`}
                                            >
                                                <p className={`text-xs font-bold mb-1 truncate ${getPriorityStyle(p.priority)}`}>{p.name}</p>
                                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                                                    <span>{p.team}</span>
                                                    <span>{p.medicalRecord}</span>
                                                </div>
                                                <div className="mt-2 flex items-center justify-between">
                                                    <span className="text-[8px] bg-slate-50 px-1.5 py-0.5 rounded text-slate-400 font-bold uppercase">
                                                        {p.sistema}
                                                    </span>
                                                    {p.examPdfPath && (
                                                        <FileText size={12} className="text-sky-500" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </main>
                
                {/* Mobile Floating Action Button */}
                <button 
                    onClick={() => { setSelectedPatient(null); setIsModalOpen(true); }}
                    className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#d4af37] text-[#0a1f44] rounded-full shadow-[0_10px_30px_rgba(212,175,55,0.5)] flex items-center justify-center active:scale-95 transition-all z-[60]"
                    aria-label="Adicionar novo paciente"
                >
                    <Plus size={32} strokeWidth={3} />
                </button>
            </div>

            <PatientModal
                patient={selectedPatient}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchData} 
            />
            <ReportModal
                patients={filteredPatients}
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
            />
            {showLgpdModal && (
                <LgpdModal 
                    userName={userName}
                    onAccept={handleLgpdAccept}
                />
            )}
        </div>
    );
}
