import { useState } from 'react';

export default function Settings() {
  const [workType, setWorkType] = useState('3-shift');
  const [dailyWage, setDailyWage] = useState('');
  const [hourlyOvertime, setHourlyOvertime] = useState('');
  
  const [employmentStartDate, setEmploymentStartDate] = useState('2026-06-09');
  const [shiftEpochDate, setShiftEpochDate] = useState('2026-07-06');

  return (
    <div className="flex flex-col items-center animate-fade-in w-full">
      <div className="w-full max-w-2xl bg-base-100 rounded-xl shadow-2xl border border-base-300 overflow-hidden">
        
        <div className="bg-base-200 border-b border-base-300 p-6">
          <h2 className="text-2xl font-bold text-base-content">Çalışma ve Ücret Ayarları</h2>
          <p className="text-sm text-base-content/60 mt-1">
            Bu ayarlar, aylık bordro ve mesai hesaplamalarınızda kullanılacaktır.
          </p>
        </div>

        <div className="p-6 space-y-6">
          
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-bold text-base-content/80">Çalışma Sistemi</span>
            </label>
            <select 
              className="select select-bordered w-full bg-base-200 focus:ring-2 focus:ring-primary"
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
            >
              <option value="fixed">Sabit Gündüz</option>
              <option value="2-shift">2'li Vardiya (Gündüz / Akşam)</option>
              <option value="3-shift">3'lü Vardiya (Gündüz / Akşam / Gece)</option>
            </select>
          </div>

          <div className="divider opacity-30">Tarih ve Döngü Referansları</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-bold text-base-content/80">İşe Başlama Tarihi</span>
              </label>
              <input 
                type="date" 
                className="input input-bordered w-full bg-base-200 focus:ring-2 focus:ring-primary" 
                value={employmentStartDate}
                onChange={(e) => setEmploymentStartDate(e.target.value)}
              />
              <label className="label">
                <span className="label-text-alt text-base-content/50">Bu tarihten öncesi hesaplanmaz.</span>
              </label>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-bold text-base-content/80">Gündüz Başlangıcı</span>
              </label>
              <input 
                type="date" 
                className="input input-bordered w-full bg-base-200 focus:ring-2 focus:ring-primary" 
                value={shiftEpochDate}
                onChange={(e) => setShiftEpochDate(e.target.value)}
              />
              <label className="label">
                <span className="label-text-alt text-base-content/50">Vardiya döngüsünün nirengi noktası.</span>
              </label>
            </div>
          </div>

          <div className="divider opacity-30">Ücretlendirme</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-bold text-base-content/80">Günlük Net Yevmiye (₺)</span>
              </label>
              <label className="input input-bordered flex items-center gap-2 bg-base-200 focus-within:ring-2 focus-within:ring-primary">
                <span className="text-base-content/50">₺</span>
                <input 
                  type="number" 
                  className="grow" 
                  placeholder="Örn: 1200" 
                  value={dailyWage}
                  onChange={(e) => setDailyWage(e.target.value)}
                />
              </label>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-bold text-base-content/80">Saatlik Mesai (₺)</span>
              </label>
              <label className="input input-bordered flex items-center gap-2 bg-base-200 focus-within:ring-2 focus-within:ring-primary">
                <span className="text-base-content/50">₺</span>
                <input 
                  type="number" 
                  className="grow" 
                  placeholder="Örn: 225" 
                  value={hourlyOvertime}
                  onChange={(e) => setHourlyOvertime(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button className="btn px-8 bg-indigo-600 hover:bg-indigo-700 text-white border-none transition-colors shadow-lg shadow-indigo-900/50">
              Ayarları Kaydet
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}