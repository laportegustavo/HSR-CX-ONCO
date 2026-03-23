import { google } from 'googleapis';
import { Patient, MedicalStaff, FieldSchema, FieldType } from '@/types';
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

export const getSheets = () => {
    const auth = getAuth();
    return google.sheets({ version: 'v4', auth });
};

export const getSpreadsheetId = () => {
    let id = process.env.GOOGLE_SHEET_ID;
    if (id) id = id.replace(/^"|"$/g, '');
    if (!id) throw new Error("Pendente configuração do Google Sheets (GOOGLE_SHEET_ID ausente no .env)");
    return id;
};

const getColumnLetter = (index: number): string => {
    let letter = "";
    while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
    }
    return letter;
};

// ========================
// ESQUEMA DE CAMPOS (Aba ConfigCampos)
// ========================

const INITIAL_SCHEMA: FieldSchema[] = [
    { id: 'id', label: 'ID', type: 'text', column: 0, isVisibleInCalendar: false, isRequired: true, order: 0, isSystem: true },
    { id: 'name', label: 'Nome do Paciente', type: 'text', column: 1, isVisibleInCalendar: true, isRequired: true, order: 1, isSystem: true },
    { id: 'position', label: 'Posição', type: 'number', column: 30, isVisibleInCalendar: false, isRequired: false, order: 2 },
    { id: 'birthDate', label: 'Data de Nascimento', type: 'date', column: 29, isVisibleInCalendar: false, isRequired: false, order: 3 },
    { id: 'age', label: 'Idade', type: 'text', column: 15, isVisibleInCalendar: false, isRequired: false, order: 4 },
    { id: 'team', label: 'Equipe', type: 'select', column: 2, isVisibleInCalendar: true, isRequired: true, order: 5, options: [] },
    { id: 'status', label: 'Status do Andamento', type: 'select', column: 3, isVisibleInCalendar: false, isRequired: true, order: 6 },
    { id: 'sistema', label: 'Sistema', type: 'select', column: 4, isVisibleInCalendar: true, isRequired: true, order: 7, options: [] },
    { id: 'medicalRecord', label: 'Prontuário', type: 'text', column: 5, isVisibleInCalendar: false, isRequired: false, order: 8 },
    { id: 'aihDate', label: 'Data da AIH', type: 'date', column: 6, isVisibleInCalendar: false, isRequired: false, order: 9 },
    { id: 'surgeryDate', label: 'Data da Cirurgia', type: 'date', column: 7, isVisibleInCalendar: false, isRequired: false, order: 10 },
    { id: 'clinicalData', label: 'Dados Clínicos / Caso', type: 'textarea', column: 8, isVisibleInCalendar: false, isRequired: false, order: 11 },
    { id: 'preceptor', label: 'Médico Preceptor', type: 'select', column: 9, isVisibleInCalendar: false, isRequired: false, order: 12, options: [] },
    { id: 'resident', label: 'Médico Residente Principal', type: 'select', column: 10, isVisibleInCalendar: false, isRequired: false, order: 13, options: [] },
    { id: 'caseDiscussion', label: 'Discussão do Caso', type: 'textarea', column: 11, isVisibleInCalendar: false, isRequired: false, order: 14 },
    { id: 'contactPhone', label: 'Telefone de Contato', type: 'text', column: 12, isVisibleInCalendar: false, isRequired: false, order: 15 },
    { id: 'preAnestheticEval', label: 'Avaliação Anestésica', type: 'textarea', column: 13, isVisibleInCalendar: false, isRequired: false, order: 16 },
    { id: 'priority', label: 'Prioridade', type: 'select', column: 14, isVisibleInCalendar: false, isRequired: false, order: 17, options: ['1', '2', '3'] },
    { id: 'needsICU', label: 'Necessidade UTI', type: 'select', column: 16, isVisibleInCalendar: false, isRequired: false, order: 18, options: ['Sim', 'Não'] },
    { id: 'latexAllergy', label: 'Alergia Latex', type: 'select', column: 17, isVisibleInCalendar: false, isRequired: false, order: 19, options: ['Sim', 'Não'] },
    { id: 'jehovahsWitness', label: 'T. Jeová', type: 'select', column: 18, isVisibleInCalendar: false, isRequired: false, order: 20, options: ['Sim', 'Não'] },
    { id: 'lastUpdated', label: 'Última Atualização', type: 'text', column: 20, isVisibleInCalendar: false, isRequired: false, order: 21, isSystem: true },
    { id: 'cpf', label: 'CPF', type: 'text', column: 21, isVisibleInCalendar: false, isRequired: false, order: 22 },
    { id: 'city', label: 'Cidade', type: 'text', column: 22, isVisibleInCalendar: false, isRequired: false, order: 23 },
    { id: 'auxiliaryResidents', label: 'Residentes Auxiliares', type: 'checkbox', column: 23, isVisibleInCalendar: false, isRequired: false, order: 24, options: [] },
    { id: 'observations', label: 'Observações / Pendências', type: 'textarea', column: 24, isVisibleInCalendar: false, isRequired: false, order: 25 },
    { id: 'lastUpdatedBy', label: 'Modificado Por', type: 'text', column: 25, isVisibleInCalendar: false, isRequired: false, order: 26, isSystem: true },
    { id: 'hospital', label: 'Local da Cirurgia', type: 'select', column: 26, isVisibleInCalendar: true, isRequired: false, order: 27, options: [] },
    { id: 'operatingRoom', label: 'Sala Cirúrgica', type: 'text', column: 27, isVisibleInCalendar: true, isRequired: false, order: 28 },
    { id: 'surgeryTime', label: 'Horário da Cirurgia', type: 'time', column: 28, isVisibleInCalendar: true, isRequired: false, order: 29 },
];

export async function ensureSheetExists(title: string, headers: string[]) {
    const sheets = getSheets();
    const spreadsheetId = getSpreadsheetId();
    
    try {
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === title);
        
        if (!exists) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [{
                        addSheet: { properties: { title } }
                    }]
                }
            });
            
            // Add headers
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${title}!A1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [headers] }
            });
        }
    } catch (e) {
        console.error(`Erro ao verificar/criar aba ${title}:`, e);
    }
}

export async function getFieldSchema(): Promise<FieldSchema[]> {
    noStore();
    try {
        const sheets = getSheets();
        const spreadsheetId = getSpreadsheetId();

        await ensureSheetExists('ConfigCampos', ["ID", "LABEL", "TYPE", "OPTIONS", "COLUMN", "VISIBLE_CALENDAR", "REQUIRED", "ORDER", "SYSTEM", "VISIBLE_FORM"]);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'ConfigCampos!A2:J',
        });

        const rows = response.data.values;
        const finalSchema: FieldSchema[] = [...INITIAL_SCHEMA];
        
        if (rows && rows.length > 0) {
            const sheetFields = rows.map(row => ({
                id: row[0],
                label: row[1],
                type: row[2] as FieldType,
                options: row[3] ? row[3].split(',').map((s: string) => s.trim()) : undefined,
                column: parseInt(row[4]),
                isVisibleInCalendar: row[5] === 'TRUE',
                isRequired: row[6] === 'TRUE',
                order: parseInt(row[7]),
                isSystem: row[8] === 'TRUE',
                isVisibleInForm: row[9] !== 'FALSE' // Padrao é TRUE caso vazio
            }));

            // Mesclar: Prioritize fields from sheet for matching IDs, but keep all from INITIAL_SCHEMA
            sheetFields.forEach(sf => {
                const idx = finalSchema.findIndex(f => f.id === sf.id);
                if (idx !== -1) {
                    finalSchema[idx] = sf;
                } else {
                    finalSchema.push(sf);
                }
            });
        }

        return finalSchema.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (error) {
        console.error('Erro ao buscar esquema de campos:', error);
        return INITIAL_SCHEMA;
    }
}

export async function saveFieldSchema(schema: FieldSchema[]): Promise<void> {
    try {
        const sheets = getSheets();
        const spreadsheetId = getSpreadsheetId();

        const values = schema.map(f => [
            f.id,
            f.label,
            f.type,
            f.options ? f.options.join(', ') : '',
            f.column,
            f.isVisibleInCalendar ? 'TRUE' : 'FALSE',
            f.isRequired ? 'TRUE' : 'FALSE',
            f.order,
            f.isSystem ? 'TRUE' : 'FALSE',
            f.isVisibleInForm !== false ? 'TRUE' : 'FALSE'
        ]);

        const header = ["ID", "LABEL", "TYPE", "OPTIONS", "COLUMN", "VISIBLE_CALENDAR", "REQUIRED", "ORDER", "SYSTEM", "VISIBLE_FORM"];
        
        await ensureSheetExists('ConfigCampos', header);

        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'ConfigCampos!A:J'
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'ConfigCampos!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [header, ...values] }
        });
    } catch (error) {
        console.error('Erro ao salvar esquema de campos:', error);
        throw error;
    }
}

// ========================
// PACIENTES (Aba Pacientes)
// ========================

export async function getPatientsFromSheet(): Promise<Patient[]> {
    noStore();
    try {
        const sheets = getSheets();
        const spreadsheetId = getSpreadsheetId();
        const schema = await getFieldSchema();
        
        const maxColIndex = Math.max(...schema.map(f => f.column));
        const range = `Pacientes!A2:${getColumnLetter(maxColIndex)}`;

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];

        return rows.map((row) => {
            const patient: Patient = { id: '', name: '' };
            
            schema.forEach(field => {
                let value = row[field.column] || '';
                
                // Conversões de tipo específicas
                if (field.type === 'checkbox') {
                    try { value = JSON.parse(value || '[]'); } catch { value = []; }
                }

                // Legado: Conversão de status (mantém compatibilidade com o que existia antes)
                if (field.id === 'status') {
                    if (value === 'OBSERVAÇÕES' || value === 'PENDÊNCIAS') {
                        value = 'OBSERVAÇÕES/PENDÊNCIAS';
                    }
                }

                patient[field.id] = value;
            });
            
            return patient;
        });
    } catch (error) {
        console.error('Erro ao buscar pacientes:', error);
        return [];
    }
}

export async function savePatientsToSheet(patients: Patient[]): Promise<void> {
    try {
        const sheets = getSheets();
        const spreadsheetId = getSpreadsheetId();
        const schema = await getFieldSchema();

        const maxColIndex = Math.max(...schema.map(f => f.column));
        const range = `Pacientes!A:${getColumnLetter(maxColIndex)}`;

        // Mapeando a lista inteira para o Google Sheets baseado no schema
        const header = new Array(maxColIndex + 1).fill('');
        schema.forEach(f => {
            header[f.column] = f.label.toUpperCase();
        });

        const values = patients.map(p => {
            const row = new Array(maxColIndex + 1).fill('');
            schema.forEach(field => {
                let val = p[field.id];
                
                if (field.id === 'id' && !val) val = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                if (field.id === 'lastUpdated' && !val) val = new Date().toISOString();
                
                if (field.type === 'checkbox') {
                    val = JSON.stringify(val || []);
                }
                
                row[field.column] = val !== undefined && val !== null ? String(val) : '';
            });
            return row;
        });

        // Limpar a aba e atualizar
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range
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

export async function getConfigFromSheet(): Promise<{ teams: string[], systems: string[], hospitals: string[] }> {
    try {
        const sheets = getSheets();
        const spreadsheetId = getSpreadsheetId();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Configuracoes!A2:B', 
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return { teams: [], systems: [], hospitals: [] };

        const config = { teams: [] as string[], systems: [] as string[], hospitals: [] as string[] };
        
        rows.forEach(row => {
            const key = row[0];
            let list = [];
            try { list = JSON.parse(row[1] || '[]'); } catch { list = []; }
            
            if (key === 'TEAMS') config.teams = list;
            if (key === 'SYSTEMS') config.systems = list;
            if (key === 'HOSPITALS') config.hospitals = list;
        });

        if (config.hospitals.length === 0) {
            config.hospitals = ['BC MEZANINO', 'HCSA', 'HDVS CCA', 'HDVS TX', 'HNT', 'HSF', 'HSJ', 'HSR', 'MULTICENTRO', 'PPF', 'PSC'];
        }
        return config;
    } catch (error) {
        console.error('Erro ao buscar configuracoes:', error);
        // Default genérico para caso ainda não tenha preenchido
        return { teams: ['Geral', 'Oncologia'], systems: ['SUS', 'Convênio'], hospitals: ['BC MEZANINO', 'HCSA', 'HDVS CCA', 'HDVS TX', 'HNT', 'HSF', 'HSJ', 'HSR', 'MULTICENTRO', 'PPF', 'PSC'] };
    }
}

export async function saveConfigToSheet(config: { teams: string[], systems: string[], hospitals?: string[] }): Promise<void> {
    try {
        const sheets = getSheets();
        const spreadsheetId = getSpreadsheetId();

        const values = [
            ["TEAMS", JSON.stringify(config.teams)],
            ["SYSTEMS", JSON.stringify(config.systems)],
            ['HOSPITALS', JSON.stringify(config.hospitals || ['BC MEZANINO', 'HCSA', 'HDVS CCA', 'HDVS TX', 'HNT', 'HSF', 'HSJ', 'HSR', 'MULTICENTRO', 'PPF', 'PSC'])]
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
