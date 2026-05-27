import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal, 
  CheckCircle2, 
  ExternalLink,
  Instagram,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Creator {
  id: string;
  full_name: string;
  ig_handle: string;
  niche: string;
  followers_count: number;
  engagement_rate: number;
  status: string;
  created_at: string;
}

const Creators: React.FC = () => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCreators = async () => {
    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCreators(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCreators();

    const channel = supabase
      .channel('admin_creators_crm')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creators' }, () => fetchCreators())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredCreators = creators.filter(c => 
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.ig_handle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Creator CRM</h1>
          <p className="text-zinc-500 font-medium">Manage the global database of creators and their performance metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text"
              placeholder="Search by name or @handle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-admin-primary outline-none w-64 transition-all"
            />
          </div>
          <button className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-admin-border bg-zinc-900/50">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Creator</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Niche</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Reach</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Engagement</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {filteredCreators.map((creator) => (
                <tr key={creator.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-bold text-white text-sm">
                        {creator.full_name?.[0] || 'C'}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{creator.full_name}</p>
                        <div className="flex items-center gap-1 text-zinc-500 text-xs">
                          <Instagram size={12} className="text-pink-500" />
                          <span>@{creator.ig_handle}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-zinc-800/50 text-zinc-300 px-2 py-1 rounded text-xs font-semibold">
                      {creator.niche || 'Lifestyle'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-sm">{(creator.followers_count || 0).toLocaleString()}</span>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Followers</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-emerald-500" />
                      <span className="text-emerald-400 font-bold text-sm">{creator.engagement_rate || '4.2'}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-white font-bold text-xs uppercase tracking-widest">Active</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-zinc-500 hover:text-white transition-colors">
                        <ExternalLink size={18} />
                      </button>
                      <button className="p-2 text-zinc-500 hover:text-white transition-colors">
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCreators.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-600 font-bold uppercase tracking-widest text-xs italic">
                    No creators found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card p-6 border-emerald-500/10">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Total Creators</p>
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black text-white">{creators.length}</h3>
            <Users className="text-zinc-800" size={32} />
          </div>
        </div>
        <div className="admin-card p-6 border-admin-primary/10">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Avg. Engagement</p>
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black text-emerald-400">4.82%</h3>
            <TrendingUp className="text-zinc-800" size={32} />
          </div>
        </div>
        <div className="admin-card p-6 border-pink-500/10">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Verified Reach</p>
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black text-white">1.2M</h3>
            <CheckCircle2 className="text-zinc-800" size={32} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Creators;
