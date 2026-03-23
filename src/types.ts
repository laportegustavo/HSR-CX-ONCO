export type PatientStatus = 
  | 'PRONTOS'
  | 'OBSERVAÇÕES/PENDÊNCIAS'
  | 'AGENDADOS'
  | 'CIRURGIA REALIZADA'
  | 'PERDA DE SEGMENTO'
  | 'SEM STATUS';

export interface Patient {
  id: string; // Internal UUID
  name: string;
  lastUpdated?: string;
  lastUpdatedBy?: string;
  [key: string]: string | string[] | number | boolean | undefined | null; // Allow dynamic fields with specific types
}

export type FieldType = 'text' | 'select' | 'date' | 'time' | 'textarea' | 'number' | 'checkbox';

export interface FieldSchema {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  column: number; // 0-indexed column in Sheets
  isVisibleInCalendar: boolean;
  isRequired: boolean;
  order: number;
  group?: string;
  isSystem?: boolean; // If true, cannot be deleted (e.g., ID, Name)
}

export interface MedicalStaff {
  id: string;
  fullName: string;
  crm?: string;
  systemName: string;
  phone?: string;
  email?: string;
  type: 'preceptor' | 'resident' | 'admin';
  username?: string;
  password?: string;
}
