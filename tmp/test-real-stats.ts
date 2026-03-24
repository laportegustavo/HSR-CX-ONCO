import { getPatientsFromSheet } from "../src/lib/google-sheets";
import { DateTime } from "luxon";

async function run() {
    const patients = await getPatientsFromSheet();
    const waitTimes: number[] = [];
    const parseDate = (d: string): DateTime | null => {
        if (!d || d === '--') return null;
        if (d.includes('/')) {
            const parts = d.split('/');
            if (parts.length === 3) {
                return DateTime.fromObject({ year: Number(parts[2]), month: Number(parts[1]), day: Number(parts[0]) }, { zone: 'America/Sao_Paulo' }).startOf('day');
            }
        } else if (d.includes('-')) {
            const isoDate = DateTime.fromISO(d).setZone('America/Sao_Paulo').startOf('day');
            if (isoDate.isValid) return isoDate;
        }
        return null;
    };

    const today = DateTime.now().setZone('America/Sao_Paulo').startOf('day');
    
    patients.forEach(p => {
        const start = parseDate(String(p.aihDate || ''));
        if (start && start.isValid) {
            const hasSurgery = p.surgeryDate && String(p.surgeryDate).trim() !== '' && String(p.surgeryDate) !== '--';
            const end = hasSurgery ? parseDate(String(p.surgeryDate)) : today;
            if (end && end.isValid) {
                const diff = end.diff(start, 'days').days;
                if (diff >= 0) {
                    waitTimes.push(Math.floor(diff));
                }
            }
        }
    });

    console.log("WAIT TIMES ARRAY:", waitTimes);
    const sum = waitTimes.reduce((a, b) => a + b, 0);
    const avg = waitTimes.length > 0 ? Math.round(sum / waitTimes.length) : 0;
    console.log(`SUM: ${sum}, COUNT: ${waitTimes.length}, AVG: ${avg}`);
}
run();
