import { getPatientsFromSheet, savePatientsToSheet, getFieldSchema } from "../src/lib/google-sheets";

function autoCalculateWaitTime(aih: unknown, surg: unknown): string {
    const sAih = String(aih || '').trim();
    const sSurg = String(surg || '').trim();
    if (!sAih || sAih === '--') return '';

    const parseDate = (d: string): Date | null => {
        if (!d || d === '--') return null;
        if (d.includes('/')) {
            const parts = d.split('/');
            if (parts.length === 3) {
                return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
            }
        } else if (d.includes('-')) {
            const parts = d.split('-');
            if (parts.length >= 3) {
                return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2].substring(0, 2)));
            }
        }
        return null;
    };

    const start = parseDate(sAih);
    if (!start || isNaN(start.getTime())) return '';

    const hasSurgery = sSurg && sSurg !== '--';
    const end = hasSurgery ? parseDate(sSurg) : new Date();

    if (!end || isNaN(end.getTime())) return '';

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return '0';
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return String(diffDays);
}

async function run() {
    console.log("Fetching schema and patients...");
    const schema = await getFieldSchema();
    const hasWait = schema.find(f => f.id === 'waitTime');
    if (!hasWait) {
        console.error("No waitTime column found in schema! Run check-schema first.");
        return;
    }
    const patients = await getPatientsFromSheet();
    let updated = 0;
    
    for (const p of patients) {
        const oldWait = p.waitTime;
        const newWait = autoCalculateWaitTime(p.aihDate, p.surgeryDate);
        if (oldWait !== newWait) {
            p.waitTime = newWait;
            updated++;
        }
    }
    
    if (updated > 0) {
        console.log(`Updating ${updated} patients...`);
        await savePatientsToSheet(patients);
        console.log("Done updating wait times.");
    } else {
        console.log("No patients needed updating.");
    }
}

run();
