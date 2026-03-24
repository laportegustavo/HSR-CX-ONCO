import { NextRequest, NextResponse } from 'next/server';
import { getPatientChangeLogs } from '@/lib/audit-log';
import { getAccessLogs } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Basic verification (optional: use a CRON_SECRET if on Vercel)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Fetch logs
        const [changeLogs, accessLogs] = await Promise.all([
            getPatientChangeLogs(),
            getAccessLogs()
        ]);

        // Helper to parse pt-BR timestamp: "DD/MM/YYYY, HH:MM:SS"
        const parseTimestamp = (ts: string) => {
            if (!ts) return new Date(0);
            const [datePart, timePart] = ts.split(', ');
            if (!datePart || !timePart) return new Date(0);
            const [day, month, year] = datePart.split('/').map(Number);
            const [hour, min, sec] = timePart.split(':').map(Number);
            return new Date(year, month - 1, day, hour, min, sec);
        };

        // Filter last 24h
        const recentChanges = changeLogs.filter(log => parseTimestamp(log.timestamp) >= twentyFourHoursAgo);
        const recentAccesses = accessLogs.filter(log => parseTimestamp(log.timestamp) >= twentyFourHoursAgo);

        if (recentChanges.length === 0 && recentAccesses.length === 0) {
            return NextResponse.json({ message: 'Nenhuma atividade nas últimas 24h.' });
        }

        // Format Report
        let reportText = `RESUMO DIÁRIO - CIRUFLOW\n`;
        reportText += `Período: ${twentyFourHoursAgo.toLocaleString('pt-BR')} até ${now.toLocaleString('pt-BR')}\n`;
        reportText += `====================================================\n\n`;

        if (recentChanges.length > 0) {
            reportText += `MODIFICAÇÕES DE PACIENTES (${recentChanges.length}):\n`;
            // Group by patient
            const groupedByPatient: Record<string, typeof recentChanges> = {};
            recentChanges.forEach(log => {
                const key = `${log.patientName} (ID: ${log.patientId})`;
                if (!groupedByPatient[key]) groupedByPatient[key] = [];
                groupedByPatient[key].push(log);
            });

            for (const [patient, logs] of Object.entries(groupedByPatient)) {
                reportText += `\nPaciente: ${patient}\n`;
                logs.forEach(l => {
                    reportText += `  - [${l.timestamp.split(', ')[1]}] ${l.user} alterou "${l.field}": "${l.oldValue || '--'}" -> "${l.newValue}"\n`;
                });
            }
            reportText += `\n`;
        }

        if (recentAccesses.length > 0) {
            reportText += `ACESSOS AO SISTEMA (${recentAccesses.length}):\n`;
            recentAccesses.forEach(a => {
                reportText += `- [${a.timestamp}] ${a.username} (${a.role})\n`;
            });
        }

        reportText += `\n====================================================\n`;
        reportText += `RELATÓRIO GERADO AUTOMATICAMENTE ÀS ${now.toLocaleTimeString('pt-BR')}\n`;

        // Simulate Email Sending
        console.log(`[DAILY REPORT EMAIL SENT TO LAPORTEGUSTAVO@GMAIL.COM]`);
        console.log(reportText);

        return NextResponse.json({ 
            success: true, 
            summary: {
                changes: recentChanges.length,
                accesses: recentAccesses.length
            },
            message: 'Relatório processado e logado no servidor.' 
        });
    } catch (error) {
        console.error('Erro ao gerar relatório diário:', error);
        return NextResponse.json({ success: false, error: 'Erro interno ao processar relatório' }, { status: 500 });
    }
}
