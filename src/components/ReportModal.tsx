"use client";

import { useState } from "react";
import { X, Printer, Check, ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { Patient } from "../types";

interface ReportModalProps {
    patients: Patient[];
    isOpen: boolean;
    onClose: () => void;
}

const allColumns = [
    { key: 'status', label: 'Status' },
    { key: 'team', label: 'Equipe' },
    { key: 'sistema', label: 'Sistema' },
    { key: 'preceptor', label: 'Preceptor' },
    { key: 'name', label: 'Nome do Paciente' },
    { key: 'medicalRecord', label: 'Prontuário' },
    { key: 'aihDate', label: 'Data AIH' },
    { key: 'surgeryDate', label: 'Data Cirurgia' },
    { key: 'resident', label: 'Residente' },
    { key: 'auxiliaryResidents', label: 'Residente Auxiliar' },
    { key: 'priority', label: 'Prioridade' },
    { key: 'hospital', label: 'Local da Cirurgia' },
    { key: 'operatingRoom', label: 'Sala' },
    { key: 'surgeryTime', label: 'Horário' },
    { key: 'needsICU', label: 'UTI' },
    { key: 'contactPhone', label: 'Telefone' },
    { key: 'city', label: 'Cidade' },
    { key: 'waitTime', label: 'Tempo de Espera (Dias)' },
];

export default function ReportModal({ patients, isOpen, onClose }: ReportModalProps) {
    const [selectedColumns, setSelectedColumns] = useState<string[]>(['status', 'team', 'name', 'surgeryDate', 'needsICU']);
    const [sortKey, setSortKey] = useState<keyof Patient>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const [filters, setFilters] = useState<Record<string, string[]>>({
        preceptor: [],
        resident: [],
        auxiliaryResidents: [],
        status: [],
        sistema: [],
        team: [],
        priority: [],
        hospital: []
    });
    const [activeFilterTab, setActiveFilterTab] = useState<string | null>(null);

    if (!isOpen) return null;

    const uniqueOptions = {
        preceptor: (Array.from(new Set(patients.map(p => p.preceptor).filter(Boolean))) as string[]).sort(),
        resident: (Array.from(new Set(patients.map(p => p.resident).filter(Boolean))) as string[]).sort(),
        auxiliaryResidents: (Array.from(new Set(patients.flatMap(p => p.auxiliaryResidents || []))).filter(Boolean) as string[]).sort(),
        status: (Array.from(new Set(patients.map(p => p.status).filter(Boolean))) as string[]).sort(),
        sistema: (Array.from(new Set(patients.map(p => p.sistema).filter(Boolean))) as string[]).sort(),
        team: (Array.from(new Set(patients.map(p => p.team).filter(Boolean))) as string[]).sort(),
        hospital: (Array.from(new Set(patients.map(p => p.hospital).filter(Boolean))) as string[]).sort(),
        priority: ['1', '2', '3']
    };

    const toggleFilter = (category: string, value: string) => {
        setFilters(prev => {
            const current = prev[category] || [];
            if (current.includes(value)) {
                return { ...prev, [category]: current.filter(v => v !== value) };
            } else {
                return { ...prev, [category]: [...current, value] };
            }
        });
    };

    const toggleColumn = (key: string) => {
        setSelectedColumns(prev => 
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const handlePrint = () => {
        const filteredData = patients.filter(p => {
            if (filters.preceptor.length > 0 && (!p.preceptor || !filters.preceptor.includes(p.preceptor))) return false;
            if (filters.resident.length > 0 && (!p.resident || !filters.resident.includes(p.resident))) return false;
            if (filters.auxiliaryResidents.length > 0 && (!p.auxiliaryResidents || !p.auxiliaryResidents.some(r => filters.auxiliaryResidents.includes(r)))) return false;
            if (filters.status.length > 0 && (!p.status || !filters.status.includes(p.status))) return false;
            if (filters.sistema.length > 0 && (!p.sistema || !filters.sistema.includes(p.sistema))) return false;
            if (filters.team.length > 0 && (!p.team || !filters.team.includes(p.team))) return false;
            if (filters.priority.length > 0 && (!p.priority || !filters.priority.includes(p.priority))) return false;
            if (filters.hospital.length > 0 && (!p.hospital || !filters.hospital.includes(p.hospital))) return false;
            return true;
        });

        const sortedData = [...filteredData].sort((a, b) => {
            const aVal = String(a[sortKey] || "");
            const bVal = String(b[sortKey] || "");
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const columns = allColumns.filter(c => selectedColumns.includes(c.key));
        
        const html = `
            <html>
                <head>
                    <title>Relatório de Pacientes - HSR</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        h1 { text-align: center; color: #0a1f44; margin-bottom: 5px; }
                        p.subtitle { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th { background-color: #f8fafc; color: #1e293b; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; padding: 12px 8px; border: 1px solid #e2e8f0; text-align: left; }
                        td { border: 1px solid #e2e8f0; padding: 10px 8px; font-size: 11px; }
                        tr:nth-child(even) { background-color: #f1f5f9; }
                        .priority-1 { border-left: 4px solid #ef4444; }
                        .priority-2 { border-left: 4px solid #f59e0b; }
                        .priority-3 { border-left: 4px solid #10b981; }
                        @media print {
                            @page { margin: 1cm; }
                            body { padding: 0; }
                            table { page-break-inside: auto; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                        }
                    </style>
                </head>
                <body>
                    <h1>HSR CRM CIRÚRGICO</h1>
                    <p class="subtitle">Relatório gerado em ${new Date().toLocaleString('pt-BR')}</p>
                    <table>
                        <thead>
                            <tr>
                                ${columns.map(c => `<th>${c.label}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedData.map(p => {
                                const calculateWait = (aih: string, surg: string) => {
                                    if (!aih || !surg || aih === '--' || surg === '--') return '--';
                                    try {
                                        const parseDate = (d: string) => {
                                            if (d.includes('-')) return new Date(d);
                                            const [day, month, year] = d.split('/');
                                            return new Date(`${year}-${month}-${day}`);
                                        };
                                        const date1 = parseDate(aih);
                                        const date2 = parseDate(surg);
                                        if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return '--';
                                        const diffTime = date2.getTime() - date1.getTime();
                                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                        return diffDays >= 0 ? diffDays.toString() : '0';
                                    } catch { return '--'; }
                                };

                                return `
                                    <tr class="priority-${p.priority || '3'}">
                                        ${columns.map(c => {
                                            if (c.key === 'waitTime') {
                                                return `<td>${calculateWait(p.aihDate || '', p.surgeryDate || '')}</td>`;
                                            }
                                            if (c.key === 'auxiliaryResidents') {
                                                return `<td>${(p.auxiliaryResidents || []).join(', ') || '--'}</td>`;
                                            }
                                            return `<td>${p[c.key as keyof Patient] || '--'}</td>`;
                                        }).join('')}
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-950/40 p-4">
            <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Gerar Relatório (PDF)</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Selecione as colunas e a ordenação</p>
                    </div>
                    <button onClick={onClose} title="Fechar modal de relatório" className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 pb-32">
                    {/* Columns selection */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Colunas Visíveis</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {allColumns.map(col => (
                                <button 
                                    key={col.key}
                                    onClick={() => toggleColumn(col.key)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                                        selectedColumns.includes(col.key) 
                                        ? 'border-blue-600 bg-blue-50 text-blue-700' 
                                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                        selectedColumns.includes(col.key) ? 'bg-blue-600 border-blue-600' : 'border-slate-200 bg-white'
                                    }`}>
                                        {selectedColumns.includes(col.key) && <Check size={12} className="text-white" strokeWidth={4} />}
                                    </div>
                                    <span className="text-xs font-bold">{col.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filters section */}
                    <div className="space-y-3 pt-4 border-t border-slate-50 relative">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Filtros Adicionais</h3>
                            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">Vazio = Todos</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                                { key: 'preceptor', label: 'Preceptor' },
                                { key: 'resident', label: 'Residente' },
                                { key: 'auxiliaryResidents', label: 'Res. Auxiliar' },
                                { key: 'status', label: 'Status' },
                                { key: 'sistema', label: 'Sistema' },
                                { key: 'team', label: 'Equipe' },
                                { key: 'hospital', label: 'Local da Cirurgia' },
                                { key: 'priority', label: 'Prioridade' }
                            ].map(category => (
                                <div key={category.key} className="relative group">
                                    <button 
                                        onClick={() => setActiveFilterTab(activeFilterTab === category.key ? null : category.key)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all ${
                                            (filters[category.key] && filters[category.key].length > 0) 
                                                ? 'border-blue-600 bg-blue-50 text-blue-700' 
                                                : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className="text-[10px] sm:text-[11px] font-bold truncate pr-1">
                                            {category.label}
                                            {(filters[category.key] && filters[category.key].length > 0) && ` (${filters[category.key].length})`}
                                        </span>
                                        <ChevronDown size={14} className={`transition-transform flex-shrink-0 text-slate-400 ${activeFilterTab === category.key ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {activeFilterTab === category.key && (
                                        <div className="absolute z-50 w-48 sm:w-56 mt-1 bg-white border border-slate-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-1 max-h-56 overflow-y-auto left-0">
                                            {uniqueOptions[category.key as keyof typeof uniqueOptions].map(opt => (
                                                <label key={opt} className="flex items-center gap-2 p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors border-b border-slate-50 last:border-0" onClick={(e) => e.stopPropagation()}>
                                                    <input 
                                                        type="checkbox"
                                                        className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 w-4 h-4 cursor-pointer"
                                                        checked={filters[category.key]?.includes(opt)}
                                                        onChange={() => toggleFilter(category.key, opt)}
                                                    />
                                                    <span className="text-[11px] font-semibold text-slate-700 truncate select-none" title={opt}>{opt}</span>
                                                </label>
                                            ))}
                                            {uniqueOptions[category.key as keyof typeof uniqueOptions].length === 0 && (
                                                <div className="p-3 bg-slate-50 rounded-lg text-center">
                                                    <p className="text-[10px] font-medium text-slate-400">Nenhuma opção</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sorting section */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Ordernar Por</label>
                            <div className="relative">
                                <select 
                                    value={sortKey} 
                                    onChange={(e) => setSortKey(e.target.value as keyof Patient)}
                                    title="Selecionar coluna para ordenação"
                                    aria-label="Selecionar coluna para ordenação"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 appearance-none focus:border-blue-500 outline-none transition-all"
                                >
                                    {allColumns.map(col => (
                                        <option key={col.key} value={col.key}>{col.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Direção</label>
                            <div className="flex bg-slate-100 p-1 rounded-2xl">
                                <button 
                                    onClick={() => setSortDir('asc')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                                        sortDir === 'asc' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                                    }`}
                                >
                                    <ArrowUp size={14} /> Asc
                                </button>
                                <button 
                                    onClick={() => setSortDir('desc')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                                        sortDir === 'desc' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                                    }`}
                                >
                                    <ArrowDown size={14} /> Desc
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
                    <button 
                        onClick={handlePrint}
                        className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98]"
                    >
                        <Printer size={20} />
                        Gerar e Imprimir PDF
                    </button>
                </div>
            </div>
        </div>
    );
}
