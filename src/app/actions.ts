'use server';

import prisma from '@/lib/prisma';
import { logAccess, getFieldSchema } from '../lib/google-sheets';
import { logPatientChange, logPatientAction, getPatientChangeLogs } from '../lib/audit-log';
import { Patient } from '../types';
import { cookies } from 'next/headers';
import { Role } from '@prisma/client';

// Helper to get HSR Tenant
async function getHSRTenantId() {
    const tenant = await prisma.tenant.findFirst({
        where: { name: "HSR - SUS CX ONCO" }
    });
    return tenant?.id;
}

async function getCurrentUser() {
    const cookieStore = await cookies();
    const username = cookieStore.get('username')?.value;
    if (!username) return null;

    return await prisma.user.findUnique({
        where: { username },
        include: { tenant: true }
    });
}

/**
 * Recalculates the `position` field for all patients based on their AIH date.
 */
async function syncPositionsInDB(tenantId: string) {
    const patients = await prisma.patient.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' }
    });

    const parseDateBR = (dateStr: string): number => {
        if (!dateStr || dateStr === '--') return 0;
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length >= 3) {
                const [y, m, d] = parts;
                return new Date(`${y}-${m}-${d.substring(0, 2)}T00:00:00`).getTime();
            }
        } else if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const [d, m, y] = parts;
                return new Date(`${y}-${m}-${d}T00:00:00`).getTime();
            }
        }
        return 0;
    };

    const sorted = [...patients].sort((a, b) => {
        const timeA = parseDateBR(a.aihDate || '');
        const timeB = parseDateBR(b.aihDate || '');
        
        if (timeA === 0 && timeB !== 0) return 1;
        if (timeA !== 0 && timeB === 0) return -1;
        if (timeA !== timeB) return timeA - timeB;

        return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const teamCounters: Record<string, number> = {};
    
    for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i];
        const teamId = p.teamId || 'N/A';
        teamCounters[teamId] = (teamCounters[teamId] || 0) + 1;
        
        const hasDate = !!(p.aihDate && p.aihDate !== '--');
        const newPos = hasDate ? i + 1 : 0;
        const newTeamPos = hasDate ? teamCounters[teamId] : 0;

        if (p.position !== newPos || p.teamPosition !== newTeamPos) {
            await prisma.patient.update({
                where: { id: p.id },
                data: { 
                    position: newPos,
                    teamPosition: newTeamPos
                }
            });
        }
    }
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
    const user = await getCurrentUser() as any;
    if (!user) return [];

    const whereClause: any = { tenantId: user.tenantId };
    
    // Level 2: Service Admin (Service Chief) - Filter by their team only
    if ((user.role as string) === 'SERVICE_ADMIN' && user.serviceId) {
        whereClause.teamId = user.serviceId;
    }
    // Level 3/4: Staff (Preceptor/Resident) - Currently also filtered by service in the UI/logic
    // but the Hospital Admin (HOSPITAL_ADMIN) sees EVERYTHING (whereClause.teamId is not set)

    const patients = await prisma.patient.findMany({
        where: whereClause,
        include: { team: true },
        orderBy: [
            { position: 'asc' },
            { createdAt: 'asc' }
        ]
    });

    return patients.map(p => ({
        id: p.id,
        name: p.fullName,
        team: p.team?.name || '',
        medicalRecord: p.medicalRecord || '',
        cpf: p.cpf || '',
        birthDate: p.birthDate || '',
        aihDate: p.aihDate || '',
        status: p.status || '',
        priority: p.priority || '3',
        needsICU: p.needsICU ? "Sim" : "Não",
        latexAllergy: p.latexAllergy ? "Sim" : "Não",
        jehovahsWitness: p.jehovahsWitness ? "Sim" : "Não",
        clinicalData: p.clinicalData || '',
        caseDiscussion: p.caseDiscussion || '',
        preAnestheticEval: p.preAnestheticEval || '',
        observations: p.observations || '',
        preceptor: p.preceptorName || '',
        resident: p.mainResidentName || '',
        auxiliaryResidents: p.auxiliaryResidents || '',
        examPdfPath: p.examPdfPath || '',
        waitTime: String(p.waitTimeDays || 0),
        position: (p.position && p.position > 0) ? String(p.position) : '',
        teamPosition: (p.teamPosition && p.teamPosition > 0) ? String(p.teamPosition) : '',
        lastUpdated: p.updatedAt.toISOString(),
        lastUpdatedBy: p.lastUpdatedBy || 'SISTEMA'
    })) as Patient[];
}

export async function createPatientAction(patientData: Omit<Patient, 'id'>) {
    try {
        const tenantId = await getHSRTenantId();
        if (!tenantId) throw new Error("Tenant not found");

        const cookieStore = await cookies();
        const userName = cookieStore.get('username')?.value || 'Desconhecido';
        const decodedName = decodeURIComponent(userName);

        let teamId = null;
        if (patientData.team) {
            const team = await prisma.team.findFirst({
                where: { name: String(patientData.team), tenantId }
            });
            teamId = team ? team.id : (await prisma.team.create({ data: { name: String(patientData.team), tenantId } })).id;
        }

        const waitTime = autoCalculateWaitTime(patientData.aihDate as string, patientData.surgeryDate as string);

        const newPatient = await prisma.patient.create({
            data: {
                fullName: String(patientData.name || "NOME NÃO INFORMADO"),
                tenantId,
                teamId,
                medicalRecord: String(patientData.medicalRecord || ""),
                cpf: String(patientData.cpf || ""),
                birthDate: String(patientData.birthDate || ""),
                aihDate: String(patientData.aihDate || ""),
                status: String(patientData.status || "AGUARDANDO AVALIAÇÃO"),
                priority: String(patientData.priority || "3"),
                needsICU: patientData.needsICU === "Sim",
                latexAllergy: patientData.latexAllergy === "Sim",
                jehovahsWitness: patientData.jehovahsWitness === "Sim",
                clinicalData: String(patientData.clinicalData || ""),
                caseDiscussion: String(patientData.caseDiscussion || ""),
                preAnestheticEval: String(patientData.preAnestheticEval || ""),
                observations: String(patientData.observations || ""),
                preceptorName: String(patientData.preceptor || ""),
                mainResidentName: String(patientData.resident || ""),
                auxiliaryResidents: String(patientData.auxiliaryResidents || ""),
                examPdfPath: String(patientData.examPdfPath || ""),
                waitTimeDays: waitTime,
                lastUpdatedBy: decodedName
            }
        });

        await syncPositionsInDB(tenantId);
        await logPatientAction(newPatient.id, newPatient.fullName, 'CREATE', decodedName);
        await logAccess(decodedName, `CRIOU PACIENTE: ${newPatient.fullName}`).catch(console.error);

        return { success: true };
    } catch (error) {
        console.error('Error in createPatientAction:', error);
        return { success: false, error: 'Erro ao salvar paciente' };
    }
}

export async function updatePatientAction(patient: Patient) {
    try {
        const tenantId = await getHSRTenantId();
        if (!tenantId) throw new Error("Tenant not found");

        const cookieStore = await cookies();
        const userName = cookieStore.get('username')?.value || 'Desconhecido';
        const decodedName = decodeURIComponent(userName);

        const oldPatient = await prisma.patient.findUnique({
            where: { id: patient.id }
        });

        if (oldPatient) {
            const schema = await getFieldSchema();
            const changedFields: string[] = [];
            const oldObj = oldPatient as any;
            const newObj = patient as any;

            for (const field of schema) {
                const oldVal = oldObj[field.id] || oldObj[field.id === 'name' ? 'fullName' : field.id];
                const newVal = newObj[field.id];
                
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
        }

        let teamId = null;
        if (patient.team) {
            const team = await prisma.team.findFirst({
                where: { name: String(patient.team), tenantId }
            });
            teamId = team ? team.id : (await prisma.team.create({ data: { name: String(patient.team), tenantId } })).id;
        }

        const waitTime = autoCalculateWaitTime(patient.aihDate as string, patient.surgeryDate as string);

        await prisma.patient.update({
            where: { id: patient.id },
            data: {
                fullName: String(patient.name),
                teamId,
                medicalRecord: String(patient.medicalRecord || ""),
                cpf: String(patient.cpf || ""),
                birthDate: String(patient.birthDate || ""),
                aihDate: String(patient.aihDate || ""),
                status: String(patient.status || ""),
                priority: String(patient.priority || ""),
                needsICU: patient.needsICU === "Sim",
                latexAllergy: patient.latexAllergy === "Sim",
                jehovahsWitness: patient.jehovahsWitness === "Sim",
                clinicalData: String(patient.clinicalData || ""),
                caseDiscussion: String(patient.caseDiscussion || ""),
                preAnestheticEval: String(patient.preAnestheticEval || ""),
                observations: String(patient.observations || ""),
                preceptorName: String(patient.preceptor || ""),
                mainResidentName: String(patient.resident || ""),
                auxiliaryResidents: String(patient.auxiliaryResidents || ""),
                examPdfPath: String(patient.examPdfPath || ""),
                waitTimeDays: waitTime,
                lastUpdatedBy: decodedName
            }
        });

        await syncPositionsInDB(tenantId);
        return { success: true };
    } catch (error) {
        console.error('Error in updatePatientAction:', error);
        return { success: false, error: 'Erro ao atualizar paciente' };
    }
}

export async function deletePatientAction(patientId: string) {
    try {
        const tenantId = await getHSRTenantId();
        const patient = await prisma.patient.findUnique({ where: { id: patientId } });
        
        await prisma.patient.delete({ where: { id: patientId } });

        const cookieStore = await cookies();
        const userName = cookieStore.get('username')?.value || 'Desconhecido';
        const decodedName = decodeURIComponent(userName);
        
        await logPatientAction(patientId, patient?.fullName || 'Desconhecido', 'DELETE', decodedName);
        await logAccess(decodedName, `EXCLUIU PACIENTE ID: ${patientId}`).catch(console.error);

        if (tenantId) await syncPositionsInDB(tenantId);

        return { success: true };
    } catch (error) {
        console.error('Error in deletePatientAction:', error);
        return { success: false, error: 'Erro ao excluir no servidor' }; 
    }
}

export async function getPatientChangeLogsAction() {
    return await getPatientChangeLogs();
}

export async function recalculateAllPositionsAction() {
    try {
        const tenantId = await getHSRTenantId();
        if (tenantId) await syncPositionsInDB(tenantId);

        const cookieStore = await cookies();
        const userName = cookieStore.get('username')?.value || 'Desconhecido';
        const decodedName = decodeURIComponent(userName);
        await logAccess(decodedName, 'RECALCULOU POSIÇÕES POR DATA AIH').catch(console.error);

        return { success: true };
    } catch (error) {
        console.error('Error in recalculateAllPositionsAction:', error);
        return { success: false, error: 'Erro ao recalcular posições' };
    }
}
