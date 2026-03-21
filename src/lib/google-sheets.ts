import { google } from 'googleapis';
import { Patient, PatientStatus, MedicalStaff } from '@/types';
import { unstable_noStore as noStore } from 'next/cache';

// Essa função autentica com a Google Cloud Usando a Service Account
const getAuth = () => {
    const client_email = process.env.GOOGLE_CLIENT_EMAIL?.replace(/^"|"$/g, '').trim();
    
    // Leitura à prova de balas da Chave Mestra
    // Extrai APENAS os caracteres base64 válidos de qualquer lixo que o usuário tenha colado
    const base64Body = process.env.GOOGLE_PRIVATE_KEY?.replace(/-----.*?-----/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
    
    // Recria as quebras de linha a cada 64 caracteres (padrão exigido pelo Google)
    const lines = base64Body?.match(/.{1,64}/g)?.join('\n') || '';
    
    // Monta a chave perfeita
    const private_key = `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;

    const credentials = {
        client_email,
        private_key,
    };

    return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
};

const getSheets = () => {
    const auth = getAuth();
    return google.sheets({ version: 'v4', auth });
};

const getSpreadsheetId = () => {
    let id = process.env.GOOGLE_SHEET_ID;
    if (id) id = id.replace(/^"|"$/g, '');
    if (!id) throw new Error("Pendente configuração do Google Sheets (GOOGLE_SHEET_ID ausente no .env)");
    return id;
};

// ========================
// PACIENTES (Aba Pacientes)
// ========================

export async function getPatientsFromSheet(): Promise<Patient[]> {
    noStore(); // Força Vercel a nunca fazer cache desta requisição
    try {
        const sheets = getSheets();
        const spreadsheetId = getSpreadsheetId();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Pacientes!A2:Y', // Até a coluna Y (25 colunas)
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];

        return rows.map((row) => ({
            id: row[0] || '',
            name: row[1] || '',
            team: row[2] || '',
            status: (row[3] as PatientStatus) || 'SEM STATUS',
            sistema: row[4] || '',
            medicalRecord: row[5] || '',
            aihDate: row[6] || '',
            surgeryDate: row[7] || '',
            clinicalData: row[8] || '',
            preceptor: row[9] || '',
            resident: row[10] || '',
            caseDiscussion: row[11] || '',
            contactPhone: row[12] || '',
            preAnestheticEval: row[13] || '',
            priority: (row[14] as '1' | '2' | '3') || undefined,
            age: row[15] || '',
            needsICU: (row[16] as 'Sim' | 'Não') || 'Não',
            latexAllergy: (row[17] as 'Sim' | 'Não') || 'Não',
            jehovahsWitness: (row[18] as 'Sim' | 'Não') || 'Não',
            examPdfPath: row[19] || undefined,
            lastUpdated: row[20] || new Date().toISOString(),
            cpf: row[21] || '',
            city: row[22] || '',
            auxiliaryResidents: (function() { try { return JSON.parse(row[23] || '[]'); } catch { return []; } })(),
            observations: row[24] || '',
        }));
    } catch (error) {
        console.error('Erro ao buscar pacientes:', error);
        return []; // Retorna lista vazia em vez de quebrar a página inicial
    }
}

export async function savePatientsToSheet(patients: Patient[]): Promise<void> {
    try {
        const sheets = getSheets();
        const spreadsheetId = getSpreadsheetId();

        // Mapeando a lista inteira para o Google Sheets
        const values = patients.map(p => [
            p.id || Date.now().toString(),
            p.name || '',
            p.team || '',
            p.status || 'SEM STATUS',
            p.sistema || '',
            p.medicalRecord || '',
            p.aihDate || '',
            p.surgeryDate || '',
            p.clinicalData || '',
            p.preceptor || '',
            p.resident || '',
            p.caseDiscussion || '',
            p.contactPhone || '',
            p.preAnestheticEval || '',
            p.priority || '',
            p.age || '',
            p.needsICU || 'Não',
            p.latexAllergy || 'Não',
            p.jehovahsWitness || 'Não',
            p.examPdfPath || '',
            p.lastUpdated || new Date().toISOString(),
            p.cpf || '',
            p.city || '',
            JSON.stringify(p.auxiliaryResidents || []),
            p.observations || ''
        ]);

        // Cabeçaho
        const header = ["ID", "NOME", "EQUIPE", "STATUS", "SISTEMA", "PRONTUARIO", "DATA_AIH", "DATA_CIRURGIA", "DADOS_CLINICOS", "PRECEPTOR", "RESIDENTE", "DISCUSSAO", "TELEFONE", "AVAL_ANESTESICA", "PRIORIDADE", "IDADE", "UTI", "LATEX", "TESTEMUNHA", "EXAM_PDF", "LAST_UPDATED", "CPF", "CIDADE", "RESIDENTES_AUX", "OBSERVACOES"];
        
        // Limpar a aba toda e escrever os novos (para manter integridade como o .csv fazia)
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'Pacientes!A:Y'
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Pacientes!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [header, ...values] }
        });
    } catch (error) {
        console.error('Erro ao salvar pacientes:', error);
        throw error;
    }
}


// ========================
// FUNÇÕES DE EQUIPE
// ========================

export async function getStaffFromSheet(): Promise<MedicalStaff[]> {
    noStore(); // Força Vercel a nunca fazer cache desta requisição
    try {
        const sheets = getSheets();
        const spreadsheetId = getSpreadsheetId();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Equipe!A2:I', 
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];

        return rows.map((row) => ({
            id: row[0] || '',
            fullName: row[1] || '',
            crm: row[2] || '',
            systemName: row[3] || '',
            phone: row[4] || '',
            email: row[5] || '',
            type: (row[6] as 'preceptor' | 'resident' | 'admin') || 'preceptor',
            username: row[7] || '',
            password: row[8] || ''
        }));
    } catch (error) {
        console.error('Erro ao buscar equipe:', error);
        return [];
    }
}

export async function saveStaffToSheet(staffList: MedicalStaff[]): Promise<void> {
    try {
        const sheets = getSheets();
        const spreadsheetId = getSpreadsheetId();

        const values = staffList.map(s => [
            s.id,
            s.fullName,
            s.crm || '',
            s.systemName,
            s.phone || '',
            s.email || '',
            s.type,
            s.username || '',
            s.password || ''
        ]);

        const header = ["ID", "NOME_COMPLETO", "CRM", "NOME_SISTEMA", "TELEFONE", "EMAIL", "TIPO", "USUARIO", "SENHA"];
        
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'Equipe!A:I'
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Equipe!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [header, ...values] }
        });
    } catch (error) {
        console.error('Erro ao salvar equipe:', error);
        throw error;
    }
}


// ========================
// CONFIGURAÇÕES (Aba Configuracoes)
// ========================

export async function getConfigFromSheet(): Promise<{ teams: string[], systems: string[] }> {
    try {
        const sheets = getSheets();
        const spreadsheetId = getSpreadsheetId();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Configuracoes!A2:B', 
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return { teams: [], systems: [] };

        const config = { teams: [] as string[], systems: [] as string[] };
        
        rows.forEach(row => {
            const key = row[0];
            let list = [];
            try { list = JSON.parse(row[1] || '[]'); } catch { list = []; }
            
            if (key === 'TEAMS') config.teams = list;
            if (key === 'SYSTEMS') config.systems = list;
        });

        return config;
    } catch (error) {
        console.error('Erro ao buscar configuracoes:', error);
        // Default genérico para caso ainda não tenha preenchido
        return { teams: [], systems: [] };
    }
}

export async function saveConfigToSheet(config: { teams: string[], systems: string[] }): Promise<void> {
    try {
        const sheets = getSheets();
        const spreadsheetId = getSpreadsheetId();

        const values = [
            ["TEAMS", JSON.stringify(config.teams)],
            ["SYSTEMS", JSON.stringify(config.systems)]
        ];

        const header = ["CHAVE", "VALORES_JSON"];
        
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'Configuracoes!A:B'
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Configuracoes!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [header, ...values] }
        });
    } catch (error) {
        console.error('Erro ao salvar configuracoes:', error);
        throw error;
    }
}

// ========================
// ACESSOS (Aba Acessos)
// ========================

export async function getAccessLogs(): Promise<{ timestamp: string, username: string, role: string }[]> {
    noStore();
    try {
        const sheets = getSheets();
        const spreadsheetId = getSpreadsheetId();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Acessos!A2:C',
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];

        return rows.map((row) => ({
            timestamp: row[0] || '',
            username: row[1] || '',
            role: row[2] || '',
        })).reverse(); // Mais recentes primeiro
    } catch (error) {
        console.error('Erro ao buscar logs de acesso:', error);
        return [];
    }
}

export async function logAccess(username: string, role: string): Promise<void> {
    try {
        const sheets = getSheets();
        const spreadsheetId = getSpreadsheetId();
        
        // Data e hora no fuso horário do Brasil
        const now = new Date();
        const timestamp = new Intl.DateTimeFormat('pt-BR', { 
            dateStyle: 'short', 
            timeStyle: 'medium',
            timeZone: 'America/Sao_Paulo' 
        }).format(now);

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Acessos!A:C',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[timestamp, username, role]],
            },
        });
    } catch (error) {
        console.error('Erro ao registrar log de acesso. Verifique se a aba "Acessos" existe no Sheets:', error);
    }
}
