"use client";

import { useState, useEffect, useMemo, DragEvent } from "react";
import { 
    Search, Activity, RefreshCw, LayoutList, LayoutGrid, Plus, Users, 
    ArrowUpDown, ArrowUp, ArrowDown, FileText, Menu, X as CloseIcon,
    Stethoscope, Heart, Scissors, Brain, Sparkles, User, FlaskConical, 
    Bone, HeartPulse, Microscope, Printer, Calendar as CalendarIcon, Settings,
    ChevronDown, Check
} from "lucide-react";
import Image from "next/image";
import PatientModal from "@/components/PatientModal";
import ReportModal from "@/components/ReportModal";
import LgpdModal from "@/components/LgpdModal";
import CalendarView from "@/components/CalendarView";
import ProfileModal from "@/components/ProfileModal";
import { Patient, PatientStatus, FieldSchema } from "../types";
import { getPatientsAction as getPatients, updatePatientAction } from "./actions";
import { logLgpdConsentAction } from "./staff-actions";
import { getSchemaAction } from "./config-actions";

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
    const [viewMode, setViewMode] = useState<"lista" | "kanban" | "calendar">("lista");
    const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
    const [selectedSistemas, setSelectedSistemas] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<PatientStatus[]>([]);
    const [utiFilter, setUtiFilter] = useState<'Todos' | 'Sim' | 'Não'>('Todos');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'none', direction: 'asc' });
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userName, setUserName] = useState("");
    const [userFullName, setUserFullName] = useState("");
    const [userRole, setUserRole] = useState("");
    const [showLgpdModal, setShowLgpdModal] = useState<boolean>(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [schema, setSchema] = useState<FieldSchema[]>([]);
    const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
    const [visibleColumnIds, setVisibleColumnIds] = useState<Set<string>>(new Set([
        'status', 'position', 'teamPosition', 'team', 'sistema', 'name', 'aihDate', 'surgeryDate'
    ]));
    const [columnOrder, setColumnOrder] = useState<string[]>([]);

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
            const [patientsData, configData, schemaData] = await Promise.all([
                getPatients(),
                import('./config-actions').then(m => m.getConfig()),
                getSchemaAction()
            ]);
            setPatients(patientsData);
            setConfig(configData);
            setSchema(schemaData);
            
            // Try to load saved column preferences
            const savedColumns = localStorage.getItem('visible_columns');
            if (savedColumns) {
                try {
                    setVisibleColumnIds(new Set(JSON.parse(savedColumns)));
                } catch (e) {
                    console.error("Failed to parse saved columns");
                }
            }

            const savedOrder = localStorage.getItem('column_order');
            if (savedOrder) {
                try {
                    setColumnOrder(JSON.parse(savedOrder));
                } catch (e) {
                    console.error("Failed to parse saved column order");
                }
            }
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

        const fullNameMatch = document.cookie.match(/fullname=([^;]+)/);
        if (fullNameMatch) {
            setUserFullName(decodeURIComponent(fullNameMatch[1]));
        }
    }, []);

    const handleSort = (key: keyof Patient) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const orderedVisibleFields = useMemo(() => {
        const fields = schema.filter(f => visibleColumnIds.has(f.id));
        if (columnOrder.length > 0) {
            fields.sort((a, b) => {
                const idxA = columnOrder.indexOf(a.id);
                const idxB = columnOrder.indexOf(b.id);
                if (idxA === -1 && idxB === -1) return a.order - b.order;
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            });
        } else {
            fields.sort((a, b) => a.order - b.order);
        }
        return fields;
    }, [schema, visibleColumnIds, columnOrder]);

    const handleColumnDragStart = (e: DragEvent, id: string) => {
        e.dataTransfer.setData('text/plain', id);
    };

    const handleColumnDrop = (e: DragEvent, targetId: string) => {
        const sourceId = e.dataTransfer.getData('text/plain');
        if (!sourceId || sourceId === targetId) return;

        let newOrder = [...columnOrder];
        if (newOrder.length === 0) {
            newOrder = orderedVisibleFields.map(f => f.id);
        } else {
            const missing = orderedVisibleFields.map(f => f.id).filter(id => !newOrder.includes(id));
            if (missing.length > 0) {
                newOrder = [...newOrder, ...missing];
            }
        }

        const sourceIdx = newOrder.indexOf(sourceId);
        const targetIdx = newOrder.indexOf(targetId);

        if (sourceIdx !== -1 && targetIdx !== -1) {
            const [removed] = newOrder.splice(sourceIdx, 1);
            newOrder.splice(targetIdx, 0, removed);
            setColumnOrder(newOrder);
            localStorage.setItem('column_order', JSON.stringify(newOrder));
        }
    };

    const handleColumnDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleLgpdAccept = async () => {
        try {
            await logLgpdConsentAction();
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
            
            // Perist to backend
            try {
                const res = await updatePatientAction(updatedPatient);
                if (!res.success) {
                    console.error("Erro ao salvar o status");
                    // Reverte se falhar
                    setPatients(prev => prev.map(p => p.id === patientId ? patient : p));
                }
            } catch(e) {
                console.error(e);
                setPatients(prev => prev.map(p => p.id === patientId ? patient : p));
            }
        }
    };

    const filteredPatients = useMemo(() => {
        const result = patients.filter((p) => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = searchTerm === "" || Object.values(p).some(value => {
                if (typeof value === 'string' || typeof value === 'number') {
                    return String(value).toLowerCase().includes(searchLower);
                }
                if (Array.isArray(value)) {
                    return value.some(v => String(v).toLowerCase().includes(searchLower));
                }
                return false;
            });
            const matchesTeam = selectedTeams.length === 0 || selectedTeams.includes(String(p.team || ""));
            const matchesSistema = selectedSistemas.length === 0 || selectedSistemas.includes(String(p.sistema || ""));
            const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes((p.status as PatientStatus) || "SEM STATUS");
            const matchesUti = utiFilter === 'Todos' || p.needsICU === utiFilter;
            return matchesSearch && matchesTeam && matchesSistema && matchesStatus && matchesUti;
        });

        // Always prioritize Priority 1, then 2, then 3
        result.sort((a, b) => {
            const prioA = a.priority || '3';
            const prioB = b.priority || '3';
            
            // Force Priority 1 > 2 > 3
            if (prioA !== prioB) {
                return String(prioA).localeCompare(String(prioB));
            }
            
            // Secondary sort by sortConfig if active
            if (sortConfig.key !== 'none') {
                const key = sortConfig.key as keyof Patient;
                const aVal = String(a[key] || "");
                const bVal = String(b[key] || "");
                return sortConfig.direction === 'asc' 
                    ? aVal.localeCompare(bVal, undefined, { numeric: true }) 
                    : bVal.localeCompare(aVal, undefined, { numeric: true });
            }
            return 0;
        });

        return result;
    }, [searchTerm, selectedTeams, selectedSistemas, selectedStatuses, utiFilter, sortConfig, patients]);

    const stats = useMemo(() => {
        const base = patients.filter(p => {
             const searchLower = searchTerm.toLowerCase();
             const matchesSearch = searchTerm === "" || Object.values(p).some(value => {
                 if (typeof value === 'string' || typeof value === 'number') {
                     return String(value).toLowerCase().includes(searchLower);
                 }
                 if (Array.isArray(value)) {
                     return value.some(v => String(v).toLowerCase().includes(searchLower));
                 }
                 return false;
             });
            const matchesTeam = selectedTeams.length === 0 || selectedTeams.includes(String(p.team || ""));
            return matchesSearch && matchesTeam;
        });
        
        return [
            { label: "(TODOS)", type: 'Todas' as PatientStatus | 'Todas', count: base.length, utiCount: base.filter(p => p.needsICU === 'Sim').length, color: "text-white", bg: "bg-[#0a1f44]", border: 'border-blue-900', isSummary: true },
            { label: "AGENDADOS", type: 'AGENDADOS' as PatientStatus, count: base.filter(p => p.status === 'AGENDADOS').length, utiCount: base.filter(p => p.status === 'AGENDADOS' && p.needsICU === 'Sim').length, color: "text-blue-600", bg: "bg-blue-50", border: 'border-blue-400' },
            { label: "PRONTOS", type: 'PRONTOS' as PatientStatus, count: base.filter(p => p.status === 'PRONTOS').length, utiCount: base.filter(p => p.status === 'PRONTOS' && p.needsICU === 'Sim').length, color: "text-emerald-600", bg: "bg-emerald-50", border: 'border-emerald-400' },
            { label: "OBSERVAÇÕES\nPENDÊNCIAS", type: 'OBSERVAÇÕES/PENDÊNCIAS' as PatientStatus, count: base.filter(p => p.status === 'OBSERVAÇÕES/PENDÊNCIAS').length, utiCount: base.filter(p => p.status === 'OBSERVAÇÕES/PENDÊNCIAS' && p.needsICU === 'Sim').length, color: "text-rose-600", bg: "bg-rose-50", border: 'border-rose-400' },
            { label: "DISCUTIR\nEM ROUND", type: 'DISCUTIR EM ROUND' as PatientStatus, count: base.filter(p => p.status === 'DISCUTIR EM ROUND').length, utiCount: base.filter(p => p.status === 'DISCUTIR EM ROUND' && p.needsICU === 'Sim').length, color: "text-yellow-600", bg: "bg-yellow-50", border: 'border-yellow-400' },
            { label: "SEM STATUS", type: 'SEM STATUS' as PatientStatus, count: base.filter(p => p.status === 'SEM STATUS').length, utiCount: base.filter(p => p.status === 'SEM STATUS' && p.needsICU === 'Sim').length, color: "text-slate-800", bg: "bg-slate-50", border: 'border-slate-300' },
            { label: "CIRURGIA REALIZADA", type: 'CIRURGIA REALIZADA' as PatientStatus, count: base.filter(p => p.status === 'CIRURGIA REALIZADA').length, utiCount: base.filter(p => p.status === 'CIRURGIA REALIZADA' && p.needsICU === 'Sim').length, color: "text-orange-500", bg: "bg-orange-50", border: 'border-orange-400' },
            { label: "PERDA DE SEGUIMENTO", type: 'PERDA DE SEGUIMENTO' as PatientStatus, count: base.filter(p => p.status === 'PERDA DE SEGUIMENTO').length, utiCount: base.filter(p => p.status === 'PERDA DE SEGUIMENTO' && p.needsICU === 'Sim').length, color: "text-[#78350f]", bg: "bg-[#fef3c7]", border: 'border-[#78350f]' },
        ];
    }, [patients, searchTerm, selectedTeams]);

    const getStatusStyle = (status: PatientStatus) => {
        switch (status) {
            case "PRONTOS": return "bg-emerald-500 text-white";
            case "OBSERVAÇÕES/PENDÊNCIAS": return "bg-rose-500 text-white";
            case "DISCUTIR EM ROUND": return "bg-yellow-500 text-white";
            case "AGENDADOS": return "bg-blue-500 text-white";
            case "CIRURGIA REALIZADA": return "bg-orange-500 text-white";
            case "PERDA DE SEGUIMENTO": return "bg-[#78350f] text-white";
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
        case '3': return 'bg-white hover:bg-slate-50 text-slate-700';
        default: return 'bg-white hover:bg-slate-50 text-slate-700';
    }
};

    const renderDate = (dateStr: string) => {
        if (!dateStr || dateStr === '--') return '--';
        // Convert YYYY-MM-DD to DD/MM/YYYY
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    };

    const renderTableCell = (patient: Patient, field: FieldSchema) => {
        const value = patient[field.id as keyof Patient];
        
        if (field.id === 'status') {
            return (
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-wide inline-block min-w-[100px] text-center ${getStatusStyle(String(value || 'SEM STATUS') as PatientStatus)}`}>
                    {String(value || 'SEM STATUS')}
                </span>
            );
        }

        if (field.id === 'position') {
            return (
                <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{String(value || '--')}</span>
            );
        }

        if (field.id === 'teamPosition') {
            return (
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{String(value || '--')}</span>
            );
        }

        if (field.id === 'name') {
            return (
                <div className="flex flex-col">
                    <span className="text-sm transition-colors text-black font-semibold uppercase">
                        {String(value || '--')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">
                        {patient.age ? `${patient.age} anos` : ''}
                    </span>
                </div>
            );
        }

        if (field.type === 'date') {
            return (
                <span className="text-[10px] text-black uppercase font-medium">
                    {renderDate(String(value || '--'))}
                </span>
            );
        }

        return (
            <span className={`text-black uppercase ${field.type === 'number' ? 'font-mono text-xs' : 'text-[10px] font-medium'}`}>
                {String(value || '--')}
            </span>
        );
    };

    const SortIcon = ({ column }: { column: string }) => {
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
                    {[...config.teams].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((team) => {
                        const Icon = teamIcons[team] || Stethoscope;
                        const isSelected = selectedTeams.includes(team);
                        // Get unique systems present in this team's patients
                        const teamSistemas = [...new Set(
                            patients
                                .filter(p => p.team === team && p.sistema && String(p.sistema).trim() !== '')
                                .map(p => String(p.sistema))
                        )].sort((a, b) => a.localeCompare(b, 'pt-BR'));
                        return (
                            <div key={team}>
                                <button
                                    onClick={() => {
                                        setSelectedTeams(prev => 
                                            prev.includes(team) 
                                                ? prev.filter(t => t !== team)
                                                : [...prev, team]
                                        );
                                        // Clear sistema sub-filter when deselecting team
                                        if (selectedTeams.includes(team)) {
                                            setSelectedSistemas([]);
                                        }
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

                                {/* Sistema submenu - shown when team is selected and has systems */}
                                {isSelected && teamSistemas.length > 0 && (
                                    <div className="ml-4 mt-0.5 mb-1 space-y-0.5 border-l border-white/10 pl-2">
                                        {teamSistemas.map(sistema => {
                                            const isSistemaSelected = selectedSistemas.includes(sistema);
                                            const count = patients.filter(p => p.team === team && p.sistema === sistema).length;
                                            return (
                                                <button
                                                    key={sistema}
                                                    onClick={() => setSelectedSistemas(prev =>
                                                        prev.includes(sistema)
                                                            ? prev.filter(s => s !== sistema)
                                                            : [...prev, sistema]
                                                    )}
                                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${
                                                        isSistemaSelected
                                                            ? 'bg-blue-500/20 text-blue-300 font-bold'
                                                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                                    }`}
                                                >
                                                    <span className="truncate">{sistema}</span>
                                                    <span className="text-[9px] font-bold bg-white/10 px-1 rounded-full ml-1 shrink-0">{count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                </nav>
                
                <div className="p-4 mt-auto border-t border-white/5 space-y-1">
                    <button 
                        onClick={() => setIsProfileOpen(true)}
                        className="w-full flex items-center gap-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-xs py-2 px-3 rounded-lg transition-all"
                        title="Configurações de Perfil"
                    >
                        <User size={14} />
                        <span className="font-bold uppercase tracking-wider">Meu Perfil</span>
                    </button>

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
                            document.cookie = "username=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs sm:text-sm lg:text-lg font-black text-slate-900 uppercase">
                                    OLÁ, {userFullName || userName || userRole || 'NOME'}
                                </span>
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
                    <div className="h-14 flex items-center justify-between px-4 lg:px-8 bg-slate-50/30 overflow-x-auto lg:overflow-visible no-scrollbar gap-4">
                        <div className="flex items-center gap-4">

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
                                <button 
                                    onClick={() => setViewMode("calendar")}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        viewMode === "calendar" ? "bg-[#0a1f44] text-white shadow-md" : "text-slate-500 hover:text-slate-700"
                                    }`}
                                >
                                    <CalendarIcon size={14} />
                                    <span>Calendário</span>
                                </button>
                            </div>
                        </div>
                              {/* Header Actions */}
                        <div className="flex items-center gap-3">
                            {/* Column Toggle */}
                            <div className="relative">
                                <button 
                                    onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all border shadow-sm active:scale-95 ${
                                        isColumnMenuOpen ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                    }`}
                                >
                                    <Settings size={16} className={isColumnMenuOpen ? "animate-spin-slow" : ""} />
                                    <span>Colunas</span>
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${isColumnMenuOpen ? "rotate-180" : ""}`} />
                                </button>

                                {isColumnMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsColumnMenuOpen(false)} />
                                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 py-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            <div className="px-4 py-2 border-b border-slate-50 mb-2">
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Colunas Visíveis</span>
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto px-2 space-y-0.5">
                                                {schema
                                                    .filter(f => !f.isSystem || f.id === 'name')
                                                    .sort((a, b) => a.order - b.order)
                                                    .map(field => {
                                                        const isVisible = visibleColumnIds.has(field.id);
                                                        return (
                                                            <button
                                                                key={field.id}
                                                                onClick={() => {
                                                                    const newIds = new Set(visibleColumnIds);
                                                                    if (isVisible) newIds.delete(field.id);
                                                                    else newIds.add(field.id);
                                                                    setVisibleColumnIds(newIds);
                                                                    localStorage.setItem('visible_columns', JSON.stringify(Array.from(newIds)));
                                                                }}
                                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${isVisible ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                                            >
                                                                <span className="text-xs uppercase tracking-tight">{field.label}</span>
                                                                {isVisible ? (
                                                                    <div className="w-5 h-5 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                                                                        <Check size={12} className="text-white" strokeWidth={4} />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-5 h-5 border-2 border-slate-200 rounded-lg" />
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Report Button */}
                            <button 
                                onClick={() => setIsReportOpen(true)}
                                className="flex items-center gap-2 bg-white border border-slate-200/80 text-slate-700 px-6 py-2 rounded-xl text-sm font-black shadow-sm hover:border-blue-400 hover:text-blue-600 transition-all active:scale-95 group"
                                title="Gerar Relatório Personalizado"
                            >
                                <FileText size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                <span>Relatórios</span>
                            </button>
                        </div>
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
                                    <span className={`text-lg sm:text-xl lg:text-2xl font-bold ${stat.isSummary ? 'text-white' : (stat.label === 'CIRURGIA REALIZADA' ? 'text-orange-500' : stat.label === 'PERDA DE SEGUIMENTO' ? 'text-[#78350f]' : stat.label === 'PRONTOS' ? 'text-emerald-600' : stat.label.includes('OBSERVAÇÕES') ? 'text-rose-600' : stat.label.includes('DISCUTIR') ? 'text-yellow-600' : 'text-slate-900')}`}>{stat.count}</span>
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        {!stat.isSummary && <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${stat.label === 'CIRURGIA REALIZADA' ? 'bg-orange-500' : stat.label === 'PERDA DE SEGUIMENTO' ? 'bg-[#78350f]' : stat.label === 'PRONTOS' ? 'bg-emerald-500' : stat.label.includes('OBSERVAÇÕES') ? 'bg-rose-500' : stat.label.includes('DISCUTIR') ? 'bg-yellow-500' : (stat.color === 'text-slate-800' ? 'bg-slate-400' : stat.bg.replace('50', '500'))}`} />}
                                        <span className={`text-[7px] sm:text-[8px] lg:text-[10px] font-bold uppercase tracking-wider whitespace-pre-line leading-tight ${stat.isSummary ? 'text-slate-300' : stat.color}`}>{stat.label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Table View (Desktop) / Card View (Mobile) */}
                    {viewMode === "calendar" ? (
                        <CalendarView patients={filteredPatients} onPatientClick={(p) => { setSelectedPatient(p); setIsModalOpen(true); }} />
                    ) : viewMode === "lista" ? (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px] lg:min-w-0">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            {orderedVisibleFields.map(field => (
                                                    <th 
                                                        key={field.id}
                                                        draggable
                                                        onDragStart={(e) => handleColumnDragStart(e, field.id)}
                                                        onDragOver={handleColumnDragOver}
                                                        onDrop={(e) => handleColumnDrop(e, field.id)}
                                                        onClick={() => handleSort(field.id as keyof Patient)} 
                                                        className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group hover:bg-slate-100 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-1.5 pointer-events-none">
                                                            {field.label} 
                                                            <SortIcon column={field.id} />
                                                        </div>
                                                    </th>
                                                ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loading ? (
                                            Array.from({ length: 10 }).map((_, i) => (
                                                <tr key={i} className="animate-pulse">
                                                    <td colSpan={visibleColumnIds.size} className="px-6 py-4 h-14 bg-slate-50/50" />
                                                </tr>
                                            ))
                                        ) : (
                                            filteredPatients.map((patient) => (
                                                <tr 
                                                    key={patient.id} 
                                                    onClick={() => { setSelectedPatient(patient); setIsModalOpen(true); }}
                                                    className={`transition-colors cursor-pointer group ${getRowPriorityClass(String(patient.priority || '3'))}`}
                                                >
                                                    {orderedVisibleFields.map(field => (
                                                             <td key={field.id} className="px-6 py-4">
                                                                 {renderTableCell(patient, field)}
                                                             </td>
                                                         ))}
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
                                                <span className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black tracking-wide ${getStatusStyle(String(patient.status || 'SEM STATUS') as PatientStatus)}`}>
                                                    {String(patient.status || 'SEM STATUS')}
                                                </span>
                                                <div className={`p-1 sm:p-1.5 rounded-lg ${patient.priority === '1' ? 'bg-red-50 text-red-600' : patient.priority === '2' ? 'bg-yellow-50 text-yellow-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    <Activity size={14} className="sm:hidden" />
                                                    <Activity size={16} className="hidden sm:block" />
                                                </div>
                                            </div>
                                            
                                            <div className="mb-2 sm:mb-4">
                                                <h4 className="text-sm sm:text-base font-bold text-slate-800 leading-tight mb-0.5 sm:mb-1 uppercase">{patient.name}</h4>
                                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prontuário: {patient.medicalRecord}</p>
                                            </div>

                                            <div className="flex flex-col gap-1 sm:gap-2 pt-2 sm:pt-4 border-t border-slate-50">
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-1 sm:pb-2">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Posição GERAL / EQUIPE</span>
                                                    <span className="text-[10px] sm:text-xs"><span className="font-black text-blue-600 mr-1.5" title="Posição Geral">#{String(patient.position || '--')}</span><span className="font-black text-emerald-600" title="Posição Equipe">#{String(patient.teamPosition || '--')}</span></span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-1 sm:pb-2">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe / Sistema</span>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 text-right">{patient.team} <span className="text-slate-300 mx-1">•</span> {patient.sistema}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-1 sm:pb-2">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Data AIH</span>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 text-right">{renderDate(String(patient.aihDate || ''))}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-1 sm:pb-2">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Cirurgia</span>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 text-right">{renderDate(String(patient.surgeryDate || ''))}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-1 sm:pb-2">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Preceptor</span>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 text-right">{String(patient.preceptor || '--')}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Residente</span>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 text-right">{String(patient.resident || '--')}</span>
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
                        <div className="flex gap-4 sm:gap-6 pb-6 overflow-x-auto no-scrollbar snap-x snap-mandatory lg:snap-none -mx-4 px-4 sm:mx-0 sm:px-0">
                            {(selectedStatuses.length > 0
                                ? ["SEM STATUS", "AGENDADOS", "OBSERVAÇÕES/PENDÊNCIAS", "DISCUTIR EM ROUND", "PRONTOS", "CIRURGIA REALIZADA", "PERDA DE SEGUIMENTO"].filter(s => selectedStatuses.includes(s as PatientStatus))
                                : ["SEM STATUS", "AGENDADOS", "OBSERVAÇÕES/PENDÊNCIAS", "DISCUTIR EM ROUND", "PRONTOS", "CIRURGIA REALIZADA", "PERDA DE SEGUIMENTO"]
                            ).map((status) => {
                                const colPatients = filteredPatients.filter(p => p.status === status);
                                return (
                                <div 
                                    key={status} 
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, status as PatientStatus)}
                                    className="w-[280px] sm:w-80 flex-shrink-0 bg-slate-100 rounded-2xl p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 border-2 border-transparent transition-colors hover:border-blue-200 snap-center"
                                >
                                    <div className="flex items-center justify-between px-1">
                                        <h3 className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest">{status}</h3>
                                        <span className="bg-white/50 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-slate-200/50">
                                            {colPatients.length}
                                        </span>
                                    </div>
                                    <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                                        {colPatients.map((p) => (
                                            <div 
                                                key={p.id} 
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, p.id)}
                                                onClick={() => { setSelectedPatient(p); setIsModalOpen(true); }}
                                                className={`bg-white p-4 rounded-xl shadow-sm border-l-4 border-y border-r border-slate-200 cursor-grab active:cursor-grabbing hover:border-blue-400 transition-all hover:shadow-md active:scale-[0.98] group ${
                                                    String(p.priority || '3') === '1' ? 'border-l-red-500' :
                                                    String(p.priority || '3') === '2' ? 'border-l-yellow-500' :
                                                    'border-l-emerald-500'
                                                }`}
                                            >
                                                <p className={`text-xs font-bold mb-1 truncate uppercase ${getPriorityStyle(String(p.priority || '3'))}`}>{p.name}</p>
                                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                                                    <span className="truncate max-w-[120px]">{p.team}</span>
                                                    <span className="font-mono">{p.medicalRecord}</span>
                                                </div>
                                                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-50">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[8px] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded text-blue-600 font-black" title="Posição Geral">
                                                            G: #{String(p.position || '--')}
                                                        </span>
                                                        <span className="text-[8px] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-emerald-600 font-black" title="Posição Equipe">
                                                            E: #{String(p.teamPosition || '--')}
                                                        </span>
                                                        <span className="text-[8px] bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-400 font-black uppercase tracking-tighter">
                                                            {String(p.sistema || '--')}
                                                        </span>
                                                    </div>
                                                    {p.examPdfPath && (
                                                        <FileText size={12} className="text-blue-500" />
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
            <ProfileModal 
                isOpen={isProfileOpen} 
                onClose={() => setIsProfileOpen(false)} 
            />
        </div>
    );
}
