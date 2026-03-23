'use server';

import { getPatientsFromSheet, savePatientsToSheet, logAccess, getFieldSchema } from '../lib/google-sheets';
import { logPatientChange, logPatientAction, getPatientChangeLogs } from '../lib/audit-log';
import { Patient } from '../types';
import { cookies } from 'next/headers';

/**
 * Recalculates the `position` field for all patients based on their AIH date.
 * Patients with the earliest AIH date receive position 1.
 * Patients without an AIH date are placed at the end without a position number.
 */
function recalculatePositions(patients: Patient[]): Patient[] {
    const parseDateBR = (dateStr: string): number => {
        if (!dateStr) return 0;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [d, m, y] = parts;
            return new Date(`${y}-${m}-${d}T00:00:00`).getTime();
        }
        return 0;
    };

    const withDate = patients
        .filter(p => p.aihDate && String(p.aihDate).trim() !== '')
        .sort((a, b) => {
            const timeA = parseDateBR(String(a.aihDate || ''));
            const timeB = parseDateBR(String(b.aihDate || ''));
            
            // 1. Prioridade: Data da AIH (Mais antiga primeiro)
            if (timeA !== timeB) return timeA - timeB;

            // 2. Prioridade: Hora de registro (Mais antigo primeiro)
            const idA = parseInt(a.id.substring(0, 13));
            const idB = parseInt(b.id.substring(0, 13));
            if (!isNaN(idA) && !isNaN(idB) && idA !== idB) {
                return idA - idB;
            }

            // 3. Prioridade: Idade/Mais velho (Data de nascimento mais antiga primeiro)
            const birthTimeA = parseDateBR(String(a.birthDate || ''));
            const birthTimeB = parseDateBR(String(b.birthDate || ''));
            if (birthTimeA && birthTimeB && birthTimeA !== birthTimeB) {
                return birthTimeA - birthTimeB;
            }
            if (birthTimeA && !birthTimeB) return -1;
            if (!birthTimeA && birthTimeB) return 1;

            return 0;
        });

    const withoutDate = patients.filter(p => !p.aihDate || String(p.aihDate).trim() === '');

    const positioned = withDate.map((p, idx) => ({ ...p, position: String(idx + 1) }));
    const unpositioned = withoutDate.map(p => ({ ...p, position: '' }));

    // Rebuild full list preserving original order for non-dated patients but updating positions
    const positionMap = new Map<string, string>();
    [...positioned, ...unpositioned].forEach(p => positionMap.set(p.id, String(p.position || '')));

    return patients.map(p => ({ ...p, position: positionMap.get(p.id) ?? p.position }));
}

function autoCalculateWaitTime(aih: unknown, surg: unknown): string {
    const sAih = String(aih || '').trim();
    const sSurg = String(surg || '').trim();
    if (!sAih || sAih === '--') return '';

    const parseDate = (d: string): Date | null => {
        if (!d || d === '--') return null;
        if (d.includes('/')) {
            const parts = d.split('/');
            if (parts.length === 3) {
                let year = Number(parts[2]);
                if (year < 100) year += 2000;
                return new Date(year, Number(parts[1]) - 1, Number(parts[0]));
            }
        } else if (d.includes('-')) {
            const parts = d.split('-');
            if (parts.length >= 3) {
                return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2].substring(0, 2)));
            }
        }
        return null;
    };

    const start = parseDate(sAih);
    if (!start || isNaN(start.getTime())) return '';

    const hasSurgery = sSurg && sSurg !== '--';
    if (!hasSurgery) return '';

    const end = parseDate(sSurg);

    if (!end || isNaN(end.getTime())) return '';

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return '0';
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return String(diffDays);
}

export async function getPatientsAction() {
    return await getPatientsFromSheet();
}

export async function createPatientAction(patient: Omit<Patient, 'id'>) {
    console.log('Create requested for:', patient.name);
    try {
        const patients = await getPatientsFromSheet();
        const cookieStore = await cookies();
        const userName = cookieStore.get('username')?.value || 'Desconhecido';
        const decodedName = decodeURIComponent(userName);

        const newPatient: Patient = {
            ...patient,
            id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
            name: String(patient.name),
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: decodedName,
            waitTime: autoCalculateWaitTime(patient.aihDate, patient.surgeryDate)
        };
        
        const withNew = [...patients, newPatient];
        const updatedPatients = recalculatePositions(withNew);
        await savePatientsToSheet(updatedPatients);
        
        const saved = updatedPatients.find(p => p.id === newPatient.id) || newPatient;

        // Registrar log de auditoria
        await logPatientAction(newPatient.id, newPatient.name, 'CREATE', decodedName);
        await logAccess(decodedName, `CRIOU PACIENTE: ${newPatient.name}`).catch(console.error);
        
        return { success: true, patient: saved };
    } catch (error) {
        console.error('Erro ao criar paciente no Google Sheets:', error);
        return { success: false, error: 'Erro ao salvar paciente' };
    }
}

export async function updatePatientAction(patient: Patient) {
    console.log('Update requested for:', patient.name);
    try {
        const patients = await getPatientsFromSheet();
        const schema = await getFieldSchema();
        const cookieStore = await cookies();
        const userName = cookieStore.get('username')?.value || 'Desconhecido';
        const decodedName = decodeURIComponent(userName);

        const oldPatient = patients.find(p => p.id === patient.id);
        
        if (oldPatient) {
            const changedFields: string[] = [];
            for (const field of schema) {
                const oldVal = (oldPatient as Record<string, unknown>)[field.id];
                const newVal = (patient as Record<string, unknown>)[field.id];
                
                const sOld = Array.isArray(oldVal) ? JSON.stringify(oldVal) : String(oldVal || '');
                const sNew = Array.isArray(newVal) ? JSON.stringify(newVal) : String(newVal || '');

                if (sOld !== sNew && field.id !== 'lastUpdated' && field.id !== 'lastUpdatedBy') {
                    await logPatientChange(patient.id, patient.name, field.label, sOld, sNew, decodedName);
                    changedFields.push(field.label);
                }
            }
            
            const fieldsInfo = changedFields.length > 0 ? ` (${changedFields.join(', ')})` : '';
            await logAccess(decodedName, `EDITOU PACIENTE: ${patient.name}${fieldsInfo}`).catch(console.error);
        }

        const mapped = patients.map(p => 
            p.id === patient.id ? { 
                ...patient, 
                lastUpdated: new Date().toISOString(), 
                lastUpdatedBy: decodedName,
                waitTime: autoCalculateWaitTime(patient.aihDate, patient.surgeryDate)
            } : p
        );
        
        const updatedPatients = recalculatePositions(mapped);
        await savePatientsToSheet(updatedPatients);
        
        await logAccess(decodedName, `EDITOU PACIENTE: ${patient.name}`).catch(console.error);
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
        const patientToDelete = patients.find(p => p.id === patientId);
        const filtered = patients.filter(p => p.id !== patientId);
        const updatedPatients = recalculatePositions(filtered);
        
        await savePatientsToSheet(updatedPatients);

        const cookieStore = await cookies();
        const userName = cookieStore.get('username')?.value || 'Desconhecido';
        const decodedName = decodeURIComponent(userName);
        
        await logPatientAction(patientId, patientToDelete?.name || 'Desconhecido', 'DELETE', decodedName);
        await logAccess(decodedName, `EXCLUIU PACIENTE ID: ${patientId}`).catch(console.error);

        return { success: true };
    } catch (error) {
        console.error('Delete Error no Google Sheets:', error);
        return { success: false, error: 'Erro ao excluir no servidor' }; 
    }
}

export async function getPatientChangeLogsAction() {
    return await getPatientChangeLogs();
}

export async function recalculateAllPositionsAction() {
    try {
        const patients = await getPatientsFromSheet();
        const reordered = recalculatePositions(patients);
        await savePatientsToSheet(reordered);

        const cookieStore = await cookies();
        const userName = cookieStore.get('username')?.value || 'Desconhecido';
        const decodedName = decodeURIComponent(userName);
        await logAccess(decodedName, 'RECALCULOU POSIÇÕES POR DATA AIH').catch(console.error);

        return { success: true, updated: reordered.length };
    } catch (error) {
        console.error('Erro ao recalcular posições:', error);
        return { success: false, error: 'Erro ao recalcular posições' };
    }
}
