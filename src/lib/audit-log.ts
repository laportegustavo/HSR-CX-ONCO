import { getSheets, getSpreadsheetId, ensureSheetExists } from './google-sheets';

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
    
    await ensureSheetExists('HistoricoAlteracoes', ['Data/Hora', 'Usuário', 'Paciente ID', 'Paciente Nome', 'Campo', 'Valor Antigo', 'Valor Novo']);

    const now = new Date();
    const timestamp = new Intl.DateTimeFormat('pt-BR', { 
      dateStyle: 'short', 
      timeStyle: 'medium',
      timeZone: 'America/Sao_Paulo' 
    }).format(now);

    const values = [[
      timestamp,
      user,
      patientId,
      patientName,
      field,
      String(oldValue || ''),
      String(newValue || '')
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'HistoricoAlteracoes!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  } catch (error) {
    console.error('Erro ao registrar log de alteração:', error);
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
  const { unstable_noStore: noStore } = await import('next/cache');
  noStore();
  
  try {
    const sheets = getSheets();
    const spreadsheetId = getSpreadsheetId();

    await ensureSheetExists('HistoricoAlteracoes', ['Data/Hora', 'Usuário', 'Paciente ID', 'Paciente Nome', 'Campo', 'Valor Antigo', 'Valor Novo']);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'HistoricoAlteracoes!A2:G',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    return rows.map(row => ({
      timestamp: row[0] || '',
      user: row[1] || '',
      patientId: row[2] || '',
      patientName: row[3] || '',
      field: row[4] || '',
      oldValue: row[5] || '',
      newValue: row[6] || ''
    })).reverse(); // Mais recentes primeiro
  } catch (error) {
    console.error('Erro ao buscar logs de alteração:', error);
    return [];
  }
}
