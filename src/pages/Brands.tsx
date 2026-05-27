import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Search, 
  Plus,
  ArrowUpRight,
  IndianRupee,
  Briefcase,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Brand {
  id: string;
  brand_name: string;
  industry: string;
  website_url: string;
  created_at: string;
  campaign_count?: number;
  total_spent?: number;
}

const Brands: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBrands = async () => {
    // In a real scenario, we'd join with campaigns to get counts
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBrands(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBrands();

    const channel = supabase
      .channel('admin_brands_directory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brands' }, () => fetchBrands())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredBrands = brands.filter(b => 
    b.brand_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Brand Directory</h1>
          <p className="text-zinc-500 font-medium">Manage corporate partners and track their campaign history.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text"
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-admin-primary outline-none w-64 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 bg-zinc-100 text-zinc-900 px-4 py-2.5 rounded-xl font-bold hover:bg-white transition-all">
            <Plus size={18} />
            <span>Onboard Brand</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBrands.map((brand) => (
          <div key={brand.id} className="admin-card p-6 admin-card-hover group">
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 bg-zinc-900 rounded-2xl border border-admin-border flex items-center justify-center shadow-inner">
                <Building2 className="text-zinc-500 group-hover:text-admin-primary transition-colors" size={28} />
              </div>
              <button className="p-2 text-zinc-600 hover:text-white transition-colors">
                <ArrowUpRight size={20} />
              </button>
            </div>
            
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-1">{brand.brand_name}</h3>
              <p className="text-zinc-500 text-sm font-medium">{brand.industry || 'Consumer Goods'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-admin-border">
              <div>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Active Deals</p>
                <div className="flex items-center gap-2 text-white font-bold">
                  <Briefcase size={14} className="text-admin-primary" />
                  <span>3</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Total Budget</p>
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <IndianRupee size={14} />
                  <span>₹2.4L</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredBrands.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-700 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl">
            <Building2 size={48} className="mb-4 opacity-10" />
            <p className="font-bold uppercase tracking-widest text-sm">No brands found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Brands;
