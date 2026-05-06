
import { 
  Animal, 
  ReproductionEvent, 
  HealthEvent, 
  AnimalStatus, 
  ReproEventType, 
  HealthEventType,
  Alert,
  FarmSettings,
  ProtocolEnrollment,
  ProtocolTemplate,
  VaccinationRecord
} from '../types';

export const dateUtils = {
  addDays: (dateStr: string, days: number) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  },
  diffDays: (d1: string, d2: string) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
  },
  isTodayOrPast: (dateStr: string) => {
    return new Date(dateStr) <= new Date();
  },
  isSameDay: (d1: string, d2: string) => {
    return d1 === d2;
  },
  today: () => new Date().toISOString().split('T')[0]
};

/**
 * Deterministic State Machine
 * Calculates the current status of an animal based on its event history and farm settings.
 */
export const computeAnimalStatus = (
  animal: Animal,
  reproEvents: ReproductionEvent[],
  healthEvents: HealthEvent[],
  enrollments: ProtocolEnrollment[],
  settings: FarmSettings
): { status: AnimalStatus; expectedCalving?: string; activeProtocol?: ProtocolEnrollment } => {
  const today = dateUtils.today();
  
  // 1. Check Health (Sick status overrides Repro status)
  const sortedHealth = [...healthEvents]
    .filter(e => e.animalId === animal.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  
  const latestHealth = sortedHealth[0];
  if (latestHealth && latestHealth.type === HealthEventType.ILLNESS) {
    // Check if within treatment period
    if (latestHealth.treatmentDays) {
      const endDate = dateUtils.addDays(latestHealth.date, latestHealth.treatmentDays);
      if (today <= endDate) {
        return { status: AnimalStatus.SICK };
      }
    } else {
      return { status: AnimalStatus.SICK };
    }
  }

  // 2. Check Active Protocols (Overrides standard repro status)
  const activeEnrollment = enrollments.find(e => e.animalIds?.includes(animal.id) && e.status === 'Active');
  if (activeEnrollment) {
    return { status: AnimalStatus.IN_PROTOCOL, activeProtocol: activeEnrollment };
  }

  // 3. Check Repro Cycle
  const sortedRepro = [...reproEvents]
    .filter(e => e.animalId === animal.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const latest = sortedRepro[0];
  // If no repro events and animal is manually marked as Lactating, use that flag
  if (!latest) {
    return animal.isLactating ? { status: AnimalStatus.LACTATING } : { status: AnimalStatus.ACTIVE };
  }

  switch (latest.type) {
    case ReproEventType.INSEMINATION:
      return { status: AnimalStatus.INSEMINATED };
    
    case ReproEventType.PREGNANCY_CHECK:
      if (latest.success && latest.pregnancyResult !== 'Non-Pregnant') {
        const lastInsem = sortedRepro.find(e => e.type === ReproEventType.INSEMINATION && e.date <= latest.date);
        const expectedCalving = lastInsem ? dateUtils.addDays(lastInsem.date, settings.gestationDays) : undefined;
        
        if (expectedCalving) {
          const daysToCalving = dateUtils.diffDays(expectedCalving, today);
          if (daysToCalving <= settings.closeupDays) return { status: AnimalStatus.CLOSEUP, expectedCalving };
        }
        return { status: AnimalStatus.PREGNANT, expectedCalving };
      }
      return { status: AnimalStatus.ACTIVE };

    case ReproEventType.CALVING:
      return { status: AnimalStatus.LACTATING };

    case ReproEventType.DRY_OFF:
      return { status: AnimalStatus.DRY };

    case ReproEventType.ABORTION:
      return { status: AnimalStatus.ACTIVE };

    default:
      return { status: AnimalStatus.ACTIVE };
  }
};

export const generateAlerts = (
  animals: Animal[],
  reproEvents: ReproductionEvent[],
  healthEvents: HealthEvent[],
  enrollments: ProtocolEnrollment[],
  templates: ProtocolTemplate[],
  settings: FarmSettings,
  vaccinations: VaccinationRecord[] = []
): Alert[] => {
  const alerts: Alert[] = [];
  const today = dateUtils.today();

  // Protocol Alerts - Grouped by protocol template step (not per individual animal)
  const protocolAlertMap: Record<string, { animals: string[], stepDate: string, daysUntil: number, stepAction: string, stepDay: number, templateName: string, stepTime?: string }> = {};

  animals.forEach(animal => {
    const animalRepro = reproEvents.filter(e => e.animalId === animal.id).sort((a, b) => b.date.localeCompare(a.date));
    const { status, expectedCalving, activeProtocol } = computeAnimalStatus(animal, reproEvents, healthEvents, enrollments, settings);

    if (activeProtocol) {
      const template = templates.find(t => t.id === activeProtocol.templateId);
      if (template) {
        template.steps.forEach((step, idx) => {
          if (activeProtocol.completedStepIndices.includes(idx)) return;
          const stepDate = dateUtils.addDays(activeProtocol.startDate, step.dayOffset);
          const daysUntil = dateUtils.diffDays(stepDate, today);
          if (daysUntil <= 3) {
            const key = `${activeProtocol.id}-step-${idx}-${stepDate}`;
            if (!protocolAlertMap[key]) {
              protocolAlertMap[key] = { animals: [], stepDate, daysUntil, stepAction: step.action, stepDay: step.dayOffset, templateName: template.name, stepTime: step.time };
            }
            // Add all animals in this group to the alert
            activeProtocol.animalIds?.forEach(id => {
              const a = animals.find(anim => anim.id === id);
              if (a && !protocolAlertMap[key].animals.includes(a.tag)) {
                protocolAlertMap[key].animals.push(a.tag);
              }
            });
          }
        });
      }
    }

    // Pregnancy Check Alert - inseminated animals approaching check window
    if (status === AnimalStatus.INSEMINATED) {
      const lastInsem = animalRepro[0];
      const daysSince = dateUtils.diffDays(today, lastInsem.date);
      if (daysSince >= settings.pregnancyCheckDays - 7) {
        alerts.push({
          id: `alert-check-${animal.id}`,
          type: 'Repro',
          title: daysSince >= settings.pregnancyCheckDays ? 'Pregnancy Check OVERDUE' : 'Pregnancy Check Required',
          description: `${animal.tag} has been inseminated for ${daysSince} days. Pregnancy check due.`,
          dueDate: dateUtils.addDays(lastInsem.date, settings.pregnancyCheckDays),
          animalId: animal.id,
          priority: daysSince >= settings.pregnancyCheckDays ? 'High' : 'Medium'
        });
      }
    }

    // Heat Cycle Alert (21-day cycle check after Estrus or Insemination)
    {
      const lastHeat = animalRepro.find(e => e.type === ReproEventType.ESTRUS || e.type === ReproEventType.INSEMINATION);
      if (lastHeat && status === AnimalStatus.ACTIVE) {
        const daysSince = dateUtils.diffDays(today, lastHeat.date);
        const nextHeatDue = settings.estrusCycleDays || 21;
        if (daysSince >= nextHeatDue - 2 && daysSince <= nextHeatDue + 5) {
          alerts.push({
            id: `alert-heat-${animal.id}`,
            type: 'Repro',
            title: daysSince >= nextHeatDue ? 'Heat Check Due' : `Heat Check in ${nextHeatDue - daysSince} days`,
            description: `${animal.tag}: ${nextHeatDue}-day heat cycle check. Last event: ${lastHeat.type} on ${lastHeat.date}.`,
            dueDate: dateUtils.addDays(lastHeat.date, nextHeatDue),
            animalId: animal.id,
            priority: daysSince >= nextHeatDue ? 'High' : 'Medium',
          });
        }
      }
    }

    // Upcoming Calving Alert
    if (expectedCalving) {
      const daysLeft = dateUtils.diffDays(expectedCalving, today);
      if (daysLeft <= settings.closeupDays && daysLeft > -30) { // Keep alert active for 30 days past due if not logged
        alerts.push({
          id: `alert-calving-${animal.id}`,
          type: 'Repro',
          title: daysLeft < 0 ? 'Calving OVERDUE' : 'Upcoming Calving',
          description: daysLeft < 0 ? `${animal.tag} is overdue for calving by ${Math.abs(daysLeft)} days.` : `${animal.tag} is in closeup. Expected calving in ${daysLeft} days.`,
          dueDate: expectedCalving,
          animalId: animal.id,
          priority: 'High'
        });
      }
    }

    // Health Treatment Reminders
    const animalHealth = healthEvents
      .filter(e => e.animalId === animal.id && e.treatmentDays)
      .sort((a, b) => b.date.localeCompare(a.date));
    
    animalHealth.forEach(event => {
      if (!event.treatmentDays) return;
      const endDate = dateUtils.addDays(event.date, event.treatmentDays);
      const daysInto = dateUtils.diffDays(today, event.date);
      const daysLeft = dateUtils.diffDays(endDate, today);
      if (daysInto >= 0 && daysLeft >= -7) { // keep alert for 7 days if missed
        alerts.push({
          id: `health-treat-${event.id}-${today}`,
          type: 'Health',
          title: daysLeft < 0 ? 'Treatment Missed/Overdue' : 'Treatment Reminder',
          description: `${animal.tag}: Day ${daysInto + 1}/${event.treatmentDays} — ${event.medication || event.details} (${daysLeft < 0 ? 'Overdue' : `${daysLeft} days remaining`})`,
          dueDate: endDate,
          animalId: animal.id,
          priority: daysLeft <= 0 ? 'High' : 'Medium'
        });
      }
    });
  });

  // Convert grouped protocol alerts to actual alert objects
  Object.entries(protocolAlertMap).forEach(([key, data]) => {
    const { animals: animalTags, stepDate, daysUntil, stepAction, stepDay, templateName, stepTime } = data;
    const countLabel = animalTags.length === 1 ? animalTags[0] : `${animalTags.length} Cows`;
    alerts.push({
      id: `protocol-grouped-${key}`,
      type: 'Protocol',
      title: daysUntil < 0 ? `Protocol Step OVERDUE` : daysUntil === 0 ? 'Protocol Step Due TODAY' : `Protocol Step in ${daysUntil} Day${daysUntil > 1 ? 's' : ''}`,
      description: `${countLabel} — ${stepAction} (Day ${stepDay} of "${templateName}")${stepTime ? ` @ ${stepTime}` : ''}${animalTags.length > 1 ? `. Tags: ${animalTags.slice(0,5).join(', ')}${animalTags.length > 5 ? ` +${animalTags.length - 5} more` : ''}` : ''}`,
      dueDate: stepDate,
      priority: daysUntil <= 0 ? 'High' : 'Medium'
    });
  });


  // Vaccination Due Alerts
  vaccinations.forEach(vac => {
    if (!vac.nextDueDate) return;
    const daysUntil = dateUtils.diffDays(vac.nextDueDate, today);
    if (daysUntil >= 0 && daysUntil <= 14) {
      const animal = animals.find(a => a.id === vac.animalId);
      alerts.push({
        id: `vac-due-${vac.id}`,
        type: 'Vaccination',
        title: daysUntil === 0 ? 'Vaccination Due TODAY' : `Vaccination Due in ${daysUntil} Days`,
        description: `${animal?.tag || 'Unknown'}: ${vac.vaccineName} booster due on ${vac.nextDueDate}`,
        dueDate: vac.nextDueDate,
        animalId: vac.animalId,
        priority: daysUntil <= 3 ? 'High' : 'Medium'
      });
    }
  });

  return alerts.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
};

export const validations = {
  validateReproductionEvent: (event: Partial<ReproductionEvent>, currentStatus: AnimalStatus) => {
    // Allow abortion/illness note at any stage
    const isAbortionNote = event.details?.toLowerCase().includes('abort');
    if (isAbortionNote) return; // Allow any event if it documents an abortion

    if (event.type === ReproEventType.INSEMINATION) {
      if (currentStatus !== AnimalStatus.ACTIVE) {
         throw new Error(`Cannot Inseminate: Cow is currently ${currentStatus}. Current status must be Active/Heat. Correct flow: Heat → Insemination → Pregnancy Check → Calving.`);
      }
    }
    if (event.type === ReproEventType.PREGNANCY_CHECK) {
      if (currentStatus !== AnimalStatus.INSEMINATED) {
        throw new Error(`Pregnancy check requires cow to be Inseminated first. Current status: ${currentStatus}.`);
      }
    }
    if (event.type === ReproEventType.CALVING) {
      if (![AnimalStatus.PREGNANT, AnimalStatus.CLOSEUP].includes(currentStatus)) {
        throw new Error(`Calving requires cow to be Pregnant or in Closeup. Current status: ${currentStatus}.`);
      }
    }
    if (event.type === ReproEventType.DRY_OFF) {
      if (currentStatus !== AnimalStatus.LACTATING && currentStatus !== AnimalStatus.PREGNANT) {
        throw new Error(`Dry Off requires cow to be Lactating or Pregnant. Current status: ${currentStatus}.`);
      }
    }
    if (event.date && !dateUtils.isTodayOrPast(event.date)) {
      throw new Error('Events cannot be recorded in the future.');
    }
  }
};
