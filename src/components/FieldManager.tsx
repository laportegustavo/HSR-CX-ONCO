"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, Settings2, Save, X, Check, AlertCircle } from "lucide-react";
import { FieldSchema, FieldType } from "../types";
import { getFieldSchema, saveFieldSchema } from "../app/field-actions";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export default function FieldManager() {
    const [fields, setFields] = useState<FieldSchema[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [fieldToDelete, setFieldToDelete] = useState<FieldSchema | null>(null);

    useEffect(() => {
        loadFields();
    }, []);

    const loadFields = async () => {
        setLoading(true);
        try {
            const data = await getFieldSchema();
            setFields(data.sort((a: FieldSchema, b: FieldSchema) => a.order - b.order));
        } catch (error) {
            console.error("Error loading fields:", error);
            setMessage({ type: 'error', text: "Erro ao carregar campos." });
        } finally {
            setLoading(false);
        }
    };

    const handleAddField = () => {
        const newOrder = fields.length > 0 ? Math.max(...fields.map(f => f.order)) + 1 : 0;
        const nextCol = fields.length > 0 ? Math.max(...fields.map(f => f.column)) + 1 : 0;
        
        const newField: FieldSchema = {
            id: `field_${Date.now()}`,
            label: "Novo Campo",
            type: "text",
            column: nextCol,
            isVisibleInCalendar: false,
            isRequired: false,
            order: newOrder,
            isSystem: false
        };
        setFields([...fields, newField]);
    };

    const handleUpdateField = (id: string, updates: Partial<FieldSchema>) => {
        setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const handleDeleteField = (id: string) => {
        const field = fields.find(f => f.id === id);
        if (field?.isSystem) {
            setMessage({ type: 'error', text: "Este campo é do sistema e não pode ser excluído." });
            setTimeout(() => setMessage(null), 3000);
            return;
        }
        setFieldToDelete(field || null);
    };

    const confirmDeleteField = () => {
        if (fieldToDelete) {
            setFields(fields.filter(f => f.id !== fieldToDelete.id));
            setFieldToDelete(null);
        }
    };

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        
        const items = Array.from(fields);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        
        const updatedItems = items.map((item, index) => ({
            ...item,
            order: index
        }));
        
        setFields(updatedItems);
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await saveFieldSchema(fields);
            setMessage({ type: 'success', text: "Esquema de campos salvo com sucesso!" });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error("Error saving fields:", error);
            setMessage({ type: 'error', text: "Erro ao salvar alterações. Verifique sua conexão ou se a planilha está acessível." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Configuração de Colunas</h3>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleAddField}
                        title="Adicionar novo campo"
                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                    >
                        <Plus size={14} /> Novo Campo
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        title="Salvar todas as alterações no Google Sheets"
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 active:scale-95"
                    >
                        {saving ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div> : <Save size={14} />}
                        Salvar Esquema
                    </button>
                </div>
            </div>

            {message && (
                <div className={`p-3 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 mb-4 ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                }`}>
                    {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                    <p className="text-[10px] font-black uppercase tracking-tight">{message.text}</p>
                    <button onClick={() => setMessage(null)} title="Fechar aviso" className="ml-auto opacity-50 hover:opacity-100 transition-opacity">
                        <X size={14} />
                    </button>
                </div>
            )}

            <div className="bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden">
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="fields">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 uppercase tracking-[0.2em] text-[10px] font-black text-slate-400">
                                            <th className="px-6 py-4 w-12 text-center"></th>
                                            <th className="px-6 py-4">ID / Label</th>
                                            <th className="px-6 py-4 w-44">Tipo</th>
                                            <th className="px-6 py-4 w-24 text-center">Calendário</th>
                                            <th className="px-6 py-4 w-24 text-center">Formulário</th>
                                            <th className="px-6 py-4 w-24 text-center">Obrigat.</th>
                                            <th className="px-6 py-4 w-24 text-right pr-10">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {fields.map((field, index) => (
                                            <Draggable key={field.id} draggableId={field.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <tr 
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`group transition-all ${snapshot.isDragging ? 'bg-blue-50/50 shadow-2xl scale-[1.01] z-50' : 'hover:bg-slate-50/30'}`}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-blue-500 transition-colors" title="Arraste para mover">
                                                                <GripVertical size={20} />
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <input 
                                                                    type="text" 
                                                                    value={field.label}
                                                                    title={`Editar label para ${field.id}`}
                                                                    onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                                                                    className="bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none py-1 text-sm font-bold text-slate-700 transition-all w-full"
                                                                    placeholder="Nome do Campo"
                                                                />
                                                                <span className="text-[9px] font-mono text-slate-400 mt-0.5 uppercase tracking-tighter">ID: {field.id}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <select 
                                                                value={field.type}
                                                                title={`Selecionar tipo do campo ${field.label}`}
                                                                onChange={(e) => handleUpdateField(field.id, { type: e.target.value as FieldType })}
                                                                className="text-xs font-bold text-slate-600 bg-slate-100/50 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 border-none w-full"
                                                            >
                                                                <option value="text">Texto Curto</option>
                                                                <option value="textarea">Texto Longo</option>
                                                                <option value="select">Seleção</option>
                                                                <option value="date">Data</option>
                                                                <option value="time">Hora</option>
                                                                <option value="checkbox">Multi-Seleção</option>
                                                                <option value="number">Número</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={field.isVisibleInCalendar}
                                                                title="Exibir no Cartão do Calendário"
                                                                onChange={(e) => handleUpdateField(field.id, { isVisibleInCalendar: e.target.checked })}
                                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={field.isVisibleInForm !== false}
                                                                title="Exibir no Formulário de Paciente"
                                                                onChange={(e) => handleUpdateField(field.id, { isVisibleInForm: e.target.checked })}
                                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={field.isRequired}
                                                                title="Tornar campo obrigatório"
                                                                onChange={(e) => handleUpdateField(field.id, { isRequired: e.target.checked })}
                                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4 text-right pr-10">
                                                            {!field.isSystem ? (
                                                                <button 
                                                                    onClick={() => handleDeleteField(field.id)}
                                                                    title={`Excluir campo ${field.label}`}
                                                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            ) : (
                                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-2">Sistema</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
                
                {fields.length === 0 && (
                    <div className="p-20 text-center">
                        <div className="mx-auto w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                            <Settings2 size={32} />
                        </div>
                        <p className="text-sm font-medium text-slate-400 italic">Nenhum campo definido. Comece adicionando um novo campo acima.</p>
                    </div>
                )}
            </div>

            {/* Modal de Confirmação de Exclusão de Campo */}
            {fieldToDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-blue-950/40 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
                        <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Excluir Campo</h3>
                        <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                            Tem certeza que deseja excluir o campo <b className="text-slate-800 text-base">&quot;{fieldToDelete.label}&quot;</b>? 
                            <span className="block mt-2 text-[10px] uppercase font-black text-slate-400">Os dados permanecerão no Google Sheets, mas o campo não será mais exibido.</span>
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setFieldToDelete(null)}
                                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmDeleteField}
                                className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-600/20 active:scale-95"
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
