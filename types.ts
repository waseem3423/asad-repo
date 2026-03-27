
export enum AnimalStatus {
  ACTIVE = 'Active',
  IN_PROTOCOL = 'In Protocol',
  INSEMINATED = 'Inseminated',
  PREGNANT = 'Pregnant',
  CLOSEUP = 'Closeup',
  LACTATING = 'Lactating',
  DRY = 'Dry',
  SICK = 'Sick'
}

export enum ReproEventType {
  ESTRUS = 'Estrus',
  INSEMINATION = 'Insemination',
  PREGNANCY_CHECK = 'Pregnancy Check',
  CALVING = 'Calving',
  DRY_OFF = 'Dry Off',
  PROTOCOL_STEP = 'Protocol Step'
}

export enum HealthEventType {
  VACCINATION = 'Vaccination',
  ILLNESS = 'Illness',
  TREATMENT = 'Treatment',
  RECOVERY = 'Recovery',
  CHECKUP = 'Checkup'
}

export interface ProtocolStep {
  dayOffset: number;
  action: string;
  isAI: boolean;
  time?: string; // e.g., "16:00"
}

export interface ProtocolTemplate {
  id: string;
  name: string;
  description?: string;
  steps: ProtocolStep[];
  isPredefined: boolean;
}

export interface ProtocolEnrollment {
  id: string;
  animalId: string;
  templateId: string;
  startDate: string;
  status: 'Active' | 'Completed' | 'Failed' | 'Archived';
  completedStepIndices: number[];
  result?: 'Pregnant' | 'Not Pregnant';
  archivedDate?: string;
}

export interface StatusColors {
  active: string;
  pregnant: string;
  sick: string;
  dry: string;
  closeup: string;
  inProtocol: string;
  inseminated: string;
  lactating: string;
}

export interface FarmSettings {
  gestationDays: number;
  closeupDays: number;
  dryPeriodDays: number;
  pregnancyCheckDays: number;
  estrusCycleDays: number;
  pdfTemplate: 'Professional' | 'Minimalist' | 'Modern';
  farmName: string;
  statusColors: StatusColors;
  customGroups?: string[];
}

export interface Animal {
  id: string;
  tag: string;
  name: string;
  breed: string;
  sex: 'Male' | 'Female';
  dob: string;
  herd: string;
  photoUrl?: string;
  status?: AnimalStatus;
  expectedCalving?: string;
  motherId?: string;
  fatherId?: string;
  isCalf?: boolean;
  isLactating?: boolean;
}

export interface ReproductionEvent {
  id: string;
  animalId: string;
  type: ReproEventType;
  date: string;
  details: string;
  bullId?: string;
  success?: boolean;
  offspringGender?: 'Male' | 'Female';
  offspringTag?: string;
  protocolId?: string; // Link to enrollment if step
  technician?: string;
  semenName?: string;
  pregnancyResult?: 'Pregnant' | 'Non-Pregnant';
}

export interface HealthEvent {
  id: string;
  animalId: string;
  type: HealthEventType;
  date: string;
  details: string;
  medication?: string;
  dosage?: string;
  treatments?: { name: string; dose: string }[];
  nextDue?: string;
  treatmentDays?: number; // How many days to treat
  numberOfDoses?: number; // Multi-dose: total number of injections
  daysGap?: number; // Days between each dose
  completedDoses?: number; // How many doses have been marked done
  attachments?: string[];
  technician?: string;
}

export interface VaccinationRecord {
  id: string;
  animalId: string;
  vaccineName: string;
  date: string;
  nextDueDate?: string;
  dosage?: string;
  technician?: string;
  notes?: string;
  batchNumber?: string;
}

export interface Alert {
  id: string;
  type: 'Repro' | 'Health' | 'System' | 'Protocol' | 'Vaccination';
  title: string;
  description: string;
  dueDate: string;
  animalId?: string;
  priority: 'Low' | 'Medium' | 'High';
  isRead?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  farmId: string;
}
