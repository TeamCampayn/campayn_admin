import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Rocket, 
  Wallet, 
  Users, 
  Building2, 
  ShieldAlert,
  LogOut,
  PieChart
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all group",
      isActive 
        ? "bg-admin-primary/10 text-admin-primary border border-admin-primary/20" 
        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
    )}
  >
    <span className="transition-transform group-hover:scale-110">{icon}</span>
    <span className="font-semibold text-sm">{label}</span>
  </NavLink>
);

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-admin-bg">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-admin-border p-6 bg-admin-surface/50 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-2 mb-10">
          <div className="w-8 h-8 bg-admin-primary rounded flex items-center justify-center shadow-lg shadow-violet-500/30">
            <ShieldAlert className="text-white h-5 w-5" />
          </div>
          <span className="text-xl font-black tracking-tighter text-white uppercase">
            Admin HQ
          </span>
        </div>

        <nav className="flex-1 space-y-1.5">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2 px-4">Core</p>
          <NavItem to="/" icon={<Rocket size={18} />} label="Launchpad" />
          <NavItem to="/analytics" icon={<PieChart size={18} />} label="Market Pulse" />
          
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-6 mb-2 px-4">Network</p>
          <NavItem to="/creators" icon={<Users size={18} />} label="Creators" />
          <NavItem to="/brands" icon={<Building2 size={18} />} label="Brands" />
          
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-6 mb-2 px-4">Financials</p>
          <NavItem to="/ledger" icon={<Wallet size={18} />} label="The Ledger" />
        </nav>

        <div className="pt-6 border-t border-admin-border">
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all">
            <LogOut size={18} />
            <span className="font-semibold text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-admin-border px-8 flex items-center justify-between sticky top-0 bg-admin-bg/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">System Online</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <p className="text-sm font-bold text-white">Admin Root</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Super Admin</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-admin-border flex items-center justify-center font-bold text-zinc-400">
              AD
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
