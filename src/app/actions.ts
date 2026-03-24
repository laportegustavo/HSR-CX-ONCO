'use server';

import { getPatientsFromSheet, savePatientsToSheet, logAccess, getFieldSchema } from '../lib/google-sheets';
import { logPatientChange, logPatientAction, getPatientChangeLogs } from '../lib/audit-log';
import { Patient } from '../types';
import { cookies } from 'next/headers';

async function getCurrentUser() {
    const cookieStore = await cookies();
    const username = cookieStore.get('username')?.value;
    const role = cookieStore.get('role')?.value;
    const fullname = cookieStore.get('fullname')?.value;
    if (!username) return null;

    return { username, role, fullName: decodeURIComponent(fullname || "") };
}

// Positions are handled locally or via recalculateAllPositionsAction

function normalizeDate(dateStr: string | null | undefined): string {
    if (!dateStr || dateStr === '--') return '--';
    const s = String(dateStr).trim();
    if (!s) return '--';

    // Se já estiver no formato dd/mm/aaaa, retorna
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;

    // Caso aaaa-mm-dd (ISO) ou aaaa/mm/dd
    const isoMatch = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (isoMatch) {
        return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }

    return s;
}

function autoCalculateWaitTime(aih: string | null | undefined, surg: string | null | undefined): number {
    const sAih = String(aih || '').trim();
    const sSurg = String(surg || '').trim();
    if (!sAih || sAih === '--' || !sSurg || sSurg === '--') return 0;

    const parseDate = (d: string): Date | null => {
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
    const end = parseDate(sSurg);

    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export async function getPatientsAction(): Promise<Patient[]> {
    const user = await getCurrentUser();
    if (!user) return [];

    const patients = await getPatientsFromSheet();
    
    // Sort consistently
    const sorted = patients.sort((a, b) => {
        const posA = parseInt(String(a.position || '999'));
        const posB = parseInt(String(b.position || '999'));
        if (posA !== posB) return posA - posB;
        return (a.name || '').localeCompare(b.name || '');
    });

    return sorted;
}

export async function createPatientAction(patientData: Omit<Patient, 'id'>) {
    try {
        const patients = await getPatientsFromSheet();
        const user = await getCurrentUser();
        const decodedName = user?.fullName || 'Desconhecido';

        const lastId = patients.length > 0 ? Math.max(...patients.map(p => parseInt(String(p.id)) || 0)) : 0;
        const newId = (lastId + 1).toString();

        const aihDate = normalizeDate(patientData.aihDate as string);
        const surgeryDate = normalizeDate(patientData.surgeryDate as string);
        const waitTime = autoCalculateWaitTime(aihDate, surgeryDate);

        const newPatient: Patient = {
            ...(patientData as Patient),
            id: newId,
            aihDate,
            surgeryDate,
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: decodedName,
            waitTime: String(waitTime)
        };

        const updatedList = [...patients, newPatient];
        await savePatientsToSheet(updatedList);
        
        await logPatientAction(newId, newPatient.name, 'CREATE', decodedName);
        await logAccess(decodedName, `CRIOU PACIENTE: ${newPatient.name}`).catch(console.error);

        return { success: true };
    } catch (error) {
        console.error('Error in createPatientAction:', error);
        return { success: false, error: 'Erro ao salvar paciente no Sheets' };
    }
}

export async function updatePatientAction(patient: Patient) {
    try {
        const patients = await getPatientsFromSheet();
        const user = await getCurrentUser();
        const decodedName = user?.fullName || 'Desconhecido';

        const index = patients.findIndex(p => p.id === patient.id);
        if (index === -1) throw new Error("Paciente não encontrado");

        const oldPatient = patients[index];
        const schema = await getFieldSchema();
        const changedFields: string[] = [];

        for (const field of schema) {
            const oldVal = oldPatient[field.id];
            const newVal = patient[field.id];
            
            const sOld = Array.isArray(oldVal) ? JSON.stringify(oldVal) : String(oldVal || '');
            const sNew = Array.isArray(newVal) ? JSON.stringify(newVal) : String(newVal || '');

            if (sOld !== sNew && field.id !== 'lastUpdated' && field.id !== 'lastUpdatedBy') {
                await logPatientChange(patient.id, patient.name, field.label, sOld, sNew, decodedName);
                changedFields.push(field.label);
            }
        }

        if (changedFields.length > 0) {
            await logAccess(decodedName, `EDITOU PACIENTE: ${patient.name} (${changedFields.join(', ')})`).catch(console.error);
        }

        const aihDate = normalizeDate(patient.aihDate as string);
        const surgeryDate = normalizeDate(patient.surgeryDate as string);
        const waitTime = autoCalculateWaitTime(aihDate, surgeryDate);

        const updatedPatient = {
            ...patient,
            aihDate,
            surgeryDate,
            waitTime: String(waitTime),
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: decodedName
        };

        const updatedList = [...patients];
        updatedList[index] = updatedPatient;
        await savePatientsToSheet(updatedList);

        return { success: true };
    } catch (error) {
        console.error('Error in updatePatientAction:', error);
        return { success: false, error: 'Erro ao atualizar paciente no Sheets' };
    }
}

export async function deletePatientAction(patientId: string) {
    try {
        const patients = await getPatientsFromSheet();
        const user = await getCurrentUser();
        const decodedName = user?.fullName || 'Desconhecido';

        const patient = patients.find(p => p.id === patientId);
        const updatedList = patients.filter(p => p.id !== patientId);
        
        await savePatientsToSheet(updatedList);

        await logPatientAction(patientId, patient?.name || 'Desconhecido', 'DELETE', decodedName);
        await logAccess(decodedName, `EXCLUIU PACIENTE ID: ${patientId}`).catch(console.error);

        return { success: true };
    } catch (error) {
        console.error('Error in deletePatientAction:', error);
        return { success: false, error: 'Erro ao excluir no Sheets' }; 
    }
}

export async function getPatientChangeLogsAction() {
    return await getPatientChangeLogs();
}

export async function recalculateAllPositionsAction() {
    try {
        const rawPatients = await getPatientsFromSheet();
        
        // Normaliza formatos de data de todos os pacientes antes de processar
        const patients = rawPatients.map(p => ({
            ...p,
            aihDate: normalizeDate(String(p.aihDate || '--')),
            surgeryDate: normalizeDate(String(p.surgeryDate || '--'))
        } as Patient));
        
        // Separa pacientes ativos (que entram na contagem) dos inativos
        const activePatients = patients.filter(p => 
            p.status !== 'PERDA DE SEGUIMENTO' && 
            p.status !== 'CIRURGIA REALIZADA'
        );
        const inactivePatients = patients.filter(p => 
            p.status === 'PERDA DE SEGUIMENTO' || 
            p.status === 'CIRURGIA REALIZADA'
        );

        // Ordena ativos por data da AIH
        activePatients.sort((a, b) => {
            const timeA = new Date(String(a.aihDate || 0)).getTime();
            const timeB = new Date(String(b.aihDate || 0)).getTime();
            return timeA - timeB;
        });

        // Atribuir Posição Geral para ativos
        const processedActive = activePatients.map((p, i) => ({
            ...p,
            position: String(i + 1)
        } as Patient));

        // Atribuir Posição Equipe para ativos (agrupado por equipe)
        const finalActive: Patient[] = [];
        const teams = [...new Set(processedActive.map(p => String(p.team || '')))];
        
        teams.forEach(team => {
            const teamPatients = processedActive.filter(p => String(p.team || '') === team);
            // Já estão ordenados pela posição geral (cronológica AIH)
            teamPatients.forEach((p, i) => {
                const updatedP = {
                    ...p,
                    teamPosition: String(i + 1)
                } as Patient;
                finalActive.push(updatedP);
            });
        });

        // Limpar posições para inativos
        const processedInactive = inactivePatients.map(p => ({
            ...p,
            position: '--',
            teamPosition: '--'
        } as Patient));

        const updated = [...finalActive, ...processedInactive];
        await savePatientsToSheet(updated);

        const user = await getCurrentUser();
        const decodedName = user?.fullName || 'Desconhecido';
        await logAccess(decodedName, 'RECALCULOU POSIÇÕES POR DATA AIH').catch(console.error);

        return { success: true };
    } catch (error) {
        console.error('Error in recalculateAllPositionsAction:', error);
        return { success: false, error: 'Erro ao recalcular posições no Sheets' };
    }
}
