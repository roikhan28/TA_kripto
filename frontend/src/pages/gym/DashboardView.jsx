import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  AlertTriangle, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Activity, 
  Layers, 
  Clock, 
  ShieldCheck, 
  ArrowUpRight 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ipcService } from '../../services/ipcService';

export default function DashboardView({ onNavigate }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await ipcService.getDashboardMetrics();
      if (res.success) {
        setMetrics(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const pieData = [
    { name: 'Aktif', value: metrics?.members?.active || 0, color: '#22C55E' },
    { name: 'Mendekati Expired', value: metrics?.members?.nearExpiry || 0, color: '#F59E0B' },
    { name: 'Expired', value: metrics?.members?.expired || 0, color: '#EF4444' }
  ];

  const barData = metrics?.finance?.monthlyTrends?.length > 0 
    ? metrics.finance.monthlyTrends 
    : [{ month: 'Nov 2026', revenue: metrics?.finance?.totalRevenue || 0, transactions: 1 }];

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <div 
          onClick={() => onNavigate('members')}
          className="p-5 rounded-2xl bg-gym-surface border border-gym-border hover:border-gym-accent/40 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Member</span>
            <Users className="w-5 h-5 text-gym-accent group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {metrics?.members?.total || 0}
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 font-mono">
            <span>Aktif: <span className="text-gym-success font-bold">{metrics?.members?.active || 0}</span></span>
            <span>Expired: <span className="text-gym-danger font-bold">{metrics?.members?.expired || 0}</span></span>
          </div>
        </div>

        {/* Expiring Soon */}
        <div 
          onClick={() => onNavigate('members')}
          className="p-5 rounded-2xl bg-gym-surface border border-gym-border hover:border-gym-warning/40 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Mendekati Kedaluwarsa</span>
            <AlertTriangle className="w-5 h-5 text-gym-warning group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-gym-warning font-mono">
            {metrics?.members?.nearExpiry || 0} <span className="text-xs font-normal text-gray-400">Member</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">Masa aktif $\le 7$ hari lagi</p>
        </div>

        {/* Total Trainers */}
        <div className="p-5 rounded-2xl bg-gym-surface border border-gym-border shadow-lg">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Pelatih</span>
            <UserCheck className="w-5 h-5 text-gym-cyan" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {metrics?.trainers?.total || 0} <span className="text-xs font-normal text-gray-400">Trainer</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">Semua bersertifikasi CSCS / NASM</p>
        </div>

        {/* Total Revenue */}
        <div 
          onClick={() => onNavigate('payments')}
          className="p-5 rounded-2xl bg-gym-surface border border-gym-border hover:border-gym-accent/40 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Pendapatan</span>
            <DollarSign className="w-5 h-5 text-gym-accent group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-white font-mono truncate">
            Rp {(metrics?.finance?.totalRevenue || 0).toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-gray-500 mt-2">Tercatat permanen di MySQL</p>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gym-surface border border-gym-border shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gym-accent" />
                Grafik Tren Pendapatan Bulanan
              </h3>
              <p className="text-xs text-gray-400">Agregasi transaksi pembayaran dari database aktual</p>
            </div>
            <span className="text-xs font-mono text-gym-accent bg-gym-card px-2.5 py-1 rounded-lg border border-gym-border">
              MySQL InnoDB
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#272B33" vertical={false} />
                <XAxis dataKey="month" stroke="#8A94A6" fontSize={11} tickLine={false} />
                <YAxis 
                  stroke="#8A94A6" 
                  fontSize={11} 
                  tickLine={false} 
                  tickFormatter={(val) => `Rp ${(val / 1000).toLocaleString('id-ID')}k`} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#16191E', borderColor: '#272B33', borderRadius: '12px', fontSize: '11px' }}
                  formatter={(value) => [`Rp ${Number(value).toLocaleString('id-ID')}`, 'Pendapatan']}
                />
                <Bar dataKey="revenue" fill="#A3E635" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Member Status Distribution */}
        <div className="p-6 rounded-2xl bg-gym-surface border border-gym-border shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-gym-cyan" />
              Distribusi Status Member
            </h3>
            <p className="text-xs text-gray-400 mb-4">Proporsi keaktifan keanggotaan</p>

            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#16191E', borderColor: '#272B33', borderRadius: '8px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-gym-border font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-gym-success"></span> Aktif:
              </span>
              <span className="font-bold text-white">{metrics?.members?.active || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-gym-warning"></span> Near Expiry:
              </span>
              <span className="font-bold text-white">{metrics?.members?.nearExpiry || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-gym-danger"></span> Expired:
              </span>
              <span className="font-bold text-white">{metrics?.members?.expired || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities Feed */}
      <div className="p-6 rounded-2xl bg-gym-surface border border-gym-border shadow-xl">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-gym-accent" />
          Aktivitas Operasional & Audit Terbaru (Database MySQL)
        </h3>

        <div className="space-y-2.5">
          {metrics?.recentActivities?.length === 0 ? (
            <p className="text-xs text-gray-500 italic">Belum ada aktivitas tercatat</p>
          ) : (
            metrics?.recentActivities?.map(a => (
              <div key={a.id} className="p-3 rounded-xl bg-gym-card border border-gym-border/60 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gym-accent"></div>
                  <div>
                    <span className="font-bold text-white">{a.action}</span>
                    <span className="text-gray-400 block text-[11px]">
                      Aktor: <span className="text-gym-accent font-semibold">{a.username}</span> • Tipe: {a.entityType}
                    </span>
                  </div>
                </div>
                <span className="text-gray-500 text-[11px]">
                  {new Date(a.createdAt).toLocaleTimeString('id-ID')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
