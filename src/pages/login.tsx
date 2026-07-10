import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Giriş yapılıyor:', { email, password });
  };

  return (
    <div className="flex flex-col items-center justify-center animate-fade-in w-full mt-10 sm:mt-20 px-4">
      <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl border border-base-300 overflow-hidden">
        
        <div className="bg-base-200 border-b border-base-300 p-6 text-center">
          <h2 className="text-3xl font-black text-indigo-500 tracking-wide">Vardiyake</h2>
          <p className="text-sm text-base-content/60 mt-2">Hesabınıza giriş yapın</p>
        </div>

        <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-6">
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
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-bold text-base-content/80">Şifre</span>
            </label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="input input-bordered w-full bg-base-200 focus:ring-2 focus:ring-indigo-500 transition-all" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label className="label mt-1">
              <a href="#" className="label-text-alt text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Şifremi Unuttum
              </a>
            </label>
          </div>

          <button type="submit" className="btn w-full bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-lg shadow-indigo-900/50 mt-4">
            Giriş Yap
          </button>
        </form>

        <div className="bg-base-200 border-t border-base-300 p-4 text-center">
          <p className="text-sm text-base-content/70">
            Hesabınız yok mu?{' '}
            <Link to="/register" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
              Hemen Kayıt Olun
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}