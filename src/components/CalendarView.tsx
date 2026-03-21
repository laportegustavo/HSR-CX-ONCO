"use client";

import { useState } from "react";
import { Patient } from "../types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DateTime } from "luxon";

interface CalendarViewProps {
    patients: Patient[];
    onPatientClick: (patient: Patient) => void;
}

export default function CalendarView({ patients, onPatientClick }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(() => DateTime.now().setZone('America/Sao_Paulo'));

    const startOfWeek = currentDate.startOf("week"); // Monday
    const days = Array.from({ length: 7 }, (_, i) => startOfWeek.plus({ days: i }));

    const handlePrevWeek = () => setCurrentDate(curr => curr.minus({ weeks: 1 }));
    const handleNextWeek = () => setCurrentDate(curr => curr.plus({ weeks: 1 }));
    const handleToday = () => setCurrentDate(DateTime.now().setZone('America/Sao_Paulo'));

    const surgeries = (() => {
        return patients.filter(p => {
            if (!p.surgeryDate || typeof p.surgeryDate !== 'string' || p.surgeryDate === '--') return false;
            
            const parts = p.surgeryDate.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const year = parseInt(parts[2], 10);
                
                if (isNaN(day) || isNaN(month) || isNaN(year) || month < 1 || month > 12 || day < 1 || day > 31) return false;

                const date = DateTime.fromObject({ year, month, day }, { zone: 'America/Sao_Paulo' });
                if (date.isValid && date >= startOfWeek && date <= startOfWeek.plus({ days: 6 }).endOf("day")) {
                    return true;
                }
            } else if (p.surgeryDate.includes('-')) {
                const date = DateTime.fromISO(p.surgeryDate).setZone('America/Sao_Paulo');
                if (date.isValid && date >= startOfWeek && date <= startOfWeek.plus({ days: 6 }).endOf("day")) {
                    return true;
                }
            }
            return false;
        });
    })();

    const getSurgeriesForDate = (date: DateTime) => {
        return surgeries.filter(p => {
            if (!p.surgeryDate || typeof p.surgeryDate !== 'string') return false;
            const parts = p.surgeryDate.split('/');
            if (parts.length === 3) {
                return parseInt(parts[0], 10) === date.day && parseInt(parts[1], 10) === date.month && parseInt(parts[2], 10) === date.year;
            } else if (p.surgeryDate!.includes('-')) {
                 const pDate = DateTime.fromISO(p.surgeryDate!).setZone('America/Sao_Paulo');
                 return pDate.hasSame(date, 'day');
            }
            return false;
        });
    };

    const hasAIH = (aihDate?: string | null) => {
        return typeof aihDate === 'string' && aihDate !== '--' && aihDate !== '00/00/0000' && aihDate.trim() !== '';
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] mb-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight capitalize">
                        {startOfWeek.toFormat("LLLL yyyy", { locale: 'pt-BR' })}
                    </h2>
                    <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm p-1 gap-1">
                        <button onClick={handlePrevWeek} title="Semana Anterior" className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors">
                            <ChevronLeft size={18} />
                        </button>
                        <button onClick={handleToday} title="Ir para Hoje" className="px-3 py-1 hover:bg-slate-100 text-xs font-bold text-slate-600 uppercase tracking-widest rounded transition-colors">
                            Hoje
                        </button>
                        <button onClick={handleNextWeek} title="Próxima Semana" className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                        <div className="w-2 h-2 rounded bg-emerald-500"></div> Prontos
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                        <div className="w-2 h-2 rounded bg-orange-500"></div> Cirurgia Realizada
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                        <div className="w-2 h-2 rounded bg-blue-500"></div> Outros
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto">
                <div className="min-w-[800px] h-full flex flex-col">
                    <div className="grid grid-cols-7 border-b border-slate-200 shrink-0">
                        {days.map((day, i) => {
                            const isToday = day.hasSame(DateTime.now(), "day");
                            return (
                                <div key={i} className={`py-3 px-2 text-center border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-blue-50/50' : ''}`}>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                                        {day.toFormat('ccc', { locale: 'pt-BR' })}
                                    </p>
                                    <div className={`mt-1 mx-auto w-8 h-8 flex items-center justify-center rounded-full text-lg font-bold ${
                                        isToday ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-700'
                                    }`}>
                                        {day.toFormat('d')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex-1 grid grid-cols-7 relative">
                        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between opacity-10 py-2">
                             {[...Array(12)].map((_, idx) => (
                                 <div key={idx} className="border-t border-slate-400 w-full h-10" />
                             ))}
                        </div>

                        {days.map((day, i) => {
                            const daySurgeries = getSurgeriesForDate(day);
                            const isToday = day.hasSame(DateTime.now(), "day");
                            return (
                                <div key={i} className={`min-h-[400px] border-r border-slate-100 last:border-r-0 p-1.5 space-y-1.5 relative ${isToday ? 'bg-blue-50/10' : ''}`}>
                                    {daySurgeries.map((patient) => {
                                        const aih = hasAIH(patient.aihDate);
                                        return (
                                            <div 
                                                key={patient.id} 
                                                onClick={() => onPatientClick(patient)}
                                                className={`p-2 rounded-lg cursor-pointer transition-all hover:-translate-y-0.5 shadow-sm active:scale-95 border-l-4 relative z-10 ${
                                                    patient.status === 'CIRURGIA REALIZADA' 
                                                        ? 'bg-orange-50/90 border-l-orange-500 hover:shadow-orange-500/20' 
                                                        : (patient.status === 'PRONTOS' 
                                                            ? 'bg-emerald-50/90 border-l-emerald-500 hover:shadow-emerald-500/20' 
                                                            : 'bg-blue-50/90 border-l-blue-500 hover:shadow-blue-500/20')
                                                }`}
                                            >
                                                <p className="text-[11px] font-black text-slate-800 leading-tight mb-1" title={patient.name}>
                                                    {patient.name}
                                                </p>
                                                <div className="flex flex-col gap-0.5 mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                                    <span>EQ: {patient.team}</span>
                                                    <span className={`${aih ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                        {aih ? `AIH: ${patient.aihDate}` : 'SEM AIH'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
