'use server';

import fs from 'fs/promises';
import path from 'path';
import { getPatientsFromSheet, savePatientsToSheet } from '../lib/google-sheets';
import { Patient } from '../types';

export async function getPatients() {
    return await getPatientsFromSheet();
}

export async function createPatientAction(patient: Omit<Patient, 'id'>) {
    console.log('Create requested for:', patient.name);
    try {
        const patients = await getPatientsFromSheet();
        const newPatient: Patient = {
            ...patient,
            id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
            lastUpdated: new Date().toISOString()
        };
        
        const updatedPatients = [...patients, newPatient];
        await savePatientsToSheet(updatedPatients);
        
        return { success: true, patient: newPatient };
    } catch (error) {
        console.error('Erro ao criar paciente no Google Sheets:', error);
        return { success: false, error: 'Erro ao salvar paciente' };
    }
}

export async function updatePatientAction(patient: Patient) {
    console.log('Update requested for:', patient.name);
    try {
        const patients = await getPatientsFromSheet();
        const updatedPatients = patients.map(p => 
            p.id === patient.id ? { ...patient, lastUpdated: new Date().toISOString() } : p
        );
        
        await savePatientsToSheet(updatedPatients);
        return { success: true };
    } catch (error) {
        console.error('Erro ao atualizar paciente no Google Sheets:', error);
        return { success: false, error: 'Erro ao atualizar paciente' };
    }
}

export async function deletePatientAction(patientId: string) {
    console.log('Delete requested for ID:', patientId);
    try {
        const patients = await getPatientsFromSheet();
        const updatedPatients = patients.filter(p => p.id !== patientId);
        
        // We do NOT re-index their IDs anymore since they are unique identifiers now
        await savePatientsToSheet(updatedPatients);
        return { success: true };
    } catch (error) {
        console.error('Delete Error no Google Sheets:', error);
        return { success: false, error: 'Erro ao excluir no servidor' };
    }
}

export async function uploadExamAction(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        let patientName = formData.get('patientName') as string;
        
        console.log('Upload target:', patientName, 'File:', file?.name);

        if (!file) {
            return { success: false, error: 'Arquivo não selecionado' };
        }

        if (!patientName || patientName.trim() === '') {
            patientName = 'Paciente_Sem_Nome_' + Date.now();
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const timestamp = Date.now();
        const safeName = patientName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
        const fileName = `${safeName}_${timestamp}_exam.pdf`;
        
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'exams');
        
        // Ensure directory exists
        await fs.mkdir(uploadsDir, { recursive: true });
        
        const filePath = path.join(uploadsDir, fileName);
        await fs.writeFile(filePath, buffer);
        
        console.log('File saved at:', filePath);
        
        return { 
            success: true, 
            path: `/uploads/exams/${fileName}` 
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro interno no servidor';
        console.error('Upload Error:', error);
        return { success: false, error: message };
    }
}
