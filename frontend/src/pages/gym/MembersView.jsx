import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Trash2, 
  Eye, 
  Lock, 
  Phone, 
  Mail, 
  Calendar, 
  AlertCircle,
  X,
  CheckCircle2,
  Receipt
} from 'lucide-react';
import { ipcService } from '../../services/ipcService';
import { useAuth } from '../../contexts/AuthContext';

export default function MembersView() {
  const { sessionToken, hasPermission } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // New Member Form
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ipcService.getMemberList(search);
      if (res.success) {
        setMembers(res.data);
      } else {
        setError(res.error?.message || 'Gagal mengambil data member');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [search]);

  const handleOpenDetail = async (memberId) => {
    setDetailLoading(true);
    setSelectedMember(null);
    try {
      const res = await ipcService.getMemberDetail(memberId);
      if (res.success) {
        setSelectedMember(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const res = await ipcService.createMember({
        sessionToken,
        ...form
      });
      if (res.success) {
        setShowAddModal(false);
        setForm({ username: '', password: '', fullName: '', email: '', phone: '' });
        fetchMembers();
      } else {
        setFormError(res.error?.message || 'Gagal mendaftarkan member baru');
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Hapus (soft delete) member ${name}? Akun login juga akan dinonaktifkan.`)) {
      return;
    }
    try {
      const res = await ipcService.deleteMember(sessionToken, id);
      if (res.success) {
        fetchMembers();
      } else {
        alert(res.error?.message || 'Gagal menghapus member');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-gym-accent" />
            Manajemen Member Keanggotaan
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Data pribadi (PII) terenkripsi AES-256-GCM • Pencarian terakselerasi via HMAC Blind Index
          </p>
        </div>

        {hasPermission('member:manage') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gym-accent text-gym-bg font-semibold text-xs hover:bg-gym-accentHover transition shadow-lg shadow-gym-accent/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Member Baru</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-4 bg-gym-surface p-3.5 rounded-2xl border border-gym-border">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama, kode member (MBR-...), atau username..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-gym-card border border-gym-border text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gym-accent transition"
          />
        </div>
        <div className="text-xs text-gray-400 font-mono px-2">
          Total: <span className="text-gym-accent font-bold">{members.length}</span> Member
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-gym-danger/10 border border-gym-danger/30 text-gym-danger flex items-center gap-3 text-xs">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-gym-surface rounded-2xl border border-gym-border overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gym-card text-gray-400 uppercase font-semibold border-b border-gym-border tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Kode Member</th>
                <th className="py-3.5 px-4">Nama Lengkap</th>
                <th className="py-3.5 px-4">Kontak (Terenkripsi)</th>
                <th className="py-3.5 px-4">Paket Aktif</th>
                <th className="py-3.5 px-4">Masa Berlaku</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gym-border/40 text-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 font-mono">
                    Memuat data member...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    Belum ada member yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-gym-card/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gym-accent">
                      {m.member_code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{m.full_name}</div>
                      <div className="text-[11px] text-gray-400 font-mono">@{m.username}</div>
                    </td>
                    <td className="py-3 px-4 text-[11px] font-mono text-gray-300">
                      <div>{m.phone || '-'}</div>
                      <div className="text-gray-500">{m.email || '-'}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-300">
                      {m.plan_name || <span className="text-gray-500">Belum Berlangganan</span>}
                    </td>
                    <td className="py-3 px-4 text-[11px] font-mono text-gray-400">
                      {m.membership_end_date ? new Date(m.membership_end_date).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                        m.membership_status === 'ACTIVE'
                          ? 'bg-gym-success/15 text-gym-success border-gym-success/30'
                          : m.membership_status === 'EXPIRED'
                          ? 'bg-gym-warning/15 text-gym-warning border-gym-warning/30'
                          : 'bg-gray-800 text-gray-400 border-gray-700'
                      }`}>
                        {m.membership_status || 'INACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(m.id)}
                          title="Lihat Detail Profil & Riwayat"
                          className="p-1.5 rounded-lg bg-gym-card hover:bg-gym-accent/20 hover:text-gym-accent text-gray-300 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {hasPermission('member:manage') && (
                          <button
                            onClick={() => handleDelete(m.id, m.full_name)}
                            title="Soft Delete Member"
                            className="p-1.5 rounded-lg bg-gym-card hover:bg-gym-danger/20 hover:text-gym-danger text-gray-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Tambah Member Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gym-surface border border-gym-border rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-gym-border mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-gym-accent" />
                Daftarkan Member Baru
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-gym-danger/10 border border-gym-danger/30 text-gym-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMember} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="e.g. Budi Santoso"
                  className="w-full px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gym-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="budisantoso"
                    className="w-full px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gym-accent"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 6 karakter"
                    className="w-full px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gym-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1 flex items-center justify-between">
                  <span>Nomor Telepon (WhatsApp)</span>
                  <span className="text-[10px] text-gym-accent font-mono flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Enkripsi AES + HMAC Index
                  </span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="081234567890"
                  className="w-full px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gym-accent"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1 flex items-center justify-between">
                  <span>Email</span>
                  <span className="text-[10px] text-gym-accent font-mono flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Enkripsi AES + HMAC Index
                  </span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="budi@example.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gym-accent"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-2.5 rounded-xl bg-gym-accent text-gym-bg font-bold text-xs hover:bg-gym-accentHover transition shadow-md shadow-gym-accent/20 disabled:opacity-50"
                >
                  {formLoading ? 'Memproses Enkripsi & Menyimpan...' : 'Simpan Member & Enkripsi Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Detail Member & Riwayat */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-gym-surface border border-gym-border rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gym-border mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gym-accent/15 border border-gym-accent/30 text-gym-accent flex items-center justify-center font-bold">
                  {selectedMember.full_name?.substring(0, 2)}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{selectedMember.full_name}</h3>
                  <p className="text-xs text-gym-accent font-mono">{selectedMember.member_code} • @{selectedMember.username}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMember(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-gym-card border border-gym-border text-xs mb-6">
              <div>
                <span className="text-gray-400 block text-[11px]">Telepon (Didekripsi):</span>
                <span className="font-mono text-gray-200">{selectedMember.phone || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Email (Didekripsi):</span>
                <span className="font-mono text-gray-200">{selectedMember.email || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Tanggal Bergabung:</span>
                <span className="font-mono text-gray-200">{new Date(selectedMember.join_date).toLocaleDateString('id-ID')}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Paket Saat Ini:</span>
                <span className="text-gym-accent font-semibold">{selectedMember.plan_name || 'Tidak ada paket aktif'}</span>
              </div>
            </div>

            {/* Riwayat Membership */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-gym-cyan" />
                Riwayat Langganan Membership
              </h4>
              <div className="space-y-2">
                {selectedMember.membershipHistory?.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">Belum ada riwayat langganan</p>
                ) : (
                  selectedMember.membershipHistory?.map(h => (
                    <div key={h.id} className="p-3 rounded-xl bg-gym-card border border-gym-border flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="font-bold text-white">{h.plan_name}</span>
                        <span className="text-gray-400 block text-[11px]">
                          {h.start_date} s/d {h.end_date}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        h.status === 'ACTIVE' ? 'bg-gym-success/20 text-gym-success' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {h.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Riwayat Pembayaran */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5 flex items-center gap-2">
                <Receipt className="w-3.5 h-3.5 text-gym-accent" />
                Riwayat Pembayaran Transaksi
              </h4>
              <div className="space-y-2">
                {selectedMember.paymentHistory?.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">Belum ada transaksi pembayaran</p>
                ) : (
                  selectedMember.paymentHistory?.map(p => (
                    <div key={p.id} className="p-3 rounded-xl bg-gym-card border border-gym-border flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="font-bold text-gym-accent">{p.transaction_code}</span>
                        <span className="text-gray-400 block text-[11px]">{new Date(p.paid_at).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-white">Rp {Number(p.amount).toLocaleString('id-ID')}</span>
                        <span className="text-[10px] text-gym-success block">{p.payment_method}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
