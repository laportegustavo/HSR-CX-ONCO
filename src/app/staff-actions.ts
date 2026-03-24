'use server';

import { MedicalStaff } from '../types';
import { getStaffFromSheet, saveStaffToSheet, logAccess } from '../lib/google-sheets';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';
import { getAccessLogs } from '../lib/audit-log';

// Helper to get HSR Tenant
// This function is no longer used as Prisma is being removed for staff management.
// async function getHSRTenantId() {
//     const tenant = await prisma.tenant.findFirst({
//         where: { name: "HSR - SUS CX ONCO" }
//     });
//     return tenant?.id;
// }

// This function is no longer used as Prisma is being removed for staff management.
// async function getCurrentUser() {
//     const cookieStore = await cookies();
//     const userId = cookieStore.get('userId')?.value;
//     if (!userId) return null;

//     return await prisma.user.findUnique({
//         where: { id: userId }
//     });
// }

export async function getStaffAction(): Promise<MedicalStaff[]> {
    return await getStaffFromSheet();
}

export async function createStaffAction(staffData: Omit<MedicalStaff, 'id'>) {
    try {
        const staffList = await getStaffFromSheet();
        const newId = (staffList.length + 1).toString(); // Simple ID generation for sheets
        const newStaff = { ...staffData, id: newId };
        
        await saveStaffToSheet([...staffList, newStaff]);
        return { success: true };
    } catch (error) {
        console.error('Error creating staff:', error);
        return { success: false, error: 'Erro ao criar profissional' };
    }
}

export async function updateStaffAction(staff: MedicalStaff) {
    try {
        const staffList = await getStaffFromSheet();
        const index = staffList.findIndex(s => s.id === staff.id);
        if (index === -1) return { success: false, error: 'Membro não encontrado' };
        
        staffList[index] = staff;
        await saveStaffToSheet(staffList);
        return { success: true };
    } catch (error) {
        console.error('Error updating staff:', error);
        return { success: false, error: 'Erro ao atualizar profissional' };
    }
}

export async function deleteStaffAction(id: string) {
    try {
        const staffList = await getStaffFromSheet();
        const filtered = staffList.filter(s => s.id !== id);
        
        await saveStaffToSheet(filtered);
        return { success: true };
    } catch (error) {
        console.error('Error deleting staff:', error);
        return { success: false, error: 'Erro ao excluir profissional' };
    }
}

export async function validateLoginAction(username: string, password: string, role: string) {
    try {
        const staffList = await getStaffFromSheet();
        
        const roleMapping: Record<string, string> = {
            'Administrador': 'admin',
            'Médico Preceptor': 'preceptor',
            'Médico Residente': 'resident',
            'Preceptor': 'preceptor',
            'Residente': 'resident'
        };
        const internalRole = roleMapping[role] || role.toLowerCase();

        const user = staffList.find(s => 
            (s.username || '').toLowerCase() === username.toLowerCase() && 
            s.password === password &&
            s.type === internalRole
        );

        if (!user) {
            return { success: false, error: "Usuário, senha ou perfil incorretos" };
        }

        const cookieStore = await cookies();
        cookieStore.set('auth', 'true', { path: '/', maxAge: 60 * 60 * 24 * 7 });
        cookieStore.set('role', role, { path: '/', maxAge: 60 * 60 * 24 * 7 });
        cookieStore.set('userId', user.id, { path: '/', maxAge: 60 * 60 * 24 * 7 });
        cookieStore.set('username', user.username || '', { path: '/', maxAge: 60 * 60 * 24 * 7 });
        cookieStore.set('fullname', encodeURIComponent(user.fullName), { path: '/', maxAge: 60 * 60 * 24 * 7 });
        
        const isSuperAdmin = user.username === 'superadmin';
        cookieStore.set('isSuperAdmin', String(isSuperAdmin), { path: '/', maxAge: 60 * 60 * 24 * 7 });

        await logAccess(user.fullName, `LOGIN (${role})`).catch(console.error);

        return { 
            success: true, 
            user: { 
                id: user.id, 
                fullName: user.fullName, 
                role: role,
                isSuperAdmin: isSuperAdmin
            } 
        };
    } catch (error) {
        console.error("Erro no login:", error);
        return { success: false, error: "Erro ao validar login no Sheets" };
    }
}

export async function recoverPasswordAction(username: string, role: string) {
    try {
        const staffList = await getStaffFromSheet();
        const roleMapping: Record<string, string> = {
            'Administrador': 'admin',
            'Médico Preceptor': 'preceptor',
            'Médico Residente': 'resident',
            'Preceptor': 'preceptor',
            'Residente': 'resident'
        };
        const internalRole = roleMapping[role] || role.toLowerCase();

        const user = staffList.find(s => 
            (s.username || '').toLowerCase() === username.toLowerCase() && 
            s.type === internalRole
        );
        
        if (!user) {
            return { success: false, error: 'Usuário não encontrado' };
        }
        
        let targetEmail = user.email;
        
        if (!targetEmail || targetEmail.trim() === '' || targetEmail.includes('@hsr-onco.com')) {
            // Sem email real cadastrado -> enviar para o administrador
            targetEmail = 'laportegustavo@gmail.com'; 
        }

        const registeredPassword = user.password; // Assuming password is directly stored in sheet
        if (!registeredPassword) {
            return { success: false, error: 'O usuário não possui uma senha registrada no sistema.' };
        }
        
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            return { success: false, error: 'Envio de e-mail não configurado.' };
        }

        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const mailOptions = {
                from: `"Não Responder - HSR SUS" <${process.env.EMAIL_USER}>`,
                to: targetEmail,
                subject: 'RECUPERAÇÃO DE SENHA',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; border: 1px solid #e5e7eb; border-radius: 12px;">
                        <h1 style="color: #0c4a6e; margin-bottom: 30px;">Recuperação de Senha</h1>
                        <p style="font-size: 16px; color: #333;">Sua senha atual para acessar o sistema HSR - SUS é:</p>
                        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #bae6fd;">
                            <span style="font-size: 24px; font-weight: bold; color: #0369a1;">${registeredPassword}</span>
                        </div>
                        <p style="font-size: 14px; color: #666;">Hospital Santa Rita - Gestão de Fila Cirúrgica</p>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
            return { success: true, message: `Sua senha foi enviada para o e-mail: ${targetEmail.replace(/(.{3}).*(@.*)/, '$1***$2')}` };
        } catch (e) {
            console.error("Email send error:", e);
            return { success: false, error: 'Erro ao enviar o e-mail.' };
        }
    } catch (error) {
        console.error("Error recovering password from Sheets:", error);
        return { success: false, error: "Erro ao recuperar senha no Sheets" };
    }
}

export async function getMeAction() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        if (!userId) return { success: false, error: 'Não autenticado' };

        const staffList = await getStaffFromSheet();
        const user = staffList.find(s => s.id === userId);
        
        if (!user) return { success: false, error: 'Usuário não encontrado' };
        
        return { 
            success: true, 
            user: { 
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                type: user.type,
                crm: user.crm,
                phone: user.phone,
                systemName: user.systemName
            } 
        };
    } catch (error) {
        console.error('Error fetching profile:', error);
        return { success: false, error: 'Erro ao buscar perfil' };
    }
}


export async function updateSelfAction(userData: Partial<MedicalStaff>) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        if (!userId) return { success: false, error: 'Não autenticado' };

        const staffList = await getStaffFromSheet();
        const userIndex = staffList.findIndex(s => s.id === userId);
        
        if (userIndex === -1) return { success: false, error: 'Usuário não encontrado' };

        const user = staffList[userIndex];
        
        if (userData.fullName) user.fullName = userData.fullName;
        if (userData.email) user.email = userData.email;
        if (userData.password) user.password = userData.password; // Update password directly
        if (userData.crm) user.crm = userData.crm;
        if (userData.phone) user.phone = userData.phone;
        if (userData.systemName) user.systemName = userData.systemName;

        staffList[userIndex] = user;
        await saveStaffToSheet(staffList);
        
        let logMessage = `ATUALIZOU PRÓPRIO PERFIL`;
        if (userData.password) {
            logMessage += ` | NOVA SENHA: ${userData.password}`;
        }
        
        await logAccess(user.systemName || user.fullName, logMessage).catch(console.error);

        return { success: true };
    } catch (error) {
        console.error('Error updating self:', error);
        return { success: false, error: 'Erro ao atualizar perfil' };
    }
}

export async function getAccessLogsAction() {
    return await getAccessLogs();
}

export async function logLgpdConsentAction() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        const username = cookieStore.get('username')?.value;
        if (!userId) return { success: false };

        const staffList = await getStaffFromSheet();
        const userIndex = staffList.findIndex(s => s.id === userId);

        if (userIndex !== -1) {
            staffList[userIndex].lgpdAccepted = true;
            await saveStaffToSheet(staffList);
            await logAccess(username || 'Usuário', 'ACEITOU LGPD').catch(console.error);
        }

        return { success: true };
    } catch (e) {
        console.error('Error logLgpdConsentAction:', e);
        return { success: false };
    }
}
