import { BrowserRouter, Routes, Route, Link, Outlet } from 'react-router-dom';
import { useShiftCalculator } from './hooks/useShiftCalculator';
import CurrentShift from './pages/currentShift';
import NextWeeks from './pages/nextWeeks';
import WorktimeCalendar from './pages/worktimeCalendar';

function Layout() {
  const shiftContext = useShiftCalculator();

  return (
    <div className="min-h-screen bg-base-300 flex flex-col items-center">
      <div className="navbar bg-base-100 shadow-xl mb-8 w-full">
        <div className="navbar-start">
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52 text-base-content">
              <li><Link to="/">Güncel Vardiya</Link></li>
              <li><Link to="/worktime">Mesai Takvimim</Link></li>
              <li><Link to="/next-weeks">Gelecek Haftalar</Link></li>
            </ul>
          </div>
          <Link to="/" className="btn btn-ghost text-xl text-primary font-bold">Vardiya Sihirbazı</Link>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1 font-medium text-base-content">
            <li><Link to="/">Güncel Vardiya</Link></li>
            <li><Link to="/worktime">Mesai Takvimim</Link></li>
            <li><Link to="/next-weeks">Gelecek Haftalar</Link></li>
          </ul>
        </div>
        <div className="navbar-end">
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}