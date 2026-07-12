import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabaseClient';

export default function Settings() {
  const { user, setSettings } = useAppStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [workType, setWorkType] = useState('3-shift');
  const [isSaturdayWorkday, setIsSaturdayWorkday] = useState(false); 
  const [employmentStartDate, setEmploymentStartDate] = useState('2026-06-09');
  const [shiftEpochDate, setShiftEpochDate] = useState('2026-07-06');
  
  const [shiftStartTime, setShiftStartTime] = useState('08:00');
  const [shiftEndTime, setShiftEndTime] = useState('16:00'); 
  const [shiftDuration, setShiftDuration] = useState('12'); 
  
  const [dailyWage, setDailyWage] = useState('');
  const [hourlyOvertime, setHourlyOvertime] = useState('');
  const [baseWorkHours, setBaseWorkHours] = useState('7.5'); 
  const [nightBonus, setNightBonus] = useState('0'); 
  
  const [saturdayMultiplier, setSaturdayMultiplier] = useState('1.5'); 
  const [weekendMultiplier, setWeekendMultiplier] = useState('2'); // Pazar için

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      setIsLoading(true);
      const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();

      if (data) {
        setWorkType(data.work_type || '3-shift');
        setIsSaturdayWorkday(data.is_saturday_workday || false); 
        if (data.employment_start_date) setEmploymentStartDate(data.employment_start_date);
        if (data.shift_epoch_date) setShiftEpochDate(data.shift_epoch_date);
        if (data.shift_start_time) setShiftStartTime(data.shift_start_time);
        if (data.shift_end_time) setShiftEndTime(data.shift_end_time);
        if (data.shift_duration) setShiftDuration(data.shift_duration.toString());
        if (data.daily_wage) setDailyWage(data.daily_wage.toString());
        if (data.hourly_overtime) setHourlyOvertime(data.hourly_overtime.toString());
        if (data.base_work_hours) setBaseWorkHours(data.base_work_hours.toString());
        if (data.night_bonus_percent) setNightBonus(data.night_bonus_percent.toString());
        
        // Veritabanından çek
        if (data.saturday_multiplier) setSaturdayMultiplier(data.saturday_multiplier.toString());
        if (data.weekend_multiplier) setWeekendMultiplier(data.weekend_multiplier.toString());
      }
      setIsLoading(false);
    }
    loadSettings();
  }, [user]);

  const calculateEndTime = (startTime: string, hoursToAdd: number) => {
    if (!startTime) return '';
    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = (h * 60) + m + (hoursToAdd * 60);
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = Math.round(totalMinutes % 60);
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  const handleSaveSettings = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setFeedback(null);

    // KONTROLLER...
    if (dailyWage === '' || hourlyOvertime === '' || baseWorkHours === '') {
      setFeedback({ type: 'error', message: 'Lütfen ücret ve çalışma süresi alanlarını boş bırakmayın.' });
      window.scrollTo({ top: 0, behavior: 'smooth' }); return;
    }
    if (Number(dailyWage) < 0 || Number(hourlyOvertime) < 0 || Number(nightBonus) < 0) {
      setFeedback({ type: 'error', message: 'Ücret ve zam oranları negatif (-) olamaz.' });
      window.scrollTo({ top: 0, behavior: 'smooth' }); return;
    }
    if (Number(weekendMultiplier) < 1 || Number(saturdayMultiplier) < 1) {
      setFeedback({ type: 'error', message: 'Tatil çarpanları en az 1 olmalıdır.' });
      window.scrollTo({ top: 0, behavior: 'smooth' }); return;
    }
    if (!shiftStartTime || (workType === 'fixed' && !shiftEndTime)) {
      setFeedback({ type: 'error', message: 'Lütfen başlangıç ve bitiş saatlerini eksiksiz girin.' });
      window.scrollTo({ top: 0, behavior: 'smooth' }); return;
    }

    setIsSaving(true);
    let finalEndTime = shiftEndTime;
    if (workType === '3-shift') finalEndTime = calculateEndTime(shiftStartTime, 8);
    else if (workType === '2-shift') finalEndTime = calculateEndTime(shiftStartTime, Number(shiftDuration) || 12);

    const payload = {
      user_id: user.id,
      work_type: workType,
      is_saturday_workday: isSaturdayWorkday,
      employment_start_date: employmentStartDate,
      shift_epoch_date: shiftEpochDate,
      shift_start_time: shiftStartTime,
      shift_end_time: finalEndTime, 
      shift_duration: workType === '2-shift' ? Number(shiftDuration) : (workType === '3-shift' ? 8 : 0),
      daily_wage: Number(dailyWage),
      hourly_overtime: Number(hourlyOvertime),
      base_work_hours: Number(baseWorkHours),
      night_bonus_percent: Number(nightBonus) || 0,
      saturday_multiplier: Number(saturdayMultiplier) || 1.5,
      weekend_multiplier: Number(weekendMultiplier) || 2,
      updated_at: new Date().toISOString()
    };

    const { error, data } = await supabase.from('user_settings').upsert(payload).select().single();

    if (error) {
      setFeedback({ type: 'error', message: 'Hata: ' + error.message });
    } else {
      setFeedback({ type: 'success', message: 'Ayarlarınız başarıyla kaydedildi.' });
      setSettings(data); 
      setShiftEndTime(finalEndTime); 
      setTimeout(() => setFeedback(null), 3000);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col items-center animate-fade-in w-full pb-10">
      <div className="w-full max-w-3xl bg-[#16191d] rounded-xl shadow-2xl border border-base-300 overflow-hidden relative">
        
        {isLoading && (
          <div className="absolute inset-0 bg-base-100/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <span className="loading loading-spinner loading-lg text-indigo-500"></span>
          </div>
        )}

        <div className="bg-base-200 border-b border-base-300 p-6">
          <h2 className="text-2xl font-bold text-base-content">Sistem ve Bordro Ayarları</h2>
          <p className="text-sm text-base-content/60 mt-1">İşletmenizin kurallarına göre uygulamanın beynini yapılandırın.</p>
        </div>

        <div className="px-6 pt-6 sm:px-8">
          <div className="bg-indigo-900/10 border border-indigo-500/20 text-indigo-200 text-sm p-5 rounded-xl shadow-inner">
            <h4 className="font-bold text-indigo-400 mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
              Önemli İpuçları
            </h4>
            <ul className="list-disc list-inside space-y-1.5 opacity-90">
              <li><strong className="text-indigo-300">Normal Çalışma Saati:</strong> Çay ve yemek molalarını <em>çıkararak</em> sadece net çalıştığınız süreyi yazmalısınız.</li>
              <li><strong className="text-indigo-300">Saatlik Mesai:</strong> Toplamı değil, sadece 1 saatlik mesai ücretinizi girmelisiniz. (Bilmiyorsanız Hesaplamalar sekmesinden bulabilirsiniz).</li>
              <li><strong className="text-indigo-300">Tarihler:</strong> İşe giriş tarihi takvim içindir, net tarih gerekli değildir. Döngü için geçmişteki işe başladıktan sonraki ilk Gündüz pazartesi gününü seçmelisiniz.</li>
              <li><strong className="text-indigo-300">Ücretler:</strong> Henüz yevmiye veya saatliğinizi bilmiyorsanız hesaplamalardan net maaşınız ile bulabilirsiniz.</li>
            </ul>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          
          {feedback?.type === 'success' && (
            <div className="bg-emerald-900/20 border border-emerald-500/30 text-emerald-400 text-sm p-4 rounded-lg flex items-center gap-3 shadow-sm">
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}
          {feedback?.type === 'error' && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 text-sm p-4 rounded-lg flex items-center gap-3 shadow-sm">
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          <div>
            <h3 className="text-lg font-bold text-indigo-400 mb-4 border-b border-base-300 pb-2">1. Vardiya Sistemi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-control w-full md:col-span-2">
                <label className="label"><span className="label-text font-bold text-base-content/80">Sistem Tipi</span></label>
                <select className="select select-bordered w-full bg-base-200 focus:ring-2 focus:ring-indigo-500" value={workType} onChange={(e) => setWorkType(e.target.value)}>
                  <option value="fixed">Sabit Gündüz (Örn: 08:00 - 18:00)</option>
                  <option value="2-shift">2'li Vardiya (Örn: 12 Saatlik Döngü)</option>
                  <option value="3-shift">3'lü Vardiya (Örn: 8 Saatlik Döngü)</option>
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text font-bold text-base-content/80">Gündüz/Başlangıç Saati</span></label>
                <input type="time" className="input input-bordered w-full bg-base-200 focus:ring-2 focus:ring-indigo-500" value={shiftStartTime} onChange={(e) => setShiftStartTime(e.target.value)} />
              </div>

              {workType === 'fixed' && (
                <div className="form-control w-full animate-fade-in">
                  <label className="label"><span className="label-text font-bold text-base-content/80">Bitiş Saati</span></label>
                  <input type="time" className="input input-bordered w-full bg-base-200 focus:ring-2 focus:ring-indigo-500" value={shiftEndTime} onChange={(e) => setShiftEndTime(e.target.value)} />
                </div>
              )}

              {workType === '2-shift' && (
                <div className="form-control w-full animate-fade-in">
                  <label className="label"><span className="label-text font-bold text-base-content/80">Vardiya Süresi (Saat)</span></label>
                  <input type="number" className="input input-bordered w-full bg-base-200 focus:ring-2 focus:ring-indigo-500" placeholder="Örn: 12" value={shiftDuration} onChange={(e) => setShiftDuration(e.target.value)} />
                </div>
              )}

              {workType === 'fixed' && (
                <div className="form-control w-full md:col-span-2 bg-base-200/50 p-4 rounded-lg border border-base-300 mt-2">
                  <label className="cursor-pointer label justify-start gap-4">
                    <input type="checkbox" className="checkbox checkbox-primary" checked={isSaturdayWorkday} onChange={(e) => setIsSaturdayWorkday(e.target.checked)} />
                    <div>
                      <span className="label-text font-bold block">Cumartesi günleri normal mesai günüm</span>
                      <span className="label-text-alt text-base-content/60">İşaretlenmezse Cumartesi günleri takvimde hafta sonu tatili olarak sayılır.</span>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>
	
          <div>
            <h3 className="text-lg font-bold text-indigo-400 mb-4 border-b border-base-300 pb-2">2. Tarih Referansları</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-control w-full">
                <label className="label"><span className="label-text font-bold text-base-content/80">İşe Başlama Tarihi</span></label>
                <input type="date" className="input input-bordered w-full bg-base-200 focus:ring-2 focus:ring-indigo-500" value={employmentStartDate} onChange={(e) => setEmploymentStartDate(e.target.value)} />
              </div>
              <div className="form-control w-full">
                <label className="label"><span className="label-text font-bold text-base-content/80">Döngü Başlangıcı (Gündüz)</span></label>
                <input type="date" className="input input-bordered w-full bg-base-200 focus:ring-2 focus:ring-indigo-500" value={shiftEpochDate} onChange={(e) => setShiftEpochDate(e.target.value)} />
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-indigo-400 mb-4 border-b border-base-300 pb-2">3. Bordro ve Ek Ödemeler</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="form-control w-full">
                <label className="label"><span className="label-text font-bold text-base-content/80">Günlük Yevmiye (₺)</span></label>
                <label className="input input-bordered flex items-center gap-2 bg-base-200">
                  <span className="text-base-content/50">₺</span>
                  <input type="number" className="grow" value={dailyWage} onChange={(e) => setDailyWage(e.target.value)} />
                </label>
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text font-bold text-base-content/80">Saatlik Mesai (₺)</span></label>
                <label className="input input-bordered flex items-center gap-2 bg-base-200">
                  <span className="text-base-content/50">₺</span>
                  <input type="number" className="grow" value={hourlyOvertime} onChange={(e) => setHourlyOvertime(e.target.value)} />
                </label>
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text font-bold text-base-content/80">Normal Çalışma (Saat/Gün)</span></label>
                <input type="number" step="0.5" className="input input-bordered w-full bg-base-200" value={baseWorkHours} onChange={(e) => setBaseWorkHours(e.target.value)} />
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text font-bold text-base-content/80">Gece Zammı Oranı (%)</span></label>
                <label className="input input-bordered flex items-center gap-2 bg-base-200">
                  <span className="text-base-content/50">%</span>
                  <input type="number" className="grow" value={nightBonus} onChange={(e) => setNightBonus(e.target.value)} />
                </label>
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text font-bold text-base-content/80">Cumartesi Mesai Çarpanı</span></label>
                <label className="input input-bordered flex items-center gap-2 bg-base-200">
                  <span className="text-base-content/50">x</span>
                  <input type="number" step="0.5" className="grow" placeholder="Örn: 1.5" value={saturdayMultiplier} onChange={(e) => setSaturdayMultiplier(e.target.value)} />
                </label>
                <label className="label"><span className="label-text-alt text-base-content/50">%50 Zamlı = 1.5</span></label>
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text font-bold text-base-content/80">Pazar / Tatil Çarpanı</span></label>
                <label className="input input-bordered flex items-center gap-2 bg-base-200">
                  <span className="text-base-content/50">x</span>
                  <input type="number" step="0.5" className="grow" placeholder="Örn: 2" value={weekendMultiplier} onChange={(e) => setWeekendMultiplier(e.target.value)} />
                </label>
                <label className="label"><span className="label-text-alt text-base-content/50">Çift Yevmiye = 2.0</span></label>
              </div>

            </div>
          </div>

          <div className="mt-8 flex justify-end border-t border-base-300 pt-6">
            <button onClick={handleSaveSettings} disabled={isSaving || isLoading} className="btn btn-wide bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-lg shadow-indigo-900/50">
              {isSaving ? <span className="loading loading-spinner"></span> : 'Ayarları Kaydet'}
            </button>
          </div>
        </div>
      </div>
      
    </div>
  );
}