
import { AnimalStatus, Animal, ReproductionEvent, HealthEvent, Alert, ReproEventType, HealthEventType, ProtocolTemplate } from './types';

export const PREDEFINED_PROTOCOLS: ProtocolTemplate[] = [
  {
    id: 'ovsynch',
    name: 'Ovsynch',
    description: 'Standard GnRH-PGF-GnRH protocol',
    isPredefined: true,
    steps: [
      { dayOffset: 0, action: 'GnRH Injection', isAI: false },
      { dayOffset: 7, action: 'PGF2α Injection', isAI: false },
      { dayOffset: 9, action: 'GnRH Injection', isAI: false },
      { dayOffset: 10, action: 'Timed AI', isAI: true }
    ]
  },
  {
    id: 'cosynch',
    name: 'Co-Synch',
    description: 'GnRH-PGF-GnRH with AI at second GnRH',
    isPredefined: true,
    steps: [
      { dayOffset: 0, action: 'GnRH Injection', isAI: false },
      { dayOffset: 7, action: 'PGF2α Injection', isAI: false },
      { dayOffset: 9, action: 'GnRH + Timed AI', isAI: true }
    ]
  },
  {
    id: 'cidr',
    name: 'CIDR-Based',
    description: 'Progesterone insert protocol',
    isPredefined: true,
    steps: [
      { dayOffset: 0, action: 'GnRH + CIDR Insert', isAI: false },
      { dayOffset: 7, action: 'CIDR Removal + PGF2α', isAI: false },
      { dayOffset: 9, action: 'GnRH Injection', isAI: false },
      { dayOffset: 10, action: 'Timed AI', isAI: true }
    ]
  },
  {
    id: 'presynch',
    name: 'Presynch-Ovsynch',
    description: 'Two PGF injections before Ovsynch',
    isPredefined: true,
    steps: [
      { dayOffset: 0, action: 'PGF2α Injection', isAI: false },
      { dayOffset: 14, action: 'PGF2α Injection', isAI: false },
      { dayOffset: 26, action: 'GnRH Injection (Ovsynch Start)', isAI: false },
      { dayOffset: 33, action: 'PGF2α Injection', isAI: false },
      { dayOffset: 35, action: 'GnRH Injection', isAI: false },
      { dayOffset: 36, action: 'Timed AI', isAI: true }
    ]
  },
  {
    id: 'doublepg',
    name: 'Double PG',
    description: 'Sequential Prostaglandin protocol',
    isPredefined: true,
    steps: [
      { dayOffset: 0, action: 'PGF2α Injection', isAI: false },
      { dayOffset: 14, action: 'PGF2α Injection', isAI: false },
      { dayOffset: 16, action: 'Timed AI', isAI: true }
    ]
  }
];

export const MOCK_ANIMALS: Animal[] = [
  { id: '1', tag: 'TAG-001', name: 'Bessie', breed: 'Holstein', sex: 'Female', dob: '2020-05-15', status: AnimalStatus.PREGNANT, herd: 'Herd A' },
  { id: '2', tag: 'TAG-002', name: 'Daisy', breed: 'Jersey', sex: 'Female', dob: '2021-02-10', status: AnimalStatus.ACTIVE, herd: 'Herd A' },
  { id: '3', tag: 'TAG-003', name: 'Molly', breed: 'Holstein', sex: 'Female', dob: '2019-11-20', status: AnimalStatus.SICK, herd: 'Herd B' },
  { id: '4', tag: 'TAG-004', name: 'Bella', breed: 'Angus', sex: 'Female', dob: '2022-01-05', status: AnimalStatus.DRY, herd: 'Herd B' },
  { id: '5', tag: 'TAG-005', name: 'Lucy', breed: 'Holstein', sex: 'Female', dob: '2021-08-12', status: AnimalStatus.ACTIVE, herd: 'Herd A' },
];

export const MOCK_REPRO_EVENTS: ReproductionEvent[] = [
  { id: 'r1', animalId: '1', type: ReproEventType.INSEMINATION, date: '2023-10-01', details: 'Artificial Insemination', bullId: 'BULL-42', success: true },
  { id: 'r2', animalId: '1', type: ReproEventType.PREGNANCY_CHECK, date: '2023-11-15', details: 'Positive - Ultrasound', success: true },
  { id: 'r3', animalId: '2', type: ReproEventType.ESTRUS, date: '2023-12-10', details: 'Strong heat detected' },
];

export const MOCK_HEALTH_EVENTS: HealthEvent[] = [
  { id: 'h1', animalId: '3', type: HealthEventType.ILLNESS, date: '2024-01-10', details: 'Mastitis detected in rear quarter', medication: 'Masti-Clear', dosage: '1 tube daily' },
  { id: 'h2', animalId: '1', type: HealthEventType.VACCINATION, date: '2023-09-01', details: 'Standard viral panel', nextDue: '2024-09-01' },
];

export const MOCK_ALERTS: Alert[] = [
  { id: 'a1', type: 'Repro', title: 'Pregnancy Check Due', description: 'Daisy (TAG-002) is due for 30-day ultrasound.', dueDate: '2024-01-20', animalId: '2', isRead: false, priority: 'High' },
  { id: 'a2', type: 'Health', title: 'Vaccination Overdue', description: 'Herd B needs annual boosters.', dueDate: '2024-01-15', isRead: false, priority: 'Medium' },
];
