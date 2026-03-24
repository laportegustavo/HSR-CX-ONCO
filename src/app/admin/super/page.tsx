'use client';

import React, { useState, useEffect } from 'react';
import { listTenantsAction, createTenantAction, getOverallStatsAction } from '../super-actions';

export default function SuperAdminPage() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // New Tenant Form
    const [newTenant, setNewTenant] = useState({ name: '', slug: '', subscription: 'FREE' });

    async function loadData() {
        try {
            const [tList, sData] = await Promise.all([
                listTenantsAction(),
                getOverallStatsAction()
            ]);
            setTenants(tList);
            setStats(sData);
        } catch (e: any) {
            setError(e.message || "Erro ao carregar dados");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await createTenantAction(newTenant);
        if (res.success) {
            alert("Tenant criado com sucesso!");
            setNewTenant({ name: '', slug: '', subscription: 'FREE' });
            loadData();
        } else {
            alert("Erro: " + res.error);
        }
    };

    if (loading) return <div className="p-8">Carregando Painel de Controle...</div>;
    if (error) return <div className="p-8 text-red-500">Erro: {error}</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Painel de Controle Owner</h1>
                    <p className="text-gray-500">Visão Geral da Plataforma SaaS HSR-CX-ONCO</p>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Hospitais/Tenants</p>
                    <p className="text-4xl font-black text-blue-600 mt-1">{stats?.tenantCount}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Usuários Totais</p>
                    <p className="text-4xl font-black text-indigo-600 mt-1">{stats?.userCount}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pacientes Totais</p>
                    <p className="text-4xl font-black text-emerald-600 mt-1">{stats?.patientCount}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Tenants List */}
                <div className="lg:col-span-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Lista de Hospitais / Clientes</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="py-4 font-semibold text-gray-600">ID / Nome</th>
                                    <th className="py-4 font-semibold text-gray-600">URL (Slug)</th>
                                    <th className="py-4 font-semibold text-gray-600">Assinatura</th>
                                    <th className="py-4 font-semibold text-gray-600">Dados</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.map(t => (
                                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4">
                                            <div className="font-bold text-gray-900">{t.name}</div>
                                            <div className="text-xs text-gray-400 font-mono">{t.id}</div>
                                        </td>
                                        <td className="py-4">
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm font-mono">{t.slug}</span>
                                        </td>
                                        <td className="py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                t.subscription === 'FREE' ? 'bg-gray-100 text-gray-500' : 
                                                t.subscription === 'PRO' ? 'bg-blue-100 text-blue-600' : 'bg-gold-100 text-yellow-700'
                                            }`}>
                                                {t.subscription}
                                            </span>
                                        </td>
                                        <td className="py-4 text-sm text-gray-500">
                                            👤 {t._count?.users} | 🏥 {t._count?.patients}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Create Form */}
                <div className="lg:col-span-4 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 sticky top-8 h-fit">
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Provisionar Novo Cliente</h2>
                    <form onSubmit={handleCreate} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Hospital/Serviço</label>
                            <input 
                                required
                                value={newTenant.name}
                                onChange={e => setNewTenant({...newTenant, name: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="Hospital Exemplo"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Slug da URL (minúsculo, sem espaços)</label>
                            <input 
                                required
                                value={newTenant.slug}
                                onChange={e => setNewTenant({...newTenant, slug: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono"
                                placeholder="hospital-exemplo"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Plano de Assinatura</label>
                            <select 
                                title="Selecione o Plano de Assinatura"
                                value={newTenant.subscription}
                                onChange={e => setNewTenant({...newTenant, subscription: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            >
                                <option value="FREE">GRÁTIS</option>
                                <option value="PRO">PRO</option>
                                <option value="ENTERPRISE">ENTERPRISE</option>
                            </select>
                        </div>
                        <button 
                            type="submit"
                            className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors shadow-lg shadow-gray-200"
                        >
                            Provisionar Hospital
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
