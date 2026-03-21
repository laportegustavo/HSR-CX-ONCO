"use client";

import { useState, useEffect } from "react";
import { X, Camera, Loader2, Trash2 } from "lucide-react";
import { createWorker } from 'tesseract.js';
import { Patient, PatientStatus, MedicalStaff } from "../types";
import { getStaff } from "../app/staff-actions";
import { updatePatientAction, createPatientAction, deletePatientAction } from "../app/actions";

interface PatientModalProps {
    patient: Patient | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

const defaultPatient: Patient = {
    id: '',
    name: '',
    cpf: '',
    medicalRecord: '',
    aihDate: '',
    team: '',
    sistema: '',
    clinicalData: '',
    contactPhone: '',
    city: '',
    auxiliaryResidents: [],
    observations: '',
    preAnestheticEval: '',
    status: 'SEM STATUS',
    priority: '3',
    age: '',
    needsICU: 'Não',
    latexAllergy: 'Não',
    jehovahsWitness: 'Não'
};

const statusOptions: PatientStatus[] = [
    "AGENDADOS",
    "CIRURGIA REALIZADA",
    "OBSERVAÇÕES",
    "PENDÊNCIAS",
    "PERDA DE SEGMENTO",
    "PRONTOS",
    "SEM STATUS"
];

export default function PatientModal({ patient, isOpen, onClose, onSave }: PatientModalProps) {
    const [formData, setFormData] = useState<Patient | null>(null);
    const [uploading, setUploading] = useState(false);
    const [staff, setStaff] = useState<MedicalStaff[]>([]);
    const [config, setConfig] = useState<{ teams: string[], systems: string[] }>({ teams: [], systems: [] });
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        const [staffData, configData] = await Promise.all([
            getStaff(),
            import('../app/config-actions').then(m => m.getConfig())
        ]);
        setStaff(staffData);
        setConfig(configData);
    };

    useEffect(() => {
        if (isOpen) {
            if (patient) {
                const formattedPatient = { ...patient };
                if (patient.aihDate && patient.aihDate.includes('-')) {
                    const [y, m, d] = patient.aihDate.split('-');
                    formattedPatient.aihDate = `${d}/${m}/${y}`;
                }
                if (patient.surgeryDate && patient.surgeryDate.includes('-')) {
                    const [y, m, d] = patient.surgeryDate.split('-');
                    formattedPatient.surgeryDate = `${d}/${m}/${y}`;
                }
                setFormData(formattedPatient);
            } else {
                setFormData({ ...defaultPatient });
            }
        }
    }, [patient, isOpen]);

    if (!isOpen || !formData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => prev ? { ...prev, [name]: value } : null);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Simple numeric masking for DD/MM/YYYY
        const clean = value.replace(/\D/g, '').substring(0, 8);
        let masked = clean;
        if (clean.length > 2) masked = clean.substring(0, 2) + '/' + clean.substring(2);
        if (clean.length > 4) masked = masked.substring(0, 5) + '/' + masked.substring(5);
        
        setFormData((prev) => prev ? { ...prev, [name]: masked } : null);
    };

    const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !formData) return;

        setUploading(true);
        try {
            const worker = await createWorker('por');
            const ret = await worker.recognize(file);
            const text = ret.data.text;
            
            // Append OCR text to clinical data
            setFormData(prev => prev ? { 
                ...prev, 
                clinicalData: prev.clinicalData ? `${prev.clinicalData}\n\n--- OCR ---\n${text}` : text 
            } : null);
            
            await worker.terminate();
        } catch (error) {
            console.error('OCR error:', error);
            alert('Erro ao processar imagem para OCR.');
        } finally {
            setUploading(false);
        }
    };

    const isValidDate = (dateString: string) => {
        if (!dateString) return true; // Allow empty if the field itself is optional (like surgeryDate)
        const regex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!regex.test(dateString)) return false;
        const [day, month, year] = dateString.split('/').map(Number);
        if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return false;
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            if (formData.aihDate && !isValidDate(formData.aihDate)) {
                alert("Data de AIH inválida. Utilize o formato completo: DD/MM/AAAA.");
                return;
            }
            if (formData.surgeryDate && !isValidDate(formData.surgeryDate)) {
                alert("Data da Cirurgia inválida. Utilize o formato completo: DD/MM/AAAA.");
                return;
            }
            
            try {
                if (formData.id) {
                    await updatePatientAction(formData);
                } else {
                    await createPatientAction(formData);
                }
                onSave();
                onClose();
            } catch (error) {
                console.error("Error saving patient:", error);
                alert("Erro ao salvar paciente.");
            }
        }
    };

    const handleDelete = async () => {
        if (!patient) return;
        setIsConfirmingDelete(true);
    };

    const confirmAndDelete = async () => {
        if (!patient) return;
        try {
            await deletePatientAction(patient.id);
            onSave();
            onClose();
        } catch (error) {
            console.error("Error deleting patient:", error);
            alert("Erro ao excluir paciente.");
        } finally {
            setIsConfirmingDelete(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/40 sm:p-4">
            <div
                className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-2xl bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5 bg-white border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                            {patient ? "Editar Paciente" : "Novo Paciente"}
                        </h2>
                        {patient && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: {patient.id}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all p-2 bg-slate-50"
                        title="Fechar"
                    >
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50">
                    <form id="patient-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* NOME */}
                            <div className="space-y-1.5">
                                <label htmlFor="name" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome do Paciente</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 sm:py-3.5 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-bold placeholder:text-slate-300"
                                    placeholder="Nome completo"
                                />
                            </div>

                            {/* IDADE */}
                            <div className="space-y-1.5">
                                <label htmlFor="age" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Idade</label>
                                <input
                                    type="text"
                                    id="age"
                                    name="age"
                                    value={formData.age || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 sm:py-3.5 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-bold placeholder:text-slate-300"
                                    placeholder="Ex: 45 anos"
                                />
                            </div>

                            {/* CPF */}
                            <div className="space-y-2">
                                <label htmlFor="cpf" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">CPF</label>
                                <input
                                    type="text"
                                    id="cpf"
                                    name="cpf"
                                    placeholder="000.000.000-00"
                                    value={formData.cpf}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium"
                                />
                            </div>

                            {/* TELEFONE */}
                            <div className="space-y-2">
                                <label htmlFor="contactPhone" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Telefone de Contato</label>
                                <input
                                    type="text"
                                    id="contactPhone"
                                    name="contactPhone"
                                    value={formData.contactPhone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium"
                                    placeholder="Ex: (00) 00000-0000 ou Recado"
                                />
                            </div>

                            {/* CIDADE */}
                            <div className="space-y-2">
                                <label htmlFor="city" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Cidade</label>
                                <input
                                    type="text"
                                    id="city"
                                    name="city"
                                    value={formData.city || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium"
                                    placeholder="Ex: Porto Alegre"
                                />
                            </div>

                            {/* PRONTUARIO */}
                            <div className="space-y-2">
                                <label htmlFor="medicalRecord" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Prontuário</label>
                                <input
                                    type="text"
                                    id="medicalRecord"
                                    name="medicalRecord"
                                    value={formData.medicalRecord}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium"
                                />
                            </div>

                            {/* DATA AIH */}
                            <div className="space-y-2">
                                <label htmlFor="aihDate" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Data da AIH</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="aihDate"
                                        name="aihDate"
                                        placeholder="DD/MM/AAAA"
                                        value={formData.aihDate}
                                        onChange={handleDateChange}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium bg-white"
                                    />
                                </div>
                            </div>

                            {/* EQUIPE */}
                            <div className="space-y-2">
                                <label htmlFor="team" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Equipe</label>
                                <select
                                    id="team"
                                    name="team"
                                    value={formData.team}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium bg-white appearance-none"
                                >
                                    <option value="">Selecione uma equipe</option>
                                    {[...config.teams].sort((a, b) => a.localeCompare(b)).map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            {/* SISTEMA */}
                            <div className="space-y-2">
                                <label htmlFor="sistema" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Sistema</label>
                                <select
                                    id="sistema"
                                    name="sistema"
                                    value={formData.sistema}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium bg-white appearance-none"
                                >
                                    <option value="">Selecione um sistema</option>
                                    {[...config.systems].sort((a, b) => a.localeCompare(b)).map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            {/* STATUS */}
                            <div className="space-y-2">
                                <label htmlFor="status" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Status do Andamento</label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium bg-white appearance-none"
                                >
                                    {statusOptions.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>

                            {/* PRIORIDADE */}
                            <div className="space-y-2">
                                <label htmlFor="priority" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Prioridade</label>
                                <select
                                    id="priority"
                                    name="priority"
                                    value={formData.priority || '3'}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium bg-white appearance-none"
                                >
                                    <option value="1">1 - Crítico (Vermelho)</option>
                                    <option value="2">2 - Urgente (Amarelo)</option>
                                    <option value="3">3 - Normal (Verde)</option>
                                </select>
                            </div>

                            {/* DADOS CLINICOS */}
                            <div className="space-y-2 md:col-span-2">
                                <div className="flex items-center justify-between px-1">
                                    <label htmlFor="clinicalData" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dados Clínicos / Caso</label>
                                    <label className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-widest cursor-pointer hover:text-blue-700 transition-all bg-blue-50 px-2 py-1 rounded-lg">
                                        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                                        {uploading ? 'Processando...' : 'Leitor OCR (IA)'}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={handleOCR} 
                                            className="hidden" 
                                            disabled={uploading}
                                        />
                                    </label>
                                </div>
                                <textarea
                                    id="clinicalData"
                                    name="clinicalData"
                                    rows={3}
                                    value={formData.clinicalData}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium resize-none shadow-sm"
                                    placeholder="Descreva o caso ou use o leitor OCR acima..."
                                />
                            </div>

                            {/* OBSERVACOES E PENDENCIAS */}
                            <div className="space-y-2 md:col-span-2">
                                <label htmlFor="observations" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Observações / Pendências</label>
                                <textarea
                                    id="observations"
                                    name="observations"
                                    rows={2}
                                    value={formData.observations || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium resize-none shadow-sm"
                                    placeholder="Anotações adicionais e pendências..."
                                />
                            </div>

                            {/* DISCUSSAO DO CASO */}
                            <div className="space-y-2 md:col-span-2">
                                <label htmlFor="caseDiscussion" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Discussão do Caso</label>
                                <textarea
                                    id="caseDiscussion"
                                    name="caseDiscussion"
                                    rows={3}
                                    value={formData.caseDiscussion || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium resize-none shadow-sm"
                                    placeholder="Conduta definida em reunião..."
                                />
                            </div>

                            {/* AVALIACAO ANESTESICA */}
                            <div className="space-y-2 md:col-span-2">
                                <label htmlFor="preAnestheticEval" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Avaliação Anestésica</label>
                                <textarea
                                    id="preAnestheticEval"
                                    name="preAnestheticEval"
                                    rows={2}
                                    value={formData.preAnestheticEval}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium resize-none shadow-sm"
                                />
                            </div>

                            {/* UTI / LATEX / TESTEMUNHA */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:col-span-2">
                                <div className="space-y-2">
                                    <label htmlFor="needsICU" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Necessidade UTI</label>
                                    <select
                                        id="needsICU"
                                        name="needsICU"
                                        value={formData.needsICU || 'Não'}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium bg-white appearance-none text-center"
                                    >
                                        <option value="Sim">SIM</option>
                                        <option value="Não">NÃO</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="latexAllergy" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Alergia Latex</label>
                                    <select
                                        id="latexAllergy"
                                        name="latexAllergy"
                                        value={formData.latexAllergy || 'Não'}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium bg-white appearance-none text-center"
                                    >
                                        <option value="Sim">SIM</option>
                                        <option value="Não">NÃO</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="jehovahsWitness" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">T. Jeová</label>
                                    <select
                                        id="jehovahsWitness"
                                        name="jehovahsWitness"
                                        value={formData.jehovahsWitness || 'Não'}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium bg-white appearance-none text-center"
                                    >
                                        <option value="Sim">SIM</option>
                                        <option value="Não">NÃO</option>
                                    </select>
                                </div>
                            </div>

                            {/* PRECEPTOR */}
                            <div className="space-y-2">
                                <label htmlFor="preceptor" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Médico Preceptor</label>
                                <select
                                    id="preceptor"
                                    name="preceptor"
                                    value={formData.preceptor || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium bg-white appearance-none"
                                >
                                    <option value="">Selecione um preceptor</option>
                                    {staff.filter(s => s.type === 'preceptor').sort((a, b) => a.systemName.localeCompare(b.systemName)).map(s => (
                                        <option key={s.id} value={s.systemName}>{s.systemName}</option>
                                    ))}
                                </select>
                            </div>

                            {/* DATA CIRURGIA */}
                            <div className="space-y-2">
                                <label htmlFor="surgeryDate" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Data da Cirurgia</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="surgeryDate"
                                        name="surgeryDate"
                                        placeholder="DD/MM/AAAA"
                                        value={formData.surgeryDate || ''}
                                        onChange={handleDateChange}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium bg-white"
                                    />
                                </div>
                            </div>

                            {/* RESIDENTE */}
                            <div className="space-y-2">
                                <label htmlFor="resident" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Médico Residente Principal</label>
                                <select
                                    id="resident"
                                    name="resident"
                                    value={formData.resident || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium bg-white appearance-none"
                                >
                                    <option value="">Selecione um residente principal</option>
                                    {staff.filter(s => s.type === 'resident').sort((a, b) => a.systemName.localeCompare(b.systemName)).map(s => (
                                        <option key={s.id} value={s.systemName}>{s.systemName}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* RESIDENTE AUXILIAR */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Residentes Auxiliares</label>
                                <div className="w-full max-h-32 overflow-y-auto px-4 py-2 border border-slate-200 rounded-xl bg-white space-y-2">
                                    {staff.filter(s => s.type === 'resident').sort((a, b) => a.systemName.localeCompare(b.systemName)).map(s => {
                                        const isSelected = (formData.auxiliaryResidents || []).includes(s.systemName);
                                        return (
                                            <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        const current = formData.auxiliaryResidents || [];
                                                        const newArr = isSelected 
                                                            ? current.filter((r: string) => r !== s.systemName) 
                                                            : [...current, s.systemName];
                                                        setFormData(prev => prev ? { ...prev, auxiliaryResidents: newArr } : null);
                                                    }}
                                                />
                                                <span className="text-sm font-medium text-slate-700">{s.systemName}</span>
                                            </label>
                                        );
                                    })}
                                    {staff.filter(s => s.type === 'resident').length === 0 && (
                                        <p className="text-xs text-slate-400 italic">Nenhum residente cadastrado.</p>
                                    )}
                                </div>
                            </div>

                        </div>
                    </form>
                </div>

                {/* Footer Actions - Sticky on Mobile */}
                <div className="p-5 sm:p-6 bg-white border-t border-slate-100 flex flex-col sm:flex-row justify-between gap-3 shrink-0">
                    {patient && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="w-full sm:w-auto px-6 py-3.5 text-rose-600 font-black text-[10px] lg:text-xs uppercase tracking-widest hover:bg-rose-50 rounded-2xl transition-all border-2 border-transparent hover:border-rose-100 order-2 sm:order-1"
                        >
                            Excluir Paciente
                        </button>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto order-1 sm:order-2 sm:ml-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-auto px-6 py-3.5 text-slate-400 font-black text-[10px] lg:text-xs uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all border-2 border-slate-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="patient-form"
                            disabled={uploading}
                            className="w-full sm:w-auto px-10 py-3.5 bg-blue-600 text-white rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {patient ? "Salvar Alterações" : "Criar Paciente"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom Confirm Delete Modal for PWA/iOS explicitly */}
            {isConfirmingDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-950/60 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center scale-up-center">
                        <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Confirmar Exclusão</h3>
                        <p className="text-sm font-medium text-slate-500 mb-8">
                            Tem certeza que deseja excluir o paciente <b>{patient?.name}</b> do sistema? Esta ação é permanente e não pode ser desfeita.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsConfirmingDelete(false)}
                                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmAndDelete}
                                className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-colors shadow-lg shadow-red-600/20"
                            >
                                Sim, Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
