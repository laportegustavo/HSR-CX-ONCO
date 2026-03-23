'use server';

import { MedicalStaff } from '../types';
import { getStaffFromSheet, saveStaffToSheet, logAccess, getAccessLogs } from '../lib/google-sheets';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';

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
        logAccess(user.systemName || user.fullName, role).catch(console.error);
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
    let isAdminFallback = false;
    
    if (!targetEmail || targetEmail.trim() === '') {
        // Sem email cadastrado -> enviar para o administrador
        targetEmail = 'laportegustavo@gmail.com'; 
        isAdminFallback = true;
    }

    const registeredPassword = user.password;
    if (!registeredPassword) {
        return { success: false, error: 'O usuário não possui uma senha registrada no sistema.' };
    }
    
    // Check if Email credentials exist
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return { success: false, error: 'Envio de e-mail não configurado. Adicione EMAIL_USER e EMAIL_PASS no .env' };
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
            from: `"Não Responder - CX ONCO" <${process.env.EMAIL_USER}>`,
            to: targetEmail,
            subject: 'RECUPERAÇÃO DE SENHA',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; border: 1px solid #e5e7eb; border-radius: 12px;">
                    <h1 style="color: #0a1f44; margin-bottom: 30px;">Recuperação de Senha</h1>
                    ${isAdminFallback 
                        ? `<p style="color: #e11d48; font-weight: bold; font-size: 16px;">AVISO ADMINISTRADOR: O usuário ${user.fullName} (${user.username}) solicitou recuperação de senha, mas não possui e-mail cadastrado.</p>
                           <p style="font-size: 16px; color: #333;">A senha utilizada pelo usuário constante no painel é:</p>`
                        : `<p style="font-size: 16px; color: #333;">Sua senha atual para acessar o sistema CX ONCO HSR é:</p>`
                    }
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <span style="font-size: 24px; font-weight: bold; color: #d4af37;">${registeredPassword}</span>
                    </div>
                    <p style="font-size: 14px; color: #666; margin-top: 30px;">Se você não solicitou esta recuperação, preste atenção à sua conta.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        
        return { 
            success: true, 
            message: isAdminFallback 
                ? 'Sem e-mail cadastrado. A senha foi enviada para o Administrador.' 
                : `Sua senha foi enviada para o e-mail: ${targetEmail.replace(/(.{3}).*(@.*)/, '$1***$2')}`
        };
    } catch (e) {
        console.error("Email send error:", e);
        return { success: false, error: 'Erro ao enviar o e-mail. Verifique os logs do servidor SMTP.' };
    }
}

export async function getAccessLogsAction(): Promise<{ timestamp: string, username: string, role: string }[]> {
    return await getAccessLogs();
}

export async function logLgpdConsentAction(username: string) {
    try {
        await logAccess(username, 'ACEITE LGPD');
        return { success: true };
    } catch (error) {
        console.error('Error logging LGPD consent:', error);
        return { success: false, error: 'Erro ao registrar aceite da LGPD' };
    }
}

export async function getMeAction() {
    try {
        const cookieStore = await cookies();
        const username = cookieStore.get('username')?.value;
        if (!username) return { success: false, error: 'Não autenticado' };

        const staff = await getStaff();
        const user = staff.find(s => s.username === decodeURIComponent(username) || s.email === decodeURIComponent(username));
        
        if (!user) return { success: false, error: 'Usuário não encontrado' };
        
        return { success: true, user: { ...user, password: '' } }; // Send empty password for safety, but we'll need it for comparison if they want to see it? Actually user wants to edit it.
    } catch (error) {
        return { success: false, error: 'Erro ao buscar perfil' };
    }
}

export async function updateSelfAction(userData: Partial<MedicalStaff>) {
    try {
        const cookieStore = await cookies();
        const username = cookieStore.get('username')?.value;
        if (!username) return { success: false, error: 'Não autenticado' };

        const staff = await getStaff();
        const currentUsername = decodeURIComponent(username);
        const userIdx = staff.findIndex(s => s.username === currentUsername || s.email === currentUsername);
        
        if (userIdx === -1) return { success: false, error: 'Usuário não encontrado' };

        // Keep sensitive fields if not provided
        const updatedUser = {
            ...staff[userIdx],
            ...userData,
            id: staff[userIdx].id, // Cannot change ID
            type: staff[userIdx].type // Cannot change own role usually
        };

        const updatedStaff = [...staff];
        updatedStaff[userIdx] = updatedUser;
        
        await saveStaffToSheet(updatedStaff);
        
        let logMessage = `ATUALIZOU PRÓPRIO PERFIL`;
        if (userData.password) {
            logMessage += ` | NOVA SENHA: ${userData.password}`;
        }
        
        await logAccess(updatedUser.systemName || updatedUser.fullName, logMessage).catch(console.error);

        return { success: true };
    } catch (error) {
        console.error('Error updating self:', error);
        return { success: false, error: 'Erro ao atualizar perfil' };
    }
}

