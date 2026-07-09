import { useOutletContext } from 'react-router-dom';

type ShiftContextType = ReturnType<typeof import('../hooks/useShiftCalculator').useShiftCalculator>;

function formatWeekRange(start: Date, end: Date) {
  const startDay = start.getDate();
  const startMonth = start.toLocaleDateString('tr-TR', { month: 'long' });
  const endDay = end.getDate();
  const endMonth = end.toLocaleDateString('tr-TR', { month: 'long' });

  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${startMonth}`;
  } else {
    return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
  }
}

export default function NextWeeks() {
  const { scheduleList } = useOutletContext<ShiftContextType>();

  return (
    <div className="card bg-base-100 shadow-xl border border-base-200 w-full mt-4 animate-fade-in">
      <div className="card-body">
        <h2 className="card-title text-base-content/70 justify-center mb-6">Gelecek Haftalar</h2>
        
        <div className="flex flex-col gap-3">
          {scheduleList.map((item, index) => {
            const dateString = formatWeekRange(item.weekStart, item.weekEnd);
            const isCurrentWeek = index === 0; 
            
            return (
              <div 
                key={index} 
                className={`p-4 rounded-xl text-center text-lg font-medium border flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 transition-all
                  ${isCurrentWeek 
                    ? 'bg-primary/10 border-primary/30 text-primary' 
                    : 'bg-base-200 border-base-300 text-base-content/80'}`
                }
              >
                <span className="w-48 text-right hidden sm:block">{dateString}</span>
                <span className="sm:hidden">{dateString}</span>
                
                <span className="hidden sm:block opacity-50">-</span>
                
                <span className={`w-48 text-left ${isCurrentWeek ? 'font-bold' : ''}`}>
                  {item.shift.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}