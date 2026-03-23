"use client";

import { useMemo } from 'react';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Patient } from '@/types';
import { DateTime } from 'luxon';

interface DashboardStatsProps {
    patients: Patient[];
}

export default function DashboardStats({ patients }: DashboardStatsProps) {
    const statsData = useMemo(() => {
        // 1. Status Distribution
        const statusMap: Record<string, number> = {};
        patients.forEach(p => {
            const status = String(p.status || 'SEM STATUS');
            statusMap[status] = (statusMap[status] || 0) + 1;
        });
        const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

        // 2. Team Distribution
        const teamMap: Record<string, number> = {};
        patients.forEach(p => {
            const team = String(p.team || 'N/A');
            teamMap[team] = (teamMap[team] || 0) + 1;
        });
        const teamData = Object.entries(teamMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // 3. Wait Time Analysis (AIH to Surgery)
        const parseDate = (d: string): DateTime | null => {
            if (!d || d === '--') return null;
            if (d.includes('/')) {
                const parts = d.split('/');
                if (parts.length === 3) {
                    return DateTime.fromObject({ year: Number(parts[2]), month: Number(parts[1]), day: Number(parts[0]) }, { zone: 'America/Sao_Paulo' }).startOf('day');
                }
            } else if (d.includes('-')) {
                const isoDate = DateTime.fromISO(d).setZone('America/Sao_Paulo').startOf('day');
                if (isoDate.isValid) return isoDate;
            }
            return null;
        };

        const waitTimes: number[] = [];
        const today = DateTime.now().setZone('America/Sao_Paulo').startOf('day');

        patients.forEach(p => {
            const start = parseDate(String(p.aihDate || ''));
            if (start && start.isValid) {
                const hasSurgery = p.surgeryDate && String(p.surgeryDate).trim() !== '' && String(p.surgeryDate) !== '--';
                const end = hasSurgery ? parseDate(String(p.surgeryDate)) : today;
                
                if (end && end.isValid) {
                    const diff = end.diff(start, 'days').days;
                    if (diff >= 0) waitTimes.push(Math.floor(diff));
                }
            }
        });

        const avgWait = waitTimes.length > 0 
            ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length) 
            : 0;

        return { statusData, teamData, avgWait };
    }, [patients]);

    const COLORS = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#64748b', '#78350f'];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Summary Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Média de Espera (Dias)</span>
                    <span className="text-5xl font-black text-blue-600">{statsData.avgWait}</span>
                    <p className="text-xs text-slate-500 mt-2 font-medium">De AIH até a Cirurgia</p>
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
