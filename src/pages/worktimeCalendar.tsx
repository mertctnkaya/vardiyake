import { useState } from 'react';

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
  const [selectedDay, setSelectedDay] = useState<DayDetail | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [dayStatus, setDayStatus] = useState('normal');
  const [noteText, setNoteText] = useState('');

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const EPOCH_DATE = new Date('2026-07-06T00:00:00'); 
  const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

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

  const handleDayClick = (dayData: DayDetail) => {
    setSelectedDay(dayData);
    setDayStatus('normal'); 
    setNoteText('');
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col items-center animate-fade-in w-full">
      
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 px-2">
        <h2 className="text-3xl font-bold text-base-content">
          {new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(today)}
        </h2>
        <div className="badge badge-primary badge-outline font-semibold">Bordro Dönemi</div>
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
            const isPast = item.date < new Date(today.setHours(0,0,0,0));
            const isToday = item.date.toDateString() === new Date().toDateString();
            
            let cellBg = "bg-base-100 hover:bg-base-200";
            let textColor = "text-base-content"; 
            
            if (!item.isCurrentMonth) {
              cellBg = "bg-base-100/50";
              textColor = "text-base-content/20"; 
            } else if (isPast || isToday) {
              if (shift.isSunday) {
                cellBg = "bg-orange-900/20 hover:bg-orange-900/40";
                textColor = "text-orange-400";
              } else if (shift.isNight) {
                cellBg = "bg-teal-900/30 hover:bg-teal-900/50";
                textColor = "text-teal-400";
              } else {
                cellBg = "bg-green-900/20 hover:bg-green-900/40";
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
                })}
                className={`
                  min-h-[5rem] sm:min-h-[7rem] p-1 sm:p-2 border-r border-b border-base-300 
                  cursor-pointer transition-colors duration-200 flex flex-col justify-start
                  ${cellBg}
                  ${index % 7 === 6 ? 'border-r-0' : ''} 
                `}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm sm:text-lg font-semibold ${textColor} ${isToday ? 'border-b-2 border-primary' : ''}`}>
                    {item.date.getDate()}
                  </span>
                </div>
                
                <div className={`mt-auto text-[10px] sm:text-xs font-semibold truncate opacity-80 ${textColor}`}>
                  {shift.isSunday ? 'Tatil' : shift.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-full max-w-4xl mt-8 flex justify-end">
        <button className="btn btn-primary btn-wide shadow-lg shadow-primary/20">
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
              <button className="btn btn-primary" onClick={() => setIsModalOpen(false)}>Kaydet (UI)</button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}