import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabaseClient';

export default function Settings() {
  const { user } = useAppStore();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // UI Durumları
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Form Verileri (Kendi tarihlerini varsayılan olarak bıraktık)
  const [workType, setWorkType] = useState('3-shift');
  const [employmentStartDate, setEmploymentStartDate] = useState('2026-06-09');
  const [shiftEpochDate, setShiftEpochDate] = useState('2026-07-06');
  const [dailyWage, setDailyWage] = useState('');
  const [hourlyOvertime, setHourlyOvertime] = useState('');

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single(); // Sadece bu kullanıcıya ait tek bir satır bekliyoruz

      if (data) {
        setWorkType(data.work_type || '3-shift');
        if (data.employment_start_date) setEmploymentStartDate(data.employment_start_date);
        if (data.shift_epoch_date) setShiftEpochDate(data.shift_epoch_date);
        if (data.daily_wage) setDailyWage(data.daily_wage.toString());
        if (data.hourly_overtime) setHourlyOvertime(data.hourly_overtime.toString());
      }
      
      // Supabase'de hiç kayıt yoksa 'PGRST116' hatası döner. Bu yeni kullanıcı demektir, hatayı yoksayıyoruz.
      if (error && error.code !== 'PGRST116') {
        console.error("Ayarlar çekilirken hata:", error);
      }
      
      setIsLoading(false);
    }

    loadSettings();
  }, [user]);

  const handleSaveSettings = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    setFeedback(null);
    setIsSaving(true);

    const payload = {
      user_id: user.id,
      work_type: workType,
      employment_start_date: employmentStartDate,
      shift_epoch_date: shiftEpochDate,
      daily_wage: Number(dailyWage) || 0,
      hourly_overtime: Number(hourlyOvertime) || 0,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('user_settings')
      .upsert(payload);

    if (error) {
      setFeedback({ type: 'error', message: 'Hata: ' + error.message });
    } else {
      setFeedback({ type: 'success', message: 'Ayarlarınız başarıyla kaydedildi.' });
      setTimeout(() => setFeedback(null), 3000);
    }

    setIsSaving(false);
  };

  return (
    <div className="flex flex-col items-center animate-fade-in w-full">
      <div className="w-full max-w-2xl bg-base-100 rounded-xl shadow-2xl border border-base-300 overflow-hidden relative">
        
        {isLoading && (
          <div className="absolute inset-0 bg-base-100/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        )}

        <div className="bg-base-200 border-b border-base-300 p-6">
          <h2 className="text-2xl font-bold text-base-content">Çalışma ve Ücret Ayarları</h2>
          <p className="text-sm text-base-content/60 mt-1">
            Bu ayarlar, aylık bordro ve mesai hesaplamalarınızda kullanılacaktır.
          </p>
        </div>

        <div className="p-6 space-y-6">

          {feedback?.type === 'success' && (
            <div className="bg-emerald-900/20 border border-emerald-500/30 text-emerald-400 text-sm p-4 rounded-lg flex items-center gap-3 shadow-sm mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          {feedback?.type === 'error' && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 text-sm p-4 rounded-lg flex items-center gap-3 shadow-sm mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

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
            <button 
              onClick={handleSaveSettings} 
              disabled={isSaving || isLoading}
              className="btn px-8 bg-indigo-600 hover:bg-indigo-700 text-white border-none transition-colors shadow-lg shadow-indigo-900/50"
            >
              {isSaving ? <span className="loading loading-spinner"></span> : 'Ayarları Kaydet'}
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