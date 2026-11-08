import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  User, 
  ScanFace, 
  Usb, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound,
  ArrowRight,
  Info
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ipcService } from '../../services/ipcService';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('password'); // 'password' | 'biometric' | 'dongle'
  
  // Password login form
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin123!');
  const [errorMsg, setErrorMsg] = useState(null);

  // Biometric state
  const [bioUserId, setBioUserId] = useState(1);
  const [bioStatus, setBioStatus] = useState(null);
  const [bioLoading, setBioLoading] = useState(false);

  // Dongle state
  const [dongleHardwareId, setDongleHardwareId] = useState('USB-DONGLE-SN-998877');
  const [dongleStatus, setDongleStatus] = useState(null);
  const [dongleLoading, setDongleLoading] = useState(false);

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = await login(username, password);
    if (!res.success) {
      setErrorMsg(res.error);
    }
  };

  const setQuickUser = (u, p) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
  };

  // Biometric verification test
  const handleBioVerify = async () => {
    setBioLoading(true);
    setBioStatus(null);
    try {
      // Create a deterministic test face capture buffer
      const mockCapture = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==mock_face_vector_${bioUserId}_valid_entropy`;
      
      // Auto enroll first if not enrolled
      await ipcService.enrollBiometric('dummy_token', bioUserId, mockCapture + '_live');
      
      const res = await ipcService.verifyBiometric(bioUserId, mockCapture + '_live');
      if (res.success) {
        setBioStatus({
          verified: res.data.verified,
          similarity: res.data.similarity,
          threshold: res.data.threshold,
          liveness: res.data.livenessPassed
        });
      } else {
        setBioStatus({ error: res.error?.message || 'Verifikasi biometrik gagal' });
      }
    } catch (err) {
      setBioStatus({ error: err.message });
    } finally {
      setBioLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gym-bg flex items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-gym-accent/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-gym-cyan/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-gym-surface border border-gym-border rounded-3xl p-8 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gym-accent/15 border border-gym-accent/30 flex items-center justify-center text-gym-accent shadow-xl shadow-gym-accent/15 mb-3">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide">GYMVAULT</h1>
          <p className="text-xs text-gray-400 font-mono mt-1">Smart Gym Management & Security System</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-gym-card rounded-xl p-1 mb-6 border border-gym-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'password'
                ? 'bg-gym-accent text-gym-bg font-bold shadow-md shadow-gym-accent/20'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Argon2id</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('biometric')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'biometric'
                ? 'bg-gym-accent text-gym-bg font-bold shadow-md shadow-gym-accent/20'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ScanFace className="w-3.5 h-3.5" />
            <span>Biometrik</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dongle')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'dongle'
                ? 'bg-gym-accent text-gym-bg font-bold shadow-md shadow-gym-accent/20'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Usb className="w-3.5 h-3.5" />
            <span>USB Token</span>
          </button>
        </div>

        {/* TAB 1: Argon2id Password Login */}
        {activeTab === 'password' && (
          <form onSubmit={handleSubmitPassword} className="space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-gym-danger/10 border border-gym-danger/30 text-gym-danger flex items-start gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gym-card border border-gym-border text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gym-accent focus:ring-1 focus:ring-gym-accent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gym-card border border-gym-border text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gym-accent focus:ring-1 focus:ring-gym-accent transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
              <span className="flex items-center gap-1 font-mono text-[11px] text-gym-accent">
                <Shield className="w-3 h-3" /> Argon2id (m=64M, t=3, p=4)
              </span>
              <span className="text-[11px] text-gray-500">Maks 5x Salah</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gym-accent text-gym-bg font-bold text-sm hover:bg-gym-accentHover transition flex items-center justify-center gap-2 shadow-lg shadow-gym-accent/20 disabled:opacity-50"
            >
              <span>{loading ? 'Memverifikasi Hash...' : 'Masuk ke Sistem'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Demo Credentials */}
            <div className="pt-4 border-t border-gym-border">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
                Akun Uji Coba Cepat (Seed Data):
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setQuickUser('admin', 'Admin123!')}
                  className="py-1.5 px-2 rounded-lg bg-gym-card hover:bg-gym-border text-[11px] text-gray-200 border border-gym-border transition text-center"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setQuickUser('trainer_john', 'Trainer123!')}
                  className="py-1.5 px-2 rounded-lg bg-gym-card hover:bg-gym-border text-[11px] text-gray-200 border border-gym-border transition text-center"
                >
                  Trainer
                </button>
                <button
                  type="button"
                  onClick={() => setQuickUser('member_alice', 'Member123!')}
                  className="py-1.5 px-2 rounded-lg bg-gym-card hover:bg-gym-border text-[11px] text-gray-200 border border-gym-border transition text-center"
                >
                  Member
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: Biometric Face Recognition */}
        {activeTab === 'biometric' && (
          <div className="space-y-4 text-center">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-gym-card border-2 border-dashed border-gym-accent/40 flex flex-col items-center justify-center text-gym-accent relative overflow-hidden group">
              <ScanFace className="w-10 h-10 group-hover:scale-110 transition" />
              <div className="absolute inset-0 bg-gym-accent/5 pointer-events-none"></div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">Verifikasi Biometrik Wajah</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Pencocokan vektor embedding 512-dimensi via Cosine Similarity (Threshold $\ge 0.650$)
              </p>
            </div>

            {bioStatus && (
              <div className={`p-3 rounded-xl border text-xs text-left ${
                bioStatus.verified 
                  ? 'bg-gym-success/10 border-gym-success/30 text-gym-success' 
                  : 'bg-gym-danger/10 border-gym-danger/30 text-gym-danger'
              }`}>
                {bioStatus.error ? (
                  <p>{bioStatus.error}</p>
                ) : (
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-bold">{bioStatus.verified ? 'VERIFIED' : 'MISMATCH'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cosine Score:</span>
                      <span>{bioStatus.similarity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Threshold:</span>
                      <span>{bioStatus.threshold}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Liveness Passed:</span>
                      <span>{bioStatus.liveness ? 'YES' : 'NO'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleBioVerify}
              disabled={bioLoading}
              className="w-full py-2.5 rounded-xl bg-gym-accent text-gym-bg font-bold text-sm hover:bg-gym-accentHover transition flex items-center justify-center gap-2 shadow-lg shadow-gym-accent/20 disabled:opacity-50"
            >
              <ScanFace className="w-4 h-4" />
              <span>{bioLoading ? 'Mengekstrak Fitur...' : 'Uji Verifikasi Wajah (User #1)'}</span>
            </button>
          </div>
        )}

        {/* TAB 3: USB Security Dongle */}
        {activeTab === 'dongle' && (
          <div className="space-y-4 text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gym-card border-2 border-gym-cyan/40 flex items-center justify-center text-gym-cyan">
              <Usb className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">USB Hardware Security Token</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Challenge-Response Kriptografis berbasis HMAC-SHA256 & Device Binding
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gym-card border border-gym-border text-left text-xs font-mono text-gray-300 space-y-1">
              <div className="flex justify-between">
                <span>Binding ID:</span>
                <span className="text-gym-accent font-semibold">{dongleHardwareId}</span>
              </div>
              <div className="flex justify-between">
                <span>Protocol:</span>
                <span>HMAC-SHA256</span>
              </div>
              <div className="flex justify-between">
                <span>Hotplug Deteksi:</span>
                <span className="text-gym-success">Active</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 text-left flex items-start gap-1.5">
              <Info className="w-4 h-4 flex-shrink-0 text-gym-accent mt-0.5" />
              <span>
                Dongle fisik yang dicabut secara otomatis akan mengunci antarmuka aplikasi melalui hotplug listener.
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
