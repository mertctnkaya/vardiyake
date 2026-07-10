import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet, useNavigate } from 'react-router-dom';
import { useShiftCalculator } from './hooks/useShiftCalculator';
import { supabase } from './lib/supabaseClient';
import { useAppStore } from './store/useAppStore';

import CurrentShift from './pages/currentShift';
import NextWeeks from './pages/nextWeeks';
import WorktimeCalendar from './pages/worktimeCalendar';
import Settings from './pages/settings';
import Calculations from './pages/calculations';
import Login from './pages/login';
import Register from './pages/register';

function Layout() {
  const shiftContext = useShiftCalculator();
  const { user, setSession } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadUserSettings(session.user.id); 
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadUserSettings(session.user.id);
      else useAppStore.getState().setSettings(null);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);
  
  const loadUserSettings = async (userId: string) => {
    const { data } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
    if (data) useAppStore.getState().setSettings(data);
  };

  const closeDropdown = () => {
    const elem = document.activeElement as HTMLElement;
    if (elem) elem.blur();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    closeDropdown();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-base-300 flex flex-col items-center">
      <div className="navbar bg-base-100 shadow-xl mb-8 w-full z-50">
        {/* Navbar Start (Aynı kalıyor) */}
        <div className="navbar-start">
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </div>
            
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52 text-base-content border border-base-300">
              <li><Link to="/" onClick={closeDropdown}>Güncel Vardiya</Link></li>
              <li><Link to="/worktime" onClick={closeDropdown}>Mesai Takvimim</Link></li>
              <li><Link to="/next-weeks" onClick={closeDropdown}>Gelecek Haftalar</Link></li>
              <li><Link to="/calculations" onClick={closeDropdown}>Hesaplamalar</Link></li>
              <li><Link to="/settings" onClick={closeDropdown}>Ayarlar</Link></li>
              <div className="divider my-1"></div>
              
              {/* Kullanıcı giriş yapmışsa menüyü değiştir */}
              {user ? (
                <>
                  <li className="menu-title px-4 py-1 text-xs opacity-50">Hesap</li>
                  <li className="px-4 py-2 font-bold text-indigo-400">{user.user_metadata?.name}</li>
                  <li><button onClick={handleLogout} className="text-error">Çıkış Yap</button></li>
                </>
              ) : (
                <>
                  <li><Link to="/login" onClick={closeDropdown} className="text-indigo-400 font-bold">Giriş Yap</Link></li>
                  <li><Link to="/register" onClick={closeDropdown}>Kayıt Ol</Link></li>
                </>
              )}
            </ul>
          </div>
          <Link to="/" className="btn btn-ghost text-xl text-indigo-500 font-black tracking-wide">Vardiyake</Link>
        </div>
        
        {/* Navbar Center (Aynı kalıyor) */}
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1 font-medium text-base-content">
            <li><Link to="/">Güncel Vardiya</Link></li>
            <li><Link to="/worktime">Mesai Takvimim</Link></li>
            <li><Link to="/next-weeks">Gelecek Haftalar</Link></li>
            <li><Link to="/calculations">Hesaplamalar</Link></li>
            <li><Link to="/settings">Ayarlar</Link></li>
          </ul>
        </div>
        
        {/* Navbar End - Giriş yapılmışsa kullanıcı adı ve çıkış butonu gösterilir */}
        <div className="navbar-end hidden lg:flex gap-3 pr-2">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-base-content/80">
                {user.user_metadata?.name}
              </span>
              <button onClick={handleLogout} className="btn btn-sm btn-outline btn-error">
                Çıkış
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm text-base-content hover:bg-base-200">Giriş Yap</Link>
              <Link to="/register" className="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white border-none transition-colors shadow-lg shadow-indigo-900/50">
                Kayıt Ol
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="w-full max-w-4xl px-4 pb-8">
        <Outlet context={shiftContext} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<CurrentShift />} />
          <Route path="next-weeks" element={<NextWeeks />} />
          <Route path="worktime" element={<WorktimeCalendar />} />
          <Route path="settings" element={<Settings />} />
          <Route path="calculations" element={<Calculations />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}