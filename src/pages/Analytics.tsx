import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  IndianRupee, 
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Zap,
  Loader2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { supabase } from '../lib/supabase';

const data = [
  { name: 'Mon', spend: 4000, views: 24000 },
  { name: 'Tue', spend: 3000, views: 18000 },
  { name: 'Wed', spend: 2000, views: 12000 },
  { name: 'Thu', spend: 2780, views: 19000 },
  { name: 'Fri', spend: 1890, views: 15000 },
  { name: 'Sat', spend: 2390, views: 21000 },
  { name: 'Sun', spend: 3490, views: 28000 },
];

const COLORS = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B'];

const Analytics: React.FC = () => {
  const [stats, setStats] = useState({
    totalSpend: 0,
    totalImpressions: 4800000, // Still mocked until we have verification engine
    activeCreators: 0,
    campaignCount: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    const { data: campaigns } = await supabase.from('campaigns').select('budget');
    const { count: creatorCount } = await supabase.from('creators').select('*', { count: 'exact', head: true });
    
    const totalSpend = campaigns?.reduce((sum, c) => sum + Number(c.budget), 0) || 0;
    
    setStats({
      totalSpend,
      totalImpressions: 4800000,
      activeCreators: creatorCount || 0,
      campaignCount: campaigns?.length || 0
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('admin_analytics_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creators' }, () => fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="text-admin-primary animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Market Pulse</h1>
          <p className="text-zinc-500 font-medium">Real-time performance analytics across all active campaigns.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-2">
            <Calendar size={18} className="text-zinc-500" />
            <span className="text-white text-sm font-bold">May 2026</span>
          </div>
          <button className="flex items-center gap-2 bg-admin-primary text-white px-4 py-2 rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-violet-500/20">
            <Zap size={18} />
            <span>Gen Insights</span>
          </button>
        </div>
      </div>

      {/* High Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Managed Spend" 
          value={`₹${(stats.totalSpend / 100000).toFixed(1)}L`} 
          change="+0.0%" 
          isPositive={true}
          icon={<IndianRupee className="text-emerald-400" />} 
        />
        <StatCard 
          label="Total Reach" 
          value="0" 
          change="+0.0%" 
          isPositive={true}
          icon={<Users className="text-blue-400" />} 
        />
        <StatCard 
          label="Active Creators" 
          value={stats.activeCreators.toString()} 
          change="+0.0%" 
          isPositive={true}
          icon={<Zap className="text-violet-400" />} 
        />
        <StatCard 
          label="Live Campaigns" 
          value={stats.campaignCount.toString()} 
          change="+0.0%" 
          isPositive={true}
          icon={<BarChart3 className="text-pink-400" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 admin-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Budget Allocation vs Performance</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-admin-primary" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Spend</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-pink-500" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Reach</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EC4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181B" />
                <XAxis dataKey="name" stroke="#52525B" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <YAxis stroke="#52525B" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090B', border: '1px solid #18181B', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="spend" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorSpend)" />
                <Area type="monotone" dataKey="views" stroke="#EC4899" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-card p-8">
          <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-8">Niche Distribution</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Fashion', val: 45 },
                { name: 'Tech', val: 32 },
                { name: 'Lifestyle', val: 28 },
                { name: 'Gaming', val: 24 },
                { name: 'Fitness', val: 18 }
              ]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#18181B" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#A1A1AA" fontSize={10} fontWeight="bold" width={70} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#09090B', border: '1px solid #18181B', borderRadius: '12px' }}
                />
                <Bar dataKey="val" radius={[0, 4, 4, 0]} barSize={20}>
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-emerald-500" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">Growth Sector</span>
            </div>
            <p className="text-sm text-zinc-400">Fashion niche spend increased by <span className="text-white font-bold">12%</span> this week due to Summer collections.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; change: string; isPositive: boolean; icon: React.ReactNode }> = ({ label, value, change, isPositive, icon }) => (
  <div className="admin-card p-6 admin-card-hover">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 group-hover:border-admin-primary transition-all">
        {icon}
      </div>
      <div className={`flex items-center gap-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500'} text-xs font-black uppercase`}>
        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {change}
      </div>
    </div>
    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
    <h3 className="text-3xl font-black text-white italic tracking-tighter">{value}</h3>
  </div>
);

export default Analytics;
