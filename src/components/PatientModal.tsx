"use client";

import { useState, useEffect } from "react";
import { X, Camera, Loader2, Trash2 } from "lucide-react";
import { createWorker, PSM } from 'tesseract.js';
import { toast } from "sonner";
import { Patient, MedicalStaff, FieldSchema } from "../types";
import { getStaff } from "../app/staff-actions";
import { updatePatientAction, createPatientAction, deletePatientAction } from "../app/actions";
import { getFieldSchema } from "../app/field-actions";

interface PatientModalProps {
    patient: Patient | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

interface HistoryLog {
    timestamp: string;
    user: string;
    patientId: string;
    patientName: string;
    field: string;
    oldValue: string;
    newValue: string;
}

export default function PatientModal({ patient, isOpen, onClose, onSave }: PatientModalProps) {
    const [formData, setFormData] = useState<Patient | null>(null);
    const [uploading, setUploading] = useState(false);
    const [processingStatus, setProcessingStatus] = useState<string>("");
    const [staff, setStaff] = useState<MedicalStaff[]>([]);
    const [config, setConfig] = useState<{ teams: string[], systems: string[], hospitals: string[] }>({ teams: [], systems: [], hospitals: [] });
    const [schema, setSchema] = useState<FieldSchema[]>([]);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [activeTab, setActiveTab] = useState<'data' | 'history'>('data');
    const [history, setHistory] = useState<HistoryLog[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            const [staffData, configData, schemaData] = await Promise.all([
                getStaff(),
                import('../app/config-actions').then(m => m.getConfig()),
                getFieldSchema()
            ]);
            setStaff(staffData);
            setConfig(configData);
            setSchema(schemaData);

            if (patient?.id) {
                setLoadingHistory(true);
                try {
                    const logs = await import('../app/actions').then(m => m.getPatientChangeLogsAction());
                    setHistory(logs.filter((l: HistoryLog) => l.patientId === patient.id));
                } catch (err) {
                    console.error("Error loading patient history:", err);
                } finally {
                    setLoadingHistory(false);
                }
            }
        };

        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen, patient?.id]);

    useEffect(() => {
        if (isOpen && schema.length > 0) {
            if (patient) {
                const formattedPatient = { ...patient };
                // Format dates for display
                schema.forEach((field: FieldSchema) => {
                    if (field.type === 'date' && formattedPatient[field.id]) {
                        const val = String(formattedPatient[field.id]);
                        if (val.includes('-')) {
                            const [y, m, d] = val.split('-');
                            formattedPatient[field.id] = `${d}/${m}/${y}`;
                        }
                    }
                });
                setFormData(formattedPatient);
            } else {
                const newPatient: Patient = { id: '', name: '' };
                schema.forEach((f: FieldSchema) => {
                    if (f.id === 'status') newPatient[f.id] = 'SEM STATUS';
                    else if (f.id === 'priority') newPatient[f.id] = '3';
                    else if (f.type === 'checkbox') newPatient[f.id] = [];
                    else newPatient[f.id] = '';
                });
                setFormData(newPatient);
            }
        }
    }, [patient, isOpen, schema]);

    if (!isOpen || !formData || schema.length === 0) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        handleFieldChange(name, value);
    };

    const handleFieldChange = (fieldId: string, value: string | string[]) => {
        if (!formData) return;
        
        const newFormData = { ...formData, [fieldId]: value };

        // Auto-calculate age if birthDate is changed (Format: DD/MM/AAAA)
        if (fieldId === 'birthDate' && typeof value === 'string' && value.length === 10) {
            const parts = value.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const year = parseInt(parts[2], 10);
                
                if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    const today = new Date();
                    const birthDate = new Date(year, month - 1, day);
                    
                    if (birthDate < today) {
                        let age = today.getFullYear() - birthDate.getFullYear();
                        const m = today.getMonth() - birthDate.getMonth();
                        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                            age--;
                        }
                        
                        if (age >= 0) {
                            newFormData['age'] = age.toString();
                        }
                    }
                }
            }
        }

        setFormData(newFormData);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const clean = value.replace(/\D/g, '').substring(0, 8);
        let masked = clean;
        if (clean.length > 2) masked = clean.substring(0, 2) + '/' + clean.substring(2);
        if (clean.length > 4) masked = masked.substring(0, 5) + '/' + masked.substring(5);
        
        handleFieldChange(name, masked);
    };

    const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !formData) return;

        setUploading(true);
        setProcessingStatus("Otimizando imagem...");

        try {
            // Pre-processamento via Canvas
            const imageUrl = URL.createObjectURL(file);
            const img = new Image();
            
            const processedDataUrl = await new Promise<string>((resolve) => {
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    if (!ctx) {
                        resolve(imageUrl);
                        return;
                    }

                    // Aumentar escala para melhor OCR (2x se pequeno)
                    const scale = img.width < 1500 ? 2 : 1;
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;

                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    // Filtro de Contraste + Binarização Adaptativa Simples
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i+1];
                        const b = data[i+2];
                        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                        
                        // Thresholding para transformar em P&B puro (melhora OCR)
                        const threshold = 145; 
                        const v = gray > threshold ? 255 : 0;
                        
                        data[i] = v;
                        data[i+1] = v;
                        data[i+2] = v;
                    }

                    ctx.putImageData(imageData, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.src = imageUrl;
            });

            setProcessingStatus("Extraindo texto...");
            const worker = await createWorker('por');
            
            // Configurar parâmetros do motor
            await worker.setParameters({
                tessedit_pageseg_mode: PSM.AUTO,
            });

            const ret = await worker.recognize(processedDataUrl);
            const text = ret.data.text;
            
            setFormData(prev => prev ? { 
                ...prev, 
                clinicalData: prev.clinicalData ? `${prev.clinicalData}\n\n--- OCR ---\n${text}` : text 
            } : null);
            
            await worker.terminate();
            URL.revokeObjectURL(imageUrl);
            setProcessingStatus("Pronto!");
            toast.success("Texto extraído com sucesso!");
        } catch (error) {
            console.error('OCR error:', error);
            toast.error('Erro ao processar imagem para OCR.');
        } finally {
            setUploading(false);
            setTimeout(() => setProcessingStatus(""), 2000);
        }
    };
    const isValidDate = (dateString: string) => {
        if (!dateString) return true;
        const regex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!regex.test(dateString)) return false;
        const [day, month, year] = dateString.split('/').map(Number);
        if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return false;
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            // Validate all date fields in schema
            for (const field of schema) {
                if (field.type === 'date' && formData[field.id] && !isValidDate(String(formData[field.id]))) {
                    toast.error(`${field.label} inválida. Utilize o formato DD/MM/AAAA.`);
                    return;
                }
            }
            
            try {
                if (formData.id) {
                    await updatePatientAction(formData);
                    toast.success("Paciente atualizado com sucesso!");
                } else {
                    await createPatientAction(formData);
                    toast.success("Novo paciente criado com sucesso!");
                }
                onSave();
                onClose();
            } catch (error) {
                console.error("Error saving patient:", error);
                toast.error("Erro ao salvar paciente. Tente novamente.");
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
            toast.success("Paciente excluído com sucesso.");
            onSave();
            onClose();
        } catch (error) {
            console.error("Error deleting patient:", error);
            toast.error("Erro ao excluir paciente.");
        } finally {
            setIsConfirmingDelete(false);
        }
    };

    const getOptionsForField = (field: FieldSchema) => {
        if (field.options && field.options.length > 0) return field.options;
        
        switch (field.id) {
            case 'team': return [...config.teams].sort((a: string, b: string) => a.localeCompare(b));
            case 'sistema': return [...config.systems].sort((a: string, b: string) => a.localeCompare(b));
            case 'hospital': return (config.hospitals || []).sort((a: string, b: string) => a.localeCompare(b));
            case 'preceptor': return staff.filter((s: MedicalStaff) => s.type === 'preceptor').map((s: MedicalStaff) => s.systemName).sort((a: string, b: string) => a.localeCompare(b));
            case 'resident': 
            case 'auxiliaryResidents':
                return staff.filter((s: MedicalStaff) => s.type === 'resident').map((s: MedicalStaff) => s.systemName).sort((a: string, b: string) => a.localeCompare(b));
            case 'status':
                return ["AGENDADOS", "CIRURGIA REALIZADA", "OBSERVAÇÕES/PENDÊNCIAS", "PERDA DE SEGUIMENTO", "PRONTOS", "SEM STATUS"];
            case 'priority':
                return ['1', '2', '3'];
            default: return [];
        }
    };

    const renderField = (field: FieldSchema) => {
        if (field.isSystem && field.id !== 'name') return null; // ID, LastUpdated, etc are automatic

        const options = getOptionsForField(field);
        const commonClasses = "w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium bg-white";
        const labelEl = (
            <div className="flex items-center justify-between px-1">
                <label htmlFor={field.id} className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {field.label}
                    {field.isRequired && <span className="text-rose-500 ml-1">*</span>}
                </label>
                {field.id === 'clinicalData' && (
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-widest cursor-pointer hover:text-blue-700 transition-all bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 shadow-sm grow-0">
                        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                        <span className="truncate max-w-[120px]">
                            {uploading ? (processingStatus || 'Processando...') : 'Leitor IA (Scan)'}
                        </span>
                        <input type="file" accept="image/*" onChange={handleOCR} className="hidden" disabled={uploading}/>
                    </label>
                )}
            </div>
        );

        let inputEl;
        if (field.type === 'select') {
            inputEl = (
                <select id={field.id} name={field.id} value={String(formData[field.id] || '')} onChange={handleChange} className={`${commonClasses} appearance-none`}>
                    <option value="">Selecione...</option>
                    {options.map(opt => (
                        <option key={opt} value={opt}>
                            {field.id === 'priority' ? (
                                opt === '1' ? '1 - Crítico (Vermelho)' : opt === '2' ? '2 - Urgente (Amarelo)' : '3 - Normal (Verde)'
                            ) : opt}
                        </option>
                    ))}
                </select>
            );
        } else if (field.type === 'textarea') {
            inputEl = (
                <textarea id={field.id} name={field.id} rows={field.id === 'clinicalData' ? 4 : 2} value={String(formData[field.id] || '')} onChange={handleChange} className={`${commonClasses} resize-none shadow-sm`} />
            );
        } else if (field.type === 'checkbox') {
            const currentArr = Array.isArray(formData[field.id]) ? formData[field.id] as string[] : [];
            inputEl = (
                <div className="w-full max-h-32 overflow-y-auto px-4 py-2 border border-slate-200 rounded-xl bg-white space-y-2">
                    {options.map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input 
                                type="checkbox" 
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                checked={currentArr.includes(opt)}
                                onChange={() => {
                                    const newArr = currentArr.includes(opt) 
                                        ? currentArr.filter(r => r !== opt) 
                                        : [...currentArr, opt];
                                    setFormData(prev => prev ? { ...prev, [field.id]: newArr } : null);
                                }}
                            />
                            <span className="text-sm font-medium text-slate-700">{opt}</span>
                        </label>
                    ))}
                    {options.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma opção disponível.</p>}
                </div>
            );
        } else if (field.type === 'date') {
            inputEl = (
                <input type="text" id={field.id} name={field.id} placeholder="DD/MM/AAAA" value={String(formData[field.id] || '')} onChange={handleDateChange} className={commonClasses} />
            );
        } else if (field.type === 'time') {
            inputEl = (
                <input type="time" id={field.id} name={field.id} value={String(formData[field.id] || '')} onChange={handleChange} className={commonClasses} />
            );
        } else {
            inputEl = (
                <input type={field.type} id={field.id} name={field.id} value={String(formData[field.id] || '')} onChange={handleChange} className={commonClasses} />
            );
        }

        const isFullWidth = ['textarea', 'checkbox'].includes(field.type) || field.id === 'clinicalData' || field.id === 'observations';

        return (
            <div key={field.id} className={`space-y-1.5 ${isFullWidth ? 'sm:col-span-2' : ''}`}>
                {labelEl}
                {inputEl}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/40 sm:p-4">
            <div className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-2xl bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col" role="dialog" aria-modal="true">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5 bg-white border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                            {patient ? "Editar Paciente" : "Novo Paciente"}
                        </h2>
                        {patient && (
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                ID: {patient.id}
                                <span className="mx-2">•</span>
                                ÚLTIMA MODIFICAÇÃO: {patient.lastUpdatedBy ? `${new Date(patient.lastUpdated || '').toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} POR ${patient.lastUpdatedBy.toUpperCase()}` : 'SEM REGISTRO ESCRITO'}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all p-2 bg-slate-50" title="Fechar">
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 bg-white px-4 shrink-0">
                    <button 
                        onClick={() => setActiveTab('data')}
                        className={`px-4 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'data' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Dados do Paciente
                    </button>
                    {patient && (
                        <button 
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            Histórico de Alterações
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50">
                    {activeTab === 'data' ? (
                        <form id="patient-form" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                            {schema.filter(field => field.isVisibleInForm !== false).map(field => renderField(field))}
                        </form>
                    ) : (
                        <div className="space-y-4">
                            {loadingHistory ? (
                                <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                                    <Loader2 className="animate-spin" size={24} />
                                    Carregando histórico...
                                </div>
                            ) : history.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 italic">
                                    Nenhuma alteração registrada para este paciente.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {history.map((log, i) => (
                                        <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{log.timestamp}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-full">{log.user}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{log.field}:</span>
                                                <span className="text-xs text-rose-500 line-through decoration-2">{log.oldValue || '-'}</span>
                                                <span className="text-xs text-slate-300">→</span>
                                                <span className="text-xs font-bold text-emerald-600">{log.newValue || '-'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
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
