import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Stethoscope, 
  CalendarRange, 
  Bell, 
  Search, 
  Plus, 
  ChevronRight,
  X,
  AlertCircle,
  Download,
  Settings as SettingsIcon,
  Clock,
  Save,
  Menu,
  Baby,
  Tag,
  ClipboardList,
  CheckCircle2,
  Calendar as CalendarIcon,
  FlaskConical,
  Play,
  Layers,
  Activity,
  ArrowRight,
  Printer,
  Trash2,
  Syringe,
  Thermometer,
  History,
  TrendingUp,
  MapPin,
  LayoutList,
  LayoutGrid,
  Grid2X2,
  Square,
  Edit2,
  Filter,
  Check,
  Zap,
  MoreVertical,
  FileText,
  BarChart2,
  PieChart as PieChartIcon,
  ShieldCheck,
  Palette,
  HeartPulse,
  AlertTriangle,
  BabyIcon,
  ChevronDown,
  Droplets,
  Upload
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

import { useFarm } from './hooks/useFarm';
import { 
  AnimalStatus, 
  ReproEventType, 
  HealthEventType, 
  Animal, 
  ReproductionEvent, 
  HealthEvent, 
  ProtocolEnrollment,
  ProtocolTemplate,
  ProtocolStep,
  VaccinationRecord,
} from './types';
import { validations, dateUtils } from './services/businessLogic';
import { 
  generateReproSectionReport, 
  generateHealthSectionReport, 
  generateDashboardPDF,
  generateProtocolReport,
  generateIndividualAnimalReport,
  generateAnimalListReport,
  generateProtocolListReport
} from './utils/pdfUtils';
import { auth } from './services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';

const StatCard = ({ title, value, icon: Icon, colorClass, trend, onClick }: any) => (
  <div
    className={`bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-blue-200 active:scale-95' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-4 rounded-3xl ${colorClass} bg-opacity-10 shadow-inner`}>
        <Icon className={`w-7 h-7 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
      {trend && (
        <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100 uppercase tracking-tighter">
          {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-4xl font-black text-slate-800">{value}</h3>
      {onClick && <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">Tap to view →</p>}
    </div>
  </div>
);

const FormModal = ({ title, isOpen, onClose, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-xl font-black text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-2xl transition-all">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>
        <div className="p-8 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const getStatusColor = (status?: AnimalStatus) => {
  switch (status) {
    case AnimalStatus.PREGNANT: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case AnimalStatus.SICK: return 'bg-rose-50 text-rose-700 border-rose-200';
    case AnimalStatus.IN_PROTOCOL: return 'bg-amber-50 text-amber-700 border-amber-200';
    case AnimalStatus.INSEMINATED: return 'bg-blue-50 text-blue-700 border-blue-200';
    case AnimalStatus.DRY: return 'bg-slate-100 text-slate-700 border-slate-300';
    case AnimalStatus.CLOSEUP: return 'bg-purple-50 text-purple-700 border-purple-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

type ViewState = 'dashboard' | 'animals' | 'repro' | 'health' | 'protocols' | 'reports' | 'settings' | 'vaccination';
type HerdViewMode = 'list' | 'small' | 'medium' | 'large';
type ReportType = 'summary' | 'repro' | 'health' | 'individual';
type HerdTab = 'adults' | 'calves';

function MainApp({ user, onLogout }: any) {
  const { 
    loading,
    animals, 
    reproEvents, 
    healthEvents, 
    enrollments,
    protocols,
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
  } = useFarm();
  
  const [view, setView] = useState<ViewState>('dashboard');
  const [herdViewMode, setHerdViewMode] = useState<HerdViewMode>('medium');
  const [herdTab, setHerdTab] = useState<HerdTab>('adults');
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isAlertPanelOpen, setIsAlertPanelOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const alertPanelRef = useRef<HTMLDivElement>(null);
  
  // Modals state
  const [isAnimalFormOpen, setIsAnimalFormOpen] = useState(false);
  const [isReproFormOpen, setIsReproFormOpen] = useState(false);
  const [isHealthFormOpen, setIsHealthFormOpen] = useState(false);
  const [isEnrollmentFormOpen, setIsEnrollmentFormOpen] = useState(false);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [isVaccinationFormOpen, setIsVaccinationFormOpen] = useState(false);
  const [isPregnancyCheckOpen, setIsPregnancyCheckOpen] = useState(false);
  const [pregnancyCheckAnimal, setPregnancyCheckAnimal] = useState<Animal | null>(null);
  const [calfFormAnimal, setCalfFormAnimal] = useState<Animal | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [protocolAnimalSearch, setProtocolAnimalSearch] = useState('');
  const [healthPatientSearch, setHealthPatientSearch] = useState('');
  const [vaccinationAnimalSearch, setVaccinationAnimalSearch] = useState('');

  // Repro Filters & Sorts
  const [reproTagSearch, setReproTagSearch] = useState('');
  const [reproTechFilter, setReproTechFilter] = useState<string>('All');
  const [reproSemenFilter, setReproSemenFilter] = useState<string>('All');
  const [reproDateStart, setReproDateStart] = useState<string>('');
  const [reproDateEnd, setReproDateEnd] = useState<string>('');
  const [reproSort, setReproSort] = useState<'Date Desc' | 'Date Asc'>('Date Desc');

  // Health Filters
  const [healthTechFilter, setHealthTechFilter] = useState<string>('All');
  const [healthTypeFilter, setHealthTypeFilter] = useState<string>('All');
  const [healthMedFilter, setHealthMedFilter] = useState<string>('All');
  const [healthDateStart, setHealthDateStart] = useState<string>('');
  const [healthDateEnd, setHealthDateEnd] = useState<string>('');
  const [healthTagSearch, setHealthTagSearch] = useState<string>('');

  // Pregnancy Check Modal
  const [isPregnancyCheckModalOpen, setIsPregnancyCheckModalOpen] = useState(false);
  const [pregnancyCheckTarget, setPregnancyCheckTarget] = useState<Animal | null>(null);
  const [pregnancyCheckResult, setPregnancyCheckResult] = useState<'Pregnant' | 'Non-Pregnant' | ''>('');

  // Report Center State
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('summary');
  const [reportStartDate, setReportStartDate] = useState<string>('');
  const [reportEndDate, setReportEndDate] = useState<string>('');
  const [reportAnimalId, setReportAnimalId] = useState<string>('');
  const [reportAnimalSearch, setReportAnimalSearch] = useState<string>('');

  // Report Date Filters (Individual Profile)
  const [animalReportStart, setAnimalReportStart] = useState<string>('');
  const [animalReportEnd, setAnimalReportEnd] = useState<string>('');

  // Editing State
  const [editingAnimalId, setEditingAnimalId] = useState<string | null>(null);
  const [editingReproId, setEditingReproId] = useState<string | null>(null);
  const [editingHealthId, setEditingHealthId] = useState<string | null>(null);

  // Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => {} });

  // Protocol cow-tag search (within protocol tab)
  const [protocolTagSearch, setProtocolTagSearch] = useState('');
  // Protocol view mode: 'active' | 'history'
  const [protocolView, setProtocolView] = useState<'active' | 'history'>('active');
  // History date filter
  const [historyMonth, setHistoryMonth] = useState('');
  // Selected protocol for drill-down view (protocol list -> protocol detail)
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(null);
  // Group management in settings
  const [newGroupName, setNewGroupName] = useState('');
  // Dashboard status filter navigation
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState<string | null>(null);

  // Repro form cow search autocomplete
  const [reproAnimalSearch, setReproAnimalSearch] = useState('');
  const [reproAnimalDropdown, setReproAnimalDropdown] = useState(false);

  // Health form cow search autocomplete
  const [healthAnimalSearch, setHealthAnimalSearch] = useState('');
  const [healthAnimalDropdown, setHealthAnimalDropdown] = useState(false);

  // Form states
  const [newAnimal, setNewAnimal] = useState<Partial<Animal>>({ sex: 'Female', breed: 'Holstein', herd: 'Main Herd' });
  const [newRepro, setNewRepro] = useState<Partial<ReproductionEvent>>({ type: ReproEventType.ESTRUS, date: new Date().toISOString().split('T')[0] });
  const [newHealth, setNewHealth] = useState<Partial<HealthEvent>>({ type: HealthEventType.ILLNESS, date: new Date().toISOString().split('T')[0] });
  const [newEnrollment, setNewEnrollment] = useState<Partial<ProtocolEnrollment> & { animalIds?: string[] }>({ startDate: new Date().toISOString().split('T')[0], animalIds: [] });
  const [newTemplate, setNewTemplate] = useState<Partial<ProtocolTemplate>>({ name: '', description: '', steps: [{ dayOffset: 0, action: '', isAI: false, time: '08:00' }], isPredefined: false });
  const [newVaccination, setNewVaccination] = useState<Partial<VaccinationRecord>>({ date: new Date().toISOString().split('T')[0] });
  const [editingVaccinationId, setEditingVaccinationId] = useState<string | null>(null);

  // Handle outside click for search results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close forms when animal selection changes
  useEffect(() => {
    if (selectedAnimal) {
      setIsReproFormOpen(false);
      setIsHealthFormOpen(false);
      setIsEnrollmentFormOpen(false);
      setIsVaccinationFormOpen(false);
    }
  }, [selectedAnimal]);

  const filteredAnimals = useMemo(() => {
    return animals.filter(a => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        a.tag.toLowerCase().includes(term) || 
        (a.name?.toLowerCase().includes(term)) ||
        (a.herd.toLowerCase().includes(term)) ||
        (a.status?.toLowerCase().includes(term));
      const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [animals, searchTerm, statusFilter]);

  const protocolEligibleAnimals = useMemo(() => {
    return animals
      .filter(a => a.status !== AnimalStatus.PREGNANT && a.status !== AnimalStatus.IN_PROTOCOL)
      .filter(a => a.tag.toLowerCase().includes(protocolAnimalSearch.toLowerCase()) || a.breed.toLowerCase().includes(protocolAnimalSearch.toLowerCase()));
  }, [animals, protocolAnimalSearch]);

  const reportSearchAnimals = useMemo(() => {
    if (!reportAnimalSearch) return [];
    return animals.filter(a => 
      a.tag.toLowerCase().includes(reportAnimalSearch.toLowerCase()) || 
      (a.name && a.name.toLowerCase().includes(reportAnimalSearch.toLowerCase()))
    ).slice(0, 5);
  }, [animals, reportAnimalSearch]);

  const filteredReproEvents = useMemo(() => {
    let filtered = reproEvents.filter(e => {
      const animal = animals.find(a => a.id === e.animalId);
      const matchesTag = !reproTagSearch || (animal?.tag.toLowerCase().includes(reproTagSearch.toLowerCase()));
      const matchesTech = reproTechFilter === 'All' || e.technician === reproTechFilter;
      const matchesSemen = reproSemenFilter === 'All' || e.semenName === reproSemenFilter || e.bullId === reproSemenFilter;
      const matchesStart = !reproDateStart || e.date >= reproDateStart;
      const matchesEnd = !reproDateEnd || e.date <= reproDateEnd;
      return matchesTag && matchesTech && matchesSemen && matchesStart && matchesEnd;
    });
    
    return filtered.sort((a, b) => {
      if (reproSort === 'Date Desc') {
        return b.date.localeCompare(a.date);
      } else {
        return a.date.localeCompare(b.date);
      }
    });
  }, [reproEvents, animals, reproTagSearch, reproTechFilter, reproSemenFilter, reproDateStart, reproDateEnd, reproSort]);

  const filteredHealthEvents = useMemo(() => {
    return healthEvents.filter(e => {
      const animal = animals.find(a => a.id === e.animalId);
      const matchesTag = !healthTagSearch || (animal?.tag.toLowerCase().includes(healthTagSearch.toLowerCase()));
      const matchesType = healthTypeFilter === 'All' || e.type === healthTypeFilter;
      const matchesTech = healthTechFilter === 'All' || e.technician === healthTechFilter;
      const matchesMed = healthMedFilter === 'All' || e.medication === healthMedFilter;
      const matchesStart = !healthDateStart || e.date >= healthDateStart;
      const matchesEnd = !healthDateEnd || e.date <= healthDateEnd;
      return matchesTag && matchesType && matchesTech && matchesMed && matchesStart && matchesEnd;
    });
  }, [healthEvents, animals, healthTagSearch, healthTypeFilter, healthTechFilter, healthMedFilter, healthDateStart, healthDateEnd]);

  const uniqueReproTechs = useMemo(() => {
    const techs = new Set(reproEvents.map(e => e.technician).filter(Boolean));
    return Array.from(techs) as string[];
  }, [reproEvents]);

  const uniqueHealthTechs = useMemo(() => {
    const techs = new Set(healthEvents.map(e => e.technician).filter(Boolean));
    return Array.from(techs) as string[];
  }, [healthEvents]);

  const uniqueMedications = useMemo(() => {
    const meds = new Set(healthEvents.map(e => e.medication).filter(Boolean));
    return Array.from(meds) as string[];
  }, [healthEvents]);

  const uniqueSemens = useMemo(() => {
    const semens = new Set(reproEvents.map(e => e.semenName || e.bullId).filter(Boolean));
    return Array.from(semens) as string[];
  }, [reproEvents]);

  // Inseminated animals awaiting pregnancy check
  const inseminatedAnimals = useMemo(() => {
    return animals.filter(a => a.status === AnimalStatus.INSEMINATED);
  }, [animals]);

  // Health patient search autocomplete
  const healthPatientSearchResults = useMemo(() => {
    if (!healthPatientSearch || healthPatientSearch.length < 1) return [];
    return animals.filter(a =>
      a.tag.toLowerCase().includes(healthPatientSearch.toLowerCase()) ||
      (a.name?.toLowerCase().includes(healthPatientSearch.toLowerCase()))
    ).slice(0, 6);
  }, [animals, healthPatientSearch]);

  // Vaccination animal search autocomplete
  const vaccinationSearchResults = useMemo(() => {
    if (!vaccinationAnimalSearch || vaccinationAnimalSearch.length < 1) return [];
    return animals.filter(a =>
      a.tag.toLowerCase().includes(vaccinationAnimalSearch.toLowerCase()) ||
      (a.name?.toLowerCase().includes(vaccinationAnimalSearch.toLowerCase()))
    ).slice(0, 6);
  }, [animals, vaccinationAnimalSearch]);

  // Adults and Calves separation
  const adultAnimals = useMemo(() => filteredAnimals.filter(a => !a.isCalf), [filteredAnimals]);
  const calfAnimals = useMemo(() => animals.filter(a => a.isCalf && (
    !searchTerm ||
    a.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  )), [animals, searchTerm]);

  const recentLogs = useMemo(() => {
    const combined = [
      ...reproEvents.map(e => ({ ...e, logType: 'Repro' })),
      ...healthEvents.map(e => ({ ...e, logType: 'Health' }))
    ].sort((a, b) => b.date.localeCompare(a.date));
    return combined.slice(0, 10);
  }, [reproEvents, healthEvents]);

    // Auto Backup System
  useEffect(() => {
    const lastBackup = localStorage.getItem('agrovet_backup_time');
    const now = new Date().getTime();
    if (!lastBackup || now - parseInt(lastBackup) > 24 * 60 * 60 * 1000) {
      const data = {
        exportDate: new Date().toISOString(),
        animals, reproEvents, healthEvents, enrollments, settings
      };
      localStorage.setItem('agrovet_auto_backup', JSON.stringify(data));
      localStorage.setItem('agrovet_backup_time', now.toString());
    }
    
    // Auto-Archive protocols > 100 days old
    enrollments.forEach(enr => {
       if (enr.status === 'Completed' || enr.status === 'Failed') {
           const daysSince = dateUtils.diffDays(new Date().toISOString().split('T')[0], enr.startDate);
           if (daysSince > 100) {
               updateEnrollment({...enr, status: 'Archived'});
           }
       }
    });
  }, [animals, reproEvents, healthEvents, enrollments, settings]);

    const todaySteps = useMemo(() => {
    let steps: any[] = [];
    enrollments.filter(e => e.status === 'Active').forEach(enr => {
      const template = protocols.find(t => t.id === enr.templateId);
      if (!template) return;
      const animal = animals.find(a => a.id === enr.animalId);
      template.steps.forEach((step, idx) => {
        if (!enr.completedStepIndices.includes(idx)) {
          const stepDate = dateUtils.addDays(enr.startDate, step.dayOffset);
          if (stepDate <= dateUtils.today()) {
            steps.push({ enrollment: enr, stepIndex: idx, step, animal, template });
          }
        }
      });
    });
    return steps;
  }, [enrollments, protocols, animals]);

  const markTodayStepsDone = () => {
     let updatedEnrollments:any = {};
     todaySteps.forEach(s => {
         if (!updatedEnrollments[s.enrollment.id]) {
             updatedEnrollments[s.enrollment.id] = { ...s.enrollment, completedStepIndices: [...s.enrollment.completedStepIndices] };
         }
         if (!updatedEnrollments[s.enrollment.id].completedStepIndices.includes(s.stepIndex)) {
            updatedEnrollments[s.enrollment.id].completedStepIndices.push(s.stepIndex);
         }
     });
     Object.values(updatedEnrollments).forEach(enr => updateEnrollment(enr as ProtocolEnrollment));
     alert("Today's steps marked as done!");
  };

  const handleAddAnimal = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAnimal.tag) {
      if (editingAnimalId) {
        updateAnimal(newAnimal as Animal);
        setEditingAnimalId(null);
      } else {
        addAnimal({
          ...newAnimal,
          id: Math.random().toString(36).substr(2, 9),
          dob: newAnimal.isCalf ? (newAnimal.dob || new Date().toISOString().split('T')[0]) : '',
        } as Animal);
      }
      setIsAnimalFormOpen(false);
      setNewAnimal({ sex: 'Female', breed: 'Holstein', herd: 'Main Herd', isCalf: false, isLactating: false });
    }
  };

  const handleAddRepro = (e: React.FormEvent) => {
    handleCalvingWithCalf(e);
  };

  const handleAddHealth = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHealth.animalId && newHealth.type) {
      if (editingHealthId) {
        updateHealthEvent(newHealth as HealthEvent);
        setEditingHealthId(null);
      } else {
        addHealthEvent({
          ...newHealth,
          id: Math.random().toString(36).substr(2, 9),
          date: newHealth.date || new Date().toISOString().split('T')[0],
        } as HealthEvent);
      }
      setIsHealthFormOpen(false);
      setSelectedAnimal(null); // Auto-close animal profile when health form is submitted
      setNewHealth({ type: HealthEventType.ILLNESS, date: new Date().toISOString().split('T')[0] });
      setHealthAnimalSearch('');
    }
  };

  const handlePregnancyCheck = () => {
    if (!pregnancyCheckTarget || !pregnancyCheckResult) return;
    const isPregnant = pregnancyCheckResult === 'Pregnant';
    addReproEvent({
      id: Math.random().toString(36).substr(2, 9),
      animalId: pregnancyCheckTarget.id,
      type: ReproEventType.PREGNANCY_CHECK,
      date: new Date().toISOString().split('T')[0],
      details: `Pregnancy check result: ${pregnancyCheckResult}`,
      success: isPregnant,
      pregnancyResult: pregnancyCheckResult,
    } as ReproductionEvent);
    setIsPregnancyCheckModalOpen(false);
    setPregnancyCheckTarget(null);
    setPregnancyCheckResult('');
  };

  const handleCalvingWithCalf = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRepro.animalId && newRepro.type) {
      try {
        const animal = animals.find(a => a.id === newRepro.animalId);
        validations.validateReproductionEvent(newRepro, animal?.status || AnimalStatus.ACTIVE);
        const reproId = Math.random().toString(36).substr(2, 9);
        addReproEvent({
          ...newRepro,
          id: reproId,
          date: newRepro.date || new Date().toISOString().split('T')[0],
        } as ReproductionEvent);
        // Auto Remove After Insemination
        if (newRepro.type === ReproEventType.INSEMINATION) {
          const activeEnrolls = enrollments.filter(e => e.animalId === newRepro.animalId && e.status === 'Active');
          activeEnrolls.forEach(enr => {
             updateEnrollment({...enr, status: 'Completed'});
          });
        }
        
        // Auto-add calf if calving event
        if (newRepro.type === ReproEventType.CALVING && newRepro.offspringTag) {
          const calfId = Math.random().toString(36).substr(2, 9);
          addAnimal({
            id: calfId,
            tag: newRepro.offspringTag,
            name: '',
            breed: animal?.breed || 'Unknown',
            sex: (newRepro.offspringGender as 'Male' | 'Female') || 'Female',
            dob: newRepro.date || new Date().toISOString().split('T')[0],
            herd: animal?.herd || 'Main Herd',
            motherId: newRepro.animalId,
            fatherId: newRepro.bullId,
            isCalf: true,
          } as Animal);
        }
        setIsReproFormOpen(false);
        setSelectedAnimal(null); // Auto-close animal profile when form is submitted
        setNewRepro({ type: ReproEventType.ESTRUS, date: new Date().toISOString().split('T')[0] });
        setReproAnimalSearch('');
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleEditAnimal = (animal: Animal, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAnimalId(animal.id);
    setNewAnimal(animal);
    setIsAnimalFormOpen(true);
  };

  const handleDeleteAnimal = (animal: Animal, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      message: `Are you sure you want to delete Cow ${animal.tag}? This action cannot be undone.`,
      onConfirm: () => { deleteAnimal(animal.id); setSelectedAnimal(null); setConfirmDialog(d => ({ ...d, isOpen: false })); }
    });
  };

  const handleDeleteRepro = (event: ReproductionEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const animal = animals.find(a => a.id === event.animalId);
    setConfirmDialog({
      isOpen: true,
      message: `Delete ${event.type} event for ${animal?.tag || 'animal'} on ${event.date}?`,
      onConfirm: () => { deleteReproEvent(event.id); setConfirmDialog(d => ({ ...d, isOpen: false })); }
    });
  };

  const handleDeleteHealth = (event: HealthEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const animal = animals.find(a => a.id === event.animalId);
    setConfirmDialog({
      isOpen: true,
      message: `Delete ${event.type} record for ${animal?.tag || 'animal'} on ${event.date}?`,
      onConfirm: () => { deleteHealthEvent(event.id); setConfirmDialog(d => ({ ...d, isOpen: false })); }
    });
  };

  const handleEditRepro = (event: ReproductionEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingReproId(event.id);
    setNewRepro(event);
    const animal = animals.find(a => a.id === event.animalId);
    if (animal) setReproAnimalSearch(animal.tag);
    setIsReproFormOpen(true);
  };

  const exportBackup = () => {
    const data = {
      exportDate: new Date().toISOString(),
      animals,
      reproEvents,
      healthEvents,
      enrollments,
      customProtocols,
      vaccinations,
      settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agrovet_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEnrollment.animalIds && newEnrollment.animalIds.length > 0 && newEnrollment.templateId) {
      newEnrollment.animalIds.forEach(animalId => {
        addEnrollment({
          id: Math.random().toString(36).substr(2, 9),
          animalId,
          templateId: newEnrollment.templateId!,
          status: 'Active',
          completedStepIndices: [],
          startDate: newEnrollment.startDate || new Date().toISOString().split('T')[0]
        } as ProtocolEnrollment);
      });
      setIsEnrollmentFormOpen(false);
      setNewEnrollment({ startDate: new Date().toISOString().split('T')[0], animalIds: [] });
      setProtocolAnimalSearch('');
    }
  };

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTemplate.name && newTemplate.steps && newTemplate.steps.length > 0) {
      addCustomProtocol({
        ...newTemplate,
        id: Math.random().toString(36).substr(2, 9),
        isPredefined: false
      } as ProtocolTemplate);
      setIsTemplateFormOpen(false);
      setNewTemplate({ name: '', description: '', steps: [{ dayOffset: 0, action: '', isAI: false, time: '08:00' }], isPredefined: false });
    }
  };

  const executeReportExport = () => {
    const rangeLabel = (reportStartDate || reportEndDate) 
      ? `${reportStartDate || 'Start'} to ${reportEndDate || 'End'}` 
      : 'Full Record';

    switch (selectedReportType) {
      case 'summary':
        generateDashboardPDF(stats, animals, settings);
        break;
      case 'repro': {
        const filtered = reproEvents.filter(e => 
          (!reportStartDate || e.date >= reportStartDate) && 
          (!reportEndDate || e.date <= reportEndDate)
        );
        generateReproSectionReport(filtered, animals, settings, rangeLabel);
        break;
      }
      case 'health': {
        const filtered = healthEvents.filter(e => 
          (!reportStartDate || e.date >= reportStartDate) && 
          (!reportEndDate || e.date <= reportEndDate)
        );
        generateHealthSectionReport(filtered, animals, settings, rangeLabel);
        break;
      }
      case 'individual': {
        const animal = animals.find(a => a.id === reportAnimalId);
        if (!animal) {
          alert('Please select an animal first.');
          return;
        }
        const filteredRepros = reproEvents.filter(e => 
          e.animalId === animal.id &&
          (!reportStartDate || e.date >= reportStartDate) && 
          (!reportEndDate || e.date <= reportEndDate)
        );
        const filteredHealths = healthEvents.filter(e => 
          e.animalId === animal.id &&
          (!reportStartDate || e.date >= reportStartDate) && 
          (!reportEndDate || e.date <= reportEndDate)
        );
        generateIndividualAnimalReport(animal, filteredRepros, filteredHealths, rangeLabel, settings);
        break;
      }
    }
  };

  const NavItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: ViewState }) => (
    <button
      onClick={() => { setView(id); setIsSidebarOpen(false); }}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-300 ${
        view === id 
        ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 scale-[1.02]' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
      }`}
    >
      <Icon className="w-6 h-6" />
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-inter">
        <Activity className="w-16 h-16 text-blue-600 animate-pulse mb-6" />
        <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Syncing Database...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-inter">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-[110] w-72 bg-white border-r border-slate-100 transform transition-transform duration-500 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:static md:block`}>
        <div className="h-full flex flex-col p-8">
          <div className="flex items-center gap-4 mb-14 px-2">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-100 animate-pulse">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tighter">Asad's<span className="text-blue-600">Farm</span></h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest -mt-1">Management</p>
            </div>
          </div>

          <nav className="flex-1 space-y-3">
            <NavItem icon={LayoutDashboard} label="Dashboard" id="dashboard" />
            <NavItem icon={Users} label="Herd Hub" id="animals" />
            <NavItem icon={CalendarRange} label="Reproduction" id="repro" />
            <NavItem icon={Stethoscope} label="Health Bay" id="health" />
            <NavItem icon={FlaskConical} label="Protocol Lab" id="protocols" />
            <NavItem icon={FileText} label="Report Center" id="reports" />
            <NavItem icon={SettingsIcon} label="Configurations" id="settings" />
          </nav>

          <div className="mt-auto p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-[1.25rem] bg-white flex items-center justify-center text-blue-600 font-black text-xl shadow-sm border border-slate-100 flex-shrink-0">
                {settings.farmName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-800 truncate leading-tight mb-0.5">{settings.farmName}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{user?.email || 'Field Operative'}</p>
              </div>
            </div>
            <button onClick={onLogout} className="w-full py-3.5 bg-white border border-slate-200 text-slate-600 text-[11px] font-black rounded-[1.25rem] uppercase tracking-widest hover:bg-slate-100 hover:text-slate-800 transition-all shadow-sm">
              Secure Sign Out
            </button>
          </div>
        </div>
      </aside>

      
      {/* Searchable Dropdowns (Datalists) */}
      <datalist id="all-cow-tags">
        {animals.map((a) => (
          <option key={a.id} value={a.tag}>{a.tag} - {a.name || a.breed}</option>
        ))}
      </datalist>
      <datalist id="all-technicians">
        {Array.from(new Set([...reproEvents.map(e => e.technician), ...healthEvents.map(e => e.technician)])).filter(Boolean).map((t, i) => (
          <option key={i} value={t as string} />
        ))}
      </datalist>
      <datalist id="all-semen">
        {Array.from(new Set(reproEvents.map(e => e.semenName || e.bullId))).filter(Boolean).map((s, i) => (
          <option key={i} value={s as string} />
        ))}
      </datalist>
      <datalist id="all-diseases">
        <option value="Mastitis" />
        <option value="Lameness" />
        <option value="Metritis" />
        <option value="Ketosis" />
        <option value="Milk Fever" />
      </datalist>
      
      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col h-screen">
        {/* Universal Header */}
        <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-[90] border-b border-slate-100 px-6 md:px-10 py-6 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button onClick={() => setIsSidebarOpen(true)} className="p-3 md:hidden hover:bg-slate-100 rounded-2xl transition-all">
              <Menu className="w-7 h-7 text-slate-600" />
            </button>
            <h2 className="text-2xl font-black text-slate-800 capitalize tracking-tight hidden sm:block">{view.replace('-', ' ')}</h2>
          </div>

          <div className="flex items-center gap-6 flex-1 justify-end">
            <div className="relative max-w-md w-full" ref={searchRef}>
              <Search className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearchFocused ? 'text-blue-600' : 'text-slate-400'}`} />
              <input 
                type="text" 
                placeholder="Global search (Tag, Status, Herd)..." 
                className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-none rounded-[1.5rem] text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-600/20 focus:bg-white transition-all shadow-sm"
                value={searchTerm}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {/* Quick Search Dropdown */}
              {isSearchFocused && searchTerm.length > 0 && (
                <div className="absolute top-full mt-3 left-0 right-0 bg-white border border-slate-100 rounded-[2rem] shadow-2xl p-4 animate-in slide-in-from-top-2 duration-300 max-h-[400px] overflow-y-auto">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3">Quick Results ({filteredAnimals.length})</p>
                  <div className="space-y-2">
                    {filteredAnimals.length > 0 ? filteredAnimals.map(a => (
                      <button 
                        key={a.id} 
                        onClick={() => { setSelectedAnimal(a); setIsSearchFocused(false); }}
                        className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all text-left group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${getStatusColor(a.status)}`}>
                            {a.tag.slice(-2)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 group-hover:text-blue-600">{a.tag}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">{a.breed} • {a.herd}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border ${getStatusColor(a.status)}`}>{a.status}</span>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                        </div>
                      </button>
                    )) : (
                      <p className="text-center py-6 text-sm text-slate-400 font-bold italic">No matches found.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setIsAlertPanelOpen(true)} className="relative p-3.5 text-slate-500 hover:bg-slate-100 rounded-2xl transition-all group">
              <Bell className="w-6 h-6 group-hover:scale-110 transition-transform" />
              {alerts.length > 0 && <span className="absolute top-3 right-3 w-3 h-3 bg-rose-500 rounded-full border-[3px] border-white shadow-sm shadow-rose-200 animate-pulse"></span>}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth">
          {view === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard title="Total Herd" value={stats.total} icon={Users} colorClass="bg-blue-500" onClick={() => { setView('animals'); setStatusFilter('All'); }} />
                <StatCard title="Lactating" value={stats.lactating} icon={Droplets} colorClass="bg-purple-500" onClick={() => { setView('animals'); setStatusFilter('Lactating'); }} />
                <StatCard title="Pregnant" value={stats.pregnant} icon={Baby} colorClass="bg-emerald-500" trend={stats.total > 0 ? `${Math.round((stats.pregnant/stats.total)*100)}% Herd` : '0% Herd'} onClick={() => { setView('animals'); setStatusFilter('Pregnant'); }} />
                <StatCard title="In Lab" value={stats.inProtocol} icon={FlaskConical} colorClass="bg-amber-500" onClick={() => { setView('protocols'); }} />
                <StatCard title="Sick Bay" value={stats.sick} icon={Stethoscope} colorClass="bg-rose-500" onClick={() => { setView('animals'); setStatusFilter('Sick'); }} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Main Distribution Chart */}
                <div className="lg:col-span-8 bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Live Analysis</h3>
                      <p className="text-3xl font-black text-slate-800">Herd Lifecycle</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => generateDashboardPDF(stats, animals, settings)} className="p-4 text-blue-600 bg-blue-50 rounded-[1.5rem] hover:bg-blue-100 transition-all shadow-sm" title="Print Dashboard">
                        <Printer className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Active', val: stats.active },
                        { name: 'Pregnant', val: stats.pregnant },
                        { name: 'Lab', val: stats.inProtocol },
                        { name: 'Sick', val: stats.sick },
                        { name: 'Dry', val: (stats.total - stats.active - stats.pregnant - stats.sick) > 0 ? (stats.total - stats.active - stats.pregnant - stats.sick) : 0 }
                      ]}>
                        <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94A3B8', fontWeight: 800}} dy={15} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94A3B8', fontWeight: 600}} />
                        <Tooltip 
                          cursor={{fill: '#F8FAFC'}} 
                          contentStyle={{borderRadius: '24px', border: 'none', padding: '16px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)'}}
                        />
                        <Bar dataKey="val" radius={[16, 16, 0, 0]} barSize={56}>
                          {[0,1,2,3,4].map((_, i) => (
                            <Cell key={`c-${i}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#64748B'][i]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Priority Alerts */}
                <div className="lg:col-span-4 bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Critical Tasks</h3>
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="space-y-5 flex-1 overflow-y-auto max-h-[400px] pr-2 scrollbar-hide">
                    {alerts.length > 0 ? alerts.map(alert => (
                      <div key={alert.id} className="group flex items-start gap-5 p-5 rounded-[1.5rem] bg-slate-50/50 hover:bg-white transition-all border border-transparent hover:border-slate-100 hover:shadow-lg">
                        <div className={`mt-1 p-3 rounded-2xl shadow-sm ${alert.priority === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-800 truncate leading-tight mb-1">{alert.title}</p>
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium mb-3">{alert.description}</p>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-slate-100 shadow-sm">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{alert.dueDate}</span>
                            </div>
                            {alert.animalId && (
                              <button 
                                onClick={() => setSelectedAnimal(animals.find(a => a.id === alert.animalId) || null)}
                                className="text-[10px] font-black text-blue-600 hover:underline underline-offset-4"
                              >
                                View Cow
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="flex flex-col items-center justify-center h-full py-10 opacity-40">
                        <CheckCircle2 className="w-20 h-20 text-slate-100 mb-4" />
                        <p className="text-sm text-slate-400 font-black tracking-widest uppercase">System Clear</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Activity & Funnel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pb-10">
                <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 rounded-2xl">
                        <History className="w-7 h-7 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800">Activity Stream</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time entries</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {recentLogs.map((log: any) => {
                      const animal = animals.find(a => a.id === log.animalId);
                      return (
                        <div key={log.id} className="flex items-center gap-6 p-5 rounded-[1.5rem] bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-100 transition-all cursor-pointer group" onClick={() => setSelectedAnimal(animal || null)}>
                          <div className={`p-3 rounded-2xl shadow-sm ${log.logType === 'Repro' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                            {log.logType === 'Repro' ? <Baby className="w-5 h-5" /> : <Stethoscope className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-black text-slate-800 group-hover:text-blue-600">{animal?.tag || 'Unk'}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${log.logType === 'Repro' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                                {log.type}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{log.details}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{log.date}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 rounded-2xl">
                        <TrendingUp className="w-7 h-7 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800">Herd Composition</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Health & Repro Ratio</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="w-64 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Healthy', value: stats.active + stats.pregnant },
                              { name: 'Under Treatment', value: stats.sick },
                              { name: 'Protocol', value: stats.inProtocol },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={8}
                            dataKey="value"
                          >
                            {[0,1,2].map((_, i) => (
                              <Cell key={`p-${i}`} fill={['#10B981', '#EF4444', '#F59E0B'][i]} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            <span className="text-sm font-black text-slate-600 uppercase tracking-wider">Health Stability</span>
                          </div>
                          <span className="text-sm font-black text-slate-800">{Math.round(((stats.active + stats.pregnant)/stats.total)*100)}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-emerald-500" style={{ width: `${Math.round(((stats.active + stats.pregnant)/stats.total)*100)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'animals' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-10">
              <div className="bg-white p-6 md:p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex flex-col lg:flex-row gap-6 justify-between items-center">
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search tags or status..." 
                        className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold shadow-inner"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select 
                      className="w-full sm:w-auto bg-slate-50 border-none rounded-2xl text-sm font-black py-3.5 px-6 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Status</option>
                      {Object.values(AnimalStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="flex p-1 bg-slate-100 rounded-2xl shadow-inner flex-1 sm:flex-none">
                      {[
                        { id: 'list', icon: LayoutList },
                        { id: 'small', icon: LayoutGrid },
                        { id: 'medium', icon: Grid2X2 },
                        { id: 'large', icon: Square },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setHerdViewMode(mode.id as HerdViewMode)}
                          className={`p-3 rounded-xl transition-all ${
                            herdViewMode === mode.id 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title={`${mode.id.charAt(0).toUpperCase() + mode.id.slice(1)} View`}
                        >
                          <mode.icon className="w-5 h-5" />
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={() => {
                        const label = statusFilter === 'All' ? 'All Status' : statusFilter;
                        generateAnimalListReport(filteredAnimals, settings, label);
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-emerald-600 text-white border-2 border-emerald-600 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100"
                    >
                      <Download className="w-6 h-6" /> Export PDF
                    </button>

                    <button 
                      onClick={() => { setEditingAnimalId(null); setNewAnimal({ sex: 'Female', breed: 'Holstein', herd: 'Main Herd' }); setIsAnimalFormOpen(true); }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                    >
                      <Plus className="w-6 h-6" /> Add Cow
                    </button>
                  </div>
                </div>
              </div>

              {/* Adults / Calves Tab Switcher */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit shadow-inner">
                <button
                  onClick={() => setHerdTab('adults')}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                    herdTab === 'adults' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Adults ({adultAnimals.length})
                </button>
                <button
                  onClick={() => setHerdTab('calves')}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                    herdTab === 'calves' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  🐄 Calves ({calfAnimals.length})
                </button>
              </div>

              {herdTab === 'calves' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {calfAnimals.length === 0 ? (
                    <div className="col-span-full py-20 text-center">
                      <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No calves recorded yet</p>
                      <p className="text-slate-300 text-xs mt-2">Calves are auto-added when a Calving event is recorded</p>
                    </div>
                  ) : calfAnimals.map(calf => {
                    const mother = animals.find(a => a.id === calf.motherId);
                    return (
                      <div key={calf.id} className="bg-white p-8 rounded-[3rem] border-2 border-emerald-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-emerald-400" />
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 font-black text-xl border border-emerald-100">
                              {calf.tag.slice(-2)}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-800 text-xl tracking-tighter">{calf.tag}</h4>
                              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-100">{calf.sex} Calf</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mother</span>
                            <span className="text-xs font-black text-slate-700">{mother?.tag || calf.motherId || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Father (Bull)</span>
                            <span className="text-xs font-black text-slate-700">{calf.fatherId || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Born</span>
                            <span className="text-xs font-black text-slate-700">{calf.dob}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
              <div className={`
                ${herdViewMode === 'list' ? 'flex flex-col gap-3' : ''}
                ${herdViewMode === 'small' ? 'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4' : ''}
                ${herdViewMode === 'medium' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : ''}
                ${herdViewMode === 'large' ? 'grid grid-cols-1 lg:grid-cols-2 gap-8' : ''}
              `}>
                {adultAnimals.map(animal => {
                  const EditButton = () => (
                    <button 
                      onClick={(e) => handleEditAnimal(animal, e)}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  );

                  if (herdViewMode === 'list') {
                    return (
                      <div 
                        key={animal.id} 
                        onClick={() => setSelectedAnimal(animal)}
                        className="group bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${getStatusColor(animal.status)}`}>
                            {animal.tag.slice(-2)}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 group-hover:text-blue-600">{animal.tag}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{animal.breed} • {animal.herd}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <span className={`hidden sm:inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${getStatusColor(animal.status)}`}>
                            {animal.status}
                          </span>
                          <div className="flex items-center gap-2">
                            <EditButton />
                            <button onClick={(e) => handleDeleteAnimal(animal, e)} className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (herdViewMode === 'small') {
                    return (
                      <div 
                        key={animal.id} 
                        onClick={() => setSelectedAnimal(animal)}
                        className="group bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all text-center cursor-pointer relative"
                      >
                        <div className={`w-10 h-10 mx-auto mb-3 rounded-xl flex items-center justify-center font-black text-xs ${getStatusColor(animal.status)}`}>
                          {animal.tag.slice(-2)}
                        </div>
                        <p className="font-black text-slate-800 text-sm truncate">{animal.tag}</p>
                        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <EditButton />
                        </div>
                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${getStatusColor(animal.status).split(' ')[0]}`}></div>
                      </div>
                    );
                  }

                  if (herdViewMode === 'large') {
                    return (
                      <div 
                        key={animal.id} 
                        onClick={() => setSelectedAnimal(animal)}
                        className="group bg-white p-10 rounded-[3.5rem] border-2 border-slate-50 shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all duration-500 cursor-pointer relative"
                      >
                        <div className="flex items-start justify-between mb-8">
                          <div className="flex items-center gap-8">
                            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border border-slate-100 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-500 shadow-inner">
                              <Tag className="w-10 h-10 text-slate-300 group-hover:text-white transition-colors" />
                            </div>
                            <div>
                              <h4 className="font-black text-slate-800 text-4xl group-hover:text-blue-600 transition-colors tracking-tighter mb-2">{animal.tag}</h4>
                              <div className="flex items-center gap-3">
                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${getStatusColor(animal.status)}`}>
                                  {animal.status}
                                </span>
                                <p className="text-xs text-slate-400 font-black uppercase tracking-widest">{animal.breed}</p>
                              </div>
                            </div>
                          </div>
                          <EditButton />
                        </div>
                        <div className="grid grid-cols-2 gap-6 mt-10">
                          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100/50">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">Age Context</p>
                            <p className="text-xl font-black text-slate-800">{dateUtils.diffDays(new Date().toISOString().split('T')[0], animal.dob)} Days Old</p>
                          </div>
                          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100/50">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">Assigned Herd</p>
                            <p className="text-xl font-black text-slate-700 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-500" /> {animal.herd}</p>
                          </div>
                        </div>
                        <div className="absolute bottom-8 right-8 bg-blue-50 p-4 rounded-3xl text-blue-600 opacity-0 group-hover:opacity-100 transition-all">
                          <ArrowRight className="w-6 h-6" />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={animal.id} 
                      onClick={() => setSelectedAnimal(animal)}
                      className="group bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-5">
                          <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center border border-slate-100 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-500 shadow-inner">
                            <Tag className="w-7 h-7 text-slate-400 group-hover:text-white transition-colors" />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800 text-2xl group-hover:text-blue-600 transition-colors tracking-tighter">{animal.tag}</h4>
                            <p className="text-xs text-slate-400 font-black uppercase tracking-widest">{animal.breed}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tighter border shadow-sm ${getStatusColor(animal.status)}`}>
                            {animal.status}
                          </span>
                          <EditButton />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-8">
                        <div className="p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100/50">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Born</p>
                          <p className="text-sm font-black text-slate-700">{animal.dob}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100/50">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Herd Location</p>
                          <p className="text-sm font-black text-slate-700 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {animal.herd}</p>
                        </div>
                      </div>
                      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                        <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-xl shadow-blue-200">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          )}

          {view === 'repro' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="flex flex-col sm:flex-row gap-6 justify-between items-center bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Reproduction Lab</h3>
                  <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Global fertility logs</p>
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      const label = (reproDateStart || reproDateEnd) ? `${reproDateStart || 'Start'} to ${reproDateEnd || 'End'}` : 'Full History';
                      generateReproSectionReport(filteredReproEvents, animals, settings, label);
                    }} 
                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-white text-slate-700 border-2 border-slate-100 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    <Printer className="w-5 h-5" /> Print PDF
                  </button>
                  <button 
                    onClick={() => { setEditingReproId(null); setNewRepro({ type: ReproEventType.ESTRUS, date: new Date().toISOString().split('T')[0] }); setIsReproFormOpen(true); }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                  >
                    <Plus className="w-5 h-5" /> Record Event
                  </button>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3 mb-2">
                   <Filter className="w-5 h-5 text-blue-600" />
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Filters & Sorters</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Animal Tag</label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search tag..."
                        className="w-full pl-9 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={reproTagSearch}
                        onChange={(e) => setReproTagSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Technician</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={reproTechFilter}
                      onChange={(e) => setReproTechFilter(e.target.value)}
                    >
                      <option value="All">All Technicians</option>
                      {uniqueReproTechs.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Semen / Bull</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={reproSemenFilter}
                      onChange={(e) => setReproSemenFilter(e.target.value)}
                    >
                      <option value="All">All Semen</option>
                      {uniqueSemens.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">From Date</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={reproDateStart}
                      onChange={(e) => setReproDateStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">To Date</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={reproDateEnd}
                      onChange={(e) => setReproDateEnd(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sort By</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={reproSort}
                      onChange={(e) => setReproSort(e.target.value as any)}
                    >
                      <option value="Date Desc">Newest First</option>
                      <option value="Date Asc">Oldest First</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pregnancy Check Queue in Reproduction View */}
              {inseminatedAnimals.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-[2.5rem] p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-blue-800 uppercase tracking-widest">Pregnancy Check Queue</h4>
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{inseminatedAnimals.length} animals awaiting clearance</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inseminatedAnimals.map(a => {
                      const lastInsem = reproEvents.filter(e => e.animalId === a.id && e.type === ReproEventType.INSEMINATION).sort((x, y) => y.date.localeCompare(x.date))[0];
                      const daysSince = lastInsem ? dateUtils.diffDays(new Date().toISOString().split('T')[0], lastInsem.date) : 0;
                      const isCheckDue = daysSince >= settings.pregnancyCheckDays - 3;
                      const isOverdue = daysSince >= settings.pregnancyCheckDays;
                      return (
                        <div key={a.id} className={`bg-white rounded-2xl p-5 border-2 flex items-center justify-between shadow-sm transition-all hover:shadow-md ${
                          isOverdue ? 'border-rose-300 shadow-rose-50' : isCheckDue ? 'border-amber-300 shadow-amber-50' : 'border-blue-100'
                        }`}>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-black text-slate-800 text-lg">{a.tag}</p>
                              {isOverdue && <span className="text-[9px] font-black bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full uppercase tracking-tight">Overdue</span>}
                              {!isOverdue && isCheckDue && <span className="text-[9px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full uppercase tracking-tight">Due Soon</span>}
                            </div>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${
                              isOverdue ? 'text-rose-600' : isCheckDue ? 'text-amber-600' : 'text-blue-500'
                            }`}>Day {daysSince} / {settings.pregnancyCheckDays} since insem</p>
                            {lastInsem && <p className="text-[9px] text-slate-400 font-bold mt-1">Inseminated: {lastInsem.date}</p>}
                          </div>
                          <button
                            onClick={() => { setPregnancyCheckTarget(a); setPregnancyCheckResult(''); setIsPregnancyCheckModalOpen(true); }}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md ml-3"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Check
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Cow Ident</th>
                      <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Activity</th>
                      <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Technician</th>
                      <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Semen/Bull</th>
                      <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Outcome</th>
                      <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredReproEvents.map(event => {
                      const animal = animals.find(a => a.id === event.animalId);
                      return (
                        <tr key={event.id} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                          <td className="px-8 py-6" onClick={() => setSelectedAnimal(animal || null)}>
                            <span className="font-black text-slate-800 group-hover:text-blue-600">{animal?.tag || 'Unk'}</span>
                          </td>
                          <td className="px-8 py-6" onClick={() => setSelectedAnimal(animal || null)}>
                            <div className="flex flex-col">
                              <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm border inline-block w-fit ${
                                event.type === ReproEventType.INSEMINATION ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                event.type === ReproEventType.PREGNANCY_CHECK ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                event.type === ReproEventType.ABORTION ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {event.type}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wider">{event.date}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-sm text-slate-700 font-bold">{event.technician || '--'}</td>
                          <td className="px-8 py-6 text-sm text-slate-500 font-black">{event.semenName || event.bullId || '--'}</td>
                          <td className="px-8 py-6">
                            {event.success !== undefined && (
                              <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${event.success ? 'text-emerald-600' : 'text-rose-500'}`}>
                                <div className={`w-2 h-2 rounded-full ${event.success ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                {event.success ? 'Successful' : 'Failed'}
                              </span>
                            )}
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={(e) => handleEditRepro(event, e)}
                                className="p-3 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all"
                                title="Edit Details"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => handleDeleteRepro(event, e)}
                                className="p-3 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'health' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="flex flex-col sm:flex-row gap-6 justify-between items-center bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Clinical Log</h3>
                  <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Medical treatment records</p>
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      const label = (healthDateStart || healthDateEnd) ? `${healthDateStart || 'Start'} to ${healthDateEnd || 'End'}` : 'Full History';
                      generateHealthSectionReport(filteredHealthEvents, animals, settings, label);
                    }} 
                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-white text-slate-700 border-2 border-slate-100 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    <Printer className="w-5 h-5" /> Print PDF
                  </button>
                  <button 
                    onClick={() => { setEditingHealthId(null); setNewHealth({ type: HealthEventType.ILLNESS, date: new Date().toISOString().split('T')[0], treatments: [{name: '', dose: ''}] }); setIsHealthFormOpen(true); }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-rose-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-100"
                  >
                    <Plus className="w-5 h-5" /> Add Discovery
                  </button>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3 mb-2">
                   <Filter className="w-5 h-5 text-rose-600" />
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Health Filters</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Patient Tag</label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search tag..."
                        className="w-full pl-9 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20"
                        value={healthTagSearch}
                        onChange={(e) => setHealthTagSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Technician / Vet</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20"
                      value={healthTechFilter}
                      onChange={(e) => setHealthTechFilter(e.target.value)}
                    >
                      <option value="All">All Vets</option>
                      {uniqueHealthTechs.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Medication</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20"
                      value={healthMedFilter}
                      onChange={(e) => setHealthMedFilter(e.target.value)}
                    >
                      <option value="All">All Medication</option>
                      {uniqueMedications.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Type</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20"
                      value={healthTypeFilter}
                      onChange={(e) => setHealthTypeFilter(e.target.value)}
                    >
                      <option value="All">All Types</option>
                      {Object.values(HealthEventType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">From Date</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20"
                      value={healthDateStart}
                      onChange={(e) => setHealthDateStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">To Date</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20"
                      value={healthDateEnd}
                      onChange={(e) => setHealthDateEnd(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Inseminated Animals - Pregnancy Check Queue in Health view */}
              {inseminatedAnimals.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-[2.5rem] p-8 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest">Pregnancy Check Queue — {inseminatedAnimals.length} Inseminated</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inseminatedAnimals.map(a => {
                      const lastInsem = reproEvents.filter(e => e.animalId === a.id && e.type === ReproEventType.INSEMINATION).sort((x, y) => y.date.localeCompare(x.date))[0];
                      const daysSince = lastInsem ? dateUtils.diffDays(new Date().toISOString().split('T')[0], lastInsem.date) : 0;
                      const isCheckDue = daysSince >= settings.pregnancyCheckDays - 3;
                      return (
                        <div key={a.id} className={`bg-white rounded-2xl p-5 border flex items-center justify-between shadow-sm ${isCheckDue ? 'border-amber-200' : 'border-blue-100'}`}>
                          <div>
                            <p className="font-black text-slate-800">{a.tag}</p>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${isCheckDue ? 'text-amber-600' : 'text-blue-500'}`}>Day {daysSince} since insem</p>
                          </div>
                          <button
                            onClick={() => { setPregnancyCheckTarget(a); setPregnancyCheckResult(''); setIsPregnancyCheckModalOpen(true); }}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Preg Check
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Animal</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Type</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Prescription</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Condition Details</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHealthEvents.map(event => {
                        const animal = animals.find(a => a.id === event.animalId);
                        return (
                          <tr key={event.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-8 py-6 cursor-pointer" onClick={() => setSelectedAnimal(animal || null)}>
                              <span className="font-black text-slate-800 group-hover:text-blue-600">{animal?.tag || 'Unknown Tag'}</span>
                              <br />
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                {animal?.status || 'Active'}
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex flex-col">
                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm border inline-block w-fit ${
                                  event.type === HealthEventType.ILLNESS ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                  event.type === HealthEventType.VACCINATION ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                  'bg-emerald-50 text-emerald-600 border-emerald-100'
                                }`}>
                                  {event.type}
                                </span>
                                <span className="text-[9px] text-slate-500 font-bold mt-1.5 uppercase tracking-wider flexItemsCenter gap-1">
                                  {event.date}
                                </span>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              {(event.treatments && event.treatments.length > 0 && event.treatments[0].name) ? (
                                <div className="space-y-1">
                                  {event.treatments.map((t, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <Syringe className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                      <span className="text-xs font-black text-slate-700">{t.name || 'Unnamed'}</span>
                                      <span className="text-[9px] font-black text-slate-400 uppercase ml-1">({t.dose || 'N/A'})</span>
                                    </div>
                                  ))}
                                </div>
                              ) : event.medication ? (
                                <div className="flex items-center gap-2">
                                  <Syringe className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <span className="text-xs font-black text-slate-700">{event.medication}</span>
                                  <span className="text-[9px] font-black text-slate-400 uppercase ml-1">({event.dosage || 'N/A'})</span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">No medication</span>
                              )}
                            </td>
                            <td className="px-8 py-6 max-w-[200px]">
                              <p className="text-xs text-slate-600 font-bold truncate" title={event.details}>{event.details || '--'}</p>
                              {event.technician && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 block">Tech: {event.technician}</span>}
                              
                              {event.treatmentDays && (() => {
                                const today = new Date().toISOString().split('T')[0];
                                const endDate = dateUtils.addDays(event.date, event.treatmentDays);
                                const daysInto = dateUtils.diffDays(today, event.date);
                                const daysLeft = dateUtils.diffDays(endDate, today);
                                const isActive = daysInto >= 0 && daysLeft >= 0;
                                return isActive ? (
                                  <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md mt-2 inline-block">
                                    {daysLeft} days active
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md mt-2 inline-block">
                                    Done
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => { setEditingHealthId(event.id); const toEdit = {...event}; if (!toEdit.treatments) { if (toEdit.medication || toEdit.dosage) { toEdit.treatments = [{name: toEdit.medication || '', dose: toEdit.dosage || ''}]; } else { toEdit.treatments = [{name: '', dose: ''}]; } } setNewHealth(toEdit); const anim = animals.find((x: any) => x.id === event.animalId); if(anim) setHealthAnimalSearch(anim.tag); setIsHealthFormOpen(true); }}
                                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteHealth(event, e)}
                                  className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredHealthEvents.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold text-sm">
                            No health records found in this view.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {view === 'protocols' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
              {/* Header */}
              <div className="flex flex-col lg:flex-row gap-6 justify-between items-center bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Protocol Lab</h3>
                  <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Animal Synchronization &amp; Templates</p>
                </div>
                <div className="flex flex-wrap gap-4 justify-center">
                  <button 
                    onClick={() => { 
                      generateProtocolListReport(enrollments.filter(e => e.status === 'Active'), protocols, animals, settings);
                    }}
                    className="flex items-center justify-center gap-3 bg-white text-slate-700 border-2 border-slate-100 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <Printer className="w-5 h-5 text-blue-600" /> Print Active
                  </button>
                  <button 
                    onClick={() => { setEditingReproId(null); setNewEnrollment({ startDate: new Date().toISOString().split('T')[0], animalIds: [] }); setProtocolAnimalSearch(''); setIsEnrollmentFormOpen(true); }}
                    className="flex items-center justify-center gap-3 bg-amber-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-700 transition-all shadow-xl shadow-amber-100"
                  >
                    <Zap className="w-5 h-5" /> Enroll Batch
                  </button>
                </div>
              </div>

              {/* Daily Steps Section */}
              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const todaySteps = enrollments.filter(e => e.status === 'Active').flatMap(enrollment => {
                  const template = protocols.find(t => t.id === enrollment.templateId);
                  if (!template) return [];
                  return template.steps
                    .map((step, idx) => ({ step, idx, enrollment, template, stepDate: `${new Date(enrollment.startDate).getFullYear()}-${String(new Date(enrollment.startDate).getMonth()+1).padStart(2,'0')}-${String(new Date(enrollment.startDate).getDate() + step.dayOffset).padStart(2,'0')}` }))
                    .filter(s => !enrollment.completedStepIndices.includes(s.idx) && s.stepDate === today);
                });
                if (todaySteps.length === 0) return null;
                return (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-[3rem] p-8 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-600 rounded-xl"><CalendarIcon className="w-5 h-5 text-white" /></div>
                        <div>
                          <h4 className="text-sm font-black text-amber-800 uppercase tracking-widest">Today's Protocol Steps</h4>
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{todaySteps.length} steps due today — {today}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                           todaySteps.forEach(({ step, idx, enrollment }) => {
                              const newCompleted = [...enrollment.completedStepIndices, idx];
                              const newStatus = newCompleted.length === enrollment.templateId.length ? 'Completed' : 'Active'; 
                              updateEnrollment({...enrollment, completedStepIndices: newCompleted, status: newStatus as any});
                           });
                        }}
                        className="px-6 py-2 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-amber-700 transition-all"
                      >
                         Mark All Today Done
                      </button>
                    </div>
                    <div className="space-y-3">
                      {todaySteps.map(({ step, idx, enrollment, template }) => {
                        const animal = animals.find(a => a.id === enrollment.animalId);
                        return (
                          <div key={`${enrollment.id}-${idx}`} className="bg-white rounded-2xl p-4 border border-amber-100 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-700 font-black text-xs">D{step.dayOffset}</div>
                              <div>
                                <p className="font-black text-slate-800">{animal?.tag || 'Unk'}</p>
                                <p className="text-xs text-slate-500 font-semibold">{step.action}{step.time ? ` @ ${step.time}` : ''} — {template.name}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const newCompleted = [...enrollment.completedStepIndices, idx];
                                const isFinished = newCompleted.length === template.steps.length;
                                updateEnrollment({ ...enrollment, completedStepIndices: newCompleted, status: isFinished ? 'Completed' : 'Active' });
                              }}
                              className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-amber-700 transition-all shadow-md"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Cow Tag Search in Protocol View */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Search className="w-5 h-5 text-slate-400" />
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Search Cow in Protocols</label>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Type cow tag to see protocol status..."
                    className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-amber-500/20"
                    value={protocolTagSearch}
                    onChange={e => setProtocolTagSearch(e.target.value)}
                  />
                </div>
                {protocolTagSearch && (() => {
                  const matchedAnimals = animals.filter(a => a.tag.toLowerCase().includes(protocolTagSearch.toLowerCase()));
                  if (matchedAnimals.length === 0) return <p className="mt-3 text-xs text-slate-400 font-bold text-center">No animals match</p>;
                  return (
                    <div className="mt-4 space-y-2">
                      {matchedAnimals.map(a => {
                        const animalEnrollments = enrollments.filter(e => e.animalId === a.id);
                        return (
                          <div key={a.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-black text-slate-800">{a.tag}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">{a.status} • {a.breed}</p>
                              </div>
                              {animalEnrollments.length === 0 ? (
                                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase">No Protocol</span>
                              ) : animalEnrollments.map(enr => {
                                const t = protocols.find(p => p.id === enr.templateId);
                                return (
                                  <span key={enr.id} className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${enr.status === 'Active' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {t?.name || 'Protocol'} — {enr.status}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Protocol View Toggle */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit shadow-inner">
                <button onClick={() => setProtocolView('active')} className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${protocolView === 'active' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  Active ({enrollments.filter(e => e.status === 'Active').length})
                </button>
                <button onClick={() => setProtocolView('history')} className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${protocolView === 'history' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  History ({enrollments.filter(e => e.status !== 'Active').length})
                </button>
              </div>

              {/* SECTION 1: Manual Template Creation (at the top) */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-[3rem] p-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200">
                      <ClipboardList className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-800">Create Manual Protocol</h4>
                      <p className="text-xs text-blue-600 font-black uppercase tracking-widest">Define custom day-based injection schedules with time</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setIsTemplateFormOpen(true); }}
                    className="flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                  >
                    <Plus className="w-5 h-5" /> New Protocol
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-sm">
                    <div className="text-3xl mb-3">📅</div>
                    <h5 className="font-black text-slate-800 mb-2">Day-Based Steps</h5>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">Define injections at Day 0, Day 7, Day 14, etc. System auto-calculates due dates.</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-sm">
                    <div className="text-3xl mb-3">⏰</div>
                    <h5 className="font-black text-slate-800 mb-2">Time Scheduling</h5>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">Set exact injection times (e.g., 08:00, 16:00) for each protocol step.</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-sm">
                    <div className="text-3xl mb-3">🔔</div>
                    <h5 className="font-black text-slate-800 mb-2">Auto Alerts</h5>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">Protocol steps automatically fire alerts on dashboard 3 days before due date.</p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Active Synchronizations */}
              {/* SECTION 2: Protocol List View (grouped by template) */}
              <div className="space-y-8">
                <div className="flex items-center gap-4 px-2">
                  <div className="p-2 bg-amber-50 rounded-xl">
                    <Activity className="w-5 h-5 text-amber-600" />
                  </div>
                  <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Live Synchronizations</h4>
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-tighter">
                    {enrollments.filter(e => e.status === 'Active').length} Animals
                  </span>
                  {selectedProtocolId && (
                    <button
                      onClick={() => setSelectedProtocolId(null)}
                      className="ml-auto flex items-center gap-2 text-xs font-black text-slate-500 hover:text-blue-600 transition-colors"
                    >
                      ← Back to Protocols
                    </button>
                  )}
                </div>

                {!selectedProtocolId ? (
                  // === PROTOCOL LIST VIEW (grouped by template) ===
                  (() => {
                    const activeEnrollments = enrollments.filter(e => e.status === 'Active');
                    if (activeEnrollments.length === 0) {
                      return (
                        <div className="bg-white p-20 rounded-[4rem] text-center border border-slate-100">
                          <FlaskConical className="w-20 h-20 text-slate-100 mx-auto mb-6" />
                          <p className="text-lg font-black text-slate-400 uppercase tracking-widest">No active synchronizations</p>
                          <p className="text-sm text-slate-300 font-bold mt-2">Enroll animals using the button above</p>
                        </div>
                      );
                    }
                    // Group enrollments by templateId
                    const grouped: Record<string, { template: typeof protocols[0]; enrollments: typeof activeEnrollments; totalProgress: number }> = {};
                    activeEnrollments.forEach(enr => {
                      const template = protocols.find(t => t.id === enr.templateId);
                      if (!template) return;
                      if (!grouped[enr.templateId]) {
                        grouped[enr.templateId] = { template, enrollments: [], totalProgress: 0 };
                      }
                      grouped[enr.templateId].enrollments.push(enr);
                    });
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(grouped).map(([templateId, group]) => {
                          const avgProgress = group.enrollments.reduce((sum, enr) => sum + (enr.completedStepIndices.length / group.template.steps.length) * 100, 0) / group.enrollments.length;
                          const today = new Date().toISOString().split('T')[0];
                          // Check for today's pending steps
                          const pendingToday = group.enrollments.filter(enr => {
                            return group.template.steps.some((step, idx) => {
                              if (enr.completedStepIndices.includes(idx)) return false;
                              const stepDate = dateUtils.addDays(enr.startDate, step.dayOffset);
                              return stepDate <= today;
                            });
                          }).length;
                          return (
                            <div
                              key={templateId}
                              className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                              onClick={() => setSelectedProtocolId(templateId)}
                            >
                              <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
                                    <Layers className="w-7 h-7" />
                                  </div>
                                  <div>
                                    <h5 className="font-black text-slate-800 text-xl group-hover:text-amber-600 transition-colors">{group.template.name}</h5>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{group.template.steps.length} Steps</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-3xl font-black text-amber-600">{group.enrollments.length}</p>
                                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Animals</p>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  <span>Avg Progress</span>
                                  <span>{Math.round(avgProgress)}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                  <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-1000 ease-out" style={{ width: `${avgProgress}%` }}></div>
                                </div>
                              </div>
                              {pendingToday > 0 && (
                                <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider">{pendingToday} animal{pendingToday > 1 ? 's' : ''} have pending steps today</p>
                                </div>
                              )}
                              <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-blue-500 group-hover:text-amber-600 transition-colors">
                                <span>Click to view animals</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                ) : (
                  // === PROTOCOL DETAIL VIEW (animals in selected protocol) ===
                  (() => {
                    const template = protocols.find(t => t.id === selectedProtocolId);
                    if (!template) return null;
                    const protocolEnrollments = enrollments.filter(e => e.status === 'Active' && e.templateId === selectedProtocolId);
                    return (
                      <div className="space-y-6">
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-center gap-4">
                          <Layers className="w-6 h-6 text-amber-600" />
                          <div>
                            <h5 className="font-black text-slate-800 text-lg">{template.name}</h5>
                            <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest">{protocolEnrollments.length} Animals Enrolled — {template.steps.length} Steps</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {protocolEnrollments.map(enrollment => {
                            const animal = animals.find(a => a.id === enrollment.animalId);
                            const nextStepIndex = template.steps.findIndex((_, idx) => !enrollment.completedStepIndices.includes(idx));
                            const progress = (enrollment.completedStepIndices.length / template.steps.length) * 100;
                            return (
                              <div key={enrollment.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                                <div className="flex items-start justify-between mb-6">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-700 font-black text-lg border border-amber-100">
                                      {(animal?.tag || '??').slice(-2)}
                                    </div>
                                    <div>
                                      <h5 className="font-black text-slate-800 text-xl">{animal?.tag || 'Unknown'}</h5>
                                      <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">Started: {enrollment.startDate}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => generateProtocolReport(enrollment, template, animal!, settings)} className="p-3 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-xl transition-all" title="Print Protocol">
                                      <Printer className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setConfirmDialog({ isOpen: true, message: `Remove ${animal?.tag || 'this animal'} from protocol "${template.name}"?`, onConfirm: () => { deleteEnrollment(enrollment.id); setConfirmDialog(d => ({ ...d, isOpen: false })); } })}
                                      className="p-3 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-all"
                                      title="Remove from protocol"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-3 mb-4">
                                  <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <span>Progress: {enrollment.completedStepIndices.length}/{template.steps.length} steps</span>
                                    <span>{Math.round(progress)}%</span>
                                  </div>
                                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                    <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
                                  </div>
                                </div>
                                {/* Steps Timeline */}
                                <div className="space-y-2">
                                  {template.steps.map((step, idx) => {
                                    const isDone = enrollment.completedStepIndices.includes(idx);
                                    const isNext = !isDone && idx === nextStepIndex;
                                    const stepDate = dateUtils.addDays(enrollment.startDate, step.dayOffset);
                                    return (
                                      <div key={idx} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${isDone ? 'bg-emerald-50 opacity-60' : isNext ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-emerald-500 text-white' : isNext ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                          {isDone ? <Check className="w-2.5 h-2.5" /> : <span className="text-[8px] font-black">{step.dayOffset}</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-[10px] font-black truncate ${isDone ? 'text-emerald-700 line-through' : isNext ? 'text-amber-800' : 'text-slate-600'}`}>{step.action}</p>
                                          <p className="text-[9px] text-slate-400 font-bold">{stepDate}{step.time ? ` @ ${step.time}` : ''}</p>
                                        </div>
                                        {isNext && (
                                          <button
                                            onClick={() => {
                                              const newCompleted = [...enrollment.completedStepIndices, nextStepIndex];
                                              const isFinished = newCompleted.length === template.steps.length;
                                              updateEnrollment({ ...enrollment, completedStepIndices: newCompleted, status: isFinished ? 'Completed' : 'Active' });
                                              if (step.isAI && animal) {
                                                setEditingReproId(null);
                                                setNewRepro({
                                                  type: ReproEventType.INSEMINATION,
                                                  date: stepDate,
                                                  animalId: animal.id,
                                                  details: `Protocol Step: ${step.action}`
                                                });
                                                setReproAnimalSearch(animal.tag);
                                                setIsReproFormOpen(true);
                                              }
                                            }}
                                            className="flex-shrink-0 px-2.5 py-1 bg-amber-600 text-white rounded-lg font-black text-[8px] uppercase tracking-wider hover:bg-amber-700 transition-all"
                                          >
                                            Done
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                {nextStepIndex === -1 && (
                                  <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                    <p className="text-sm font-black text-emerald-700 uppercase tracking-widest">Completed!</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>


              {/* SECTION 2b: Protocol History */}
              {protocolView === 'history' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-4 px-2">
                      <div className="p-2 bg-slate-100 rounded-xl"><History className="w-5 h-5 text-slate-500" /></div>
                      <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Protocol History</h4>
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-tighter">{enrollments.filter(e => e.status !== 'Active').length} Records</span>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Month</label>
                      <input type="month" className="px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none" value={historyMonth} onChange={e => setHistoryMonth(e.target.value)} />
                      {historyMonth && <button onClick={() => setHistoryMonth('')} className="text-xs text-slate-400 hover:text-slate-600 font-black">Clear</button>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {enrollments.filter(e => e.status !== 'Active').filter(e => !historyMonth || e.startDate.startsWith(historyMonth)).map(enrollment => {
                      const animal = animals.find(a => a.id === enrollment.animalId);
                      const template = protocols.find(t => t.id === enrollment.templateId);
                      const progress = template ? (enrollment.completedStepIndices.length / template.steps.length) * 100 : 0;
                      return (
                        <div key={enrollment.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400"><History className="w-6 h-6" /></div>
                              <div>
                                <h5 className="font-black text-slate-800 text-lg">{animal?.tag || 'Unk'}</h5>
                                <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em]">{template?.name || 'Protocol'}</p>
                                <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">Started: {enrollment.startDate}</p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${enrollment.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : enrollment.status === 'Archived' ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-600'}`}>{enrollment.status}</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-4">
                            <div className="h-full bg-gradient-to-r from-slate-400 to-slate-600 transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">{enrollment.completedStepIndices.length}/{template?.steps.length || 0} Steps Completed — {Math.round(progress)}%</p>
                        </div>
                      );
                    })}
                    {enrollments.filter(e => e.status !== 'Active').length === 0 && (
                      <div className="col-span-2 py-16 text-center">
                        <History className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                        <p className="text-sm text-slate-400 font-black uppercase tracking-widest">No completed protocols yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 3: Template Library (at the bottom) */}
              <div className="space-y-8">
                <div className="flex items-center gap-4 px-2">
                  <div className="p-2 bg-slate-100 rounded-xl">
                    <ClipboardList className="w-5 h-5 text-slate-500" />
                  </div>
                  <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Template Library</h4>
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-tighter">
                    {protocols.length} Templates
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {protocols.map(p => (
                    <div key={p.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 group hover:shadow-xl transition-all relative overflow-hidden">
                       {!p.isPredefined && (
                         <button 
                           onClick={() => deleteProtocolTemplate(p.id)}
                           className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       )}
                       <div className="flex items-center gap-4 mb-6">
                         <div className={`p-3 rounded-2xl ${p.isPredefined ? 'bg-slate-50 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
                           <FlaskConical className="w-5 h-5" />
                         </div>
                         <div>
                           <h5 className="font-black text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{p.name}</h5>
                           <span className={`text-[9px] font-black uppercase tracking-widest ${
                             p.isPredefined ? 'text-slate-400' : 'text-blue-500'
                           }`}>{p.isPredefined ? '🔒 Standard / Predefined' : '✏️ Custom / Manual'}</span>
                         </div>
                       </div>
                       <p className="text-xs text-slate-500 font-semibold mb-6 line-clamp-2">{p.description || 'No description provided.'}</p>
                       <div className="space-y-2 mb-6">
                         {p.steps.map((step, idx) => (
                           <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                             <span className="w-8 h-5 bg-slate-100 rounded text-center leading-5 font-black text-slate-600 flex-shrink-0">D{step.dayOffset}</span>
                             <span className="truncate">{step.action}</span>
                             {step.time && <span className="text-slate-300 flex-shrink-0">@ {step.time}</span>}
                           </div>
                         ))}
                       </div>
                       <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                         <span className="px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-tighter">{p.steps.length} Steps</span>
                         <span className="px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-tighter">{p.steps[p.steps.length-1]?.dayOffset || 0} Days Total</span>
                         <button
                           onClick={() => { setNewEnrollment({ startDate: new Date().toISOString().split('T')[0], animalIds: [], templateId: p.id }); setProtocolAnimalSearch(''); setIsEnrollmentFormOpen(true); }}
                           className="ml-auto px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-amber-600 hover:text-white transition-all border border-amber-100"
                         >
                           Enroll →
                         </button>
                       </div>
                     </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'reports' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
               <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-6 mb-12">
                  <div className="bg-blue-600 p-4 rounded-[1.5rem] shadow-xl shadow-blue-100">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">Report Center</h3>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em]">Generate comprehensive analytics & records</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-5 space-y-6">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] px-2">Select Report Format</h4>
                    <div className="grid grid-cols-1 gap-4">
                      {[
                        { id: 'summary', label: 'Dashboard Summary', icon: BarChart2, desc: 'Overview of herd metrics and counts' },
                        { id: 'repro', label: 'Reproduction History', icon: Baby, desc: 'Logs of all breeding and fertility events' },
                        { id: 'health', label: 'Health Activity Log', icon: Stethoscope, desc: 'Treatment history and clinical findings' },
                        { id: 'individual', label: 'Individual Cow Dossier', icon: Users, desc: 'Detailed combined history for one animal' }
                      ].map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setSelectedReportType(type.id as ReportType)}
                          className={`flex items-start gap-5 p-6 rounded-[2rem] border transition-all text-left group ${
                            selectedReportType === type.id 
                            ? 'bg-blue-50 border-blue-200 shadow-sm' 
                            : 'bg-white border-slate-100 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`p-3 rounded-2xl transition-colors ${selectedReportType === type.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-blue-600'}`}>
                            <type.icon className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-black text-slate-800 leading-tight mb-1">{type.label}</p>
                            <p className="text-xs text-slate-400 font-bold leading-relaxed">{type.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-7 bg-slate-50/50 p-10 rounded-[3rem] border border-slate-100 space-y-8 h-fit">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
                       <SettingsIcon className="w-4 h-4" /> Configure Parameters
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Start Date</label>
                        <input 
                          type="date" 
                          className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-xs font-black shadow-sm focus:ring-2 focus:ring-blue-500/20"
                          value={reportStartDate}
                          onChange={(e) => setReportStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">End Date</label>
                        <input 
                          type="date" 
                          className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-xs font-black shadow-sm focus:ring-2 focus:ring-blue-500/20"
                          value={reportEndDate}
                          onChange={(e) => setReportEndDate(e.target.value)}
                        />
                      </div>
                    </div>

                    {selectedReportType === 'individual' && (
                      <div className="space-y-2 relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Search Animal *</label>
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Type Tag or Name..." 
                            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-xs font-black shadow-sm focus:ring-2 focus:ring-blue-500/20"
                            value={reportAnimalSearch}
                            onChange={(e) => setReportAnimalSearch(e.target.value)}
                          />
                        </div>
                        {reportSearchAnimals.length > 0 && (
                          <div className="absolute z-10 top-full mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            {reportSearchAnimals.map(a => (
                              <button
                                key={a.id}
                                onClick={() => { setReportAnimalId(a.id); setReportAnimalSearch(a.tag); }}
                                className={`w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors ${reportAnimalId === a.id ? 'bg-blue-50' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${getStatusColor(a.status)}`}>{a.tag.slice(-2)}</div>
                                   <div className="text-left">
                                      <p className="text-xs font-black text-slate-800">{a.tag}</p>
                                      <p className="text-[9px] text-slate-400 uppercase font-bold">{a.breed}</p>
                                   </div>
                                </div>
                                {reportAnimalId === a.id && <Check className="w-4 h-4 text-blue-600" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-6">
                      <button 
                        onClick={executeReportExport}
                        className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                      >
                        <Download className="w-5 h-5" /> Export Selected Report
                      </button>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center mt-6">Report will be downloaded as high-fidelity PDF</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'settings' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto space-y-10">
              <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-6 mb-12">
                  <div className="bg-blue-600 p-4 rounded-[1.5rem] shadow-xl shadow-blue-100">
                    <SettingsIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">System Parameters</h3>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em]">Reproduction Bio-Settings</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Average Gestation (Days)</label>
                    <input 
                      type="number" 
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner focus:ring-2 focus:ring-blue-600/20"
                      value={settings.gestationDays}
                      onChange={(e) => updateSettings({ ...settings, gestationDays: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Preg Check Window (Days)</label>
                    <input 
                      type="number" 
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner focus:ring-2 focus:ring-blue-600/20"
                      value={settings.pregnancyCheckDays}
                      onChange={(e) => updateSettings({ ...settings, pregnancyCheckDays: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="mt-10 space-y-6">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Farm Identity</h4>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Farm Name</label>
                      <input
                        type="text"
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner focus:ring-2 focus:ring-blue-600/20"
                        value={settings.farmName}
                        onChange={(e) => updateSettings({ ...settings, farmName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mt-10 space-y-6">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Status Color Palette</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {([
                        { key: 'active', label: 'Active' },
                        { key: 'pregnant', label: 'Pregnant' },
                        { key: 'sick', label: 'Sick' },
                        { key: 'dry', label: 'Dry' },
                        { key: 'closeup', label: 'Closeup' },
                        { key: 'inProtocol', label: 'In Protocol' },
                        { key: 'inseminated', label: 'Inseminated' },
                        { key: 'lactating', label: 'Lactating' },
                      ] as const).map(({ key, label }) => (
                        <div key={key} className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="w-10 h-10 rounded-xl border-2 border-slate-200 overflow-hidden shadow-inner">
                            <input
                              type="color"
                              className="w-12 h-12 -m-1 cursor-pointer border-none"
                              value={settings.statusColors[key]}
                              onChange={(e) => updateSettings({ ...settings, statusColors: { ...settings.statusColors, [key]: e.target.value } })}
                            />
                          </div>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                <div className="mt-12 pt-10 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-bold italic">Auto-Sync via Firebase</p>
                  <button onClick={() => window.location.reload()} className="flex items-center gap-3 bg-slate-800 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg scale-100 hover:scale-[1.02]">
                    <Save className="w-5 h-5" /> Sync Data
                  </button>
                </div>
                {/* Group Management */}
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Herd Group Management</h4>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="New group name (e.g. Elite A)"
                        className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner focus:ring-2 focus:ring-blue-600/20"
                        value={newGroupName}
                        onChange={e => setNewGroupName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newGroupName.trim()) {
                            e.preventDefault();
                            const groups = settings.customGroups || [];
                            if (!groups.includes(newGroupName.trim())) {
                              updateSettings({ ...settings, customGroups: [...groups, newGroupName.trim()] });
                            }
                            setNewGroupName('');
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newGroupName.trim()) {
                            const groups = settings.customGroups || [];
                            if (!groups.includes(newGroupName.trim())) {
                              updateSettings({ ...settings, customGroups: [...groups, newGroupName.trim()] });
                            }
                            setNewGroupName('');
                          }
                        }}
                        className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-blue-700 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(settings.customGroups || []).map(group => (
                        <div key={group} className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-xs font-black text-slate-700">{group}</span>
                          <button
                            onClick={() => updateSettings({ ...settings, customGroups: (settings.customGroups || []).filter(g => g !== group) })}
                            className="text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {(!settings.customGroups || settings.customGroups.length === 0) && (
                        <p className="text-xs text-slate-300 font-bold italic">No custom groups yet. Add one above.</p>
                      )}
                    </div>
                  </div>
                </div>
                {/* Backup & Restore */}
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 mt-6">
                  <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-3">Backup & Restore</h4>
                  <p className="text-[10px] text-emerald-600 font-bold mb-4">Download or restore a full JSON backup of your farm data.</p>
                  <div className="flex gap-3 flex-wrap">
                    <button onClick={exportBackup} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md">
                      <Download className="w-4 h-4" /> Export Backup
                    </button>
                    <label className="flex items-center gap-2 bg-white border border-emerald-200 text-emerald-700 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm cursor-pointer">
                      <Upload className="w-4 h-4" /> Restore from File
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const text = await file.text();
                          try {
                            const data = JSON.parse(text);
                            if (confirm(`Restore backup from "${file.name}"? This will overwrite all current data.`)) {
                              const { storageService } = await import('./services/storage');
                              if (data.animals) await storageService.saveAnimals(data.animals);
                              if (data.reproEvents) await storageService.saveReproEvents(data.reproEvents);
                              if (data.healthEvents) await storageService.saveHealthEvents(data.healthEvents);
                              if (data.enrollments) await storageService.saveEnrollments(data.enrollments);
                              if (data.customProtocols) await storageService.saveCustomProtocols(data.customProtocols);
                              if (data.vaccinations) await storageService.saveVaccinations(data.vaccinations);
                              if (data.settings) await storageService.saveSettings(data.settings);
                              alert('Backup restored successfully! Reloading...');
                              window.location.reload();
                            }
                          } catch {
                            alert('Invalid backup file. Please use a valid JSON export.');
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ====== ALERT PANEL SLIDE-IN ====== */}
      {isAlertPanelOpen && (
        <div className="fixed inset-0 z-[180] flex justify-end" onClick={() => setIsAlertPanelOpen(false)}>
          <div 
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right-8 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Alert Center</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{alerts.length} Active Notifications</p>
                </div>
              </div>
              <button onClick={() => setIsAlertPanelOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Alert Categories */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 opacity-40">
                  <CheckCircle2 className="w-20 h-20 text-slate-200 mb-4" />
                  <p className="text-sm text-slate-400 font-black tracking-widest uppercase">All Clear</p>
                  <p className="text-xs text-slate-300 font-bold mt-2">No active alerts</p>
                </div>
              ) : (
                (['Protocol', 'Health', 'Repro', 'Vaccination', 'System'] as const).map(category => {
                  const catAlerts = alerts.filter(a => a.type === category);
                  if (catAlerts.length === 0) return null;
                  const catConfig = {
                    Protocol: { color: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', label: '🧪 Protocol Lab' },
                    Health: { color: 'bg-rose-50 border-rose-200', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500', label: '🩺 Health Bay' },
                    Repro: { color: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', label: '🐄 Reproduction' },
                    Vaccination: { color: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', label: '💉 Vaccination' },
                    System: { color: 'bg-slate-50 border-slate-200', badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500', label: '⚙️ System' },
                  }[category];
                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-2 h-2 rounded-full ${catConfig.dot}`}></div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{catConfig.label}</h4>
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-black ${catConfig.badge}`}>{catAlerts.length}</span>
                      </div>
                      <div className="space-y-3">
                        {catAlerts.map(alert => (
                          <div key={alert.id} className={`p-5 rounded-[1.5rem] border ${catConfig.color} transition-all hover:shadow-md`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${alert.priority === 'High' ? 'bg-rose-500' : 'bg-amber-400'}`}></span>
                                  <p className="text-sm font-black text-slate-800 truncate">{alert.title}</p>
                                </div>
                                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-2">{alert.description}</p>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-slate-100 shadow-sm">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase">{alert.dueDate}</span>
                                  </div>
                                  {alert.priority === 'High' && (
                                    <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[9px] font-black rounded-full uppercase tracking-wider">Urgent</span>
                                  )}
                                </div>
                              </div>
                              {alert.animalId && (
                                <button
                                  onClick={() => { setSelectedAnimal(animals.find(a => a.id === alert.animalId) || null); setIsAlertPanelOpen(false); }}
                                  className="flex-shrink-0 p-2 bg-white rounded-xl hover:bg-blue-50 hover:text-blue-600 text-slate-400 transition-all border border-slate-100 shadow-sm"
                                  title="View Animal"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Panel Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={() => { setView('dashboard'); setIsAlertPanelOpen(false); }}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
              >
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animal Detail Modal (Profile) */}
      {selectedAnimal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-[4rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in slide-in-from-bottom-10 duration-500">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-blue-600 font-black text-3xl border border-slate-100 shadow-inner">
                  {selectedAnimal.tag.slice(-2)}
                </div>
                <div>
                  <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{selectedAnimal.tag}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em]">{selectedAnimal.name || 'Anonymous Profile'}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    const repros = reproEvents.filter(e => e.animalId === selectedAnimal.id)
                      .filter(e => (!animalReportStart || e.date >= animalReportStart) && (!animalReportEnd || e.date <= animalReportEnd));
                    const healths = healthEvents.filter(e => e.animalId === selectedAnimal.id)
                      .filter(e => (!animalReportStart || e.date >= animalReportStart) && (!animalReportEnd || e.date <= animalReportEnd));
                    const label = (animalReportStart || animalReportEnd) 
                      ? `${animalReportStart || 'Start'} to ${animalReportEnd || 'End'}` 
                      : 'Full History';
                    generateIndividualAnimalReport(selectedAnimal, repros, healths, label, settings);
                  }} 
                  className="p-5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-[1.5rem] transition-all"
                  title="Download Filtered Report"
                >
                  <Download className="w-7 h-7" />
                </button>
                <button onClick={() => setSelectedAnimal(null)} className="p-5 hover:bg-slate-100 rounded-[1.5rem] transition-all text-slate-400">
                  <X className="w-8 h-8" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-12">
              <div className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100/50 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                   <Filter className="w-5 h-5 text-blue-600" />
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Report Parameter Selection</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filter From Date</label>
                     <input 
                       type="date"
                       className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                       value={animalReportStart}
                       onChange={(e) => setAnimalReportStart(e.target.value)}
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filter To Date</label>
                     <input 
                       type="date"
                       className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                       value={animalReportEnd}
                       onChange={(e) => setAnimalReportEnd(e.target.value)}
                     />
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Life Status</p>
                  <p className={`text-sm font-black uppercase inline-block px-3 py-1 rounded-lg border ${getStatusColor(selectedAnimal.status)}`}>{selectedAnimal.status}</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Genetic Breed</p>
                  <p className="text-lg font-black text-slate-800">{selectedAnimal.breed}</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Age Context</p>
                  <p className="text-lg font-black text-slate-800">{dateUtils.diffDays(new Date().toISOString().split('T')[0], selectedAnimal.dob)} Days</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Herd Assigned</p>
                  <p className="text-lg font-black text-slate-800">{selectedAnimal.herd}</p>
                </div>
              </div>

              <div className="space-y-8">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                  <CalendarRange className="w-6 h-6 text-blue-500" /> Lifecycle Chronology
                </h4>
                <div className="space-y-4">
                  {reproEvents.filter(e => e.animalId === selectedAnimal.id)
                    .filter(e => (!animalReportStart || e.date >= animalReportStart) && (!animalReportEnd || e.date <= animalReportEnd))
                    .map(e => (
                    <div key={e.id} className="flex items-center gap-6 p-6 rounded-[2rem] border border-slate-100 bg-white hover:bg-slate-50 transition-all shadow-sm">
                      <div className="p-4 rounded-2xl bg-slate-50 text-slate-400 transition-all">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                           <p className="text-base font-black text-slate-800">{e.type}</p>
                           <button onClick={(event) => handleEditRepro(e, event)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600">
                             <Edit2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold">{e.details}</p>
                        <div className="flex gap-4 mt-2">
                           {e.technician && <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">Tech: {e.technician}</span>}
                           {e.semenName && <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-md">Semen: {e.semenName}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">{e.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-8 border-t border-slate-100 bg-white flex gap-4 flex-wrap">
              <button 
                onClick={() => { setEditingReproId(null); setNewRepro({ type: ReproEventType.ESTRUS, date: new Date().toISOString().split('T')[0], animalId: selectedAnimal.id }); setReproAnimalSearch(selectedAnimal.tag); setIsReproFormOpen(true); setSelectedAnimal(null); }}
                className="flex-1 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
              >
                Log Repro Event
              </button>
              <button 
                onClick={() => { setEditingHealthId(null); setNewHealth({ type: HealthEventType.ILLNESS, date: new Date().toISOString().split('T')[0], animalId: selectedAnimal.id, treatments: [{name: '', dose: ''}] }); setHealthAnimalSearch(selectedAnimal.tag); setIsHealthFormOpen(true); setSelectedAnimal(null); }}
                className="flex-1 py-4 bg-rose-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-700 transition-all shadow-xl shadow-rose-100"
              >
                Log Health Issue
              </button>
              <button 
                onClick={(e) => handleDeleteAnimal(selectedAnimal, e)}
                className="py-4 px-6 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-50 hover:text-rose-600 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forms Modals */}
      <FormModal title={editingAnimalId ? "Edit Animal Record" : "Add New Animal"} isOpen={isAnimalFormOpen} onClose={() => setIsAnimalFormOpen(false)}>
        <form onSubmit={handleAddAnimal} className="space-y-6">
          {/* Calf Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Register as Calf</p>
              <p className="text-[10px] text-slate-400 font-bold">Enable for newborn/young animals</p>
            </div>
            <button
              type="button"
              onClick={() => setNewAnimal({...newAnimal, isCalf: !newAnimal.isCalf})}
              className={`w-14 h-7 rounded-full transition-all duration-300 relative flex-shrink-0 ${newAnimal.isCalf ? 'bg-emerald-500' : 'bg-slate-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 transition-all duration-300 ${newAnimal.isCalf ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tag Identifier *</label>
              <input required className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" placeholder="e.g. COW-701" value={newAnimal.tag || ''} onChange={e => setNewAnimal({...newAnimal, tag: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Breed</label>
              <input className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" placeholder="e.g. Jersey" value={newAnimal.breed || ''} onChange={e => setNewAnimal({...newAnimal, breed: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* DOB only for calves */}
            {newAnimal.isCalf && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth</label>
                <input type="date" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" value={newAnimal.dob || ''} onChange={e => setNewAnimal({...newAnimal, dob: e.target.value})} />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sex</label>
              <select className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" value={newAnimal.sex || 'Female'} onChange={e => setNewAnimal({...newAnimal, sex: e.target.value as any})}>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Herd / Group</label>
            <select
              className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner"
              value={newAnimal.herd || ''}
              onChange={e => setNewAnimal({...newAnimal, herd: e.target.value})}
            >
              <option value="">Select group...</option>
              {(settings.customGroups || ['Main Herd', 'Elite', 'High Group', 'Medium Group', 'Heifers', 'Breeding']).map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          {/* Lactating Checkbox (females only) */}
          {(newAnimal.sex === 'Female' || !newAnimal.sex) && !newAnimal.isCalf && (
            <div className="flex items-center justify-between p-4 bg-pink-50 rounded-2xl border border-pink-100">
              <div>
                <p className="text-xs font-black text-pink-700 uppercase tracking-widest">Currently Lactating</p>
                <p className="text-[10px] text-pink-400 font-bold">Mark if this cow is actively producing milk</p>
              </div>
              <button
                type="button"
                onClick={() => setNewAnimal({...newAnimal, isLactating: !newAnimal.isLactating})}
                className={`w-14 h-7 rounded-full transition-all duration-300 relative flex-shrink-0 ${newAnimal.isLactating ? 'bg-pink-500' : 'bg-slate-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 transition-all duration-300 ${newAnimal.isLactating ? 'left-8' : 'left-1'}`} />
              </button>
            </div>
          )}
          <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 mt-4">
             {editingAnimalId ? "Save Changes" : "Complete Registration"}
          </button>
        </form>
      </FormModal>

      <FormModal title={editingReproId ? "Modify Repro Record" : "Log Repro Event"} isOpen={isReproFormOpen} onClose={() => { setIsReproFormOpen(false); setReproAnimalSearch(''); }}>
        <form onSubmit={handleAddRepro} className="space-y-6">
          {/* Cow Tag Searchable Autocomplete */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cow Tag *</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                required={!newRepro.animalId}
                placeholder="Search and select cow..."
                className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-500/20"
                value={reproAnimalSearch}
                onChange={e => { setReproAnimalSearch(e.target.value); setReproAnimalDropdown(true); if(!e.target.value) setNewRepro({...newRepro, animalId: ''}); }}
                onFocus={() => setReproAnimalDropdown(true)}
                disabled={!!editingReproId}
              />
              {newRepro.animalId && <CheckCircle2 className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" />}
            </div>
            {reproAnimalDropdown && reproAnimalSearch && !editingReproId && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                {animals.filter(a => a.tag.toLowerCase().includes(reproAnimalSearch.toLowerCase()) || (a.name && a.name.toLowerCase().includes(reproAnimalSearch.toLowerCase()))).slice(0, 8).map(a => (
                  <button key={a.id} type="button"
                    onClick={() => { setNewRepro({...newRepro, animalId: a.id}); setReproAnimalSearch(a.tag); setReproAnimalDropdown(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left ${newRepro.animalId === a.id ? 'bg-blue-50' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-black text-slate-800">{a.tag}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{a.status} • {a.breed}</p>
                    </div>
                    {newRepro.animalId === a.id && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
                {animals.filter(a => a.tag.toLowerCase().includes(reproAnimalSearch.toLowerCase())).length === 0 && (
                  <p className="text-center py-4 text-xs text-slate-400 font-bold">No animals found</p>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <select className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" value={newRepro.type || ReproEventType.ESTRUS} onChange={e => setNewRepro({...newRepro, type: e.target.value as any})}>
              {Object.values(ReproEventType).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="date" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" value={newRepro.date || ''} onChange={e => setNewRepro({...newRepro, date: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Technician Name</label>
              <input className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" placeholder="Dr. Smith" value={newRepro.technician || ''} onChange={e => setNewRepro({...newRepro, technician: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semen / Bull Name</label>
              <input className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" placeholder="Bull ID or Semen Code" value={newRepro.semenName || ''} onChange={e => setNewRepro({...newRepro, semenName: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={() => setNewRepro({...newRepro, success: true})} className={`flex-1 py-4 rounded-2xl font-black text-[10px] tracking-widest ${newRepro.success === true ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>SUCCESS</button>
            <button type="button" onClick={() => setNewRepro({...newRepro, success: false})} className={`flex-1 py-4 rounded-2xl font-black text-[10px] tracking-widest ${newRepro.success === false ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>FAILED</button>
          </div>
          <textarea className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" placeholder="Field notes..." value={newRepro.details || ''} onChange={e => setNewRepro({...newRepro, details: e.target.value})} />
          {newRepro.type === ReproEventType.CALVING && (
            <div className="space-y-4 p-5 bg-emerald-50 rounded-2xl border border-emerald-200">
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">🐄 Calf Details (auto-added to herd)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calf Tag *</label>
                  <input className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm font-black shadow-inner" placeholder="e.g. CALF-001" value={newRepro.offspringTag || ''} onChange={e => setNewRepro({...newRepro, offspringTag: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calf Sex</label>
                  <select className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm font-black shadow-inner" value={newRepro.offspringGender || 'Female'} onChange={e => setNewRepro({...newRepro, offspringGender: e.target.value as any})}>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Father (Bull / Semen ID)</label>
                <input className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm font-black shadow-inner" placeholder="Bull ID or Semen name" value={newRepro.bullId || ''} onChange={e => setNewRepro({...newRepro, bullId: e.target.value})} />
              </div>
            </div>
          )}
          <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest">
            {editingReproId ? "Update Record" : "Persist Record"}
          </button>
        </form>
      </FormModal>

      <FormModal title="Protocol Enrollment" isOpen={isEnrollmentFormOpen} onClose={() => setIsEnrollmentFormOpen(false)}>
        <form onSubmit={handleAddEnrollment} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search tag or breed..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold shadow-inner"
                value={protocolAnimalSearch}
                onChange={(e) => setProtocolAnimalSearch(e.target.value)}
              />
            </div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enroll Animals (Select Multiple) *</label>
            <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-[1.5rem] p-4 bg-slate-50 space-y-1">
              {protocolEligibleAnimals.map(a => (
                <label key={a.id} className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer group ${newEnrollment.animalIds?.includes(a.id) ? 'bg-white shadow-sm' : 'hover:bg-slate-100/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${newEnrollment.animalIds?.includes(a.id) ? 'bg-amber-500 border-amber-500' : 'bg-white border-slate-200'}`}>
                       {newEnrollment.animalIds?.includes(a.id) && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{a.tag}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{a.breed}</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden"
                    checked={newEnrollment.animalIds?.includes(a.id)}
                    onChange={(e) => {
                      const ids = newEnrollment.animalIds || [];
                      if (e.target.checked) {
                        setNewEnrollment({...newEnrollment, animalIds: [...ids, a.id]});
                      } else {
                        setNewEnrollment({...newEnrollment, animalIds: ids.filter(id => id !== a.id)});
                      }
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
          <select required className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" value={newEnrollment.templateId || ''} onChange={e => setNewEnrollment({...newEnrollment, templateId: e.target.value})}>
            <option value="">Select Protocol Template...</option>
            {protocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" value={newEnrollment.startDate || ''} onChange={e => setNewEnrollment({...newEnrollment, startDate: e.target.value})} />
          <button type="submit" disabled={!newEnrollment.animalIds?.length || !newEnrollment.templateId} className="w-full py-5 bg-amber-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-100 disabled:opacity-50 transition-all">
             Authorize Batch Start
          </button>
        </form>
      </FormModal>

      <FormModal title="Create Manual Protocol" isOpen={isTemplateFormOpen} onClose={() => setIsTemplateFormOpen(false)}>
        <form onSubmit={handleAddTemplate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Name *</label>
            <input required className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" placeholder="e.g. My Custom Heat Synch" value={newTemplate.name || ''} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workflow Steps</label>
            <button type="button" onClick={() => setNewTemplate({...newTemplate, steps: [...(newTemplate.steps || []), { dayOffset: 0, action: '', isAI: false, time: '08:00' }]})} className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:underline mb-2">
              <Plus className="w-3 h-3" /> Add Step
            </button>
            <div className="space-y-3">
               {newTemplate.steps?.map((step, idx) => (
                 <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative group">
                    <button type="button" onClick={() => setNewTemplate({...newTemplate, steps: newTemplate.steps?.filter((_, i) => i !== idx)})} className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                       <input type="number" required placeholder="Day" className="px-3 py-2 bg-white rounded-lg text-xs font-bold border border-slate-100" value={step.dayOffset} onChange={e => {
                         const steps = [...(newTemplate.steps || [])];
                         steps[idx].dayOffset = parseInt(e.target.value) || 0;
                         setNewTemplate({...newTemplate, steps});
                       }} />
                       <input type="time" required className="px-3 py-2 bg-white rounded-lg text-xs font-bold border border-slate-100" value={step.time || '08:00'} onChange={e => {
                         const steps = [...(newTemplate.steps || [])];
                         steps[idx].time = e.target.value;
                         setNewTemplate({...newTemplate, steps});
                       }} />
                    </div>
                    <input required placeholder="Action (e.g. GnRH Injection)" className="w-full px-3 py-2 bg-white rounded-lg text-xs font-bold border border-slate-100" value={step.action} onChange={e => {
                      const steps = [...(newTemplate.steps || [])];
                      steps[idx].action = e.target.value;
                      setNewTemplate({...newTemplate, steps});
                    }} />
                    <label className="flex items-center gap-2 cursor-pointer">
                       <input type="checkbox" checked={step.isAI} onChange={e => {
                         const steps = [...(newTemplate.steps || [])];
                         steps[idx].isAI = e.target.checked;
                         setNewTemplate({...newTemplate, steps});
                       }} />
                       <span className="text-[10px] font-black text-slate-500 uppercase">Triggers Insemination Log</span>
                    </label>
                 </div>
               ))}
            </div>
          </div>
          <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100">
             Save Protocol Template
          </button>
        </form>
      </FormModal>

      <FormModal title={editingHealthId ? "Edit Clinical Record" : "Clinical Discovery"} isOpen={isHealthFormOpen} onClose={() => { setIsHealthFormOpen(false); setHealthAnimalSearch(''); }}>
        <form onSubmit={handleAddHealth} className="space-y-6">
          {/* Patient Tag Searchable Autocomplete */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Cow Tag *</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                required={!newHealth.animalId}
                placeholder="Search and select patient..."
                className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20"
                value={healthAnimalSearch}
                onChange={e => { setHealthAnimalSearch(e.target.value); setHealthAnimalDropdown(true); if(!e.target.value) setNewHealth({...newHealth, animalId: ''}); }}
                onFocus={() => setHealthAnimalDropdown(true)}
                disabled={!!editingHealthId}
              />
              {newHealth.animalId && <CheckCircle2 className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" />}
            </div>
            {healthAnimalDropdown && healthAnimalSearch && !editingHealthId && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                {animals.filter(a => a.tag.toLowerCase().includes(healthAnimalSearch.toLowerCase()) || (a.name && a.name.toLowerCase().includes(healthAnimalSearch.toLowerCase()))).slice(0, 8).map(a => (
                  <button key={a.id} type="button"
                    onClick={() => { setNewHealth({...newHealth, animalId: a.id}); setHealthAnimalSearch(a.tag); setHealthAnimalDropdown(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left ${newHealth.animalId === a.id ? 'bg-rose-50' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-black text-slate-800">{a.tag}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{a.status} • {a.breed}</p>
                    </div>
                    {newHealth.animalId === a.id && <Check className="w-4 h-4 text-rose-600" />}
                  </button>
                ))}
                {animals.filter(a => a.tag.toLowerCase().includes(healthAnimalSearch.toLowerCase())).length === 0 && (
                  <p className="text-center py-4 text-xs text-slate-400 font-bold">No animals found</p>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <select className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" value={newHealth.type || HealthEventType.ILLNESS} onChange={e => setNewHealth({...newHealth, type: e.target.value as any})}>
              {Object.values(HealthEventType).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="date" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" value={newHealth.date || ''} onChange={e => setNewHealth({...newHealth, date: e.target.value})} />
          </div>
          <input className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" placeholder="Technician / Veterinarian" value={newHealth.technician || ''} onChange={e => setNewHealth({...newHealth, technician: e.target.value})} />
          <div className="space-y-3 p-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm">
            <div className="flex items-center justify-between pl-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Treatments & Injections</label>
              <button 
                type="button" 
                onClick={() => {
                  const currentTreatments = newHealth.treatments || [];
                  setNewHealth({...newHealth, treatments: [...currentTreatments, {name: '', dose: ''}]});
                }}
                className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl uppercase tracking-widest hover:bg-blue-100 transition-colors"
              >
                + Add Medicine
              </button>
            </div>
            {(!newHealth.treatments || newHealth.treatments.length === 0) && (
               <div className="grid grid-cols-2 gap-4">
                 <input className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold shadow-inner" placeholder="Medication (Optional)" value={newHealth.medication || ''} onChange={e => setNewHealth({...newHealth, medication: e.target.value})} />
                 <input className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold shadow-inner" placeholder="Dosage" value={newHealth.dosage || ''} onChange={e => setNewHealth({...newHealth, dosage: e.target.value})} />
               </div>
            )}
            {newHealth.treatments?.map((treatment: any, idx: number) => (
              <div key={idx} className="flex gap-2 relative group">
                 <input className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold shadow-inner focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="Injection / Medication Name" value={treatment.name} onChange={e => {
                   const t = [...(newHealth.treatments || [])];
                   t[idx].name = e.target.value;
                   setNewHealth({...newHealth, treatments: t});
                 }} />
                 <input className="w-1/3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold shadow-inner focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="Dosage (e.g. 5ml)" value={treatment.dose} onChange={e => {
                   const t = [...(newHealth.treatments || [])];
                   t[idx].dose = e.target.value;
                   setNewHealth({...newHealth, treatments: t});
                 }} />
                 {(newHealth.treatments && newHealth.treatments.length > 1) && (
                   <button type="button" onClick={() => {
                     const t = [...(newHealth.treatments || [])];
                     t.splice(idx, 1);
                     setNewHealth({...newHealth, treatments: t});
                   }} className="w-10 flex-shrink-0 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                     <Trash2 className="w-4 h-4" />
                   </button>
                 )}
              </div>
            ))}
          </div>
          <textarea className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" rows={3} placeholder="Clinical symptoms..." value={newHealth.details || ''} onChange={e => setNewHealth({...newHealth, details: e.target.value})} />
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Treatment Duration (Days)</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 5 (for 5-day treatment reminders)"
              className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner"
              value={newHealth.treatmentDays || ''}
              onChange={e => setNewHealth({...newHealth, treatmentDays: e.target.value ? parseInt(e.target.value) : undefined})}
            />
            <p className="text-[10px] text-slate-400 font-bold px-1">Daily alerts will fire for each day of treatment</p>
          </div>
          <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl space-y-4">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">💉 Multi-Dose Protocol (Optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Number of Doses</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 3"
                  className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm font-black shadow-inner"
                  value={newHealth.numberOfDoses || ''}
                  onChange={e => setNewHealth({...newHealth, numberOfDoses: e.target.value ? parseInt(e.target.value) : undefined})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Days Between Doses</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 2"
                  className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm font-black shadow-inner"
                  value={newHealth.daysGap || ''}
                  onChange={e => setNewHealth({...newHealth, daysGap: e.target.value ? parseInt(e.target.value) : undefined})}
                />
              </div>
            </div>
            <p className="text-[9px] text-amber-600 font-bold">System will create dose reminder alerts automatically</p>
          </div>
          <button type="submit" className="w-full py-5 bg-rose-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-100">
             {editingHealthId ? "Save Changes" : "Save Clinical Record"}
          </button>
        </form>
      </FormModal>

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">Confirm Delete</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 font-semibold leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDialog(d => ({ ...d, isOpen: false }))} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">
                Cancel
              </button>
              <button onClick={confirmDialog.onConfirm} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pregnancy Check Modal */}
      {isPregnancyCheckModalOpen && pregnancyCheckTarget && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-100 bg-blue-50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-800">Pregnancy Check</h3>
                <p className="text-xs text-blue-600 font-black uppercase tracking-widest mt-1">{pregnancyCheckTarget.tag}</p>
              </div>
              <button onClick={() => setIsPregnancyCheckModalOpen(false)} className="p-3 hover:bg-blue-100 rounded-2xl transition-all">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-sm text-slate-600 font-semibold">Select the result of today's pregnancy examination:</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setPregnancyCheckResult('Pregnant')}
                  className={`p-6 rounded-2xl border-2 font-black text-sm uppercase tracking-wider transition-all ${
                    pregnancyCheckResult === 'Pregnant' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl shadow-emerald-100' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                  }`}
                >
                  ✓ Pregnant
                </button>
                <button
                  onClick={() => setPregnancyCheckResult('Non-Pregnant')}
                  className={`p-6 rounded-2xl border-2 font-black text-sm uppercase tracking-wider transition-all ${
                    pregnancyCheckResult === 'Non-Pregnant' ? 'bg-rose-600 text-white border-rose-600 shadow-xl shadow-rose-100' : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
                  }`}
                >
                  ✗ Open
                </button>
              </div>
              <button
                onClick={handlePregnancyCheck}
                disabled={!pregnancyCheckResult}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-40"
              >
                Confirm &amp; Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-inter">
        <Activity className="w-16 h-16 text-blue-600 animate-pulse mb-6" />
        <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Connecting...</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 bg-[url('https://images.unsplash.com/photo-1596700810165-22d71625d033?auto=format&fit=crop&q=80')] bg-cover bg-center font-inter">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
        <div className="relative z-10 bg-white w-full max-w-md p-10 rounded-[3rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-100">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tighter">Asad's<span className="text-blue-600">Farm</span></h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Management</p>
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-slate-800 mb-6">{isLoginMode ? 'Welcome Back' : 'Create Account'}</h2>
          
          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl mb-6 text-sm font-bold border border-rose-100 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                placeholder="operative@farm.com"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="w-full py-4 mt-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200 transition-all">
              {isLoginMode ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm font-bold text-slate-500">
            {isLoginMode ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}
              className="text-blue-600 hover:text-blue-700 underline underline-offset-4"
            >
              {isLoginMode ? 'Sign Up' : 'Log In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <MainApp user={user} onLogout={handleLogout} />;
}
