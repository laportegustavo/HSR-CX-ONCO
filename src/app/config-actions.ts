'use server';

import prisma from '@/lib/prisma';

// Helper to get HSR Tenant
async function getHSRTenantId() {
    const tenant = await prisma.tenant.findFirst({
        where: { name: "HSR - SUS CX ONCO" }
    });
    return tenant?.id;
}

// Return configuration for the current tenant
export async function getConfig() {
    const tenantId = await getHSRTenantId();
    if (!tenantId) return { teams: [], systems: [], hospitals: [] };

    const teams = await prisma.team.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' }
    });

    const config = await prisma.tenantConfig.findUnique({
        where: { tenantId }
    });

    return {
        teams: teams.map(t => t.name),
        systems: config?.systems || [],
        hospitals: config?.hospitals || []
    };
}

// This remains legacy for now or can be simplified to a static object if needed
export async function getSchemaAction() {
    // In a fully SAAS model, this might be dynamic per tenant, 
    // but here we can keep the legacy Google Sheets helper to avoid breakage for now
    // or just return the fields that the UI expects.
    const { getFieldSchema } = await import('../lib/google-sheets');
    return await getFieldSchema();
}

export async function addTeamAction(teamName: string) {
    const tenantId = await getHSRTenantId();
    if (!tenantId) return { success: false };

    const id = teamName + tenantId;
    await prisma.team.upsert({
        where: { id },
        update: {},
        create: { id, name: teamName, tenantId }
    });
    return { success: true };
}

export async function deleteTeamAction(teamName: string) {
    const tenantId = await getHSRTenantId();
    if (!tenantId) return { success: false };

    const id = teamName + tenantId;
    await prisma.team.delete({
        where: { id }
    });
    return { success: true };
}

async function ensureConfigExists(tenantId: string) {
    const existing = await prisma.tenantConfig.findUnique({ where: { tenantId } });
    if (!existing) {
        return await prisma.tenantConfig.create({
            data: { tenantId, systems: [], hospitals: [] }
        });
    }
    return existing;
}

export async function addSystemAction(system: string) {
    const tenantId = await getHSRTenantId();
    if (!tenantId) return { success: false };

    const config = await ensureConfigExists(tenantId);
    if (!config.systems.includes(system)) {
        await prisma.tenantConfig.update({
            where: { tenantId },
            data: { systems: { push: system } }
        });
    }
    return { success: true };
}

export async function deleteSystemAction(system: string) {
    const tenantId = await getHSRTenantId();
    if (!tenantId) return { success: false };

    const config = await prisma.tenantConfig.findUnique({ where: { tenantId } });
    if (config) {
        await prisma.tenantConfig.update({
            where: { tenantId },
            data: { systems: config.systems.filter(s => s !== system) }
        });
    }
    return { success: true };
}

export async function addHospitalAction(hospital: string) {
    const tenantId = await getHSRTenantId();
    if (!tenantId) return { success: false };

    const config = await ensureConfigExists(tenantId);
    if (!config.hospitals.includes(hospital)) {
        await prisma.tenantConfig.update({
            where: { tenantId },
            data: { hospitals: { push: hospital } }
        });
    }
    return { success: true };
}

export async function deleteHospitalAction(hospital: string) {
    const tenantId = await getHSRTenantId();
    if (!tenantId) return { success: false };

    const config = await prisma.tenantConfig.findUnique({ where: { tenantId } });
    if (config) {
        await prisma.tenantConfig.update({
            where: { tenantId },
            data: { hospitals: config.hospitals.filter(h => h !== hospital) }
        });
    }
    return { success: true };
}

export async function updateTeamAction(oldName: string, newName: string) {
    try {
        const tenantId = await getHSRTenantId();
        if (!tenantId) return { success: false };

        const oldId = oldName + tenantId;
        const newId = newName + tenantId;

        // In Prisma, we can't easily change a primary key (id). 
        // So we create new, update relationships (nullable), and delete old.
        // Actually, our Schema has Team.id as a string.
        
        const newTeam = await prisma.team.upsert({
            where: { id: newId },
            update: { name: newName },
            create: { id: newId, name: newName, tenantId }
        });

        // Update all patients
        await prisma.patient.updateMany({
            where: { teamId: oldId },
            data: { teamId: newId }
        });

        // Delete old team if it was different
        if (oldId !== newId) {
            await prisma.team.delete({ where: { id: oldId } });
        }

        return { success: true };
    } catch (error) {
        console.error('Error updating team:', error);
        return { success: false };
    }
}

export async function updateSystemAction(oldName: string, newName: string) {
    const tenantId = await getHSRTenantId();
    if (!tenantId) return { success: false };

    const config = await prisma.tenantConfig.findUnique({ where: { tenantId } });
    if (config) {
        const updatedSystems = config.systems.map(s => s === oldName ? newName : s);
        await prisma.tenantConfig.update({
            where: { tenantId },
            data: { systems: updatedSystems }
        });

        // Update medicinal staff system names
        await prisma.user.updateMany({
            where: { systemName: oldName, tenantId },
            data: { systemName: newName }
        });
    }
    return { success: true };
}

export async function updateHospitalAction(oldName: string, newName: string) {
    const tenantId = await getHSRTenantId();
    if (!tenantId) return { success: false };

    const config = await prisma.tenantConfig.findUnique({ where: { tenantId } });
    if (config) {
        const updatedHospitals = config.hospitals.map(h => h === oldName ? newName : h);
        await prisma.tenantConfig.update({
            where: { tenantId },
            data: { hospitals: updatedHospitals }
        });
    }
    return { success: true };
}
