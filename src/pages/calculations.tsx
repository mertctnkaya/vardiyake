import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabaseClient';

export default function Calculations() {
  const { settings, user, setSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState<'tools' | 'payroll'>('payroll');

  const [targetSalary, setTargetSalary] = useState('');
  const [calcResults, setCalcResults] = useState<{ daily: number, hourly: number, overtime: number } | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [payrollDate, setPayrollDate] = useState(new Date());
  const [isLoadingPayroll, setIsLoadingPayroll] = useState(false);

  const [payrollData, setPayrollData] = useState({
    basePay: 0,
    overtimePay: 0,
    nightBonusPay: 0,
    holidayWorkPay: 0, // YENİ: Resmi Tatil Mesaisi 
    absentDeduction: 0, 
    lateDeduction: 0,   
    netTotal: 0,
    stats: { paidDays: 0, overtimeHours: 0, lateHours: 0, nightShifts: 0, absentDays: 0, weekendDays: 0, holidayWorkDays: 0 }
  });

  const calculateFromSalary = () => {
    const salary = Number(targetSalary);
    if (!salary || salary <= 0) return;

    const dailyWage = salary / 30;
    const baseHours = settings?.base_work_hours ? Number(settings.base_work_hours) : 7.5;
    const hourlyWage = dailyWage / baseHours;
    const overtimeWage = hourlyWage * 1.5;

    setCalcResults({
      daily: Number(dailyWage.toFixed(2)),
      hourly: Number(hourlyWage.toFixed(2)),
      overtime: Number(overtimeWage.toFixed(2))
    });
  };

  const applyCalculatedSettings = async () => {
    if (!user || !calcResults) return;
    setIsSavingSettings(true);

    const payload = {
      user_id: user.id,
      daily_wage: calcResults.daily,
      hourly_overtime: calcResults.overtime,
      updated_at: new Date().toISOString()
    };

    const { error, data } = await supabase.from('user_settings').upsert(payload).select().single();

    if (!error && data) {
      setSettings(data);
      setFeedback({ type: 'success', message: 'Katsayılar ayarlarınıza başarıyla kaydedildi!' });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: 'error', message: 'Kaydedilirken bir hata oluştu.' });
      setTimeout(() => setFeedback(null), 3000);
    }
    setIsSavingSettings(false);
  };

  const generatePayroll = async () => {
    if (!user || !settings) return;
    setIsLoadingPayroll(true);

    try {
      const year = payrollDate.getFullYear();
      const month = payrollDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      const { data: logs } = await supabase
        .from('work_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('log_date', firstDayStr)
        .lte('log_date', lastDayStr);

      const logsMap: Record<string, any> = {};
      if (logs) logs.forEach(log => logsMap[log.log_date] = log);

      const dailyWage = Number(settings.daily_wage) || 0;
      const hourlyOvertime = Number(settings.hourly_overtime) || 0;
      const baseWorkHours = Number(settings.base_work_hours) || 7.5; 
      const nightBonusPercent = Number(settings.night_bonus_percent) || 0;
      const holidayMultiplier = Number(settings.holiday_multiplier) || 2; // YENİ

      const hourlyWage = dailyWage / baseWorkHours; 
      const hourlyNightBonus = hourlyWage * (nightBonusPercent / 100);

      const empDateStr = settings.employment_start_date || '2026-06-09';
      const [eYear, eMonth, eDay] = empDateStr.split('-').map(Number);
      const employmentStart = new Date(eYear, eMonth - 1, eDay);
      
      const epDateStr = settings.shift_epoch_date || '2026-07-06';
      const [epYear, epMonth, epDay] = epDateStr.split('-').map(Number);
      const epochDate = new Date(epYear, epMonth - 1, epDay);
      
      const workType = settings.work_type || '3-shift';
      const isSaturdayWork = settings.is_saturday_workday || false;
      const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

      let stats = { paidDays: 0, overtimeHours: 0, lateHours: 0, nightShifts: 0, absentDays: 0, weekendDays: 0, holidayWorkDays: 0 };
      let overtimePay = 0;
      let holidayWorkPay = 0;
      let absentDeduction = 0; 
      let lateDeduction = 0;   
      
      const actualToday = new Date();
      actualToday.setHours(0, 0, 0, 0);

      for (let i = 1; i <= daysInMonth; i++) {
        const currentDate = new Date(year, month, i);
        if (currentDate < employmentStart) continue;

        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const log = logsMap[dateKey];
        
        const dayOfWeek = currentDate.getDay();
        const isSunday = dayOfWeek === 0;
        const isSaturday = dayOfWeek === 6;
        const isOffDay = workType === 'fixed' ? (isSunday || (!isSaturdayWork && isSaturday)) : isSunday;

        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(currentDate);
        monday.setDate(currentDate.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);

        const diffMs = monday.getTime() - epochDate.getTime();
        const deltaWeeks = Math.floor(diffMs / MS_PER_WEEK);
        
        let isNightShift = false;
        if (workType === '3-shift' && (((deltaWeeks % 3) + 3) % 3) === 1 && !isOffDay) isNightShift = true;
        if (workType === '2-shift' && (((deltaWeeks % 2) + 2) % 2) === 1 && !isOffDay) isNightShift = true;

        if (log) {
          if (log.status === 'absent') {
            stats.absentDays += 1;
            absentDeduction += dailyWage; 
          } 
          else if (log.status === 'late' || log.status === 'partial_leave') {
            stats.paidDays += 1;
            const hours = Number(log.hours) || 0;
            stats.lateHours += hours;
            lateDeduction += (hours * hourlyWage); 
            if (isNightShift) stats.nightShifts += 1; 
          } 
          else if (log.status === 'overtime') {
            stats.paidDays += 1;
            const hours = Number(log.hours) || 0;
            stats.overtimeHours += hours;
            overtimePay += (hours * hourlyOvertime);
            if (isNightShift) stats.nightShifts += 1;
          } 
          else if (log.status === 'holiday_work') { // YENİ EKLENDİ
            stats.paidDays += 1;
            stats.holidayWorkDays += 1;
            holidayWorkPay += (dailyWage * holidayMultiplier); // Normal yevmiyeye ek tatil yevmiyesi
            if (isNightShift) stats.nightShifts += 1;
          }
          else if (log.status === 'normal' || log.status === 'leave' || log.status === 'annual_leave') {
            stats.paidDays += 1;
            if (isNightShift) stats.nightShifts += 1;
          }
        } else {
          // Log yoksa ama gün yaşanmışsa
          if (currentDate <= actualToday) {
            if (!isOffDay) {
              stats.paidDays += 1;
              if (isNightShift) stats.nightShifts += 1;
            } else {
              stats.weekendDays += 1;
            }
          }
        }
      }

      const totalPaidDays = stats.paidDays + stats.weekendDays;
      const basePay = totalPaidDays * dailyWage;
      const nightBonusPay = stats.nightShifts * baseWorkHours * hourlyNightBonus;
      const totalDeductions = lateDeduction; // Devamsızlık çift kesilmez
      
      const netTotal = basePay + overtimePay + holidayWorkPay + nightBonusPay - totalDeductions;

      setPayrollData({
        basePay: isNaN(basePay) ? 0 : basePay,
        overtimePay: isNaN(overtimePay) ? 0 : overtimePay,
        nightBonusPay: isNaN(nightBonusPay) ? 0 : nightBonusPay,
        holidayWorkPay: isNaN(holidayWorkPay) ? 0 : holidayWorkPay,
        absentDeduction: isNaN(absentDeduction) ? 0 : absentDeduction,
        lateDeduction: isNaN(lateDeduction) ? 0 : lateDeduction,
        netTotal: isNaN(netTotal) ? 0 : netTotal,
        stats
      });

    } catch (err) {
      console.error("Bordro hesaplama hatası:", err);
    } finally {
      setIsLoadingPayroll(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'payroll') {
      generatePayroll();
    }
  }, [payrollDate, activeTab, settings]);

  return (
    <div className="flex flex-col items-center animate-fade-in w-full pb-10">
      
      <div className="w-full max-w-4xl mb-6 px-2">
        <h2 className="text-3xl font-bold text-base-content">Hesaplamalar</h2>
        <p className="text-base-content/60 mt-1">Bordro analizi ve katsayı araçları.</p>
      </div>

      <div className="w-full max-w-4xl px-2 mb-6">
        <div className="tabs tabs-boxed bg-[#16191d] p-1 border border-base-300">
          <a 
            className={`tab tab-lg ${activeTab === 'payroll' ? 'bg-indigo-600 text-white' : 'text-base-content/60 hover:text-white transition-colors'}`} 
            onClick={() => setActiveTab('payroll')}
          >
            Aylık Bordro Motoru
          </a>
          <a 
            className={`tab tab-lg ${activeTab === 'tools' ? 'bg-indigo-600 text-white' : 'text-base-content/60 hover:text-white transition-colors'}`} 
            onClick={() => setActiveTab('tools')}
          >
            Maaştan Yevmiye Bulma
          </a>
        </div>
      </div>

      {activeTab === 'payroll' && (
        <div className="w-full max-w-4xl space-y-6 animate-fade-in">
          
          <div className="bg-[#16191d] rounded-xl border border-base-300 p-4 flex justify-between items-center shadow-lg">
            <button onClick={() => setPayrollDate(new Date(payrollDate.getFullYear(), payrollDate.getMonth() - 1, 1))} className="btn btn-sm btn-ghost hover:bg-base-200">
              &laquo; Önceki Ay
            </button>
            <h3 className="text-xl font-bold text-base-content">
              {new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(payrollDate)} Bordrosu
            </h3>
            <button onClick={() => setPayrollDate(new Date(payrollDate.getFullYear(), payrollDate.getMonth() + 1, 1))} className="btn btn-sm btn-ghost hover:bg-base-200">
              Sonraki Ay &raquo;
            </button>
          </div>

          {isLoadingPayroll ? (
            <div className="flex justify-center py-20">
              <span className="loading loading-spinner loading-lg text-indigo-500"></span>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-br from-indigo-900/40 to-[#16191d] rounded-2xl border border-indigo-500/30 p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="relative z-10">
                  <p className="text-indigo-300 font-medium mb-1">Tahmini Net Hakediş</p>
                  <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight">
                    {payrollData.netTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-3xl text-indigo-400">₺</span>
                  </h1>
                  <p className="text-sm text-base-content/50 mt-2">Bu tutar girdiğiniz günlük net yevmiye ({settings?.daily_wage} ₺) üzerinden hesaplanmıştır.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-[#16191d] rounded-xl border border-base-300 p-6 shadow-lg">
                  <h4 className="font-bold text-emerald-400 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Hakediş Detayları
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end border-b border-base-300/50 pb-2">
                      <div>
                        <p className="text-base-content/80 font-medium">Normal Mesai ({payrollData.stats.paidDays} Gün)</p>
                      </div>
                      <span className="font-bold text-base-content">+{((payrollData.stats.paidDays) * (Number(settings?.daily_wage) || 0)).toFixed(2)} ₺</span>
                    </div>

                    <div className="flex justify-between items-end border-b border-base-300/50 pb-2">
                      <div>
                        <p className="text-base-content/80 font-medium">Hafta Tatili ({payrollData.stats.weekendDays} Gün)</p>
                      </div>
                      <span className="font-bold text-base-content">+{((payrollData.stats.weekendDays) * (Number(settings?.daily_wage) || 0)).toFixed(2)} ₺</span>
                    </div>
                    
                    <div className="flex justify-between items-end border-b border-base-300/50 pb-2">
                      <div>
                        <p className="text-base-content/80 font-medium">Fazla Mesai ({payrollData.stats.overtimeHours} Saat)</p>
                      </div>
                      <span className="font-bold text-emerald-400">+{payrollData.overtimePay.toFixed(2)} ₺</span>
                    </div>

                    {payrollData.stats.holidayWorkDays > 0 && (
                      <div className="flex justify-between items-end border-b border-base-300/50 pb-2">
                        <div>
                          <p className="text-base-content/80 font-medium">Resmi Tatil Mesaisi ({payrollData.stats.holidayWorkDays} Gün)</p>
                        </div>
                        <span className="font-bold text-emerald-400">+{payrollData.holidayWorkPay.toFixed(2)} ₺</span>
                      </div>
                    )}

                    <div className="flex justify-between items-end pb-2">
                      <div>
                        <p className="text-base-content/80 font-medium">Gece Zammı ({payrollData.stats.nightShifts} Gece - %{settings?.night_bonus_percent || 0})</p>
                      </div>
                      <span className="font-bold text-emerald-400">+{payrollData.nightBonusPay.toFixed(2)} ₺</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#16191d] rounded-xl border border-base-300 p-6 shadow-lg relative">
                  <h4 className="font-bold text-red-400 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    Kesintiler
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end border-b border-base-300/50 pb-2">
                      <div>
                        <p className="text-base-content/80 font-medium">Devamsızlık ({payrollData.stats.absentDays} Gün)</p>
                      </div>
                      <span className="font-bold text-base-content/40 line-through">
                        {payrollData.absentDeduction > 0 ? '-' : ''}{payrollData.absentDeduction.toFixed(2)} ₺
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-end pb-2">
                      <div>
                        <p className="text-base-content/80 font-medium">Geç Kalma / Erken Çıkma ({payrollData.stats.lateHours} Saat)</p>
                      </div>
                      <span className="font-bold text-red-400">
                        {payrollData.lateDeduction > 0 ? '-' : ''}{payrollData.lateDeduction.toFixed(2)} ₺
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-xs text-warning/80 bg-warning/10 p-2 rounded leading-tight">
                    * İşlenmeyen devamsızlık kesintisi: Devamsız olduğunuz günler zaten hakedişinize (Normal Mesai günlerine) eklenmediği için, maaşınızdan ikinci kez <strong>kesilmez.</strong> Sadece bilgi amaçlı gösterilir.
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'tools' && (
        <div className="w-full max-w-4xl bg-[#16191d] rounded-xl shadow-2xl border border-base-300 p-6 sm:p-8 animate-fade-in">
          
          {feedback && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border shadow-sm ${feedback.type === 'success' ? 'bg-green-900/30 border-green-500/30 text-green-400' : 'bg-red-900/30 border-red-500/30 text-red-400'}`}>
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-indigo-400 mb-2">Hedef Net Maaşınız</h3>
              <p className="text-sm text-base-content/60 mb-6">Aylık net gelirinizi yazın, sistem 30 gün üzerinden günlük yevmiyenizi hesaplasın.</p>
              
              <div className="form-control w-full mb-4">
                <label className="input input-bordered flex items-center gap-2 bg-[#1e2329] focus-within:ring-2 focus-within:ring-indigo-500 border-base-300 h-14">
                  <span className="text-indigo-400 font-bold text-lg">₺</span>
                  <input 
                    type="number" 
                    className="grow text-lg font-bold" 
                    placeholder="Örn: 33750" 
                    value={targetSalary}
                    onChange={(e) => setTargetSalary(e.target.value)}
                  />
                </label>
              </div>
              <button 
                onClick={calculateFromSalary}
                className="btn w-full bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-lg shadow-indigo-900/40"
              >
                Katsayıları Çözümle
              </button>
            </div>

            <div className="bg-[#1e2329] rounded-xl border border-base-300 p-6 flex flex-col justify-center">
              {calcResults ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-base-300 pb-3">
                    <span className="text-base-content/70 font-medium">Günlük Net Yevmiye (30 Gün):</span>
                    <span className="text-xl font-bold text-emerald-400">{calcResults.daily} ₺</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-base-300 pb-3">
                    <span className="text-base-content/70 font-medium">1 Saatlik Net Ücret ({settings?.base_work_hours || 7.5} Saat):</span>
                    <span className="text-xl font-bold text-blue-400">{calcResults.hourly} ₺</span>
                  </div>
                  <div className="flex justify-between items-center pb-2">
                    <span className="text-base-content/70 font-medium">1 Saatlik Fazla Mesai (%50):</span>
                    <span className="text-xl font-bold text-indigo-400">{calcResults.overtime} ₺</span>
                  </div>

                  <button 
                    onClick={applyCalculatedSettings}
                    disabled={isSavingSettings}
                    className="btn btn-outline border-indigo-500 text-indigo-400 hover:bg-indigo-600 hover:text-white w-full mt-4"
                  >
                    {isSavingSettings ? <span className="loading loading-spinner"></span> : 'Bunu Ayarlarıma Kaydet'}
                  </button>
                </div>
              ) : (
                <div className="text-center text-base-content/40 py-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  <p>Maaşınızı yazıp hesapla butonuna basın.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}