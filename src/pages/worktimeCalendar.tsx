import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

interface DayDetail {
  date: Date;
  shiftName: string;
  isNightShift: boolean;
  isSunday: boolean;
  isPast: boolean;
  isCurrentMonth: boolean;
  shiftId: number;
}

export default function WorktimeCalendar() {
  const { user } = useAppStore();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [selectedDay, setSelectedDay] = useState<DayDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [dayStatus, setDayStatus] = useState('normal');
  const [noteText, setNoteText] = useState('');

  const [baseDate, setBaseDate] = useState(new Date());

  const actualToday = new Date();
  actualToday.setHours(0, 0, 0, 0);

  const currentYear = baseDate.getFullYear();
  const currentMonth = baseDate.getMonth();

  const EMPLOYMENT_START_DATE = new Date('2026-06-09T00:00:00'); 
  const EPOCH_DATE = new Date('2026-07-06T00:00:00'); 
  const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

  const handlePrevMonth = () => setBaseDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setBaseDate(new Date(currentYear, currentMonth + 1, 1));
  const handleGoToToday = () => setBaseDate(new Date());

  const getShiftForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const diffMs = monday.getTime() - EPOCH_DATE.getTime();
    const deltaWeeks = Math.floor(diffMs / MS_PER_WEEK);
    const shiftIndex = ((deltaWeeks % 3) + 3) % 3;

    return {
      id: shiftIndex,
      name: shiftIndex === 0 ? 'Gündüz' : shiftIndex === 1 ? 'Gece' : 'Akşam',
      isNight: shiftIndex === 1,
      isSunday: dayOfWeek === 0
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

    setSelectedDay(dayData);
    setDayStatus('normal'); 
    setNoteText('');
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col items-center animate-fade-in w-full">
      
      <div className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center mb-6 px-2 gap-4">
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-base-content min-w-[200px] text-center sm:text-left">
            {new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(baseDate)}
          </h2>
          
          <div className="flex gap-2">
            <button 
              onClick={handlePrevMonth} 
              className="btn btn-sm sm:btn-md btn-outline bg-green-800 p-2 border-text-base-content/70 hover:bg-green-900"
            >
              &laquo; Önceki Ay
            </button>
            <button 
              onClick={handleGoToToday} 
              className="btn btn-sm sm:btn-md p-2 bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md"
            >
              Bugün
            </button>
            <button 
              onClick={handleNextMonth} 
              className="btn btn-sm sm:btn-md btn-outline bg-green-800 p-2 border-text-base-content/70 hover:bg-green-900"
            >
              Sonraki Ay &raquo;
            </button>
          </div>
        </div>

        <div className="badge badge-primary badge-outline font-semibold whitespace-nowrap hidden sm:inline-flex">
          Bordro Dönemi
        </div>
      </div>

      <div className="w-full max-w-4xl bg-base-100 rounded-xl shadow-2xl border border-base-300 overflow-hidden">
        <div className="grid grid-cols-7 bg-base-200 border-b border-base-300">
          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
            <div key={day} className="py-3 text-center text-sm font-bold text-base-content/60">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr">
          {calendarDays.map((item, index) => {
            const shift = getShiftForDate(item.date);
            const isPast = item.date < actualToday;
            const isToday = item.date.toDateString() === actualToday.toDateString();
            
            // YENİ MANTIK: Bu gün, işe başlama tarihinden önce mi?
            const isBeforeEmployment = item.date < EMPLOYMENT_START_DATE;
            
            let cellBg = "bg-base-100 hover:bg-base-200 cursor-pointer";
            let textColor = "text-base-content"; 
            
            if (isBeforeEmployment) {
              // İşe girilmemiş günler: Tamamen pasif, tıklanamaz, hayalet görünüm
              cellBg = "bg-base-100/10 opacity-30 cursor-not-allowed";
              textColor = "text-base-content/20";
            } else if (!item.isCurrentMonth) {
              cellBg = "bg-base-100/50 cursor-pointer";
              textColor = "text-base-content/20"; 
            } else if (isPast || isToday) {
              if (shift.isSunday) {
                cellBg = "bg-orange-900/20 hover:bg-orange-900/40 cursor-pointer";
                textColor = "text-orange-400";
              } else if (shift.isNight) {
                cellBg = "bg-teal-900/30 hover:bg-teal-900/50 cursor-pointer";
                textColor = "text-teal-400";
              } else {
                cellBg = "bg-green-900/20 hover:bg-green-900/40 cursor-pointer";
                textColor = "text-green-400";
              }
            } else {
              if (shift.isSunday) textColor = "text-orange-400/70";
            }

            return (
              <div 
                key={index}
                onClick={() => handleDayClick({
                  date: item.date,
                  shiftName: shift.isSunday ? 'Hafta Tatili' : shift.name,
                  isNightShift: shift.isNight,
                  isSunday: shift.isSunday,
                  isPast,
                  isCurrentMonth: item.isCurrentMonth,
                  shiftId: shift.id
                }, isBeforeEmployment)}
                className={`
                  min-h-[5rem] sm:min-h-[7rem] p-1 sm:p-2 border-r border-b border-base-300 
                  transition-colors duration-200 flex flex-col justify-start
                  ${cellBg}
                  ${index % 7 === 6 ? 'border-r-0' : ''} 
                `}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm sm:text-lg font-semibold ${textColor} ${isToday ? 'border-b-2 border-primary' : ''}`}>
                    {item.date.getDate()}
                  </span>
                </div>
                
                {/* İşe girmeden önceki günlerde vardiya bilgisini sakla */}
                {!isBeforeEmployment && (
                  <div className={`mt-auto text-[10px] sm:text-xs font-semibold truncate opacity-80 ${textColor}`}>
                    {shift.isSunday ? 'Tatil' : shift.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-full max-w-4xl mt-8 flex justify-end">
        <button className="btn btn-wide bg-indigo-600 hover:bg-indigo-700 text-white border-none transition-colors shadow-lg shadow-indigo-900/50">
          Bu Ayı Hesapla (Yakında)
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            onClick={() => setIsModalOpen(false)}
          ></div>
          
          <div className="bg-base-200 border border-base-300 rounded-2xl p-6 relative z-10 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col animate-fade-in">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
            >✕</button>

            <h3 className="font-bold text-2xl text-primary mb-1 pr-8">
              {selectedDay?.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
            </h3>
            <p className="py-1 text-md font-medium text-base-content/80">
              Vardiya: <span className="text-base-content">{selectedDay?.shiftName}</span>
            </p>
            
            <div className="divider my-1"></div>
            
            <div className="form-control w-full mb-4">
              <label className="label pb-1">
                <span className="label-text font-semibold text-base-content/80">Günlük Durum</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-base-100 p-3 rounded-lg border border-base-300">
                <label className="label cursor-pointer justify-start gap-3">
                  <input type="radio" name="status" className="radio radio-sm radio-primary" checked={dayStatus === 'normal'} onChange={() => setDayStatus('normal')} />
                  <span className="label-text">Normal Mesai</span>
                </label>
                <label className="label cursor-pointer justify-start gap-3">
                  <input type="radio" name="status" className="radio radio-sm radio-info" checked={dayStatus === 'overtime'} onChange={() => setDayStatus('overtime')} />
                  <span className="label-text">Fazla Mesai (+Ekstra)</span>
                </label>
                <label className="label cursor-pointer justify-start gap-3">
                  <input type="radio" name="status" className="radio radio-sm radio-warning" checked={dayStatus === 'late'} onChange={() => setDayStatus('late')} />
                  <span className="label-text">Geç Kaldım (Kesinti)</span>
                </label>
                <label className="label cursor-pointer justify-start gap-3">
                  <input type="radio" name="status" className="radio radio-sm radio-error" checked={dayStatus === 'absent'} onChange={() => setDayStatus('absent')} />
                  <span className="label-text">Devamsız / Ücretsiz</span>
                </label>
                <label className="label cursor-pointer justify-start gap-3 sm:col-span-2">
                  <input type="radio" name="status" className="radio radio-sm radio-success" checked={dayStatus === 'leave'} onChange={() => setDayStatus('leave')} />
                  <span className="label-text">Ücretli İzin / Raporlu</span>
                </label>
              </div>
            </div>

            <div className="form-control w-full">
              <label className="label pb-1">
                <span className="label-text font-semibold text-base-content/80">Detay / Not (Opsiyonel)</span>
              </label>
              <textarea 
                className="textarea textarea-bordered h-20 bg-base-100 text-sm focus:ring-2 focus:ring-primary" 
                placeholder={dayStatus === 'late' ? "Örn: 2 saat servis kaçırma kesintisi..." : "Bu güne dair notlar..."}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              ></textarea>
            </div>

            <div className="modal-action mt-4 flex justify-end gap-3">
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>İptal</button>
              <button className="btn px-6 bg-indigo-600 hover:bg-indigo-700 text-white border-none transition-colors shadow-lg shadow-indigo-900/50" onClick={() => setIsModalOpen(false)}>Kaydet (UI)</button>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setShowAuthModal(false)}></div>
          <div className="bg-base-200 border border-base-300 rounded-2xl p-6 sm:p-8 relative z-10 shadow-2xl w-full max-w-sm flex flex-col animate-fade-in text-center">
            
            <div className="mx-auto bg-indigo-900/30 text-indigo-400 p-4 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>

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