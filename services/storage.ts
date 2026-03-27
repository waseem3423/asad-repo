import { Animal, ReproductionEvent, HealthEvent, FarmSettings, ProtocolEnrollment, ProtocolTemplate, VaccinationRecord } from '../types';
import { MOCK_ANIMALS, MOCK_REPRO_EVENTS, MOCK_HEALTH_EVENTS, PREDEFINED_PROTOCOLS } from '../data';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const KEYS = {
  ANIMALS: 'agrovet_animals',
  REPRO: 'agrovet_repro',
  HEALTH: 'agrovet_health',
  SETTINGS: 'asad_settings',
  ENROLLMENTS: 'agrovet_enrollments',
  PROTOCOLS: 'agrovet_protocols',
  VACCINATIONS: 'agrovet_vaccinations'
};

export const DEFAULT_SETTINGS: FarmSettings = {
  gestationDays: 283,
  closeupDays: 21,
  dryPeriodDays: 60,
  pregnancyCheckDays: 30,
  estrusCycleDays: 21,
  pdfTemplate: 'Professional',
  farmName: "Asad's Farm",
  statusColors: {
    active: '#10B981',
    pregnant: '#3B82F6',
    sick: '#EF4444',
    dry: '#64748B',
    closeup: '#8B5CF6',
    inProtocol: '#F59E0B',
    inseminated: '#06B6D4',
    lactating: '#EC4899'
  },
  customGroups: ['Main Herd', 'Elite', 'High Group', 'Medium Group', 'Heifers', 'Breeding']
};

const getFromFirebase = async <T>(key: string, defaultData: T): Promise<T> => {
  try {
    const docRef = doc(db, 'farmData', key);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().data as T;
    }
    return defaultData;
  } catch (error) {
    console.error('Error fetching from Firebase:', error);
    return defaultData; // fallback to default on error
  }
};

const saveToFirebase = async (key: string, data: any) => {
  try {
    const docRef = doc(db, 'farmData', key);
    await setDoc(docRef, { data });
  } catch (error) {
    console.error('Error saving to Firebase:', error);
  }
};

export const storageService = {
  getAnimals: () => getFromFirebase<Animal[]>(KEYS.ANIMALS, MOCK_ANIMALS),
  saveAnimals: (data: Animal[]) => saveToFirebase(KEYS.ANIMALS, data),

  getReproEvents: () => getFromFirebase<ReproductionEvent[]>(KEYS.REPRO, MOCK_REPRO_EVENTS),
  saveReproEvents: (data: ReproductionEvent[]) => saveToFirebase(KEYS.REPRO, data),

  getHealthEvents: () => getFromFirebase<HealthEvent[]>(KEYS.HEALTH, MOCK_HEALTH_EVENTS),
  saveHealthEvents: (data: HealthEvent[]) => saveToFirebase(KEYS.HEALTH, data),

  getEnrollments: () => getFromFirebase<ProtocolEnrollment[]>(KEYS.ENROLLMENTS, []),
  saveEnrollments: (data: ProtocolEnrollment[]) => saveToFirebase(KEYS.ENROLLMENTS, data),

  getCustomProtocols: () => getFromFirebase<ProtocolTemplate[]>(KEYS.PROTOCOLS, []),
  saveCustomProtocols: (data: ProtocolTemplate[]) => saveToFirebase(KEYS.PROTOCOLS, data),

  getSettings: async () => {
    try {
      const docRef = doc(db, 'farmData', KEYS.SETTINGS);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const parsed = docSnap.data().data;
        return { ...DEFAULT_SETTINGS, ...parsed, statusColors: { ...DEFAULT_SETTINGS.statusColors, ...(parsed.statusColors || {}) } };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error fetching settings from Firebase', error);
      return DEFAULT_SETTINGS;
    }
  },
  saveSettings: (data: FarmSettings) => saveToFirebase(KEYS.SETTINGS, data),

  getVaccinations: () => getFromFirebase<VaccinationRecord[]>(KEYS.VACCINATIONS, []),
  saveVaccinations: (data: VaccinationRecord[]) => saveToFirebase(KEYS.VACCINATIONS, data),
};
