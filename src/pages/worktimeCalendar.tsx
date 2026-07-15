import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabaseClient';

interface DayDetail {
  date: Date;
  shiftName: string;
  isNightShift: boolean;
  isOffDay: boolean; 
  isPast: boolean;
  isCurrentMonth: boolean;
  shiftId: number;
}

export default function WorktimeCalendar() {
  const { settings, user } = useAppStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [logHours, setLogHours] = useState(''); 

  const [selectedDay, setSelectedDay] = useState<DayDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [dayStatus, setDayStatus] = useState(''); // DÜZELTME: Artık varsayılan olarak BOMBOŞ geliyor
  const [noteText, setNoteText] = useState('');

  const [baseDate, setBaseDate] = useState(new Date());
  
  const [workLogs, setWorkLogs] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  const actualToday = new Date();
  actualToday.setHours(0, 0, 0, 0);

  const currentYear = baseDate.getFullYear();
  const currentMonth = baseDate.getMonth();

  const employmentStartDate = useMemo(() => {
    return settings?.employment_start_date 
      ? new Date(settings.employment_start_date + 'T00:00:00') 
      : new Date('2026-06-09T00:00:00');
  }, [settings]);
  
  const epochDate = useMemo(() => {
    return settings?.shift_epoch_date 
      ? new Date(settings.shift_epoch_date + 'T00:00:00') 
      : new Date('2026-07-06T00:00:00');
  }, [settings]);

  const workType = settings?.work_type || '3-shift';
  const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

  useEffect(() => {
    async function fetchLogs() {
      if (!user) return;
      const firstDay = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const lastDay = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('work_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('log_date', firstDay)
        .lte('log_date', lastDay);

      if (data && !error) {
        const logsMap: Record<string, any> = {};
        data.forEach(log => {
          logsMap[log.log_date] = log;
        });
        setWorkLogs(logsMap);
      }
    }
    fetchLogs();
  }, [baseDate, user, currentMonth, currentYear]);

  const handlePrevMonth = () => setBaseDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setBaseDate(new Date(currentYear, currentMonth + 1, 1));
  const handleGoToToday = () => setBaseDate(new Date());

  const getShiftForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    
    const isOffDay = workType === 'fixed' 
      ? (isSunday || (!settings?.is_saturday_workday && isSaturday)) 
      : isSunday;

    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const diffMs = monday.getTime() - epochDate.getTime();
    const deltaWeeks = Math.floor(diffMs / MS_PER_WEEK);
    
    let shiftIndex = 0;
    if (workType === '3-shift') shiftIndex = ((deltaWeeks % 3) + 3) % 3;
    else if (workType === '2-shift') shiftIndex = ((deltaWeeks % 2) + 2) % 2; 

    return {
      id: shiftIndex,
      name: isOffDay ? 'Tatil' : (workType === 'fixed' ? 'Sabit Gündüz' : (shiftIndex === 0 ? 'Gündüz' : shiftIndex === 1 ? 'Gece' : 'Akşam')),
      isNight: shiftIndex === 1 && workType !== 'fixed',
      isOffDay: isOffDay
    };
  };

  const generateCalendar = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    
    let startDayOfWeek = firstDayOfMonth.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 7 : startDayOfWeek;

    const days = [];
    for (let i = 1; i < startDayOfWeek; i++) {
      const prevDate = new Date(currentYear, currentMonth, 1 - (startDayOfWeek - i));
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push({ date: new Date(currentYear, currentMonth, i), isCurrentMonth: true });
    }
    const totalCells = days.length > 35 ? 42 : 35;
    const extraDays = totalCells - days.length;
    for (let i = 1; i <= extraDays; i++) {
      days.push({ date: new Date(currentYear, currentMonth + 1, i), isCurrentMonth: false });
    }
    return days;
  };

  const calendarDays = generateCalendar();

  const handleDayClick = (dayData: DayDetail, isBeforeEmployment: boolean) => {
    if (isBeforeEmployment) return; 

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const dateKey = dayData.date.toISOString().split('T')[0];
    const existingLog = workLogs[dateKey];

    setSelectedDay(dayData);
    
    // DÜZELTME: Veritabanında kayıt yoksa bomboş ('') bırak. Kullanıcı kendi seçecek.
    setDayStatus(existingLog?.status || ''); 
    setNoteText(existingLog?.note || '');
    setLogHours(existingLog?.hours ? existingLog.hours.toString() : ''); 
    setIsModalOpen(true);
  };

  const handleStatusChange = (status: string) => {
    setDayStatus(status);
    if (status === 'overtime') setLogHours('3');
    else if (status === 'late') setLogHours('1');
    else if (status === 'partial_leave') setLogHours('1');
    else setLogHours(''); 
  };

  // YENİ: Yanlış kaydedilmiş günü veritabanından tamamen silme fonksiyonu
  const handleDeleteLog = async () => {
    if (!user || !selectedDay) return;
    setIsSaving(true);
    const dateKey = selectedDay.date.toISOString().split('T')[0];

    const { error } = await supabase
      .from('work_logs')
      .delete()
      .eq('user_id', user.id)
      .eq('log_date', dateKey);

    if (!error) {
      const newLogs = { ...workLogs };
      delete newLogs[dateKey]; // State'ten de siliyoruz
      setWorkLogs(newLogs);
      setIsModalOpen(false);
    } else {
      alert("Silinirken hata oluştu: " + error.message);
    }
    setIsSaving(false);
  };

  const handleSaveLog = async () => {
    if (!user || !selectedDay) return;
    
    // DÜZELTME: Boş kaydetmeye çalışırsa engelle
    if (!dayStatus) {
      alert("Lütfen kaydetmeden önce bir 'Günlük Durum' seçin.");
      return;
    }

    setIsSaving(true);
    const dateKey = selectedDay.date.toISOString().split('T')[0];
    const payload = {
      user_id: user.id,
      log_date: dateKey,
      status: dayStatus,
      note: noteText,
      hours: Number(logHours) || 0 
    };

    const { data, error } = await supabase
      .from('work_logs')
      .upsert(payload, { onConflict: 'user_id,log_date' })
      .select()
      .single();

    if (!error && data) {
      setWorkLogs(prev => ({ ...prev, [dateKey]: data }));
      setIsModalOpen(false);
    } else {
      alert("Kaydedilirken hata oluştu: " + error?.message);
    }
    setIsSaving(false);
  };

  const isFutureDay = selectedDay && !selectedDay.isPast && selectedDay.date.toDateString() !== actualToday.toDateString();
  const dateKeyForSelected = selectedDay?.date.toISOString().split('T')[0] || '';
  const existingLogForSelected = workLogs[dateKeyForSelected];

  return (
    <div className="flex flex-col items-center animate-fade-in w-full pb-10">
      
      <div className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center mb-6 px-2 gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-base-content min-w-[200px] text-center sm:text-left">
            {new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(baseDate)}
          </h2>
          <div className="flex gap-2">
            <button onClick={handlePrevMonth} className="btn btn-sm sm:btn-md btn-outline bg-green-800 p-2 border-text-base-content/70 hover:bg-green-900">&laquo; Önceki Ay</button>
            <button onClick={handleGoToToday} className="btn btn-sm sm:btn-md p-2 bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md">Bugün</button>
            <button onClick={handleNextMonth} className="btn btn-sm sm:btn-md btn-outline bg-green-800 p-2 border-text-base-content/70 hover:bg-green-900">Sonraki Ay &raquo;</button>
          </div>
        </div>
        <div className="badge badge-primary badge-outline font-semibold whitespace-nowrap hidden sm:inline-flex">
          Bordro Dönemi
        </div>
      </div>

      <div className="w-full max-w-4xl bg-[#16191d] rounded-xl shadow-2xl border border-base-300 overflow-hidden">
        <div className="grid grid-cols-7 bg-base-200 border-b border-base-300">
          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
            <div key={day} className="py-3 text-center text-sm font-bold text-base-content/60">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr">
          {calendarDays.map((item, index) => {
            const shift = getShiftForDate(item.date);
            const isPast = item.date < actualToday;
            const isToday = item.date.toDateString() === actualToday.toDateString();
            const isBeforeEmployment = item.date < employmentStartDate;
            const dateKey = item.date.toISOString().split('T')[0];
            const logStatus = workLogs[dateKey]?.status; 
            
            let cellBg = "bg-[#1e2329] hover:bg-[#2a3038] cursor-pointer";
            let textColor = "text-white"; 
            
            if (isBeforeEmployment) {
              cellBg = "bg-[#1e2329] opacity-30 cursor-not-allowed";
              textColor = "text-white/50";
            } else if (!item.isCurrentMonth) {
              cellBg = "bg-[#16191d] cursor-pointer hover:bg-[#1e2329]";
              textColor = "text-white/50"; 
            } else if (logStatus) {
              if (logStatus === 'overtime') { cellBg = "bg-green-900/90 hover:bg-green-900/70 cursor-pointer"; textColor = "text-green-400"; }
              else if (logStatus === 'leave') { cellBg = "bg-purple-900/40 hover:bg-purple-900/60 cursor-pointer"; textColor = "text-purple-400"; }
              else if (logStatus === 'annual_leave') { cellBg = "bg-purple-900/60 hover:bg-purple-900/80 cursor-pointer"; textColor = "text-purple-300"; }
              else if (logStatus === 'late') { cellBg = "bg-amber-900/40 hover:bg-amber-900/60 cursor-pointer"; textColor = "text-amber-400"; }
              else if (logStatus === 'absent') { cellBg = "bg-red-900/40 hover:bg-red-900/60 cursor-pointer"; textColor = "text-red-400"; }
              else if (logStatus === 'partial_leave') { cellBg = "bg-sky-900/40 hover:bg-sky-900/60 cursor-pointer"; textColor = "text-sky-400"; }
              else if (logStatus === 'holiday_work') { cellBg = "bg-amber-600/40 hover:bg-amber-600/60 cursor-pointer"; textColor = "text-amber-200"; }
              else if (logStatus === 'normal') {
                if (shift.isOffDay) { cellBg = "bg-[#331c17] hover:bg-[#43251e] cursor-pointer"; textColor = "text-[#d97757]"; } 
                else if (shift.isNight) { cellBg = "bg-[#163333] hover:bg-[#1f4a4a] cursor-pointer"; textColor = "text-[#5eead4]"; } 
                else { cellBg = "bg-[#192a25] hover:bg-[#213831] cursor-pointer"; textColor = "text-[#4ade80]"; }
              }
            } else if (isPast || isToday) {
              if (shift.isOffDay) { cellBg = "bg-[#331c17] hover:bg-[#43251e] cursor-pointer"; textColor = "text-[#d97757]"; } 
              else if (shift.isNight) { cellBg = "bg-[#163333] hover:bg-[#1f4a4a] cursor-pointer"; textColor = "text-[#5eead4]"; } 
              else { cellBg = "bg-[#192a25] hover:bg-[#213831] cursor-pointer"; textColor = "text-[#4ade80]"; }
            } else {
              if (shift.isOffDay) textColor = "text-[#d97757]";
            }

            return (
              <div 
                key={index}
                onClick={() => handleDayClick({
                  date: item.date, shiftName: shift.name, isNightShift: shift.isNight,
                  isOffDay: shift.isOffDay, isPast, isCurrentMonth: item.isCurrentMonth, shiftId: shift.id
                }, isBeforeEmployment)}
                className={`min-h-[5rem] sm:min-h-[7rem] p-2 border-r border-b border-base-300 transition-colors duration-200 flex flex-col justify-start ${cellBg} ${index % 7 === 6 ? 'border-r-0' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm sm:text-lg font-bold ${textColor} ${isToday ? 'border-b-2 border-primary' : ''}`}>
                    {item.date.getDate()}
                  </span>
                  {workLogs[dateKey]?.note && !isBeforeEmployment && (
                    <span className="text-white/50">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </div>
                {!isBeforeEmployment && (
                  <div className={`mt-auto text-[10px] sm:text-xs font-semibold truncate opacity-80 ${textColor}`}>
                    {shift.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AYLIK ÖZET RAPORU DİVİ */}
      <div className="w-full max-w-4xl mt-6 bg-[#16191d] rounded-xl border border-base-300 p-6 shadow-lg animate-fade-in">
        <h3 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
          {new Intl.DateTimeFormat('tr-TR', { month: 'long' }).format(baseDate)} Ayı Özet Raporu
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {(() => {
            let normal = 0, overtimeHours = 0, lateHours = 0, absent = 0, leave = 0, weekendPaid = 0;
            
            calendarDays.forEach(item => {
              if (!item.isCurrentMonth || item.date < employmentStartDate) return;
              const isPast = item.date < actualToday;
              const isToday = item.date.toDateString() === actualToday.toDateString();
              const dateKey = item.date.toISOString().split('T')[0];
              const log = workLogs[dateKey];
              const shift = getShiftForDate(item.date);

              if (log) {
                if (log.status === 'normal' || log.status === 'holiday_work') normal++;
                if (log.status === 'overtime') { normal++; overtimeHours += (Number(log.hours) || 0); }
                if (log.status === 'late' || log.status === 'partial_leave') { normal++; lateHours += (Number(log.hours) || 0); }
                if (log.status === 'absent') absent++;
                if (log.status === 'leave' || log.status === 'annual_leave') leave++;
              } 
              else if (isPast || isToday) {
                if (!shift.isOffDay) normal++; 
                else weekendPaid++; 
              }
            });

            return (
              <>
                <div className="bg-[#1e2329] p-3 rounded-lg border border-base-300 text-center">
                  <p className="text-xs text-base-content/60 font-medium mb-1">Normal Mesai</p>
                  <p className="text-xl font-bold text-emerald-400">{normal} Gün</p>
                </div>
                <div className="bg-[#1e2329] p-3 rounded-lg border border-base-300 text-center">
                  <p className="text-xs text-base-content/60 font-medium mb-1">Hafta Tatili</p>
                  <p className="text-xl font-bold text-base-content">{weekendPaid} Gün</p>
                </div>
                <div className="bg-[#1e2329] p-3 rounded-lg border border-base-300 text-center">
                  <p className="text-xs text-base-content/60 font-medium mb-1">Fazla Mesai</p>
                  <p className="text-xl font-bold text-indigo-400">{overtimeHours} Saat</p>
                </div>
                <div className="bg-[#1e2329] p-3 rounded-lg border border-base-300 text-center">
                  <p className="text-xs text-base-content/60 font-medium mb-1">Ücretli İzin</p>
                  <p className="text-xl font-bold text-purple-400">{leave} Gün</p>
                </div>
                <div className="bg-[#1e2329] p-3 rounded-lg border border-base-300 text-center">
                  <p className="text-xs text-base-content/60 font-medium mb-1">Devamsızlık</p>
                  <p className="text-xl font-bold text-red-400">{absent} Gün</p>
                </div>
                <div className="bg-[#1e2329] p-3 rounded-lg border border-base-300 text-center">
                  <p className="text-xs text-base-content/60 font-medium mb-1">Eksik/Geç Saat</p>
                  <p className="text-xl font-bold text-warning">{lateHours} Saat</p>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="bg-base-200 border border-base-300 rounded-2xl p-6 sm:p-8 relative z-10 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col animate-fade-in">
            <button onClick={() => setIsModalOpen(false)} className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4">✕</button>

            <h3 className="font-bold text-2xl sm:text-3xl text-primary mb-2 pr-8">
              {selectedDay?.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
            </h3>
            <p className="py-1 text-md sm:text-lg font-medium text-base-content/80">
              Vardiya: <span className="text-base-content">{selectedDay?.shiftName}</span>
            </p>
            
            <div className="divider my-2 opacity-50"></div>
            
            {isFutureDay && (
              <div className="bg-blue-900/30 border border-blue-500/30 text-blue-300 text-sm p-3 rounded-xl flex items-center gap-3 mb-4 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Bu gün henüz yaşanmadı. Sadece geleceğe yönelik planlı izin veya tatil mesaisi girebilirsiniz.</span>
              </div>
            )}

            <div className="form-control w-full mb-6">
              <label className="label pb-2"><span className="label-text font-bold text-base-content/80">Günlük Durum</span></label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-100 p-4 rounded-xl border border-base-300 w-full">
                
                <label className={`label justify-start gap-3 p-1 rounded-lg transition-colors ${isFutureDay ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-base-200'}`}>
                  <input type="radio" name="status" className="radio radio-sm" disabled={isFutureDay ?? false} checked={dayStatus === 'normal'} onChange={() => handleStatusChange('normal')} />
                  <span className="label-text font-medium text-base-content/90">Normal Mesai</span>
                </label>
                
                <label className="label cursor-pointer justify-start gap-3 p-1 hover:bg-base-200 rounded-lg transition-colors">
                  <input type="radio" name="status" className="radio radio-sm" checked={dayStatus === 'leave'} onChange={() => handleStatusChange('leave')} />
                  <span className="label-text text-purple-400 font-bold">Ücretli İzinli/Raporlu</span>
                </label>
                
                <label className="label cursor-pointer justify-start gap-3 p-1 hover:bg-base-200 rounded-lg transition-colors">
                  <input type="radio" name="status" className="radio radio-sm" style={{accentColor: '#c084fc'}} checked={dayStatus === 'annual_leave'} onChange={() => handleStatusChange('annual_leave')} />
                  <span className="label-text text-purple-400 font-bold">Yıllık İzin</span>
                </label>
                
                <label className="label cursor-pointer justify-start gap-3 p-1 hover:bg-base-200 rounded-lg transition-colors">
                  <input type="radio" name="status" className="radio radio-sm" style={{accentColor: '#fbbf24'}} checked={dayStatus === 'holiday_work'} onChange={() => handleStatusChange('holiday_work')} />
                  <span className="label-text text-amber-400 font-bold">Resmi Tatil Mesaisi</span>
                </label>

                <label className={`label justify-start gap-3 p-1 rounded-lg transition-colors ${isFutureDay ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-base-200'}`}>
                  <input type="radio" name="status" className="radio radio-sm" disabled={isFutureDay ?? false} checked={dayStatus === 'absent'} onChange={() => handleStatusChange('absent')} />
                  <span className="label-text text-error font-bold">Devamsız / Ücretsiz</span>
                </label>
                
                <label className={`label justify-start gap-3 p-1 rounded-lg transition-colors ${isFutureDay ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-base-200'}`}>
                  <input type="radio" name="status" className="radio radio-sm" style={{accentColor: '#10b981'}} disabled={isFutureDay ?? false} checked={dayStatus === 'overtime'} onChange={() => handleStatusChange('overtime')} />
                  <span className="label-text text-emerald-500 font-bold">Fazla Mesai (+Ekstra)</span>
                </label>
                
                <label className={`label justify-start gap-3 p-1 rounded-lg transition-colors ${isFutureDay ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-base-200'}`}>
                  <input type="radio" name="status" className="radio radio-sm" disabled={isFutureDay ?? false} checked={dayStatus === 'late'} onChange={() => handleStatusChange('late')} />
                  <span className="label-text text-warning font-bold">Geç Kaldım (Kesinti)</span>
                </label>
                
                <label className={`label justify-start gap-3 p-1 rounded-lg transition-colors ${isFutureDay ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-base-200'}`}>
                  <input type="radio" name="status" className="radio radio-sm" disabled={isFutureDay ?? false} checked={dayStatus === 'partial_leave'} onChange={() => handleStatusChange('partial_leave')} />
                  <span className="label-text text-sky-400 font-bold">Saatlik İzin / Erken Çıkma</span>
                </label>
              </div>
            </div>

            {['overtime', 'late', 'partial_leave'].includes(dayStatus) && (
              <div className="form-control w-full mb-4 animate-fade-in bg-base-100 p-3 rounded-lg border border-base-300">
                <label className="label pb-1">
                  <span className="label-text font-bold text-base-content/90">
                    {dayStatus === 'overtime' ? 'Kaç Saat Fazla Mesai Yaptınız?' : 
                     dayStatus === 'late' ? 'Kaç Saat Geç Kaldınız? (Örn: 1.5)' : 
                     'Kaç Saat Erken Çıktınız / İzin Aldınız?'}
                  </span>
                </label>
                <label className="input input-bordered flex items-center gap-2 bg-base-200 focus-within:ring-2 focus-within:ring-primary">
                  <input type="number" step="0.5" min="0" className="grow" placeholder={dayStatus === 'overtime' ? '3' : '1'} value={logHours} onChange={(e) => { const val = Number(e.target.value); if (val >= 0 || e.target.value === '') setLogHours(e.target.value); }} />
                  <span className="text-base-content/50 font-bold">Saat</span>
                </label>
              </div>
            )}

            <div className="form-control w-full mb-2">
              <label className="label pb-2"><span className="label-text font-bold text-base-content/80">Detay / Not (Opsiyonel)</span></label>
              <textarea className="textarea textarea-bordered w-full min-h-[120px] bg-base-100 text-sm focus:ring-2 focus:ring-primary p-4 leading-relaxed resize-y" placeholder="Bu güne dair notlar..." value={noteText} onChange={(e) => setNoteText(e.target.value)}></textarea>
            </div>

            {/* DÜZELTME: KAYDI SİL BUTONU EKLENDİ VE HİZALANDI */}
            <div className="modal-action mt-6 flex justify-between items-center w-full">
              <div>
                {existingLogForSelected && (
                  <button className="btn btn-error btn-outline" onClick={handleDeleteLog} disabled={isSaving}>
                    Kaydı Temizle
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button className="btn btn-ghost hover:bg-base-300" onClick={() => setIsModalOpen(false)}>İptal</button>
                <button className="btn px-8 bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-lg shadow-indigo-900/50" onClick={handleSaveLog} disabled={isSaving}>
                  {isSaving ? <span className="loading loading-spinner"></span> : 'Kaydet'}
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setShowAuthModal(false)}></div>
          <div className="bg-base-200 border border-base-300 rounded-2xl p-6 sm:p-8 relative z-10 shadow-2xl w-full max-w-sm flex flex-col animate-fade-in text-center">
            <h3 className="font-bold text-xl text-base-content mb-2">Giriş Yapmanız Gerekiyor</h3>
            <p className="text-base-content/70 mb-6 text-sm">Bu güne dair mesai durumu veya not girmek için oturum açmalısınız.</p>
            <div className="flex flex-col gap-3">
              <Link to="/login" className="btn bg-indigo-600 hover:bg-indigo-700 text-white border-none">Giriş Yap / Kayıt Ol</Link>
              <button className="btn btn-ghost hover:bg-base-300 text-base-content/80" onClick={() => setShowAuthModal(false)}>İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}