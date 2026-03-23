"use client";

import { useState, useEffect } from "react";
import { X, Camera, Loader2, Trash2 } from "lucide-react";
import { createWorker } from 'tesseract.js';
import { Patient, PatientStatus, MedicalStaff, FieldSchema } from "../types";
import { getStaff } from "../app/staff-actions";
import { updatePatientAction, createPatientAction, deletePatientAction } from "../app/actions";
import { getFieldSchema } from "../app/field-actions";

interface PatientModalProps {
    patient: Patient | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export default function PatientModal({ patient, isOpen, onClose, onSave }: PatientModalProps) {
    const [formData, setFormData] = useState<Patient | null>(null);
    const [uploading, setUploading] = useState(false);
    const [staff, setStaff] = useState<MedicalStaff[]>([]);
    const [config, setConfig] = useState<{ teams: string[], systems: string[], hospitals: string[] }>({ teams: [], systems: [], hospitals: [] });
    const [schema, setSchema] = useState<FieldSchema[]>([]);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        const [staffData, configData, schemaData] = await Promise.all([
            getStaff(),
            import('../app/config-actions').then(m => m.getConfig()),
            getFieldSchema()
        ]);
        setStaff(staffData);
        setConfig(configData);
        setSchema(schemaData);
    };

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

        // Auto-calculate age if birthDate is changed
        if (fieldId === 'birthDate' && typeof value === 'string' && value.length === 10) {
            const [d, m, y] = value.split('/').map(Number);
            if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y > 1900) {
                const today = new Date();
                let age = today.getFullYear() - y;
                const monthDiff = today.getMonth() - (m - 1);
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
                    age--;
                }
                if (age >= 0) {
                    newFormData['age'] = age.toString();
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
        try {
            const worker = await createWorker('por');
            const ret = await worker.recognize(file);
            const text = ret.data.text;
            
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
                    alert(`${field.label} inválida. Utilize o formato DD/MM/AAAA.`);
                    return;
                }
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
                return ["AGENDADOS", "CIRURGIA REALIZADA", "OBSERVAÇÕES/PENDÊNCIAS", "PERDA DE SEGMENTO", "PRONTOS", "SEM STATUS"];
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
                    <label className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-widest cursor-pointer hover:text-blue-700 transition-all bg-blue-50 px-2 py-1 rounded-lg">
                        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                        {uploading ? 'Processando...' : 'Leitor OCR (IA)'}
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
                                {patient.lastUpdatedBy && (
                                    <>
                                        <span className="mx-2">•</span>
                                        Última Modificação: {new Date(patient.lastUpdated || '').toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} por {patient.lastUpdatedBy}
                                    </>
                                )}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all p-2 bg-slate-50" title="Fechar">
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50">
                    <form id="patient-form" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                        {schema.map(field => renderField(field))}
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
