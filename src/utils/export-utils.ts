import * as XLSX from 'xlsx';
import { Patient } from '../types';

export const exportPatientsToExcel = (patients: Patient[], fileName: string = 'pacientes_hsr.xlsx') => {
    // Flat the data for Excel
    const data = patients.map(p => ({
        'Status': p.status || 'SEM STATUS',
        'Equipe': p.team || '',
        'Sistema': p.sistema || '',
        'Preceptor': p.preceptor || '',
        'Nome': p.name || '',
        'Prontuário': p.medicalRecord || '',
        'Data AIH': p.aihDate || '',
        'Data Cirurgia': p.surgeryDate || '',
        'Residente': p.resident || '',
        'UTI': p.needsICU || '',
        'Observações': p.observations || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pacientes");

    // Generate buffer
    XLSX.writeFile(workbook, fileName);
};

export const downloadBackupAsJson = (data: unknown, fileName: string = `hsr_backup_${new Date().toISOString().split('T')[0]}.json`) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const downloadBackupAsExcel = (data: Patient[], fileName: string = `hsr_backup_${new Date().toISOString().split('T')[0]}.xlsx`) => {
    // Para backup completo, exportamos todos os campos serializados.
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Backup Completo");

    // Generate file
    XLSX.writeFile(workbook, fileName);
};
