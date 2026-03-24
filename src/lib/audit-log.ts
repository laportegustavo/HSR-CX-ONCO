import { getSheets, getSpreadsheetId, ensureSheetExists } from './google-sheets';

const AUDIT_SHEET = 'LogsAuditoria';
const AUDIT_HEADERS = ["TIMESTAMP", "USUARIO", "PACIENTE_ID", "PACIENTE_NOME", "CAMPO", "VALOR_ANTIGO", "VALOR_NOVO"];

export async function logPatientChange(
  patientId: string, 
  patientName: string,
  field: string, 
  oldValue: string | number | boolean | null | undefined, 
  newValue: string | number | boolean | null | undefined, 
  user: string
): Promise<void> {
  try {
    const sheets = getSheets();
    const spreadsheetId = getSpreadsheetId();
    await ensureSheetExists(AUDIT_SHEET, AUDIT_HEADERS);

    const now = new Date();
    const timestamp = new Intl.DateTimeFormat('pt-BR', { 
        dateStyle: 'short', 
        timeStyle: 'medium',
        timeZone: 'America/Sao_Paulo' 
    }).format(now);

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${AUDIT_SHEET}!A:G`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[
                timestamp,
                user,
                patientId,
                patientName,
                field,
                String(oldValue || ''),
                String(newValue || '')
            ]]
        }
    });
  } catch (error) {
    console.error('Erro ao registrar log de alteração no Sheets:', error);
  }
}

export async function logPatientAction(
  patientId: string,
  patientName: string,
  action: 'CREATE' | 'DELETE' | 'RESTORE',
  user: string
): Promise<void> {
    await logPatientChange(patientId, patientName, 'ACTION', '', action, user);
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
    const sheets = getSheets();
    const spreadsheetId = getSpreadsheetId();

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${AUDIT_SHEET}!A2:G`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    return rows.map((row) => ({
      timestamp: row[0] || '',
      user: row[1] || '',
      patientId: row[2] || '',
      patientName: row[3] || '',
      field: row[4] || '',
      oldValue: row[5] || '',
      newValue: row[6] || ''
    })).reverse().slice(0, 500); 
  } catch (error) {
    console.error('Erro ao buscar logs de alteração no PostgreSQL:', error);
    return [];
  }
}
export async function logAccess(username: string, role: string): Promise<void> {
    try {
        const sheets = getSheets();
        const spreadsheetId = getSpreadsheetId();
        await ensureSheetExists('Acessos', ["timestamp", "username", "role"]);

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
        console.error('Erro ao registrar log de acesso no Sheets:', error);
    }
}

export async function getAccessLogs(): Promise<{ timestamp: string, username: string, role: string }[]> {
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
        })).reverse().slice(0, 200);
    } catch (error) {
      console.error('Erro ao buscar logs de acesso no Sheets:', error);
      return [];
    }
}
