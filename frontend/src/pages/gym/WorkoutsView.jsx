import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Calendar, 
  Target, 
  X, 
  Layers
} from 'lucide-react';
import { ipcService } from '../../services/ipcService';
import { useAuth } from '../../contexts/AuthContext';

export default function WorkoutsView() {
  const { sessionToken, user } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [members, setMembers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [form, setForm] = useState({
    memberId: '',
    trainerId: '',
    title: '',
    goalDescription: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    exercises: [
      { dayOfWeek: 'MONDAY', exerciseName: 'Barbell Bench Press', sets: 4, reps: 10, restSeconds: 90, notes: 'Target dada utama' },
      { dayOfWeek: 'WEDNESDAY', exerciseName: 'Barbell Squat', sets: 4, reps: 8, restSeconds: 120, notes: 'Kedalaman 90 derajat' },
      { dayOfWeek: 'FRIDAY', exerciseName: 'Conventional Deadlift', sets: 3, reps: 6, restSeconds: 180, notes: 'Jaga tulang punggung netral' }
    ]
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [memRes, trainRes] = await Promise.all([
        ipcService.getMemberList(''),
        ipcService.getTrainerList()
      ]);

      if (memRes.success) setMembers(memRes.data);
      if (trainRes.success) setTrainers(trainRes.data);

      // Default load member workouts for admin or first member
      if (memRes.data?.length > 0) {
        const wRes = await ipcService.getWorkoutList(memRes.data[0].id);
        if (wRes.success) setWorkouts(wRes.data);
        if (!form.memberId) setForm(prev => ({ ...prev, memberId: memRes.data[0].id }));
      }
      if (trainRes.data?.length > 0 && !form.trainerId) {
        setForm(prev => ({ ...prev, trainerId: trainRes.data[0].id }));
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

  const handleAddExerciseRow = () => {
    setForm(prev => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        { dayOfWeek: 'MONDAY', exerciseName: '', sets: 3, reps: 12, restSeconds: 60, notes: '' }
      ]
    }));
  };

  const handleRemoveExerciseRow = (index) => {
    setForm(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const handleExerciseChange = (index, field, value) => {
    setForm(prev => {
      const updated = [...prev.exercises];
      updated[index][field] = value;
      return { ...prev, exercises: updated };
    });
  };

  const handleCreateWorkout = async (e) => {
    e.preventDefault();
    if (!form.memberId || !form.trainerId) {
      alert('Pilih member dan trainer terlebih dahulu');
      return;
    }
    setFormLoading(true);
    try {
      const res = await ipcService.createWorkout({
        sessionToken,
        trainerId: Number(form.trainerId),
        memberId: Number(form.memberId),
        title: form.title,
        goalDescription: form.goalDescription,
        startDate: form.startDate,
        endDate: form.endDate,
        exercises: form.exercises
      });

      if (res.success) {
        setShowModal(false);
        const wRes = await ipcService.getWorkoutList(form.memberId);
        if (wRes.success) setWorkouts(wRes.data);
      } else {
        alert(res.error?.message || 'Gagal menyimpan program latihan');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Dumbbell className="w-6 h-6 text-gym-accent" />
            Program & Rencana Latihan Kebugaran
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Manajemen gerakan latihan, repetisi, set, dan durasi istirahat terintegrasi
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gym-accent text-gym-bg font-semibold text-xs hover:bg-gym-accentHover transition shadow-lg shadow-gym-accent/20"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Program Baru</span>
        </button>
      </div>

      {/* Workouts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 text-center py-16 text-gray-500 font-mono text-xs">
            Memuat program latihan...
          </div>
        ) : workouts.length === 0 ? (
          <div className="col-span-2 text-center py-16 text-gray-500 bg-gym-surface rounded-2xl border border-gym-border text-xs">
            Belum ada program latihan terdaftar untuk member ini.
          </div>
        ) : (
          workouts.map(w => (
            <div key={w.id} className="p-6 rounded-2xl bg-gym-surface border border-gym-border shadow-xl space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-gym-border">
                <div>
                  <h3 className="font-bold text-base text-white">{w.title}</h3>
                  <p className="text-xs text-gym-accent font-mono mt-0.5">Pelatih: {w.trainer_name}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gym-success/15 text-gym-success border border-gym-success/30 uppercase">
                  {w.status}
                </span>
              </div>

              {w.goal_description && (
                <p className="text-xs text-gray-300 italic">
                  "{w.goal_description}"
                </p>
              )}

              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Rincian Latihan & Target Gerakan:
                </h4>
                {w.details?.map(d => (
                  <div key={d.id} className="p-2.5 rounded-xl bg-gym-card border border-gym-border/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white">{d.exercise_name}</span>
                      <span className="text-gray-400 block text-[10px] font-mono">
                        {d.day_of_week} • Istirahat: {d.rest_seconds}s
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-gym-accent font-bold">{d.sets} Set × {d.reps} Reps</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: Buat Program Baru */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-gym-surface border border-gym-border rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-gym-border mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-gym-accent" />
                Rancang Program Latihan Baru
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkout} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
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
                      <option key={m.id} value={m.id}>{m.member_code} - {m.full_name}</option>
                    ))}
                  </select>
                </div>
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
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Judul Program</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. 12-Week Hypertrophy & Muscle Mass"
                  className="w-full px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border text-gray-100 focus:outline-none focus:border-gym-accent"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Target & Deskripsi Kebugaran</label>
                <input
                  type="text"
                  value={form.goalDescription}
                  onChange={(e) => setForm({ ...form, goalDescription: e.target.value })}
                  placeholder="e.g. Menaikkan massa otot bebas lemak dan melatih kekuatan bench press"
                  className="w-full px-3.5 py-2 rounded-xl bg-gym-card border border-gym-border text-gray-100 focus:outline-none focus:border-gym-accent"
                />
              </div>

              {/* Exercises List Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-gray-300 uppercase tracking-wider text-[11px]">
                    Daftar Gerakan / Exercise
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddExerciseRow}
                    className="px-2.5 py-1 rounded-lg bg-gym-card hover:bg-gym-accent/20 hover:text-gym-accent text-gray-300 font-semibold text-[11px] border border-gym-border flex items-center gap-1 transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah Gerakan</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {form.exercises.map((ex, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-gym-card border border-gym-border grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <select
                          value={ex.dayOfWeek}
                          onChange={(e) => handleExerciseChange(idx, 'dayOfWeek', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-gym-bg border border-gym-border text-[11px] text-gray-200"
                        >
                          <option value="MONDAY">Senin</option>
                          <option value="TUESDAY">Selasa</option>
                          <option value="WEDNESDAY">Rabu</option>
                          <option value="THURSDAY">Kamis</option>
                          <option value="FRIDAY">Jumat</option>
                          <option value="SATURDAY">Sabtu</option>
                          <option value="SUNDAY">Minggu</option>
                        </select>
                      </div>

                      <div className="col-span-4">
                        <input
                          type="text"
                          required
                          value={ex.exerciseName}
                          onChange={(e) => handleExerciseChange(idx, 'exerciseName', e.target.value)}
                          placeholder="Nama Latihan"
                          className="w-full px-2 py-1.5 rounded-lg bg-gym-bg border border-gym-border text-[11px] text-gray-200"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={(e) => handleExerciseChange(idx, 'sets', Number(e.target.value))}
                          placeholder="Set"
                          className="w-full px-2 py-1.5 rounded-lg bg-gym-bg border border-gym-border text-[11px] text-center font-mono text-gray-200"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          value={ex.reps}
                          onChange={(e) => handleExerciseChange(idx, 'reps', Number(e.target.value))}
                          placeholder="Reps"
                          className="w-full px-2 py-1.5 rounded-lg bg-gym-bg border border-gym-border text-[11px] text-center font-mono text-gray-200"
                        />
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveExerciseRow(idx)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gym-danger transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-2.5 rounded-xl bg-gym-accent text-gym-bg font-bold text-xs hover:bg-gym-accentHover transition shadow-md shadow-gym-accent/20 disabled:opacity-50"
                >
                  {formLoading ? 'Menyimpan Program...' : 'Simpan Program Latihan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
