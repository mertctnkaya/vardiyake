export default function Calculations() {
  return (
    <div className="flex flex-col items-center animate-fade-in w-full">
      <div className="w-full max-w-2xl bg-base-100 rounded-xl shadow-2xl border border-base-300 p-8 text-center">
        <h2 className="text-3xl font-bold text-primary mb-4">Aylık Rapor & Bordro</h2>
        <p className="text-base-content/70 text-lg mb-6">
          Mesai ve devamsızlık durumlarına göre hesaplanan tahmini maaş dökümü burada yer alacak.
        </p>
        
        <div className="alert alert-info shadow-lg flex justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>Bu modül, veritabanı entegrasyonu tamamlandıktan sonra aktif edilecektir.</span>
        </div>
      </div>
    </div>
  );
}