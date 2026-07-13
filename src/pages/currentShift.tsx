import { useOutletContext, Link } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";

type ShiftContextType = ReturnType<
  typeof import("../hooks/useShiftCalculator").useShiftCalculator
>;

export default function CurrentShift() {
  const { targetDate, setTargetDate, currentShift } = useOutletContext<ShiftContextType>();
  const { user, settings } = useAppStore();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setTargetDate(new Date(e.target.value));
    }
  };

  const shiftDate = (days: number) => {
    const newDate = new Date(targetDate);
    newDate.setDate(newDate.getDate() + days);
    setTargetDate(newDate);
  };

  const formattedDateValue = targetDate.toISOString().split("T")[0];

  // SAAT HESAPLAMA YARDIMCISI
  const calculateEndTime = (startTime: string, hoursToAdd: number) => {
    if (!startTime) return '';
    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = (h * 60) + m + (hoursToAdd * 60);
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = Math.round(totalMinutes % 60);
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  // VARDİYANIN ÇALIŞMA SAATLERİNİ BULAN MOTOR
  const getShiftHours = () => {
    if (!settings || currentShift.id === -1) return null; // Tatil günlerinde saat yazmaz
    
    const start = settings.shift_start_time || '08:00';
    const type = settings.work_type || '3-shift';
    let duration = 8;
    let offset = 0;

    if (type === 'fixed') {
      return `${start} - ${settings.shift_end_time || '18:00'}`;
    } else if (type === '2-shift') {
      duration = Number(settings.shift_duration) || 12;
      if (currentShift.id === 1) offset = duration; // 2'li vardiyada gece offseti
    } else {
      duration = 8;
      if (currentShift.id === 2) offset = 8;  // Akşam (Örn: 16:00 - 00:00)
      if (currentShift.id === 1) offset = 16; // Gece (Örn: 00:00 - 08:00)
    }

    const shiftStart = calculateEndTime(start, offset);
    const shiftEnd = calculateEndTime(shiftStart, duration);
    return `${shiftStart} - ${shiftEnd}`;
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body items-center text-center w-full">
          <h2 className="card-title text-xl mb-4 text-base-content/80">
            Tarih Sorgula
          </h2>

          <input
            type="date"
            value={formattedDateValue}
            onChange={handleDateChange}
            className="input input-bordered w-full max-w-xs text-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <div className="flex items-center justify-between w-full max-w-xs mt-6 gap-2">
            <button onClick={() => shiftDate(-1)} className="btn btn-sm flex-1 bg-slate-700 hover:bg-slate-600 text-white border-none">
              &larr; Dün
            </button>
            <span className="text-sm font-semibold text-base-content whitespace-nowrap px-2">
              {targetDate.toLocaleDateString("tr-TR", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
            </span>
            <button onClick={() => shiftDate(1)} className="btn btn-sm flex-1 bg-slate-700 hover:bg-slate-600 text-white border-none">
              Yarın &rarr;
            </button>
          </div>

          <div className="flex items-center justify-between w-full max-w-xs mt-3 gap-3">
            <button onClick={() => shiftDate(-7)} className="btn btn-sm flex-1 bg-indigo-600 hover:bg-indigo-500 text-white border-none">
              &laquo; Önceki Hf.
            </button>
            <button onClick={() => shiftDate(7)} className="btn btn-sm flex-1 bg-indigo-600 hover:bg-indigo-500 text-white border-none">
              Gelecek Hf. &raquo;
            </button>
          </div>
          <div className="flex items-center justify-between w-full max-w-xs mt-2 gap-3">
            <button onClick={() => setTargetDate(new Date())} className="btn btn-sm flex-1 bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md">
              Bugün
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body items-center justify-center text-center">
          <h2 className="card-title text-base-content/80 mb-2">
            Güncel Vardiya
          </h2>

          <div className="text-4xl font-black text-primary mt-4 mb-1">
            {currentShift.name}
          </div>

          {/* VARDİYA SAATLERİ BURADA GÖSTERİLİR */}
          {currentShift.id !== -1 && (
            <div className="text-lg font-bold text-base-content/60 mb-2 bg-base-200 px-3 py-1 rounded-md border border-base-300">
              {getShiftHours()}
            </div>
          )}

          {/* KIRMIZI UYARI KUTUSU */}
          {currentShift.note && (
            <div className="mt-3 font-bold px-4 py-2 rounded-lg bg-error/20 text-error border border-error/50">
              {currentShift.note}
            </div>
          )}
        </div>
      </div>

      {/* Kayıt Ol/Giriş Yap Kutusu (Kullanıcı Yoksa) */}
      {!user && (
        <div className="md:col-span-2 mt-2 bg-indigo-900/10 border border-indigo-500/20 rounded-2xl p-6 sm:p-8 text-center shadow-lg">
          <h3 className="text-xl sm:text-2xl font-bold text-indigo-400 mb-2">Kendinize Göre Özelleştirin</h3>
          <p className="text-base-content/70 mb-6 max-w-2xl mx-auto">
            Şu an örnek bir vardiya döngüsünü görüntülüyorsunuz. Kendi işe başlama tarihinizi, yevmiye ayarlarınızı ve devamsızlık durumlarınızı kaydedip otomatik bordro hesabı yaptırmak için ücretsiz hesap oluşturun.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/login" className="btn btn-outline border-indigo-500/50 text-indigo-400 hover:bg-indigo-500 hover:text-white">Giriş Yap</Link>
            <Link to="/register" className="btn bg-indigo-600 hover:bg-indigo-700 text-white border-none">Hemen Kayıt Ol</Link>
          </div>
        </div>
      )}
    </div>
  );
}