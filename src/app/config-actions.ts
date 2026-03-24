'use server';

import { getConfigFromSheet, saveConfigToSheet, getFieldSchema } from '../lib/google-sheets';
import { Patient } from '../types';

// Return configuration for the current tenant
export async function getConfig() {
    return await getConfigFromSheet();
}

// This remains legacy for now or can be simplified to a static object if needed
export async function getSchemaAction() {
    return await getFieldSchema();
}

export async function addTeamAction(teamName: string) {
    const config = await getConfigFromSheet();
    if (!config.teams.includes(teamName)) {
        config.teams.push(teamName);
        await saveConfigToSheet(config);
    }
    return { success: true };
}

export async function deleteTeamAction(teamName: string) {
    const config = await getConfigFromSheet();
    config.teams = config.teams.filter(t => t !== teamName);
    await saveConfigToSheet(config);
    return { success: true };
}

export async function addSystemAction(system: string) {
    const config = await getConfigFromSheet();
    if (!config.systems.includes(system)) {
        config.systems.push(system);
        await saveConfigToSheet(config);
    }
    return { success: true };
}

export async function deleteSystemAction(system: string) {
    const config = await getConfigFromSheet();
    config.systems = config.systems.filter(s => s !== system);
    await saveConfigToSheet(config);
    return { success: true };
}

export async function addHospitalAction(hospital: string) {
    const config = await getConfigFromSheet();
    if (!config.hospitals.includes(hospital)) {
        config.hospitals.push(hospital);
        await saveConfigToSheet(config);
    }
    return { success: true };
}

export async function deleteHospitalAction(hospital: string) {
    const config = await getConfigFromSheet();
    config.hospitals = config.hospitals.filter(h => h !== hospital);
    await saveConfigToSheet(config);
    return { success: true };
}

export async function updateTeamAction(oldName: string, newName: string) {
    const config = await getConfigFromSheet();
    config.teams = config.teams.map(t => t === oldName ? newName : t);
    await saveConfigToSheet(config);
    
    // Update all patients in the spreadsheet
    const { getPatientsFromSheet, savePatientsToSheet } = await import('../lib/google-sheets');
    const patients = await getPatientsFromSheet();
    const updatedPatients = patients.map(p => p.team === oldName ? { ...p, team: newName } : p);
    await savePatientsToSheet(updatedPatients);

    return { success: true };
}

export async function updateSystemAction(oldName: string, newName: string) {
    const config = await getConfigFromSheet();
    config.systems = config.systems.map(s => s === oldName ? newName : s);
    await saveConfigToSheet(config);

    // Update all patients
    const { getPatientsFromSheet, savePatientsToSheet } = await import('../lib/google-sheets');
    const patients = await getPatientsFromSheet();
    const updatedPatients = patients.map(p => p.sistema === oldName ? { ...p, sistema: newName } : p);
    await savePatientsToSheet(updatedPatients);

    // Update staff system names
    const { getStaffFromSheet, saveStaffToSheet } = await import('../lib/google-sheets');
    const staff = await getStaffFromSheet();
    const updatedStaff = staff.map(s => s.systemName === oldName ? { ...s, systemName: newName } : s);
    await saveStaffToSheet(updatedStaff);

    return { success: true };
}

export async function updateHospitalAction(oldName: string, newName: string) {
    const config = await getConfigFromSheet();
    config.hospitals = config.hospitals.map(h => h === oldName ? newName : h);
    await saveConfigToSheet(config);

    // Update patients
    const { getPatientsFromSheet, savePatientsToSheet } = await import('../lib/google-sheets');
    const patients = await getPatientsFromSheet();
    const updatedPatients = patients.map(p => (p as Patient & { hospital?: string }).hospital === oldName ? { ...p, hospital: newName } : p);
    await savePatientsToSheet(updatedPatients);

    return { success: true };
}
