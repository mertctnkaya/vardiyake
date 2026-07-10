import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export default function Settings() {
  const { user } = useAppStore();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [workType, setWorkType] = useState('3-shift');
  const [dailyWage, setDailyWage] = useState('');
  const [hourlyOvertime, setHourlyOvertime] = useState('');
  
  const [employmentStartDate, setEmploymentStartDate] = useState('2026-06-09');
  const [shiftEpochDate, setShiftEpochDate] = useState('2026-07-06');

  const handleSaveSettings = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    // TODO: Gerçek veritabanı kayıt işlemi ileride buraya eklenecek
    console.log("Ayarlar kaydedildi.");
  };

  return (
    <div className="flex flex-col items-center animate-fade-in w-full">
      <div className="w-full max-w-2xl bg-base-100 rounded-xl shadow-2xl border border-base-300 overflow-hidden relative">
        
        <div className="bg-base-200 border-b border-base-300 p-6">
          <h2 className="text-2xl font-bold text-base-content">Çalışma ve Ücret Ayarları</h2>
          <p className="text-sm text-base-content/60 mt-1">
            Bu ayarlar, aylık bordro ve mesai hesaplamalarınızda kullanılacaktır.
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="form-control w-full">
            <label className="label"><span className="label-text font-bold text-base-content/80">Çalışma Sistemi</span></label>
            <select className="select select-bordered w-full bg-base-200 focus:ring-2 focus:ring-primary" value={workType} onChange={(e) => setWorkType(e.target.value)}>
              <option value="fixed">Sabit Gündüz</option>
              <option value="2-shift">2'li Vardiya (Gündüz / Akşam)</option>
              <option value="3-shift">3'lü Vardiya (Gündüz / Akşam / Gece)</option>
            </select>
          </div>

          <div className="divider opacity-30">Tarih ve Döngü Referansları</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control w-full">
              <label className="label"><span className="label-text font-bold text-base-content/80">İşe Başlama Tarihi</span></label>
              <input type="date" className="input input-bordered w-full bg-base-200 focus:ring-2 focus:ring-primary" value={employmentStartDate} onChange={(e) => setEmploymentStartDate(e.target.value)} />
              <label className="label"><span className="label-text-alt text-base-content/50">Bu tarihten öncesi hesaplanmaz.</span></label>
            </div>
            <div className="form-control w-full">
              <label className="label"><span className="label-text font-bold text-base-content/80">Gündüz Başlangıcı</span></label>
              <input type="date" className="input input-bordered w-full bg-base-200 focus:ring-2 focus:ring-primary" value={shiftEpochDate} onChange={(e) => setShiftEpochDate(e.target.value)} />
              <label className="label"><span className="label-text-alt text-base-content/50">Vardiya döngüsünün nirengi noktası.</span></label>
            </div>
          </div>

          <div className="divider opacity-30">Ücretlendirme</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control w-full">
              <label className="label"><span className="label-text font-bold text-base-content/80">Günlük Net Yevmiye (₺)</span></label>
              <label className="input input-bordered flex items-center gap-2 bg-base-200 focus-within:ring-2 focus-within:ring-primary">
                <span className="text-base-content/50">₺</span>
                <input type="number" className="grow" placeholder="Örn: 1200" value={dailyWage} onChange={(e) => setDailyWage(e.target.value)} />
              </label>
            </div>
            <div className="form-control w-full">
              <label className="label"><span className="label-text font-bold text-base-content/80">Saatlik Mesai (₺)</span></label>
              <label className="input input-bordered flex items-center gap-2 bg-base-200 focus-within:ring-2 focus-within:ring-primary">
                <span className="text-base-content/50">₺</span>
                <input type="number" className="grow" placeholder="Örn: 225" value={hourlyOvertime} onChange={(e) => setHourlyOvertime(e.target.value)} />
              </label>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button onClick={handleSaveSettings} className="btn px-8 bg-indigo-600 hover:bg-indigo-700 text-white border-none transition-colors shadow-lg shadow-indigo-900/50">
              Ayarları Kaydet
            </button>
          </div>
        </div>
      </div>

      {/* YETKİ UYARI MODALI */}
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
            <p className="text-base-content/70 mb-6 text-sm">Ayarlarınızı kaydetmek ve verilerinizi yedeklemek için oturum açmalısınız.</p>
            
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