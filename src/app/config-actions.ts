'use server';

import { getConfigFromSheet, saveConfigToSheet } from '../lib/google-sheets';
import { getPatientsFromSheet, savePatientsToSheet } from '../lib/google-sheets';
import { getStaffFromSheet, saveStaffToSheet } from '../lib/google-sheets';

export async function getConfig() {
    return await getConfigFromSheet();
}

export async function saveConfigAction(config: { teams: string[], systems: string[] }) {
    await saveConfigToSheet(config);
    return { success: true };
}

export async function addTeamAction(team: string) {
    const config = await getConfig();
    if (!config.teams.includes(team)) {
        config.teams.push(team);
        await saveConfigAction(config);
    }
    return { success: true };
}

export async function deleteTeamAction(team: string) {
    const config = await getConfig();
    config.teams = config.teams.filter((t: string) => t !== team);
    await saveConfigAction(config);
    return { success: true };
}

export async function addSystemAction(system: string) {
    const config = await getConfig();
    if (!config.systems.includes(system)) {
        config.systems.push(system);
        await saveConfigAction(config);
    }
    return { success: true };
}

export async function deleteSystemAction(system: string) {
    const config = await getConfig();
    config.systems = config.systems.filter((s: string) => s !== system);
    await saveConfigAction(config);
    return { success: true };
}

// Quando uma equipe é renomeada, devemos atualizar todos os pacientes associados
export async function updateTeamAction(oldName: string, newName: string) {
    try {
        const config = await getConfig();
        const index = config.teams.indexOf(oldName);
        
        if (index !== -1) {
            // Renomeia na config
            config.teams[index] = newName;
            await saveConfigAction(config);

            // Atualiza os pacientes do Google Sheets
            const patients = await getPatientsFromSheet();
            let changedPatients = false;
            
            const updatedPatients = patients.map(p => {
                if (p.team === oldName) {
                    changedPatients = true;
                    return { ...p, team: newName };
                }
                return p;
            });

            if (changedPatients) {
                await savePatientsToSheet(updatedPatients);
            }
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error in updateTeamAction:', error);
        return { success: false, error: 'Erro ao atualizar a equipe' };
    }
}

// Quando um sistema é renomeado, atualizar pacientes e a equipe médica
export async function updateSystemAction(oldName: string, newName: string) {
    try {
        const config = await getConfig();
        const index = config.systems.indexOf(oldName);
        
        if (index !== -1) {
            // Renomeia na config
            config.systems[index] = newName;
            await saveConfigAction(config);

            // Atualiza os pacientes no Google Sheets
            const patients = await getPatientsFromSheet();
            let changedPatients = false;
            
            const updatedPatients = patients.map(p => {
                if (p.sistema === oldName) {
                    changedPatients = true;
                    return { ...p, sistema: newName };
                }
                return p;
            });

            if (changedPatients) {
                await savePatientsToSheet(updatedPatients);
            }

            // Atualiza os médicos no Google Sheets
            const staff = await getStaffFromSheet();
            let changedStaff = false;
            
            const updatedStaff = staff.map(s => {
                if (s.systemName === oldName) {
                    changedStaff = true;
                    return { ...s, systemName: newName };
                }
                return s;
            });

            if (changedStaff) {
                await saveStaffToSheet(updatedStaff);
            }
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error in updateSystemAction:', error);
        return { success: false, error: 'Erro ao atualizar o sistema' };
    }
}
