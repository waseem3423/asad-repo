
import { useState, useEffect, useMemo, useRef } from 'react';
import { Animal, ReproductionEvent, HealthEvent, Alert, FarmSettings, ProtocolEnrollment, ProtocolTemplate, ReproEventType, VaccinationRecord } from '../types';
import { storageService, DEFAULT_SETTINGS } from '../services/storage';
import { computeAnimalStatus, generateAlerts } from '../services/businessLogic';
import { PREDEFINED_PROTOCOLS } from '../data';

export const useFarm = () => {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [reproEvents, setReproEvents] = useState<ReproductionEvent[]>([]);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [enrollments, setEnrollments] = useState<ProtocolEnrollment[]>([]);
  const [customProtocols, setCustomProtocols] = useState<ProtocolTemplate[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([]);
  const [settings, setSettings] = useState<FarmSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const isInitialMount = useRef(true);

  const allTemplates = useMemo(() => [...PREDEFINED_PROTOCOLS, ...customProtocols], [customProtocols]);

  // Initialize
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const fetchedAnimals = await storageService.getAnimals();
        const fetchedReproEvents = await storageService.getReproEvents();
        const fetchedHealthEvents = await storageService.getHealthEvents();
        const fetchedEnrollments = await storageService.getEnrollments();
        const fetchedCustomProtocols = await storageService.getCustomProtocols();
        const fetchedVaccinations = await storageService.getVaccinations();
        const fetchedSettings = await storageService.getSettings();

        setAnimals(fetchedAnimals);
        setReproEvents(fetchedReproEvents);
        setHealthEvents(fetchedHealthEvents);
        setEnrollments(fetchedEnrollments);
        setCustomProtocols(fetchedCustomProtocols);
        setVaccinations(fetchedVaccinations);
        setSettings(fetchedSettings);
      } catch (error) {
        console.error("Error loading farm data", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save on change
  useEffect(() => {
    if (!loading && animals.length) storageService.saveAnimals(animals);
  }, [animals, loading]);

  useEffect(() => {
    if (!loading && reproEvents.length) storageService.saveReproEvents(reproEvents);
  }, [reproEvents, loading]);

  useEffect(() => {
    if (!loading && healthEvents.length) storageService.saveHealthEvents(healthEvents);
  }, [healthEvents, loading]);

  useEffect(() => {
    if (!loading) storageService.saveEnrollments(enrollments);
  }, [enrollments, loading]);

  useEffect(() => {
    if (!loading) storageService.saveCustomProtocols(customProtocols);
  }, [customProtocols, loading]);

  useEffect(() => {
    if (!loading) storageService.saveVaccinations(vaccinations);
  }, [vaccinations, loading]);

  useEffect(() => {
    if (!loading) storageService.saveSettings(settings);
  }, [settings, loading]);

  // Derived Data
  const animalsWithStatus = useMemo(() => {
    return animals.map(a => ({
      ...a,
      ...computeAnimalStatus(a, reproEvents, healthEvents, enrollments, settings)
    }));
  }, [animals, reproEvents, healthEvents, enrollments, settings]);

  const alerts = useMemo(() => {
    return generateAlerts(animals, reproEvents, healthEvents, enrollments, allTemplates, settings, vaccinations);
  }, [animals, reproEvents, healthEvents, enrollments, allTemplates, settings, vaccinations]);

  const stats = useMemo(() => {
    const statuses = animalsWithStatus.map(a => a.status);
    return {
      total: animals.filter(a => !a.isCalf).length,
      pregnant: statuses.filter(s => s === 'Pregnant').length,
      closeup: statuses.filter(s => s === 'Closeup').length,
      sick: statuses.filter(s => s === 'Sick').length,
      active: statuses.filter(s => s === 'Active').length,
      calves: animals.filter(a => a.isCalf).length,
      inProtocol: statuses.filter(s => s === 'In Protocol').length,
      inseminated: statuses.filter(s => s === 'Inseminated').length,
      lactating: statuses.filter(s => s === 'Lactating').length,
    };
  }, [animalsWithStatus, animals]);

  // Actions
  const addAnimal = (a: Animal) => setAnimals(prev => [a, ...prev]);
  const updateAnimal = (updated: Animal) => setAnimals(prev => prev.map(a => a.id === updated.id ? updated : a));
  const deleteAnimal = (id: string) => setAnimals(prev => prev.filter(a => a.id !== id));

  const addReproEvent = (e: ReproductionEvent) => {
    if (e.type === ReproEventType.INSEMINATION && !e.protocolId) {
      setEnrollments(prev => prev.filter(enrollment => enrollment.animalId !== e.animalId || enrollment.status !== 'Active'));
    }
    setReproEvents(prev => [e, ...prev]);
  };

  const updateReproEvent = (updated: ReproductionEvent) => setReproEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
  const deleteReproEvent = (id: string) => setReproEvents(prev => prev.filter(e => e.id !== id));
  const addHealthEvent = (e: HealthEvent) => setHealthEvents(prev => [e, ...prev]);
  const updateHealthEvent = (updated: HealthEvent) => setHealthEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
  const deleteHealthEvent = (id: string) => setHealthEvents(prev => prev.filter(e => e.id !== id));

  const addEnrollment = (e: ProtocolEnrollment) => setEnrollments(prev => [e, ...prev]);
  const updateEnrollment = (updated: ProtocolEnrollment) => setEnrollments(prev => prev.map(e => e.id === updated.id ? updated : e));
  const deleteEnrollment = (id: string) => setEnrollments(prev => prev.filter(e => e.id !== id));

  const addCustomProtocol = (p: ProtocolTemplate) => setCustomProtocols(prev => [p, ...prev]);
  const deleteProtocolTemplate = (id: string) => setCustomProtocols(prev => prev.filter(p => p.id !== id));

  const addVaccination = (v: VaccinationRecord) => setVaccinations(prev => [v, ...prev]);
  const updateVaccination = (updated: VaccinationRecord) => setVaccinations(prev => prev.map(v => v.id === updated.id ? updated : v));
  const deleteVaccination = (id: string) => setVaccinations(prev => prev.filter(v => v.id !== id));

  const updateSettings = (s: FarmSettings) => setSettings(s);

  return {
    loading,
    animals: animalsWithStatus,
    reproEvents,
    healthEvents,
    enrollments,
    protocols: allTemplates,
    customProtocols,
    vaccinations,
    alerts,
    stats,
    settings,
    addAnimal,
    updateAnimal,
    deleteAnimal,
    addReproEvent,
    updateReproEvent,
    deleteReproEvent,
    addHealthEvent,
    updateHealthEvent,
    deleteHealthEvent,
    addEnrollment,
    updateEnrollment,
    deleteEnrollment,
    addCustomProtocol,
    deleteProtocolTemplate,
    addVaccination,
    updateVaccination,
    deleteVaccination,
    updateSettings
  };
};
