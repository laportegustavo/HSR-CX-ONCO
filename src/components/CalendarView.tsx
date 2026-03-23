"use client";

import { useState } from "react";
import { Patient } from "../types";
import { ChevronLeft, ChevronRight, Stethoscope, Building2 } from "lucide-react";
import { DateTime } from "luxon";
import { useMemo, useLayoutEffect, useRef } from "react";

interface CalendarViewProps {
    patients: Patient[];
    onPatientClick: (patient: Patient) => void;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 to 21:00
const HOUR_HEIGHT = 40;

export default function CalendarView({ patients, onPatientClick }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(() => DateTime.now().setZone('America/Sao_Paulo'));

    const startOfWeek = currentDate.startOf("week"); // Monday
    const days = Array.from({ length: 7 }, (_, i) => startOfWeek.plus({ days: i }));

    const handlePrevWeek = () => setCurrentDate(curr => curr.minus({ weeks: 1 }));
    const handleNextWeek = () => setCurrentDate(curr => curr.plus({ weeks: 1 }));
    const handleToday = () => setCurrentDate(DateTime.now().setZone('America/Sao_Paulo'));

    const parseSurgeryDate = (dateStr: string | undefined): DateTime | null => {
        if (!dateStr || dateStr === '--' || !dateStr.trim() || dateStr.toLowerCase().includes('pendente')) return null;
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/').map(Number);
            if (parts.length !== 3 || parts.some(isNaN)) return null;
            const [d, m, y] = parts;
            return DateTime.fromObject({ year: y, month: m, day: d }, { zone: 'America/Sao_Paulo' });
        }
        const isoDate = DateTime.fromISO(dateStr).setZone('America/Sao_Paulo');
        return isoDate.isValid ? isoDate : null;
    };


    const getTimeOffset = (timeStr?: string) => {
        if (!timeStr || !timeStr.includes(':')) return null;
        const parts = timeStr.split(':').map(Number);
        if (parts.length < 1 || isNaN(parts[0])) return null;
        
        const hours = parts[0];
        const minutes = parts[1] || 0;
        
        const startHour = HOURS[0];
        const relativeHour = (hours + minutes / 60) - startHour;
        
        // Clamp to middle if outside range or return null
        if (relativeHour < 0) return 10; 
        if (relativeHour > HOURS.length) return (HOURS.length - 1) * HOUR_HEIGHT + 20;

        return relativeHour * HOUR_HEIGHT;
    };

    const containerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!containerRef.current) return;
        const cards = containerRef.current.querySelectorAll<HTMLElement>('[data-card-top]');
        cards.forEach(card => {
            const top = card.getAttribute('data-card-top');
            if (top) card.style.top = `${top}px`;
        });
    }, [patients, currentDate]);

    const daySurgeriesMap = useMemo(() => {
        const map = new Map<string, Patient[]>();
        days.forEach(day => {
            const key = day.toFormat('yyyy-MM-dd');
            map.set(key, patients.filter(p => {
                const pDate = parseSurgeryDate(String(p.surgeryDate || ''));
                return pDate && pDate.hasSame(day, 'day');
            }));
        });
        return map;
    }, [patients, days]);



    return (
        <div className="flex flex-col h-[600px] bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden mb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-5 border-b border-slate-100 bg-white gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-100">
                        <select 
                            value={currentDate.month}
                            onChange={(e) => setCurrentDate(curr => curr.set({ month: parseInt(e.target.value) }))}
                            className="bg-transparent text-lg font-black text-slate-900 tracking-tight capitalize outline-none cursor-pointer hover:text-blue-600 transition-colors appearance-none"
                            title="Selecionar Mês"
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i+1} value={i+1}>{DateTime.local(2000, i+1).toFormat('LLLL', { locale: 'pt-BR' })}</option>
                            ))}
                        </select>
                        <select 
                            value={currentDate.year}
                            onChange={(e) => setCurrentDate(curr => curr.set({ year: parseInt(e.target.value) }))}
                            className="bg-transparent text-lg font-black text-slate-900 tracking-tight outline-none cursor-pointer hover:text-blue-600 transition-colors appearance-none"
                            title="Selecionar Ano"
                        >
                            {Array.from({ length: 10 }, (_, i) => {
                                const y = DateTime.now().year - 2 + i;
                                return <option key={y} value={y}>{y}</option>;
                            })}
                        </select>
                    </div>
                    <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
                        <button onClick={handlePrevWeek} title="Anterior" className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 transition-all">
                            <ChevronLeft size={20} strokeWidth={3} />
                        </button>
                        <button onClick={handleToday} className="px-4 py-1.5 hover:bg-white hover:shadow-sm text-xs font-black text-slate-700 uppercase tracking-widest rounded-lg transition-all">
                            Hoje
                        </button>
                        <button onClick={handleNextWeek} title="Próximo" className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 transition-all">
                            <ChevronRight size={20} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Prontos
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-orange-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> Realizadas
                    </div>
                </div>
            </div>

            {/* Calendar Body */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Day Labels - Sticky */}
                <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-slate-100 bg-slate-50/30 sticky top-0 z-20">
                    <div className="border-r border-slate-100"></div>
                    {days.map((day, i) => {
                        const isToday = day.hasSame(DateTime.now(), "day");
                        return (
                            <div key={i} className={`py-4 px-2 text-center border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-blue-50/50' : ''}`}>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                                    {day.toFormat('ccc', { locale: 'pt-BR' })}
                                </p>
                                <p className={`text-xs font-black ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>
                                    {day.toFormat('dd/MM/yyyy')}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Timeline Grid Area */}
                <div className="flex-1 overflow-y-auto no-scrollbar relative bg-slate-50/10" ref={containerRef}>
                    <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] min-h-full transition-all duration-500 h-[600px]">
                        
                        {/* Time labels column */}
                        <div className="col-span-1 border-r border-slate-100 bg-white/80 backdrop-blur-sm sticky left-0 z-10">
                            {HOURS.map((hour) => (
                                <div key={hour} className={`relative h-[40px] ${hour % 2 === 0 ? 'border-b border-slate-100' : 'border-b border-slate-50/50'}`}>
                                    {hour % 2 === 1 && (
                                        <span className="absolute -top-2.5 right-3 text-[10px] font-black text-slate-400 tabular-nums">
                                            {hour.toString().padStart(2, '0')}:00
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Columns for each day */}
                        {days.map((day, dayIdx) => {
                            const dateKey = day.toFormat('yyyy-MM-dd');
                            const daySurgeries = daySurgeriesMap.get(dateKey) || [];
                            const isToday = day.hasSame(DateTime.now(), "day");
                            
                            return (
                                <div key={dayIdx} className={`relative border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-blue-50/5' : ''}`}>
                                    {/* Hour background lines */}
                                    {HOURS.map((h) => (
                                        <div key={h} className="h-[40px] border-b border-slate-100 last:border-b-0"></div>
                                    ))}

                                    {/* Medical Surgery Cards */}
                                    {daySurgeries.map((patient, pIdx) => {
                                        const top = getTimeOffset(patient.surgeryTime ? String(patient.surgeryTime) : undefined) ?? (10 + (pIdx * 50));
                                        const isSurgeryDone = patient.status === 'CIRURGIA REALIZADA';
                                        const isReady = patient.status === 'PRONTOS';
                                        
                                        // Robust check for hospital/room
                                        const hasHospital = patient.hospital && String(patient.hospital).trim() !== "" && patient.hospital !== "--";
                                        const hasRoom = patient.operatingRoom && String(patient.operatingRoom).trim() !== "" && patient.operatingRoom !== "--";
                                        const showLocation = hasHospital || hasRoom;

                                        return (
                                            <div 
                                                key={patient.id}
                                                onClick={() => onPatientClick(patient)}
                                                data-card-top={top}
                                                className={`absolute left-1 right-1 p-1.5 rounded-xl cursor-pointer transition-all hover:scale-[1.02] hover:z-20 shadow-md border-l-4 group min-h-[46px] ${
                                                    isSurgeryDone 
                                                        ? 'bg-white border-l-orange-500 shadow-orange-100/30' 
                                                        : isReady 
                                                            ? 'bg-white border-l-emerald-500 shadow-emerald-100/30' 
                                                            : 'bg-white border-l-blue-500 shadow-blue-100/30'
                                                }`}
                                            >
                                                <div className="flex flex-col h-full justify-start gap-1 overflow-hidden">
                                                    <p className="text-[10px] font-black text-slate-900 leading-tight uppercase truncate">
                                                        {String(patient.name || '')}
                                                    </p>
                                                    {/* 2. Equipe */}
                                                    <div className="flex items-center gap-1 text-[8px] font-bold text-slate-500 uppercase">
                                                        <Stethoscope size={9} className="text-slate-400 shrink-0" />
                                                        <span className="truncate">EQ: {patient.team}</span>
                                                    </div>
                                                    {/* 3. Sistema */}
                                                    <div className="flex items-center">
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest shrink-0 border ${
                                                            patient.sistema === 'SUS' ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                                        }`}>
                                                            SISTEMA: {patient.sistema || 'SUS'}
                                                        </span>
                                                    </div>
                                                    {/* 4 & 5. Hospital e Sala */}
                                                    {showLocation && (
                                                        <div className="flex items-center gap-1 text-[8px] font-bold text-slate-700 uppercase mt-0.5">
                                                            <Building2 size={9} className="text-slate-400 shrink-0" />
                                                            <span className="truncate">
                                                                {hasHospital ? patient.hospital : ''} 
                                                                {hasRoom ? ` [S ${patient.operatingRoom}]` : ''}
                                                            </span>
                                                        </div>
                                                    )}
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
