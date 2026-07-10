import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password.length < 6) {
      setErrorMsg('Şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMsg('Şifreler eşleşmiyor!');
      return;
    }

    setLoading(true);
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name }
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        setErrorMsg('Bu e-posta adresi zaten kullanımda.');
      } else {
        setErrorMsg(error.message);
      }
      setLoading(false);
    } else {
      setSuccessMsg('Kayıt başarılı! Ayarlar sayfasına yönlendiriliyorsunuz...');
      
      setName('');
      setEmail('');
      setPassword('');
      setPasswordConfirm('');
      
      setTimeout(() => {
        navigate('/settings');
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center animate-fade-in w-full mt-10 sm:mt-12 px-4">
      <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl border border-base-300 overflow-hidden">
        
        <div className="bg-base-200 border-b border-base-300 p-6 text-center">
          <h2 className="text-2xl font-bold text-base-content">Yeni Hesap Oluştur</h2>
          <p className="text-sm text-base-content/60 mt-2">Mesai ve bordro takibine başlamak için kayıt olun.</p>
        </div>

        <form onSubmit={handleRegister} className="p-6 sm:p-8 space-y-4">
          
          {errorMsg && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg flex items-center gap-2 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-900/20 border border-emerald-500/30 text-emerald-400 text-sm p-3 rounded-lg flex items-center gap-2 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-bold text-base-content/80">Ad</span>
            </label>
            <input 
              type="text" 
              placeholder="Örn: Mert" 
              className="input input-bordered w-full bg-base-200 focus:ring-2 focus:ring-indigo-500 transition-all" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading || successMsg.length > 0} // Başarılı olunca form kitlenir
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-bold text-base-content/80">E-posta Adresi</span>
            </label>
            <input 
              type="email" 
              placeholder="ornek@email.com" 
              className="input input-bordered w-full bg-base-200 focus:ring-2 focus:ring-indigo-500 transition-all" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || successMsg.length > 0}
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-bold text-base-content/80">Şifre</span>
            </label>
            <input 
              type="password" 
              placeholder="En az 6 karakter" 
              className="input input-bordered w-full bg-base-200 focus:ring-2 focus:ring-indigo-500 transition-all" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || successMsg.length > 0}
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-bold text-base-content/80">Şifre (Tekrar)</span>
            </label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="input input-bordered w-full bg-base-200 focus:ring-2 focus:ring-indigo-500 transition-all" 
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              disabled={loading || successMsg.length > 0}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || successMsg.length > 0}
            className="btn w-full bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-lg shadow-indigo-900/50 mt-6"
          >
            {loading ? <span className="loading loading-spinner"></span> : 'Kayıt Ol'}
          </button>
        </form>

        <div className="bg-base-200 border-t border-base-300 p-4 text-center">
          <p className="text-sm text-base-content/70">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
              Giriş Yapın
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}