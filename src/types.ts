export type PatientStatus = 
  | 'PRONTOS'
  | 'PENDÊNCIAS'
  | 'OBSERVAÇÕES'
  | 'AGENDADOS'
  | 'CIRURGIA REALIZADA'
  | 'PERDA DE SEGMENTO'
  | 'SEM STATUS';

export interface Patient {
  id: string; // Internal UUID
  name: string;
  cpf: string; // CPF
  medicalRecord: string; // prontuario
  aihDate: string; // data de AIH
  surgeryDate?: string; // data da cirurgia (DD/MM/AAAA)
  team: string; // equipe
  preceptor?: string; // médico preceptor
  resident?: string; // médico residente
  sistema: string; // sistema
  clinicalData: string; // dados clinicos
  caseDiscussion?: string; // discussão do caso
  contactPhone: string; // telefone de contato
  city?: string; // cidade
  auxiliaryResidents?: string[]; // residentes auxiliares
  observations?: string; // observações / pendências
  preAnestheticEval: string; // avaliacao pre-anestesica
  examPdfPath?: string; // Path to the exam PDF
  status: PatientStatus;
  priority?: '1' | '2' | '3'; // priority level
  age?: string; // idade
  needsICU?: 'Sim' | 'Não'; // necessidade de UTI
  latexAllergy?: 'Sim' | 'Não'; // alergia a latex
  jehovahsWitness?: 'Sim' | 'Não'; // testemunha de jeova
  lastUpdated?: string;
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
