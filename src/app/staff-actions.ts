'use server';

import { MedicalStaff } from '../types';
import prisma from '@/lib/prisma';
import { logAccess } from '../lib/google-sheets';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';
import { getAccessLogs } from '../lib/audit-log';
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
        where: { username }
    });
}

export async function getStaff(): Promise<MedicalStaff[]> {
    const user = await getCurrentUser() as any;
    if (!user) return [];

    const whereClause: any = { tenantId: user.tenantId };
    
    // Level 2: Service Admin (Service Chief) - Can only see staff in their service
    if (user.role === 'SERVICE_ADMIN' && user.serviceId) {
        whereClause.serviceId = user.serviceId;
    }

    const users = await prisma.user.findMany({
        where: whereClause,
        orderBy: { fullName: 'asc' }
    });

    return users.map(u => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        email: u.email || '',
        password: u.passwordHash,
        type: u.role.toLowerCase() as any,
        crm: u.crm || '',
        phone: u.phone || '',
        systemName: u.systemName || u.fullName,
        serviceId: u.serviceId || undefined
    })) as MedicalStaff[];
}

export async function saveStaffAction(staffMember: MedicalStaff | Omit<MedicalStaff, 'id'>) {
    try {
        const tenantId = await getHSRTenantId();
        if (!tenantId) throw new Error("Tenant não encontrado");

        const roleMap: Record<string, 'HOSPITAL_ADMIN' | 'SERVICE_ADMIN' | 'PRECEPTOR' | 'RESIDENT'> = {
            'hospital_admin': 'HOSPITAL_ADMIN',
            'service_admin': 'SERVICE_ADMIN',
            'preceptor': 'PRECEPTOR',
            'resident': 'RESIDENT',
            'admin': 'HOSPITAL_ADMIN' // Fallback for legacy
        };

        const data: any = {
            username: staffMember.username || `user_${Math.random().toString(36).substring(7)}`,
            fullName: staffMember.fullName,
            email: staffMember.email || `${staffMember.username || 'user'}@hsr-onco.com`,
            passwordHash: staffMember.password || "123456",
            role: roleMap[staffMember.type] || 'RESIDENT',
            crm: staffMember.crm || "",
            phone: staffMember.phone || "",
            systemName: staffMember.systemName || staffMember.fullName,
            tenantId,
            lgpdAccepted: true,
            serviceId: staffMember.serviceId || null
        };

        if ('id' in staffMember && staffMember.id) {
            await prisma.user.update({
                where: { id: staffMember.id },
                data
            });
        } else {
            await prisma.user.create({
                data
            });
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error saving staff to PostgreSQL:', error);
        return { success: false, error: 'Erro ao salvar profissional' };
    }
}

export async function deleteStaffAction(id: string) {
    try {
        await prisma.user.delete({
            where: { id }
        });
        return { success: true };
    } catch (error) {
        console.error('Error deleting staff from PostgreSQL:', error);
        return { success: false, error: 'Erro ao excluir profissional' };
    }
}

export async function validateLoginAction(username: string, password: string, role: string) {
    const roleMap: Record<string, Role> = {
        'Administrador Hospital': Role.HOSPITAL_ADMIN,
        'Administrador Serviço': Role.SERVICE_ADMIN,
        'Médico Preceptor': Role.PRECEPTOR,
        'Médico Residente': Role.RESIDENT
    };
    
    const targetRole = roleMap[role];
    
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { username: username },
                { email: username }
            ],
            passwordHash: password, 
            role: targetRole
        }
    });
    
    if (user) {
        const cookieStore = await cookies();
        cookieStore.set('userId', user.id, { path: '/', maxAge: 60 * 60 * 24 });
        cookieStore.set('auth', 'true', { path: '/', maxAge: 60 * 60 * 24 });
        cookieStore.set('username', encodeURIComponent(user.fullName), { path: '/', maxAge: 60 * 60 * 24 });
        cookieStore.set('role', role, { path: '/', maxAge: 60 * 60 * 24 });
        cookieStore.set('tenantId', user.tenantId, { path: '/', maxAge: 60 * 60 * 24 });
        cookieStore.set('isSuperAdmin', String(!!(user as any).isSuperAdmin), { path: '/', maxAge: 60 * 60 * 24 });

        logAccess(user.systemName || user.fullName, role).catch(console.error);
        return { success: true, user: { id: user.id, fullName: user.fullName, role: role } };
    }
    
    return { success: false, error: 'Usuário ou senha incorretos para este perfil' };
}

export async function recoverPasswordAction(username: string, role: string) {
    const roleMap: Record<string, Role> = {
        'Administrador Hospital': Role.HOSPITAL_ADMIN,
        'Administrador Serviço': Role.SERVICE_ADMIN,
        'Médico Preceptor': Role.PRECEPTOR,
        'Médico Residente': Role.RESIDENT
    };
    
    const targetRole = roleMap[role];
    
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { username: username },
                { email: username }
            ],
            role: targetRole
        }
    });
    
    if (!user) {
        return { success: false, error: 'Usuário não encontrado' };
    }
    
    let targetEmail = user.email;
    let isAdminFallback = false;
    
    if (!targetEmail || targetEmail.trim() === '' || targetEmail.includes('@hsr-onco.com')) {
        // Sem email real cadastrado -> enviar para o administrador
        targetEmail = 'laportegustavo@gmail.com'; 
        isAdminFallback = true;
    }

    const registeredPassword = user.passwordHash;
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
            from: `"Não Responder - CX ONCO" <${process.env.EMAIL_USER}>`,
            to: targetEmail,
            subject: 'RECUPERAÇÃO DE SENHA',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; border: 1px solid #e5e7eb; border-radius: 12px;">
                    <h1 style="color: #0a1f44; margin-bottom: 30px;">Recuperação de Senha</h1>
                    <p style="font-size: 16px; color: #333;">Sua senha atual para acessar o sistema CX ONCO HSR é:</p>
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <span style="font-size: 24px; font-weight: bold; color: #d4af37;">${registeredPassword}</span>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return { success: true, message: `Sua senha foi enviada para o e-mail: ${targetEmail.replace(/(.{3}).*(@.*)/, '$1***$2')}` };
    } catch (e) {
        console.error("Email send error:", e);
        return { success: false, error: 'Erro ao enviar o e-mail.' };
    }
}

export async function getMeAction() {
    try {
        const cookieStore = await cookies();
        const username = (await cookieStore).get('username')?.value;
        if (!username) return { success: false, error: 'Não autenticado' };

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: decodeURIComponent(username) },
                    { email: decodeURIComponent(username) }
                ]
            }
        });
        
        if (!user) return { success: false, error: 'Usuário não encontrado' };
        
        return { 
            success: true, 
            user: { 
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                type: user.role.toLowerCase(),
                crm: user.crm,
                phone: user.phone,
                systemName: user.systemName
            } 
        };
    } catch (error) {
        return { success: false, error: 'Erro ao buscar perfil' };
    }
}


export async function updateSelfAction(userData: Partial<MedicalStaff>) {
    try {
        const cookieStore = await cookies();
        const username = cookieStore.get('username')?.value;
        if (!username) return { success: false, error: 'Não autenticado' };

        const currentUsername = decodeURIComponent(username);
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: currentUsername },
                    { email: currentUsername }
                ]
            }
        });
        
        if (!user) return { success: false, error: 'Usuário não encontrado' };

        const data: any = {};
        if (userData.fullName) data.fullName = userData.fullName;
        if (userData.email) data.email = userData.email;
        if (userData.password) data.passwordHash = userData.password;
        if (userData.crm) data.crm = userData.crm;
        if (userData.phone) data.phone = userData.phone;
        if (userData.systemName) data.systemName = userData.systemName;

        await prisma.user.update({
            where: { id: user.id },
            data
        });
        
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
        const username = cookieStore.get('username')?.value;
        if (!username) return { success: false };

        const currentUsername = decodeURIComponent(username);
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: currentUsername },
                    { email: currentUsername }
                ]
            }
        });

        if (user) {
            await prisma.user.update({
                where: { id: user.id },
                data: { lgpdAccepted: true }
            });
            await logAccess(user.username, 'ACEITOU LGPD').catch(console.error);
        }

        return { success: true };
    } catch (e) {
        console.error('Error logLgpdConsentAction:', e);
        return { success: false };
    }
}
