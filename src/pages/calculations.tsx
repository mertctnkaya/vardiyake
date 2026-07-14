import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabaseClient';

// Devletin Yasal Kesinti Oranları ve İstisnaları (Bordrodan Alınan)
const CONSTANTS = {
  SGK_RATE: 0.14,
  UNEMPLOYMENT_RATE: 0.01,
  STAMP_TAX_RATE: 0.00759,
  TAX_RATE_TIER_1: 0.15,
  MIN_WAGE_GV_EXEMPTION: 4211.33,
  MIN_WAGE_DV_EXEMPTION: 250.70
};

export default function Calculations() {
  const { settings, user, setSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState<'payroll' | 'annual_leave' | 'tools'>('payroll');
  const [showTaxes, setShowTaxes] = useState(false); // Brüt/Net Toggle

  const [payrollDate, setPayrollDate] = useState(new Date());
  const [isLoadingPayroll, setIsLoadingPayroll] = useState(false);
  const [fetchedLogs, setFetchedLogs] = useState<any[]>([]); 

  // SADECE GEREKLİ KULLANICI GİRDİLERİ (Focus bug'ı çözüldü)
  const [extraDeductions, setExtraDeductions] = useState(''); 
  const [extraIncome, setExtraIncome] = useState('');

  // ARAÇLAR İÇİN GİRDİLER
  const [targetSalary, setTargetSalary] = useState('');
  const [calcResults, setCalcResults] = useState<{ daily: number, hourly: number, overtime: number } | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [payrollData, setPayrollData] = useState({
    basePay: 0,
    overtimePay: 0,
    nightBonusPay: 0,
    holidayWorkPay: 0,
    absentDeduction: 0, 
    lateDeduction: 0,   
    netTotal: 0,
    calculatedNightHours: 0,
    estimatedTaxes: { gross: 0, sgk: 0, unemployment: 0, incomeTax: 0, stampTax: 0 },
    stats: { basePayrollDays: 0, overtimeHours: 0, lateHours: 0, absentDays: 0, holidayWorkDays: 0, annualLeaveDays: 0 }
  });

  const fetchWorkLogs = async () => {
    if (!user) return;
    setIsLoadingPayroll(true);
    try {
      const year = payrollDate.getFullYear();
      const month = payrollDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      const { data: logs } = await supabase.from('work_logs').select('*').eq('user_id', user.id).gte('log_date', firstDayStr).lte('log_date', lastDayStr);
      setFetchedLogs(logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPayroll(false);
    }
  };

  const calculatePayrollMotor = () => {
    if (!settings) return;

    const year = payrollDate.getFullYear();
    const month = payrollDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const logsMap: Record<string, any> = {};
    fetchedLogs.forEach(log => logsMap[log.log_date] = log);

    const dailyWage = Number(settings.daily_wage) || 0;
    const baseWorkHours = Number(settings.base_work_hours) || 7.5; 
    const hourlyWage = dailyWage / baseWorkHours; 
    
    const hourlyOvertime = Number(settings.hourly_overtime) || (hourlyWage * 1.5);
    const nightBonusPercent = Number(settings.night_bonus_percent) || 0;
    const hourlyNightBonus = hourlyWage * (nightBonusPercent / 100);
    const holidayMultiplier = Number(settings.holiday_multiplier) || 2; 

    const empDateStr = settings.employment_start_date || '2026-06-09';
    const [eYear, eMonth, eDay] = empDateStr.split('-').map(Number);
    const employmentStart = new Date(eYear, eMonth - 1, eDay);
    
    const epDateStr = settings.shift_epoch_date || '2026-07-06';
    const [epYear, epMonth, epDay] = epDateStr.split('-').map(Number);
    const epochDate = new Date(epYear, epMonth - 1, epDay);
    
    const workType = settings.work_type || '3-shift';
    const isSaturdayWork = settings.is_saturday_workday || false;
    const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

    let stats = { basePayrollDays: 0, overtimeHours: 0, lateHours: 0, absentDays: 0, holidayWorkDays: 0, annualLeaveDays: 0 };
    let calculatedNightHours = 0;

    // 1. GÜN SAYIM DÖNGÜSÜ
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month, i);
      
      if (currentDate >= employmentStart) {
        stats.basePayrollDays++; // İşe başladığı günden itibaren her gün taban maaşa eklenir
      } else {
        continue;
      }

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
      let isEveningShift = false;
      if (workType === '3-shift') {
          const shiftIndex = ((deltaWeeks % 3) + 3) % 3;
          if (shiftIndex === 1 && !isOffDay) isNightShift = true;
          if (shiftIndex === 2 && !isOffDay) isEveningShift = true;
      }

      const processNightHours = () => {
          if (isNightShift) calculatedNightHours += 6; 
          if (isEveningShift) calculatedNightHours += 4; 
      };

      if (log) {
        if (log.status === 'absent') stats.absentDays++;
        else if (log.status === 'late' || log.status === 'partial_leave') {
          stats.lateHours += (Number(log.hours) || 0);
          processNightHours();
        } 
        else if (log.status === 'overtime') {
          stats.overtimeHours += (Number(log.hours) || 0);
          processNightHours();
        } 
        else if (log.status === 'holiday_work') {
          stats.holidayWorkDays++;
          processNightHours();
        }
        else if (log.status === 'annual_leave') {
          stats.annualLeaveDays++;
        }
        else if (log.status === 'normal' || log.status === 'leave') {
          processNightHours();
        }
      } else {
        if (currentDate <= new Date()) {
          if (!isOffDay) processNightHours();
        }
      }
    }

    // 2. MATEMATİK MOTORU (Tamamen Kullanıcının Girdiği NET Üzerinden)
    
    // Türkiye'de tam aylar genelde 30 gün kabul edilir. 
    // Eğer tüm ay çalıştıysa 30, ay ortası girdiyse çalıştığı gün kadar.
    const finalBaseDays = (stats.basePayrollDays === daysInMonth) ? 30 : stats.basePayrollDays;
    
    const basePay = finalBaseDays * dailyWage;
    const absentDeduction = stats.absentDays * dailyWage;
    const lateDeduction = stats.lateHours * hourlyWage;
    
    const overtimePay = stats.overtimeHours * hourlyOvertime;
    const holidayWorkPay = stats.holidayWorkDays * dailyWage * holidayMultiplier;
    const nightBonusPay = calculatedNightHours * hourlyNightBonus;
    
    const extDeduct = Number(extraDeductions) || 0;
    const extInc = Number(extraIncome) || 0;

    const netTotal = basePay - absentDeduction - lateDeduction + overtimePay + holidayWorkPay + nightBonusPay + extInc - extDeduct;

    // 3. TERSİNE BRÜT VE VERGİ HESAPLAMASI (Sadece Merak Edenlere)
    // Brüt = Net / ~0.7149 (Asgari ücret istisnası dahil yaklaşık oran)
    let estimatedGross = 0;
    if (netTotal > 4462.03) {
       estimatedGross = (netTotal - 4462.03) / 0.71491;
    } else {
       estimatedGross = netTotal / 0.85; 
    }

    const sgkCut = estimatedGross * CONSTANTS.SGK_RATE;
    const unempCut = estimatedGross * CONSTANTS.UNEMPLOYMENT_RATE;
    const taxBase = estimatedGross - sgkCut - unempCut;
    
    const incomeTaxCut = Math.max(0, (taxBase * CONSTANTS.TAX_RATE_TIER_1) - CONSTANTS.MIN_WAGE_GV_EXEMPTION);
    const stampTaxCut = Math.max(0, (estimatedGross * CONSTANTS.STAMP_TAX_RATE) - CONSTANTS.MIN_WAGE_DV_EXEMPTION);

    setPayrollData({
      basePay: isNaN(basePay) ? 0 : basePay,
      overtimePay: isNaN(overtimePay) ? 0 : overtimePay,
      nightBonusPay: isNaN(nightBonusPay) ? 0 : nightBonusPay,
      holidayWorkPay: isNaN(holidayWorkPay) ? 0 : holidayWorkPay,
      absentDeduction: isNaN(absentDeduction) ? 0 : absentDeduction,
      lateDeduction: isNaN(lateDeduction) ? 0 : lateDeduction,
      calculatedNightHours,
      netTotal: isNaN(netTotal) ? 0 : netTotal,
      estimatedTaxes: {
        gross: isNaN(estimatedGross) ? 0 : estimatedGross,
        sgk: isNaN(sgkCut) ? 0 : sgkCut,
        unemployment: isNaN(unempCut) ? 0 : unempCut,
        incomeTax: isNaN(incomeTaxCut) ? 0 : incomeTaxCut,
        stampTax: isNaN(stampTaxCut) ? 0 : stampTaxCut
      },
      stats: { ...stats, basePayrollDays: finalBaseDays }
    });
  };

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
    }
    setIsSavingSettings(false);
  };

  useEffect(() => {
    if (activeTab === 'payroll') fetchWorkLogs();
  }, [payrollDate, activeTab]);

  useEffect(() => {
    calculatePayrollMotor();
  }, [fetchedLogs, settings, extraDeductions, extraIncome]);

  return (
    <div className="flex flex-col items-center animate-fade-in w-full pb-10">
      
      <div className="w-full max-w-5xl mb-6 px-2 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-base-content">Hesaplamalar</h2>
          <p className="text-base-content/60 mt-1">Sizi yormayan, net ve anlaşılır bordro yönetim ekranı.</p>
        </div>
      </div>

      <div className="w-full max-w-5xl px-2 mb-6">
        <div className="tabs tabs-boxed bg-[#16191d] p-1 border border-base-300">
          <a className={`tab tab-lg ${activeTab === 'payroll' ? 'bg-indigo-600 text-white' : 'text-base-content/60 hover:text-white transition-colors'}`} onClick={() => setActiveTab('payroll')}>Net Bordro Motoru</a>
          <a className={`tab tab-lg ${activeTab === 'annual_leave' ? 'bg-indigo-600 text-white' : 'text-base-content/60 hover:text-white transition-colors'}`} onClick={() => setActiveTab('annual_leave')}>Yıllık İzin Panosu</a>
          <a className={`tab tab-lg ${activeTab === 'tools' ? 'bg-indigo-600 text-white' : 'text-base-content/60 hover:text-white transition-colors'}`} onClick={() => setActiveTab('tools')}>Maaştan Yevmiye Bul</a>
        </div>
      </div>

      {activeTab === 'payroll' && (
        <div className="w-full max-w-5xl space-y-6 animate-fade-in">
          
          <div className="bg-[#16191d] rounded-xl border border-base-300 p-4 flex justify-between items-center shadow-lg">
            <button onClick={() => setPayrollDate(new Date(payrollDate.getFullYear(), payrollDate.getMonth() - 1, 1))} className="btn btn-sm btn-ghost hover:bg-base-200">&laquo; Önceki Ay</button>
            <h3 className="text-xl font-bold text-base-content">{new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(payrollDate)} Bordrosu</h3>
            <button onClick={() => setPayrollDate(new Date(payrollDate.getFullYear(), payrollDate.getMonth() + 1, 1))} className="btn btn-sm btn-ghost hover:bg-base-200">Sonraki Ay &raquo;</button>
          </div>

          {/* SADECE EKSTRA GİRDİLER (Focus Kaybı Yok) */}
          <div className="bg-[#1e2329] p-5 rounded-xl border border-base-300 shadow-md grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
             <div>
               <label className="text-xs font-bold text-base-content/60 block mb-1">Özel Kesinti (Örn: BES, İcra vb.)</label>
               <div className="relative">
                 <span className="absolute left-3 top-2 text-base-content/50">₺</span>
                 <input type="number" placeholder="Yoksa boş bırakın" value={extraDeductions} onChange={(e) => setExtraDeductions(e.target.value)} className="input input-bordered w-full bg-base-100 pl-7" />
               </div>
             </div>
             <div>
               <label className="text-xs font-bold text-base-content/60 block mb-1">Ek Kazanç (Örn: Prim, Bayram Harçlığı)</label>
               <div className="relative">
                 <span className="absolute left-3 top-2 text-base-content/50">₺</span>
                 <input type="number" placeholder="Yoksa boş bırakın" value={extraIncome} onChange={(e) => setExtraIncome(e.target.value)} className="input input-bordered w-full bg-base-100 pl-7" />
               </div>
             </div>
          </div>

          {isLoadingPayroll ? (
            <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-indigo-500"></span></div>
          ) : (
            <>
              {/* ANA MAAŞ KARTI */}
              <div className="bg-gradient-to-br from-indigo-900/40 to-[#16191d] rounded-2xl border border-indigo-500/30 p-8 shadow-2xl relative overflow-hidden text-center sm:text-left">
                <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <p className="text-indigo-300 font-medium mb-1">Net Yatan Maaş (Hesabınıza Geçecek Tutar)</p>
                    <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight">
                      {payrollData.netTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-3xl text-indigo-400">₺</span>
                    </h1>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer flex flex-col gap-2 bg-base-200/50 p-3 rounded-xl border border-indigo-500/30 hover:bg-base-200 transition-colors">
                      <span className="label-text font-bold text-indigo-200">Yasal Vergileri Göster</span> 
                      <input type="checkbox" className="toggle toggle-primary" checked={showTaxes} onChange={() => setShowTaxes(!showTaxes)} />
                    </label>
                  </div>
                </div>
              </div>

              {/* DETAY TABLOLARI (NET) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* HAKEDİŞLER */}
                <div className="bg-[#16191d] rounded-xl border border-base-300 shadow-lg overflow-hidden">
                  <div className="bg-emerald-900/20 p-4 border-b border-base-300 flex items-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                     <h4 className="font-bold text-emerald-400">Net Gelirler (Hakedişler)</h4>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-end border-b border-base-300/50 pb-2">
                      <p className="text-base-content/80 font-medium">Taban Maaş ({payrollData.stats.basePayrollDays} Gün)</p>
                      <span className="font-bold text-base-content">+{payrollData.basePay.toFixed(2)} ₺</span>
                    </div>

                    {payrollData.stats.overtimeHours > 0 && (
                      <div className="flex justify-between items-end border-b border-base-300/50 pb-2">
                        <p className="text-base-content/80 font-medium">Fazla Mesai ({payrollData.stats.overtimeHours} Saat)</p>
                        <span className="font-bold text-emerald-400">+{payrollData.overtimePay.toFixed(2)} ₺</span>
                      </div>
                    )}

                    {payrollData.stats.holidayWorkDays > 0 && (
                      <div className="flex justify-between items-end border-b border-base-300/50 pb-2">
                        <p className="text-base-content/80 font-medium">Resmi Tatil Mesaisi ({payrollData.stats.holidayWorkDays} Gün)</p>
                        <span className="font-bold text-emerald-400">+{payrollData.holidayWorkPay.toFixed(2)} ₺</span>
                      </div>
                    )}

                    <div className="flex justify-between items-end pb-2">
                      <p className="text-base-content/80 font-medium">Gece Zammı ({payrollData.calculatedNightHours} Saat / %{settings?.night_bonus_percent || 0})</p>
                      <span className="font-bold text-emerald-400">+{payrollData.nightBonusPay.toFixed(2)} ₺</span>
                    </div>
                  </div>
                </div>

                {/* KESİNTİLER (Senin İstediğin Mantık) */}
                <div className="bg-[#16191d] rounded-xl border border-base-300 shadow-lg overflow-hidden relative">
                  <div className="bg-red-900/20 p-4 border-b border-base-300 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    <h4 className="font-bold text-red-400">Net Kesintiler</h4>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-end border-b border-base-300/50 pb-2">
                      <p className="text-base-content/80 font-medium">Devamsızlık ({payrollData.stats.absentDays} Gün)</p>
                      <span className="font-bold text-red-400">
                        -{payrollData.absentDeduction.toFixed(2)} ₺
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-end border-b border-base-300/50 pb-2">
                      <p className="text-base-content/80 font-medium">Geç Kalma / Erken Çıkma ({payrollData.stats.lateHours} Saat)</p>
                      <span className="font-bold text-red-400">
                        -{payrollData.lateDeduction.toFixed(2)} ₺
                      </span>
                    </div>

                    <div className="flex justify-between items-end pb-2">
                      <p className="text-base-content/80 font-medium">Özel Kesintiler (BES, İcra)</p>
                      <span className="font-bold text-red-400">
                        -{Number(extraDeductions) ? Number(extraDeductions).toFixed(2) : '0.00'} ₺
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* DEVLET VERGİLERİ (TOGGLE İLE AÇILIR) */}
              {showTaxes && (
                 <div className="bg-[#1e2329] rounded-xl border border-indigo-500/30 shadow-lg p-6 animate-fade-in">
                    <h4 className="font-bold text-indigo-400 mb-4 border-b border-base-300 pb-2">Tahmini Brüt ve Yasal Kesintiler (Bilgi Amaçlı)</h4>
                    <p className="text-sm text-base-content/60 mb-6">Net maaşınızdan yola çıkılarak tersine hesaplanan yasal kesintilerdir. Bu kesintiler size ödenen net tutarın içinde zaten eritilmiştir, maaşınızdan tekrar <strong>kesilmez.</strong></p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                       <div className="bg-base-200 p-3 rounded-lg border border-base-300">
                         <p className="text-base-content/60 mb-1">Brüt Maaşınız</p>
                         <p className="font-bold text-emerald-400">{payrollData.estimatedTaxes.gross.toFixed(2)} ₺</p>
                       </div>
                       <div className="bg-base-200 p-3 rounded-lg border border-base-300">
                         <p className="text-base-content/60 mb-1">SGK İşçi Primi (%14)</p>
                         <p className="font-bold text-red-400">-{payrollData.estimatedTaxes.sgk.toFixed(2)} ₺</p>
                       </div>
                       <div className="bg-base-200 p-3 rounded-lg border border-base-300">
                         <p className="text-base-content/60 mb-1">İşsizlik Primi (%1)</p>
                         <p className="font-bold text-red-400">-{payrollData.estimatedTaxes.unemployment.toFixed(2)} ₺</p>
                       </div>
                       <div className="bg-base-200 p-3 rounded-lg border border-base-300">
                         <p className="text-base-content/60 mb-1">Gelir Vergisi</p>
                         <p className="font-bold text-red-400">-{payrollData.estimatedTaxes.incomeTax.toFixed(2)} ₺</p>
                       </div>
                       <div className="bg-base-200 p-3 rounded-lg border border-base-300">
                         <p className="text-base-content/60 mb-1">Damga Vergisi</p>
                         <p className="font-bold text-red-400">-{payrollData.estimatedTaxes.stampTax.toFixed(2)} ₺</p>
                       </div>
                    </div>
                 </div>
              )}

            </>
          )}
        </div>
      )}

      {/* ARAÇLAR SEKME İÇERİĞİ (GERİ GELDİ) */}
      {activeTab === 'tools' && (
        <div className="w-full max-w-5xl bg-[#16191d] rounded-xl shadow-2xl border border-base-300 p-6 sm:p-8 animate-fade-in">
          {feedback && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border shadow-sm ${feedback.type === 'success' ? 'bg-green-900/30 border-green-500/30 text-green-400' : 'bg-red-900/30 border-red-500/30 text-red-400'}`}>
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-indigo-400 mb-2">Hedef Maaştan Yevmiye Bulma</h3>
              <p className="text-sm text-base-content/60 mb-6">Aylık net gelirinizi yazın, sistem 30 gün üzerinden günlük net yevmiyenizi hesaplayıp ayarlarınıza kaydetsin.</p>
              
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
              <button onClick={calculateFromSalary} className="btn w-full bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-lg shadow-indigo-900/40">
                Katsayıları Çözümle
              </button>
            </div>

            <div className="bg-[#1e2329] rounded-xl border border-base-300 p-6 flex flex-col justify-center">
              {calcResults ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-base-300 pb-3">
                    <span className="text-base-content/70 font-medium">Günlük Net Yevmiye:</span>
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

                  <button onClick={applyCalculatedSettings} disabled={isSavingSettings} className="btn btn-outline border-indigo-500 text-indigo-400 hover:bg-indigo-600 hover:text-white w-full mt-4">
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

      {/* YILLIK İZİN SEKME İÇERİĞİ */}
      {activeTab === 'annual_leave' && (
        <div className="w-full max-w-5xl bg-[#1e2329] rounded-xl border border-base-300 p-8 text-center animate-fade-in">
           <h3 className="text-2xl font-bold text-purple-400 mb-6">Yıllık İzin Panosu</h3>
           {(() => {
              const start = new Date(settings?.employment_start_date || '2026-06-09');
              const today = new Date();
              const yearsWorked = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
              let earnedLeave = 0;
              for (let i = 1; i <= yearsWorked; i++) {
                 if (i <= 5) earnedLeave += 14;
                 else if (i < 15) earnedLeave += 20;
                 else earnedLeave += 26;
              }
              const usedLeave = payrollData.stats.annualLeaveDays || 0; 
              const remainingLeave = earnedLeave - usedLeave;

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#16191d] p-6 rounded-xl border border-base-300">
                    <p className="text-base-content/60 mb-2">Hakediş Süresi</p>
                    <p className="text-4xl font-bold text-base-content">{yearsWorked} Yıl</p>
                  </div>
                  <div className="bg-[#16191d] p-6 rounded-xl border border-base-300">
                    <p className="text-base-content/60 mb-2">Kullanılan İzin (Bu Ay)</p>
                    <p className="text-4xl font-bold text-warning">{usedLeave} Gün</p>
                  </div>
                  <div className="bg-[#16191d] p-6 rounded-xl border border-base-300 ring-2 ring-purple-500/50">
                    <p className="text-base-content/60 mb-2">Kalan İzin Bakiyesi</p>
                    <p className="text-4xl font-bold text-purple-400">{remainingLeave} Gün</p>
                  </div>
                </div>
              );
           })()}
        </div>
      )}

    </div>
  );
}