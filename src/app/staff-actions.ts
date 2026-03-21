'use server';

import { MedicalStaff } from '../types';
import { getStaffFromSheet, saveStaffToSheet } from '../lib/google-sheets';

export async function getStaff(): Promise<MedicalStaff[]> {
    return await getStaffFromSheet();
}

export async function saveStaffAction(staffMember: MedicalStaff | Omit<MedicalStaff, 'id'>) {
    try {
        const staff = await getStaff();
        let updatedStaff: MedicalStaff[];
        
        if ('id' in staffMember && staffMember.id) {
            // Update existing
            updatedStaff = staff.map(s => s.id === staffMember.id ? staffMember as MedicalStaff : s);
        } else {
            // Create new
            const newStaff: MedicalStaff = {
                ...staffMember,
                id: Math.random().toString(36).substring(2, 9)
            };
            updatedStaff = [...staff, newStaff];
        }
        
        await saveStaffToSheet(updatedStaff);
        return { success: true };
    } catch (error) {
        console.error('Error saving staff to Google Sheets:', error);
        return { success: false, error: 'Erro ao salvar profissional' };
    }
}

export async function deleteStaffAction(id: string) {
    try {
        const staff = await getStaff();
        const updatedStaff = staff.filter(s => s.id !== id);
        await saveStaffToSheet(updatedStaff);
        return { success: true };
    } catch (error) {
        console.error('Error deleting staff from Google Sheets:', error);
        return { success: false, error: 'Erro ao excluir profissional' };
    }
}

export async function validateLoginAction(username: string, password: string, role: string) {
    const staff = await getStaff();
    
    // Role mapping from Login UI to storage type
    const roleMap: Record<string, string> = {
        'Administrador': 'admin',
        'Médico Preceptor': 'preceptor',
        'Médico Residente': 'resident'
    };
    
    const targetRole = roleMap[role];
    
    const user = staff.find(s => 
        (s.username === username || s.email === username) && 
        s.password === password && 
        s.type === targetRole
    );
    
    if (user) {
        return { success: true, user: { id: user.id, fullName: user.fullName, role: role } };
    }
    
    return { success: false, error: 'Usuário ou senha incorretos para este perfil' };
}

export async function recoverPasswordAction(username: string, role: string) {
    const staff = await getStaff();
    
    const roleMap: Record<string, string> = {
        'Administrador': 'admin',
        'Médico Preceptor': 'preceptor',
        'Médico Residente': 'resident'
    };
    
    const targetRole = roleMap[role];
    
    const user = staff.find(s => 
        (s.username === username || s.email === username) && 
        s.type === targetRole
    );
    
    if (!user) {
        return { success: false, error: 'Usuário não encontrado' };
    }
    
    let targetEmail = user.email;
    if (targetRole === 'admin' || role === 'Administrador') {
        targetEmail = 'LAPORTEGUSTAVO@GMAIL.COM';
    }
    
    if (!targetEmail) {
        return { success: false, error: 'E-mail não cadastrado para este usuário' };
    }
    
    // Generate a simple new password
    const newPassword = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Update the password in storage
    const updatedStaff = staff.map(s => s.id === user.id ? { ...s, password: newPassword } : s);
    await saveStaffToSheet(updatedStaff);
    
    // LOG the "email" for simulation
    console.log(`[PASSWORD RECOVERY] Email would be sent to: ${targetEmail}`);
    console.log(`[PASSWORD RECOVERY] Content: Sua nova senha para o CX ONCO HSR é: ${newPassword}`);
    
    return { 
        success: true, 
        message: `Uma nova senha foi enviada para o e-mail: ${targetEmail.replace(/(.{3}).*(@.*)/, '$1***$2')}`
    };
}
