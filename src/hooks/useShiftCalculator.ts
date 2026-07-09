import { useState, useMemo } from 'react';

const SHIFTS = [
  { id: 0, name: '08:00 - 16:00', note: 'Normal vardiya' },
  { id: 1, name: '00:00 - 08:00', note: 'DİKKAT: Önceki gece 23:00 servise biniş!' },
  { id: 2, name: '16:00 - 24:00', note: 'Akşam vardiyası' }
];

const EPOCH_DATE = new Date('2026-07-06T00:00:00'); 
const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

export function useShiftCalculator() {
  const [targetDate, setTargetDate] = useState<Date>(new Date());

  const currentShift = useMemo(() => {
    const dayOfWeek = targetDate.getDay();
    // Pazar(0) ise bir önceki pazartesiye git (-6), değilse kendi haftasının pazartesisine git
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const mondayDate = new Date(targetDate);
    mondayDate.setDate(targetDate.getDate() + diffToMonday);
    mondayDate.setHours(0, 0, 0, 0);

    const diffMs = mondayDate.getTime() - EPOCH_DATE.getTime();
    const deltaWeeks = Math.floor(diffMs / MS_PER_WEEK);
    const shiftIndex = ((deltaWeeks % 3) + 3) % 3;
    
    const shift = { ...SHIFTS[shiftIndex] };

    if (dayOfWeek === 0) {
      shift.name = 'Hafta Tatili';
      
      const nextWeekIndex = (((deltaWeeks + 1) % 3) + 3) % 3;
      const nextShift = SHIFTS[nextWeekIndex];
      
      shift.note = nextShift.id === 1 ? nextShift.note : '';
      // Rengini kırmızı yapabilmek için idyi eziyoruz
      shift.id = nextShift.id === 1 ? 1 : -1; 
    }

    return shift;
  }, [targetDate]);

  const scheduleList = useMemo(() => {
    const list = [];
    const baseDate = new Date(targetDate);
    
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(baseDate.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    for (let i = 0; i < 5; i++) {
      const weekStart = new Date(startOfWeek);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 5);

      const diffMs = weekStart.getTime() - EPOCH_DATE.getTime();
      const deltaWeeks = Math.floor(diffMs / MS_PER_WEEK);
      const shiftIndex = ((deltaWeeks % 3) + 3) % 3;
      
      list.push({ 
        weekStart, 
        weekEnd, 
        shift: SHIFTS[shiftIndex] 
      });
    }
    return list;
  }, [targetDate]);

  return { targetDate, setTargetDate, currentShift, scheduleList };
}