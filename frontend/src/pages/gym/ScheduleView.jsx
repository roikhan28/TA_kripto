import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  X, 
  User, 
  ShieldAlert
} from 'lucide-react';
import { ipcService } from '../../services/ipcService';
import { useAuth } from '../../contexts/AuthContext';

export default function ScheduleView() {
  const { sessionToken, user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [form, setForm] = useState({
    trainerId: '',
    memberId: '',
    sessionDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    notes: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [conflictError, setConflictError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, trainRes, memRes] = await Promise.all([
        ipcService.getScheduleList(),
        ipcService.getTrainerList(),
        ipcService.getMemberList('')
      ]);

      if (schedRes.success) setSchedules(schedRes.data);
      if (trainRes.success) {
        setTrainers(trainRes.data);
        if (trainRes.data.length > 0 && !form.trainerId) {
          setForm(prev => ({ ...prev, trainerId: trainRes.data[0].id }));
        }
      }
      if (memRes.success) {
        setMembers(memRes.data);
        if (memRes.data.length > 0 && !form.memberId) {
          setForm(prev => ({ ...prev, memberId: memRes.data[0].id }));
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

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setConflictError(null);
    try {
      const res = await ipcService.createSchedule({
        sessionToken,
        trainerId: Number(form.trainerId),
        memberId: Number(form.memberId),
        sessionDate: form.sessionDate,
        startTime: form.startTime,
        endTime: form.endTime,
        notes: form.notes
      });

      if (res.success) {
        setShowModal(false);
        fetchData();
      } else {
        setConflictError(res.error?.message || 'Gagal menjadwalkan sesi');
      }
    } catch (err) {
      setConflictError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await ipcService.updateScheduleStatus(sessionToken, id, status);
      if (res.success) {
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-gym-accent" />
            Jadwal Latihan & Booking Sesi
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Validasi bentrok ganda (*double-booking prevention*) otomatis untuk Trainer & Member
          </p>
        </div>

        <button
          onClick={() => {
            setConflictError(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gym-accent text-gym-bg font-semibold text-xs hover:bg-gym-accentHover transition shadow-lg shadow-gym-accent/20"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Jadwal Baru</span>
        </button>
      </div>

      {/* Schedules List */}
      <div className="bg-gym-surface rounded-2xl border border-gym-border overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gym-border flex items-center justify-between">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-gym-cyan" />
            Daftar Sesi Pelatihan Terjadwal
          </h3>
          <span className="text-xs font-mono text-gray-400">{schedules.length} Sesi Terjadwal</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gym-card text-gray-400 uppercase font-semibold border-b border-gym-border tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Pelatih (Trainer)</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Catatan</th>
                <th className="py-3 px-4 text-center">Aksi Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gym-border/40 text-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 font-mono">
                    Memuat jadwal sesi...
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    Belum ada jadwal sesi yang terdaftar.
                  </td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-gym-card/50 transition font-mono">
                    <td className="py-3 px-4 font-bold text-white">
                      {new Date(s.session_date).toLocaleDateString('id-ID', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-gym-cyan font-semibold">
                      {s.start_time} - {s.end_time}
                    </td>
                    <td className="py-3 px-4 text-gray-200 font-sans">
                      {s.trainer_name}
                    </td>
                    <td className="py-3 px-4 text-gray-200 font-sans">
                      <div>{s.member_name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{s.member_code}</div>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                        s.status === 'SCHEDULED' ? 'bg-gym-cyan/15 text-gym-cyan border-gym-cyan/30' :
                        s.status === 'ATTENDED' ? 'bg-gym-success/15 text-gym-success border-gym-success/30' :
                        'bg-gym-danger/15 text-gym-danger border-gym-danger/30'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 font-sans text-[11px]">
                      {s.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      {s.status === 'SCHEDULED' && (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleUpdateStatus(s.id, 'ATTENDED')}
                            title="Tandai Selesai / Hadir"
                            className="p-1.5 rounded-lg bg-gym-card hover:bg-gym-success/20 hover:text-gym-success text-gray-400 transition"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(s.id, 'CANCELLED')}
                            title="Batalkan Sesi"
                            className="p-1.5 rounded-lg bg-gym-card hover:bg-gym-danger/20 hover:text-gym-danger text-gray-400 transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Tambah Jadwal Baru */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gym-surface border border-gym-border rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-gym-border mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gym-accent" />
                Jadwalkan Sesi Latihan Baru
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {conflictError && (
              <div className="p-3.5 mb-4 rounded-xl bg-gym-danger/10 border border-gym-danger/30 text-gym-danger text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Deteksi Bentrok Jadwal:</p>
                  <p className="mt-0.5 text-[11px]">{conflictError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateSchedule} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">Pilih Pelatih (Trainer)</label>
                <select
                  required
                  value={form.trainerId}
                  onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border text-gray-100 focus:outline-none focus:border-gym-accent"
                >
                  <option value="">-- Pilih Trainer --</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.specialization})
                    </option>
                  ))}
                </select>
              </div>

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
                      {m.member_code} - {m.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Tanggal Sesi</label>
                <input
                  type="date"
                  required
                  value={form.sessionDate}
                  onChange={(e) => setForm({ ...form, sessionDate: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border text-gray-100 font-mono focus:outline-none focus:border-gym-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Waktu Mulai</label>
                  <input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border text-gray-100 font-mono focus:outline-none focus:border-gym-accent"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Waktu Selesai</label>
                  <input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border text-gray-100 font-mono focus:outline-none focus:border-gym-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Catatan Sesi</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Latihan dada & trisep, fokus hipertrofi"
                  className="w-full px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gym-accent"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-2.5 rounded-xl bg-gym-accent text-gym-bg font-bold text-xs hover:bg-gym-accentHover transition shadow-md shadow-gym-accent/20 disabled:opacity-50"
                >
                  {formLoading ? 'Memvalidasi Bentrok Jadwal...' : 'Simpan & Validasi Anti-Bentrok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
