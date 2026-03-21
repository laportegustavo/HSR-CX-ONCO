import fs from 'fs/promises';
import { Patient, PatientStatus } from '../types';

const CSV_PATH = '/Users/macbookprolaporte/Desktop/CX ONCO HSR/AIH PENDENTE/Folha 1-Tabela 1.csv';

function parseDate(dateStr: string | undefined): string {
    if (!dateStr || dateStr.trim() === '' || dateStr === '-') return '';
    
    // Support common formats: DD/MM/YY, DD/MM/YYYY, etc.
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let year = parts[2];
        
        if (year.length === 2) {
            year = '20' + year;
        }
        
        const isoDate = `${year}-${month}-${day}`;
        if (!isNaN(Date.parse(isoDate))) {
            return isoDate;
        }
    }
    
    return dateStr; // Return as is if format unknown but not clearly invalid
}

export async function parsePatientsFromCSV(): Promise<Patient[]> {
    try {
        const content = await fs.readFile(CSV_PATH, 'utf-8');
        const lines = content.split('\n');
        
        const dataLines = lines.slice(1);
        
        const patients: Patient[] = dataLines
            .filter(line => line.trim() !== '')
            .map((line, index) => {
                const columns = line.split(';').map(col => col.trim());
                
                // Status can be in column 2 or 3
                const status2 = columns[2]?.toUpperCase() || '';
                const status3 = columns[3]?.toUpperCase() || '';
                
                let statusRaw = status3;
                if (status3 === 'SEM STATUS' || status3 === '') {
                    statusRaw = status2;
                }
                
                let status: PatientStatus = 'SEM STATUS';
                
                if (statusRaw.includes('PRONTOS')) {
                    status = 'PRONTOS';
                } else if (statusRaw.includes('PENDENCIA') || statusRaw.includes('PENDÊNCIA') || statusRaw.includes('PENDÊNCIAS')) {
                    status = 'OBSERVAÇÕES/PENDÊNCIAS';
                } else if (statusRaw.includes('OBSERVAÇÕES') || statusRaw.includes('OBSERVAÇÃO')) {
                    status = 'OBSERVAÇÕES/PENDÊNCIAS';
                } else if (statusRaw.includes('AGENDADOS')) {
                    status = 'AGENDADOS';
                } else if (statusRaw.includes('REALIZADA') || statusRaw.includes('CONCLUIDA')) {
                    status = 'CIRURGIA REALIZADA';
                }

                return {
                    id: (index + 1).toString(),
                    name: columns[0] || 'Sem Nome',
                    cpf: '',
                    medicalRecord: columns[5] || 'N/A',
                    aihDate: parseDate(columns[6]),
                    surgeryDate: columns[7] || '',
                    team: columns[1] || 'N/A',
                    preceptor: columns[9] || '',
                    resident: columns[10] || '',
                    sistema: columns[4] || 'N/A',
                    clinicalData: columns[8] || 'Sem dados clínicos',
                    caseDiscussion: columns[11] || '',
                    contactPhone: columns[12] || 'N/A',
                    preAnestheticEval: columns[13] || 'Pendente',
                    status: status,
                    priority: (columns[14] as '1' | '2' | '3') || undefined,
                    age: columns[15] || '',
                    needsICU: (columns[16] as 'Sim' | 'Não') || 'Não',
                    latexAllergy: (columns[17] as 'Sim' | 'Não') || 'Não',
                    jehovahsWitness: (columns[18] as 'Sim' | 'Não') || 'Não',
                    examPdfPath: columns[19] || undefined,
                    lastUpdated: new Date().toISOString()
                };
            });

        return patients;
    } catch (error) {
        console.error('Error parsing CSV:', error);
        return [];
    }
}

export async function savePatientsToCSV(patients: Patient[]): Promise<void> {
    try {
        // Define CSV header based on the observed columns in parsePatientsFromCSV
        // columns[0]: name, columns[1]: team, columns[2]: status, columns[3]: sistema
        // columns[8]: medicalRecord, columns[12]: aihDate, columns[13]: preAnestheticEval
        // columns[16]: clinicalData, columns[19]: contactPhone
        
        // We need to maintain the original structure as much as possible.
        // Let's create a template with 21 columns (since index 20 is priority)
        
        const header = "NOME;EQUIPE;STATUS;STATUS_EXTRA;SISTEMA;PRONTUARIO;DATA_AIH;DATA_CIRURGIA;DADOS_CLINICOS;PRECEPTOR;RESIDENTE;DISCUSSAO;TELEFONE;AVAL_ANESTESICA;PRIORIDADE;IDADE;UTI;LATEX;TESTEMUNHA;EXAM_PDF";
        
        const csvLines = patients.map(p => {
            const cols = new Array(20).fill(''); // 20 columns 0-19
            cols[0] = p.name || '';
            cols[1] = p.team || '';
            cols[2] = p.status || 'SEM STATUS';
            cols[3] = p.status || 'SEM STATUS'; 
            cols[4] = p.sistema || '';
            cols[5] = p.medicalRecord || '';
            
            // Format date back to DD/MM/YYYY
            if (p.aihDate && p.aihDate.includes('-')) {
                const [y, m, d] = p.aihDate.split('-');
                cols[6] = `${d}/${m}/${y}`;
            } else {
                cols[6] = p.aihDate || '';
            }
            
            cols[7] = p.surgeryDate || '';
            cols[8] = p.clinicalData || '';
            cols[9] = p.preceptor || '';
            cols[10] = p.resident || '';
            cols[11] = p.caseDiscussion || '';
            cols[12] = p.contactPhone || '';
            cols[13] = p.preAnestheticEval || '';
            cols[14] = p.priority || '';
            cols[15] = p.age || '';
            cols[16] = p.needsICU || 'Não';
            cols[17] = p.latexAllergy || 'Não';
            cols[18] = p.jehovahsWitness || 'Não';
            cols[19] = p.examPdfPath || '';
            
            return cols.join(';');
        });
        
        const content = [header, ...csvLines].join('\n');
        await fs.writeFile(CSV_PATH, content, 'utf-8');
    } catch (error) {
        console.error('Error saving CSV:', error);
        throw error;
    }
}
