import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Activity, 
  Users, 
  CreditCard,
  Dumbbell,
  Calendar,
  Lock, 
  Key, 
  Terminal,
  LogOut,
  UserCheck,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import DashboardView from './pages/gym/DashboardView';
import MembersView from './pages/gym/MembersView';
import PaymentsView from './pages/gym/PaymentsView';
import WorkoutsView from './pages/gym/WorkoutsView';
import ScheduleView from './pages/gym/ScheduleView';
import { ipcService } from './services/ipcService';

function MainDashboard() {
  const { user, logout, sessionToken } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [pingLog, setPingLog] = useState([]);
  const [pingLoading, setPingLoading] = useState(false);

  const handlePing = async () => {
    setPingLoading(true);
    const start = performance.now();
    const res = await ipcService.ping();
    const elapsed = Math.round(performance.now() - start);

    const logEntry = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      latency: `${elapsed}ms`,
      response: res.success ? res.data?.message : 'Failed',
      ok: res.success
    };

    setPingLog(prev => [logEntry, ...prev.slice(0, 9)]);
    setPingLoading(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard & Statistik', icon: Activity },
    { id: 'members', label: 'Member Keanggotaan', icon: Users },
    { id: 'payments', label: 'Pembayaran & Keuangan', icon: CreditCard },
    { id: 'workouts', label: 'Program Latihan', icon: Dumbbell },
    { id: 'schedule', label: 'Jadwal & Booking', icon: Calendar },
    { id: 'diagnostics', label: 'IPC Diagnostics', icon: Terminal }
  ];

  return (
    <div className="flex h-screen w-screen bg-gym-bg text-gray-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-gym-surface border-r border-gym-border flex flex-col justify-between p-4 flex-shrink-0">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gym-accent/15 border border-gym-accent/30 flex items-center justify-center text-gym-accent shadow-lg shadow-gym-accent/10">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-wider text-white">GYMVAULT</h1>
              <p className="text-xs font-mono text-gym-accent">v2.0 • Phase 3 Operations</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition ${
                    isActive
                      ? 'bg-gym-accent/15 text-gym-accent border border-gym-accent/30 font-bold shadow-md shadow-gym-accent/10'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gym-card/60'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-gym-card border border-gym-border">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gym-accent/20 text-gym-accent flex items-center justify-center font-bold text-xs uppercase">
                {user?.username?.substring(0, 2) || 'US'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{user?.username}</p>
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-gym-accent/15 text-gym-accent border border-gym-accent/30 uppercase">
                  {user?.roleName}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-gray-400 font-mono space-y-0.5 pt-1 border-t border-gym-border/40">
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="text-gym-success font-semibold">MySQL InnoDB</span>
              </div>
              <div className="flex justify-between">
                <span>Encryption:</span>
                <span className="text-gym-cyan font-semibold">AES-256-GCM</span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full py-2 px-3 rounded-lg bg-gym-card hover:bg-gym-danger/10 hover:border-gym-danger/30 text-gray-300 hover:text-gym-danger border border-gym-border text-xs font-medium transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout Sesi</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-16 border-b border-gym-border bg-gym-surface/80 backdrop-blur px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gym-accent animate-pulse"></span>
            <h2 className="text-sm font-semibold text-gray-200">
              GYMVAULT Operational Console • Aktor: <span className="text-gym-accent">{user?.username}</span> [{user?.roleName}]
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handlePing}
              disabled={pingLoading}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-gym-card border border-gym-border hover:border-gym-accent/50 text-gray-200 hover:text-white transition"
            >
              <Terminal className="w-3.5 h-3.5 text-gym-accent" />
              <span>Test Secure IPC</span>
            </button>
          </div>
        </header>

        {/* Dynamic View Content */}
        <div className="p-8 flex-1">
          {currentTab === 'dashboard' && <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />}
          {currentTab === 'members' && <MembersView />}
          {currentTab === 'payments' && <PaymentsView />}
          {currentTab === 'workouts' && <WorkoutsView />}
          {currentTab === 'schedule' && <ScheduleView />}
          {currentTab === 'diagnostics' && (
            <div className="p-6 rounded-2xl bg-gym-surface border border-gym-border space-y-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-gym-accent" />
                Live Secure IPC Log Monitor
              </h3>
              <p className="text-xs text-gray-400">
                Pemeriksaan jembatan isolasi dan latensi pengiriman pesan antara renderer dan main process.
              </p>

              <div className="bg-gym-bg rounded-xl border border-gym-border p-4 font-mono text-xs overflow-y-auto space-y-2 max-h-96">
                {pingLog.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    Klik tombol "Test Secure IPC" di atas untuk mengirim pesan uji.
                  </div>
                ) : (
                  pingLog.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-gray-300 border-b border-gym-border/40 pb-1">
                      <span className="text-gray-500">[{item.time}]</span>
                      <span className="text-gym-accent">system:ping</span>
                      <span className="text-gym-cyan">{item.latency}</span>
                      <span className={item.ok ? "text-gym-success" : "text-gym-danger"}>
                        {item.response}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-gym-bg flex items-center justify-center text-gym-accent font-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gym-accent border-t-transparent rounded-full animate-spin"></div>
          <span>Memeriksa Sesi Kriptografis...</span>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <MainDashboard /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
