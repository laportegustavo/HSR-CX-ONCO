"use client";

import { useState, useMemo } from 'react';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Patient } from '@/types';
import { DateTime } from 'luxon';

export interface DashboardStatsProps {
    patients: Patient[];
    activeTeams?: string[];
}

export default function DashboardStats({ patients, activeTeams }: DashboardStatsProps) {
    const [selectedTeam, setSelectedTeam] = useState<string>("Todas");
    const [selectedSystem, setSelectedSystem] = useState<string>("Todos");

    const teams = useMemo(() => {
        if (activeTeams && activeTeams.length > 0) {
            return ["Todas", ...[...activeTeams].sort()];
        }
        const t = new Set<string>();
        patients.forEach(p => { if (p.team && p.team !== '--') t.add(String(p.team)); });
        return ["Todas", ...Array.from(t).sort()];
    }, [patients, activeTeams]);

    const systems = useMemo(() => {
        const s = new Set<string>();
        patients.forEach(p => { if (p.sistema && p.sistema !== '--') s.add(String(p.sistema)); });
        return ["Todos", ...Array.from(s).sort()];
    }, [patients]);

    const statsData = useMemo(() => {
        const filtered = patients.filter(p => {
            if (selectedTeam !== "Todas" && p.team !== selectedTeam) return false;
            if (selectedSystem !== "Todos" && p.sistema !== selectedSystem) return false;
            return true;
        });

        // 1. Status Distribution
        const statusMap: Record<string, number> = {};
        filtered.forEach(p => {
            const status = String(p.status || 'SEM STATUS');
            statusMap[status] = (statusMap[status] || 0) + 1;
        });
        const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

        // 2. Team Distribution
        const teamMap: Record<string, number> = {};
        patients.forEach(p => {
            const team = String(p.team || 'N/A').trim();
            if (activeTeams && activeTeams.length > 0) {
                if (!activeTeams.includes(team)) return; // Exclude non-active teams
            } else {
                if (team === 'N/A' || team.length > 25) return;
            }
            teamMap[team] = (teamMap[team] || 0) + 1;
        });
        const teamData = Object.entries(teamMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // 3. Wait Time Analysis (AIH to Surgery)
        const parseDate = (d: string): DateTime | null => {
            if (!d || d === '--') return null;
            try {
                if (d.includes('/')) {
                    const parts = d.split('/');
                    if (parts.length === 3) {
                        let year = Number(parts[2]);
                        const month = Number(parts[1]);
                        const day = Number(parts[0]);
                        if (year < 100) year += 2000;
                        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                            return DateTime.fromObject({ year, month, day }, { zone: 'America/Sao_Paulo' }).startOf('day');
                        }
                    }
                } else if (d.includes('-')) {
                    const isoDate = DateTime.fromISO(d).setZone('America/Sao_Paulo').startOf('day');
                    if (isoDate.isValid) return isoDate;
                }
            } catch (e) {
                console.error("Error parsing date:", d, e);
            }
            return null;
        };

        const waitTimes: number[] = [];

        filtered.forEach(p => {
            const start = parseDate(String(p.aihDate || ''));
            const hasSurgery = p.surgeryDate && String(p.surgeryDate).trim() !== '' && String(p.surgeryDate) !== '--';
            
            // First priority: dynamic calculation if dates are present and valid
            if (start && start.isValid && hasSurgery) {
                const end = parseDate(String(p.surgeryDate));
                if (end && end.isValid) {
                    const diff = end.diff(start, 'days').days;
                    if (diff >= 0 && diff < 1000) {
                        waitTimes.push(Math.floor(diff));
                        return;
                    }
                }
            }

            // Second priority: pre-calculated field from DB/migration (capped for safety)
            if (typeof p.waitTimeDays === 'number' && p.waitTimeDays > 0 && p.waitTimeDays < 1000) {
                waitTimes.push(p.waitTimeDays);
            }
        });

        const avgWait = waitTimes.length > 0 
            ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length) 
            : 0;

        return { statusData, teamData, avgWait, waitCount: waitTimes.length };
    }, [patients, selectedTeam, selectedSystem, activeTeams]);

    const COLORS = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#64748b', '#78350f'];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1" htmlFor="team-select">Filtrar por Equipe</label>
                    <select 
                        id="team-select"
                        title="Selecione a Equipe"
                        aria-label="Filtrar por Equipe"
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        className="w-full mt-1 bg-slate-50 border-2 border-slate-100 p-3 rounded-xl outline-none text-slate-700 font-bold focus:border-blue-500/30 transition-all text-sm"
                    >
                        {teams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1" htmlFor="system-select">Filtrar por Sistema</label>
                    <select 
                        id="system-select"
                        title="Selecione o Sistema"
                        aria-label="Filtrar por Sistema"
                        value={selectedSystem}
                        onChange={(e) => setSelectedSystem(e.target.value)}
                        className="w-full mt-1 bg-slate-50 border-2 border-slate-100 p-3 rounded-xl outline-none text-slate-700 font-bold focus:border-blue-500/30 transition-all text-sm"
                    >
                        {systems.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Summary Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Média de Espera (Dias)</span>
                    <span className="text-5xl font-black text-blue-600">{statsData.avgWait}</span>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">Baseado em {statsData.waitCount} cirurgia(s)</p>
                </div>

                {/* Status Pie Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 md:col-span-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Distribuição por Status</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statsData.statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statsData.statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Team Bar Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Volume por Equipe</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statsData.teamData} layout="vertical" margin={{ left: 40, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                fontSize={10} 
                                fontWeight="bold" 
                                width={120}
                                stroke="#94a3b8"
                            />
                            <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar 
                                dataKey="value" 
                                fill="#3b82f6" 
                                radius={[0, 8, 8, 0]} 
                                barSize={24}
                                label={{ position: 'right', fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
