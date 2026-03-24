'use server';

import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { PlanType } from '@prisma/client';

async function checkSuperAdmin() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    if (!userId) throw new Error("Acesso negado");

    const user = await prisma.user.findUnique({
        where: { id: userId }
    }) as any;

    if (!user || !user.isSuperAdmin) {
        throw new Error("Acesso negado: Apenas SuperAdmins podem realizar esta operação");
    }
    return user;
}

export async function listTenantsAction() {
    await checkSuperAdmin();
    return await prisma.tenant.findMany({
        include: {
            _count: {
                select: { patients: true, users: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function createTenantAction(data: { name: string, slug: string, subscription: string }) {
    await checkSuperAdmin();
    try {
        const newTenant = await prisma.tenant.create({
            data: {
                name: data.name,
                slug: data.slug.toLowerCase().trim(),
                subscription: data.subscription as PlanType,
                config: {
                    create: {
                        systems: [],
                        hospitals: []
                    }
                }
            }
        });
        return { success: true, tenant: newTenant };
    } catch (error) {
        console.error("Erro ao criar tenant:", error);
        return { success: false, error: "Conflito de Slug ou erro no banco" };
    }
}

export async function updateTenantSubscriptionAction(tenantId: string, subscription: string) {
    await checkSuperAdmin();
    await prisma.tenant.update({
        where: { id: tenantId },
        data: { subscription: subscription as PlanType }
    });
    return { success: true };
}

export async function getOverallStatsAction() {
    await checkSuperAdmin();
    const tenantCount = await prisma.tenant.count();
    const userCount = await prisma.user.count();
    const patientCount = await prisma.patient.count();
    
    return {
        tenantCount,
        userCount,
        patientCount
    };
}
