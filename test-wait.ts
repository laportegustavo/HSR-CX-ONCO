import { DateTime } from "luxon";

const parseDate = (d) => {
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

const patients = [
    { aihDate: "10/01/2026", surgeryDate: "15/01/2026" },
    { aihDate: "2026-02-01", surgeryDate: "" },
    { aihDate: "01/01/2026", surgeryDate: "2026-01-30" }
];

const waitTimes = [];
const today = DateTime.now().setZone('America/Sao_Paulo').startOf('day');

patients.forEach(p => {
    const start = parseDate(String(p.aihDate || ''));
    if (start && start.isValid) {
        const hasSurgery = p.surgeryDate && String(p.surgeryDate).trim() !== '' && String(p.surgeryDate) !== '--';
        const end = hasSurgery ? parseDate(String(p.surgeryDate)) : today;
        
        if (end && end.isValid) {
            const diff = end.diff(start, 'days').days;
            if (diff >= 0) waitTimes.push(Math.floor(diff));
        }
    }
});

const avgWait = waitTimes.length > 0 
    ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length) 
    : 0;

console.log("Wait Times:", waitTimes);
console.log("Avg Wait:", avgWait);
