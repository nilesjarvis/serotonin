import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Activity, 
  Film, 
  Tv, 
  Music, 
  Video, 
  PlaySquare, 
  LogOut 
} from 'lucide-react';
import { logout } from '../lib/api';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: <Activity className="w-5 h-5" /> },
  { name: 'Movies', path: '/library/Movie', icon: <Film className="w-5 h-5" /> },
  { name: 'Shows', path: '/library/Episode', icon: <Tv className="w-5 h-5" /> },
  { name: 'Music', path: '/library/Audio', icon: <Music className="w-5 h-5" /> },
  { name: 'Music Videos', path: '/library/MusicVideo', icon: <PlaySquare className="w-5 h-5" /> },
  { name: 'Home Videos', path: '/library/Video', icon: <Video className="w-5 h-5" /> },
];

export default function Layout({ children }) {
  const location = useLocation();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen bg-black text-neutral-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#050505] border-r border-neutral-800 flex flex-col shrink-0">
        <div className="p-6 flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter uppercase text-white">serotonin</span>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-3 rounded-none transition-all group border-l-2 ${
                  isActive 
                    ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-bold tracking-wide' 
                    : 'border-transparent text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200 hover:border-neutral-700 font-medium'
                }`}
              >
                <div className={`${isActive ? 'text-blue-500' : 'text-neutral-500 group-hover:text-neutral-300'} transition-colors`}>
                  {item.icon}
                </div>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-neutral-800">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-3 py-3 w-full text-neutral-400 hover:bg-red-950/30 hover:text-red-500 transition-colors border-l-2 border-transparent hover:border-red-500 font-medium group"
          >
            <LogOut className="w-5 h-5 text-neutral-500 group-hover:text-red-500 transition-colors" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-black p-6 md:p-8 lg:p-12">
        <div className="max-w-7xl mx-auto pb-12">
          {children}
        </div>
      </main>
    </div>
  );
}