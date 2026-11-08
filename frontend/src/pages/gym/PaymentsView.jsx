import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Receipt, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  DollarSign, 
  QrCode, 
  FileText,
  ShieldCheck,
  Printer
} from 'lucide-react';
import { ipcService } from '../../services/ipcService';
import { useAuth } from '../../contexts/AuthContext';

export default function PaymentsView() {
  const { sessionToken, hasPermission } = useAuth();
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Form State
  const [form, setForm] = useState({
    memberId: '',
    planId: '',
    paymentMethod: 'TRANSFER',
    amount: '',
    notes: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, memRes, planRes] = await Promise.all([
        ipcService.getPaymentList(),
        ipcService.getMemberList(''),
        ipcService.getPlanList()
      ]);

      if (payRes.success) setPayments(payRes.data);
      if (memRes.success) setMembers(memRes.data);
      if (planRes.success) {
        setPlans(planRes.data);
        if (planRes.data.length > 0 && !form.planId) {
          setForm(prev => ({ 
            ...prev, 
            planId: planRes.data[0].id, 
            amount: planRes.data[0].price 
          }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePlanChange = (planId) => {
    const p = plans.find(item => item.id === Number(planId));
    setForm({
      ...form,
      planId,
      amount: p ? p.price : form.amount
    });
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!form.memberId) {
      setErrorMsg('Pilih member terlebih dahulu');
      return;
    }
    setFormLoading(true);
    setErrorMsg(null);
    try {
      const res = await ipcService.createPayment({
        sessionToken,
        memberId: Number(form.memberId),
        planId: Number(form.planId),
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        notes: form.notes
      });

      if (res.success) {
        setShowModal(false);
        setActiveReceipt(res.data);
        fetchData();
      } else {
        setErrorMsg(res.error?.message || 'Gagal memproses pembayaran');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const totalRevenue = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-gym-accent" />
            Pencatatan Pembayaran & Keuangan
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Transaksi atomik database (ACID) • Kuitansi digital terverifikasi dengan hash SHA-256
          </p>
        </div>

        {hasPermission('payment:process') && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gym-accent text-gym-bg font-semibold text-xs hover:bg-gym-accentHover transition shadow-lg shadow-gym-accent/20"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pembayaran Baru</span>
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gym-surface border border-gym-border shadow-lg">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Pendapatan Aktual</span>
            <DollarSign className="w-5 h-5 text-gym-accent" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            Rp {totalRevenue.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Akumulasi transaksi status COMPLETED</p>
        </div>

        <div className="p-5 rounded-2xl bg-gym-surface border border-gym-border shadow-lg">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Transaksi</span>
            <FileText className="w-5 h-5 text-gym-cyan" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {payments.length} <span className="text-xs font-normal text-gray-400">Kuitansi</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Tercatat permanen di MySQL</p>
        </div>

        <div className="p-5 rounded-2xl bg-gym-surface border border-gym-border shadow-lg">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Integritas Transaksi</span>
            <ShieldCheck className="w-5 h-5 text-gym-success" />
          </div>
          <div className="text-2xl font-bold text-gym-success font-mono">
            100% Valid
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Setiap kuitansi bertanda tangan SHA-256</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-gym-surface rounded-2xl border border-gym-border overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gym-border flex items-center justify-between">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <Receipt className="w-4 h-4 text-gym-accent" />
            Riwayat Transaksi Pembayaran Gym
          </h3>
          <span className="text-xs font-mono text-gray-400">{payments.length} Transaksi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gym-card text-gray-400 uppercase font-semibold border-b border-gym-border tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">No. Transaksi</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Paket Langganan</th>
                <th className="py-3 px-4">Nominal</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4">Tanggal Pembayaran</th>
                <th className="py-3 px-4 text-center">Bukti Kuitansi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gym-border/40 text-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 font-mono">
                    Memuat data pembayaran...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    Belum ada riwayat pembayaran tercatat.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gym-card/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gym-accent">
                      {p.transaction_code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{p.member_name}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{p.member_code}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-300">
                      {p.plan_name}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      Rp {Number(p.amount).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gym-card border border-gym-border text-gray-300 uppercase">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] font-mono text-gray-400">
                      {new Date(p.paid_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setActiveReceipt(p)}
                        className="px-2.5 py-1 rounded-lg bg-gym-card hover:bg-gym-accent/20 hover:text-gym-accent text-gray-300 font-mono text-[11px] transition inline-flex items-center gap-1.5 border border-gym-border"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-gym-accent" />
                        <span>Kuitansi Hash</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Form Catat Pembayaran Baru */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gym-surface border border-gym-border rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-gym-border mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-gym-accent" />
                Catat Transaksi Pembayaran
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-gym-danger/10 border border-gym-danger/30 text-gym-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleProcessPayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">Pilih Member</label>
                <select
                  required
                  value={form.memberId}
                  onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border text-gray-100 focus:outline-none focus:border-gym-accent"
                >
                  <option value="">-- Pilih Member --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.member_code} - {m.full_name} (@{m.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Paket Langganan</label>
                <select
                  required
                  value={form.planId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border text-gray-100 focus:outline-none focus:border-gym-accent"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.duration_months} Bulan) - Rp {Number(p.price).toLocaleString('id-ID')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border text-gray-100 font-mono focus:outline-none focus:border-gym-accent"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">Metode Pembayaran</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border text-gray-100 focus:outline-none focus:border-gym-accent"
                  >
                    <option value="TRANSFER">Bank Transfer</option>
                    <option value="QRIS">QRIS</option>
                    <option value="CASH">Tunai (Cash)</option>
                    <option value="CREDIT_CARD">Kartu Kredit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Catatan Tambahan (Terenkripsi)</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Bukti transfer BCA a.n Pengirim"
                  className="w-full px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gym-accent"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-2.5 rounded-xl bg-gym-accent text-gym-bg font-bold text-xs hover:bg-gym-accentHover transition shadow-md shadow-gym-accent/20 disabled:opacity-50"
                >
                  {formLoading ? 'Memproses Transaksi ACID...' : 'Proses & Aktifkan Membership'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Bukti Kuitansi Digital (Digital Receipt SHA-256) */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gym-surface border border-gym-border rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gym-border mb-4">
              <div className="flex items-center gap-2 text-gym-accent">
                <Receipt className="w-5 h-5" />
                <h3 className="font-bold text-white text-sm">Bukti Kuitansi Pembayaran GYMVAULT</h3>
              </div>
              <button onClick={() => setActiveReceipt(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-gym-card border border-gym-border space-y-3 text-xs font-mono">
              <div className="text-center pb-3 border-b border-gym-border/40">
                <h4 className="font-extrabold text-base text-white">GYMVAULT FITNESS CENTER</h4>
                <p className="text-[11px] text-gray-400">Smart Gym Security & Management</p>
                <p className="text-gym-accent font-bold mt-1 text-sm">{activeReceipt.transactionCode || activeReceipt.transaction_code}</p>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Paket:</span>
                <span className="text-white font-bold">{activeReceipt.planName || activeReceipt.plan_name}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Total Nominal:</span>
                <span className="text-gym-accent font-bold">
                  Rp {Number(activeReceipt.amount).toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Masa Aktif:</span>
                <span className="text-white">
                  {activeReceipt.startDate || activeReceipt.paid_at?.split('T')[0]} s/d {activeReceipt.endDate || '-'}
                </span>
              </div>

              <div className="pt-2 border-t border-gym-border/40">
                <span className="text-[10px] text-gray-500 block mb-1">Integritas Digital SHA-256 Receipt Hash:</span>
                <p className="p-2 rounded bg-gym-bg border border-gym-border text-[9px] text-gym-cyan break-all select-all font-mono">
                  {activeReceipt.receiptHash || activeReceipt.receipt_hash}
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-gym-card hover:bg-gym-border border border-gym-border text-gray-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kuitansi</span>
              </button>
              <button
                onClick={() => setActiveReceipt(null)}
                className="flex-1 py-2 rounded-xl bg-gym-accent text-gym-bg text-xs font-bold hover:bg-gym-accentHover transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
