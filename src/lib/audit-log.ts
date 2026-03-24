import prisma from './prisma';

// Helper to get HSR Tenant
async function getHSRTenantId() {
    const tenant = await prisma.tenant.findFirst({
        where: { name: "HSR - SUS CX ONCO" }
    });
    return tenant?.id;
}

export async function logPatientChange(
  patientId: string, 
  patientName: string,
  field: string, 
  oldValue: string | number | boolean | null | undefined, 
  newValue: string | number | boolean | null | undefined, 
  user: string
): Promise<void> {
  try {
    const tenantId = await getHSRTenantId();
    
    await (prisma.accessLog as any).create({
        data: {
            user,
            patientId,
            patientName,
            field,
            oldValue: String(oldValue || ''),
            newValue: String(newValue || ''),
            tenantId
        }
    });
  } catch (error) {
    console.error('Erro ao registrar log de alteração no PostgreSQL:', error);
  }
}

export async function logPatientAction(
  patientId: string,
  patientName: string,
  action: 'CREATE' | 'DELETE' | 'RESTORE',
  user: string
): Promise<void> {
    try {
        const tenantId = await getHSRTenantId();
        await (prisma.accessLog as any).create({
            data: {
                user,
                patientId,
                patientName,
                field: 'ACTION',
                newValue: action,
                tenantId
            }
        });
    } catch (e) {
        console.error('Erro logPatientAction:', e);
    }
}

export async function getPatientChangeLogs(): Promise<{ 
  timestamp: string, 
  user: string, 
  patientId: string, 
  patientName: string, 
  field: string, 
  oldValue: string, 
  newValue: string 
}[]> {
  try {
    const tenantId = await getHSRTenantId();
    const logs = await (prisma.accessLog as any).findMany({
        where: { tenantId },
        orderBy: { timestamp: 'desc' },
        take: 500 // Limit for performance
    });

    return logs.map((l: any) => ({
      timestamp: new Intl.DateTimeFormat('pt-BR', { 
        dateStyle: 'short', 
        timeStyle: 'medium',
        timeZone: 'America/Sao_Paulo' 
      }).format(l.timestamp),
      user: l.user,
      patientId: l.patientId || '',
      patientName: l.patientName || '',
      field: l.field || '',
      oldValue: l.oldValue || '',
      newValue: l.newValue || ''
    }));
  } catch (error) {
    console.error('Erro ao buscar logs de alteração no PostgreSQL:', error);
    return [];
  }
}
export async function logAccess(username: string, role: string): Promise<void> {
    try {
        const tenantId = await getHSRTenantId();
        await (prisma.accessLog as any).create({
            data: {
                user: username,
                field: 'LOGIN',
                newValue: role,
                tenantId
            }
        });
    } catch (e) {
        console.error('Erro logAccess no PostgreSQL:', e);
    }
}

export async function getAccessLogs(): Promise<{ timestamp: string, username: string, role: string }[]> {
    try {
        const tenantId = await getHSRTenantId();
        const logs = await (prisma.accessLog as any).findMany({
            where: { 
                tenantId,
                field: 'LOGIN' 
            },
            orderBy: { timestamp: 'desc' },
            take: 200
        });

        return logs.map((l: any) => ({
            timestamp: new Intl.DateTimeFormat('pt-BR', { 
                dateStyle: 'short', 
                timeStyle: 'medium',
                timeZone: 'America/Sao_Paulo' 
            }).format(l.timestamp),
            username: l.user,
            role: l.newValue || ''
        }));
    } catch (error) {
        console.error('Erro ao buscar logs de acesso no PostgreSQL:', error);
        return [];
    }
}
