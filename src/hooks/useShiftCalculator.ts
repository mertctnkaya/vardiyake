import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

const SHIFTS = [
  { id: 0, name: 'Gündüz', note: '' },
  { id: 1, name: 'Gece', note: 'DİKKAT: Bu gece akşamından servise biniş!' },
  { id: 2, name: 'Akşam', note: '' }
];

const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

export function useShiftCalculator() {
  const { settings } = useAppStore();
  const [targetDate, setTargetDate] = useState<Date>(new Date());

  const epochDate = useMemo(() => {
    return settings?.shift_epoch_date 
      ? new Date(settings.shift_epoch_date + 'T00:00:00') 
      : new Date('2026-07-06T00:00:00');
  }, [settings]);

  const currentShift = useMemo(() => {
    const dayOfWeek = targetDate.getDay();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    
    const workType = settings?.work_type || '3-shift';
    const isSaturdayWork = settings?.is_saturday_workday || false;

    const isOffDay = workType === 'fixed' ? (isSunday || (!isSaturdayWork && isSaturday)) : isSunday;

    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayDate = new Date(targetDate);
    mondayDate.setDate(targetDate.getDate() + diffToMonday);
    mondayDate.setHours(0, 0, 0, 0);

    const diffMs = mondayDate.getTime() - epochDate.getTime();
    const deltaWeeks = Math.floor(diffMs / MS_PER_WEEK);
    
    let shiftIndex = 0;
    // DÜZELTME: Vardiya tipine göre döngüyü sınırlar
    if (workType === '3-shift') {
        shiftIndex = ((deltaWeeks % 3) + 3) % 3;
    } else if (workType === '2-shift') {
        shiftIndex = ((deltaWeeks % 2) + 2) % 2; // Sadece 0 (Gündüz) ve 1 (Gece)
    } else if (workType === 'fixed') {
        shiftIndex = 0; // Her zaman 0
    }

    const shift = { ...SHIFTS[shiftIndex] };

    // DÜZELTME: Sabit gündüz ise ismi ez
    if (workType === 'fixed') {
        shift.name = 'Sabit Gündüz';
    }

    if (isOffDay) {
      shift.name = 'Hafta Tatili';
      shift.id = -1; 
      
      let nextWeekIndex = 0;
      if (workType === '3-shift') nextWeekIndex = (((deltaWeeks + 1) % 3) + 3) % 3;
      if (workType === '2-shift') nextWeekIndex = (((deltaWeeks + 1) % 2) + 2) % 2;
      
      const nextShift = SHIFTS[nextWeekIndex];
      
      if (nextShift.id === 1 && workType !== 'fixed') {
        shift.note = 'DİKKAT: Bu gece akşamından servise biniş!';
      } else {
        shift.note = ''; 
      }
    } else {
      // DÜZELTME: Sadece Pazar günü uyaracak, diğer günler not boş kalacak.
      shift.note = ''; 
    }

    return shift;
  }, [targetDate, epochDate, settings]);

  const scheduleList = useMemo(() => {
    const list = [];
    const baseDate = new Date(targetDate);
    
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(baseDate.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const workType = settings?.work_type || '3-shift';

    for (let i = 0; i < 5; i++) {
      const weekStart = new Date(startOfWeek);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 5);

      const diffMs = weekStart.getTime() - epochDate.getTime();
      const deltaWeeks = Math.floor(diffMs / MS_PER_WEEK);
      
      let shiftIndex = 0;
      if (workType === '3-shift') shiftIndex = ((deltaWeeks % 3) + 3) % 3;
      else if (workType === '2-shift') shiftIndex = ((deltaWeeks % 2) + 2) % 2;
      else if (workType === 'fixed') shiftIndex = 0;
      
      const s = { ...SHIFTS[shiftIndex] };
      if (workType === 'fixed') s.name = 'Sabit Gündüz';

      list.push({ weekStart, weekEnd, shift: s });
    }
    return list;
  }, [targetDate, epochDate, settings]);

  return { targetDate, setTargetDate, currentShift, scheduleList };
}