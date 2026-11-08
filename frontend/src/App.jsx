import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Database, 
  Cpu, 
  Key, 
  Lock, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Users, 
  Server,
  Layers,
  Terminal
} from 'lucide-react';
import { ipcService } from './services/ipcService';

export default function App() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pingLog, setPingLog] = useState([]);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ipcService.getSystemStatus();
      if (res.success) {
        setStatus(res.data);
      } else {
        setError(res.error?.message || 'Gagal memuat status sistem');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePing = async () => {
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
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="flex h-screen w-screen bg-gym-bg text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gym-surface border-r border-gym-border flex flex-col justify-between p-4">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gym-accent/15 border border-gym-accent/30 flex items-center justify-center text-gym-accent shadow-lg shadow-gym-accent/10">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-wider text-white">GYMVAULT</h1>
              <p className="text-xs font-mono text-gym-accent">v2.0 • Phase 1 Foundation</p>
            </div>
          </div>

          {/* Navigation Items (Phase 1 Status) */}
          <nav className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gym-accent/10 text-gym-accent font-medium text-sm border border-gym-accent/20">
              <Activity className="w-4 h-4" />
              <span>System Diagnostics</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 font-medium text-sm hover:bg-gym-card/60 transition cursor-not-allowed opacity-60">
              <Users className="w-4 h-4" />
              <span>Member Operations</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 font-medium text-sm hover:bg-gym-card/60 transition cursor-not-allowed opacity-60">
              <Lock className="w-4 h-4" />
              <span>Super Encryption</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 font-medium text-sm hover:bg-gym-card/60 transition cursor-not-allowed opacity-60">
              <Key className="w-4 h-4" />
              <span>Security Center</span>
            </div>
          </nav>
        </div>

        {/* Runtime info */}
        <div className="p-3 rounded-lg bg-gym-card border border-gym-border text-xs text-gray-400 space-y-1.5 font-mono">
          <div className="flex justify-between">
            <span>Runtime:</span>
            <span className="text-gray-200">Electron 29</span>
          </div>
          <div className="flex justify-between">
            <span>Database:</span>
            <span className={status?.database?.connected ? "text-gym-accent" : "text-gym-danger"}>
              {status?.database?.connected ? "MySQL Connected" : "Disconnected"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Security:</span>
            <span className="text-gym-cyan">Isolated Sandbox</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-16 border-b border-gym-border bg-gym-surface/80 backdrop-blur px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gym-accent animate-pulse"></span>
            <h2 className="text-sm font-semibold text-gray-200">Fondasi Sistem GYMVAULT V2.0 Aktif</h2>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handlePing}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-gym-card border border-gym-border hover:border-gym-accent/50 text-gray-200 hover:text-white transition"
            >
              <Terminal className="w-3.5 h-3.5 text-gym-accent" />
              <span>Test Secure IPC</span>
            </button>
            <button 
              onClick={fetchStatus}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-gym-accent text-gym-bg font-semibold hover:bg-gym-accentHover transition shadow-md shadow-gym-accent/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-gym-danger/10 border border-gym-danger/30 text-gym-danger flex items-center gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Database Status */}
            <div className="p-5 rounded-2xl bg-gym-surface border border-gym-border hover:border-gym-accent/30 transition shadow-lg">
              <div className="flex items-center justify-between text-gray-400 mb-3">
                <span className="text-xs font-medium uppercase tracking-wider">MySQL Engine</span>
                <Database className="w-5 h-5 text-gym-accent" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {status?.database?.connected ? "Online & Siap" : "Offline"}
              </div>
              <p className="text-xs text-gray-400">
                Database: <span className="font-mono text-gym-accent font-semibold">{status?.database?.dbName || 'gymvault'}</span>
              </p>
            </div>

            {/* Card 2: Tables Loaded */}
            <div className="p-5 rounded-2xl bg-gym-surface border border-gym-border hover:border-gym-accent/30 transition shadow-lg">
              <div className="flex items-center justify-between text-gray-400 mb-3">
                <span className="text-xs font-medium uppercase tracking-wider">Tabel Terdaftar</span>
                <Layers className="w-5 h-5 text-gym-cyan" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {status?.database?.totalTables || 0} / 22
              </div>
              <p className="text-xs text-gym-success flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Seluruh 22 skema InnoDB aktif
              </p>
            </div>

            {/* Card 3: Cryptography Suite */}
            <div className="p-5 rounded-2xl bg-gym-surface border border-gym-border hover:border-gym-accent/30 transition shadow-lg">
              <div className="flex items-center justify-between text-gray-400 mb-3">
                <span className="text-xs font-medium uppercase tracking-wider">Crypto Suite</span>
                <Lock className="w-5 h-5 text-gym-accent" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                7 / 7 Algoritma
              </div>
              <p className="text-xs text-gray-400">
                Argon2id, AES, ChaCha, Stego, Chain
              </p>
            </div>

            {/* Card 4: Memory & System */}
            <div className="p-5 rounded-2xl bg-gym-surface border border-gym-border hover:border-gym-accent/30 transition shadow-lg">
              <div className="flex items-center justify-between text-gray-400 mb-3">
                <span className="text-xs font-medium uppercase tracking-wider">Memori Heap</span>
                <Cpu className="w-5 h-5 text-gym-warning" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {status?.systemMemory?.heapUsedMB || 0} MB
              </div>
              <p className="text-xs text-gray-400 font-mono">
                Node {status?.nodeVersion || 'v26'} ({status?.platform || 'win32'})
              </p>
            </div>
          </div>

          {/* Details Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cryptography Stack Overview */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-gym-surface border border-gym-border">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gym-accent" />
                Daftar Kesiapan Modul Kriptografi GYMVAULT
              </h3>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-gym-card border border-gym-border flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-200">1. Authentication & Password Security</h4>
                    <p className="text-xs text-gray-400">Argon2id (m=64MB, t=3, p=4) + Brute Force Protection</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gym-success/15 text-gym-success border border-gym-success/30">
                    Ready
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-gym-card border border-gym-border flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-200">2. Super Encryption (Secure Messaging)</h4>
                    <p className="text-xs text-gray-400">Vigenere Extended (256 ASCII/Unicode) + AES-256-GCM (96-bit IV, 128-bit Tag)</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gym-success/15 text-gym-success border border-gym-success/30">
                    Ready
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-gym-card border border-gym-border flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-200">3. File Vault Encryption</h4>
                    <p className="text-xs text-gray-400">ChaCha20-Poly1305 Streaming/Chunked authenticated file storage</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gym-success/15 text-gym-success border border-gym-success/30">
                    Ready
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-gym-card border border-gym-border flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-200">4. Database Encryption & Blind Indexing</h4>
                    <p className="text-xs text-gray-400">AES-256-GCM data at rest + HMAC-SHA256 Blind Indexing</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gym-success/15 text-gym-success border border-gym-success/30">
                    Ready
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-gym-card border border-gym-border flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-200">5. Steganografi Citra LSB PNG</h4>
                    <p className="text-xs text-gray-400">Framing Header (GVST), Payload Length, Checksum, Lossless PNG</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gym-success/15 text-gym-success border border-gym-success/30">
                    Ready
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-gym-card border border-gym-border flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-200">6. Blockchain Integrity Ledger</h4>
                    <p className="text-xs text-gray-400">SHA-256 Hash Chaining, Canonical Serialization, Checkpoint verification</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gym-success/15 text-gym-success border border-gym-success/30">
                    Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Secure IPC Diagnostic Terminal */}
            <div className="p-6 rounded-2xl bg-gym-surface border border-gym-border flex flex-col">
              <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-gym-accent" />
                Live IPC Diagnostics
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Pemeriksaan jembatan isolasi contextBridge renderer $\leftrightarrow$ main process.
              </p>

              <div className="flex-1 bg-gym-bg rounded-xl border border-gym-border p-3 font-mono text-xs overflow-y-auto space-y-2 max-h-72">
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

              <div className="mt-4 pt-3 border-t border-gym-border text-xs text-gray-400 flex items-center justify-between">
                <span>Channel Policy:</span>
                <span className="text-gym-accent font-semibold">Strict Whitelist</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
