import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  IndianRupee,
  Eye,
  Clock,
  Loader2,
  Rocket,
  Instagram,
  ArrowRight,
  X,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Creator {
  id: string;
  name?: string;
  full_name?: string;
  ig_handle: string;
}

interface CampaignRequest {
  id: string;
  campaign_name: string;
  budget: number;
  status: string;
  created_at: string;
  brand_id: string;
  cpv_rate?: number;
  campaign_description?: string;
  description?: string;
  campaign_type?: string;
  target_category?: string;
  requirements?: string;
  deliverables?: {
    content_type?: string;
    creator_type?: string;
    quality_level?: string;
    product_name?: string;
    product_link?: string;
    product_type?: string;
    product_value?: string;
    shipping_required?: boolean;
  };
  brands: { brand_name: string };
  phase?: string;
  campaign_creators: { 
    creator_id: string;
    creators: Creator;
  }[];
}

const Launchpad: React.FC = () => {
  const [requests, setRequests] = useState<CampaignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspecting, setInspecting] = useState<CampaignRequest | null>(null);
  const [cpvRates, setCpvRates] = useState<Record<string, number>>({});

  const fetchRequests = async () => {
    // Fetch campaigns with brand info and ALL selected creators
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        brands(brand_name),
        campaign_creators(
          creator_id,
          creators(*)
        )
      `)
      .in('status', ['pending_admin', 'payment_pending', 'active'])
      .not('phase', 'in', '("campaign_active","campaign_complete")')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('admin_launchpad_deep')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => fetchRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_creators' }, () => fetchRequests())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLaunch = async (campaignId: string) => {
    try {
      const campaign = requests.find(r => r.id === campaignId);
      const cpvVal = cpvRates[campaignId] !== undefined 
        ? cpvRates[campaignId] 
        : (campaign?.cpv_rate || 2.0);

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/launch-campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          cpvRate: cpvVal,
          platformFee: 20
        })
      });
      
      if (response.ok) {
        alert(`Campaign Launched Successfully with CPV ₹${cpvVal.toFixed(2)}!`);
        fetchRequests();
        setInspecting(null);
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`Failed to launch campaign: ${errData.error || response.statusText}`);
      }
    } catch (err: any) {
      alert(`Connection error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="text-admin-primary animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Approval Queue</h1>
          <p className="text-zinc-500 font-medium">Real-time requests from brands awaiting your validation.</p>
        </div>
        <div className="bg-admin-amber/10 border border-admin-amber/20 px-4 py-2 rounded-lg flex items-center gap-3">
          <Clock className="text-admin-amber" size={18} />
          <span className="text-admin-amber font-bold text-sm tracking-wide">
            {requests.length} Live Requests
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {requests.length === 0 ? (
          <div className="admin-card p-20 flex flex-col items-center justify-center text-zinc-700 bg-zinc-900/10 border-dashed">
            <Rocket size={48} className="mb-4 opacity-10" />
            <p className="font-bold uppercase tracking-widest text-sm">Waiting for Brand Submissions...</p>
          </div>
        ) : requests.map((req) => (
          <div key={req.id} className="admin-card p-6 admin-card-hover group border-l-4 border-l-transparent hover:border-l-admin-primary transition-all">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-zinc-900 rounded-xl border border-admin-border flex items-center justify-center relative">
                  <Building2 className="text-zinc-500 group-hover:text-admin-primary transition-colors" size={28} />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-admin-bg animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white uppercase tracking-tight italic">{req.brands?.brand_name}</h3>
                    <span className="text-[10px] font-black text-zinc-700 bg-zinc-800 px-1.5 py-0.5 rounded tracking-widest">#{req.id.split('-')[0]}</span>
                    {req.status === 'pending_admin' && (
                      <span className="text-[10px] font-bold text-admin-amber bg-admin-amber/10 border border-admin-amber/20 px-2 py-0.5 rounded uppercase tracking-wider">Review Required</span>
                    )}
                    {req.phase === 'approved_pending_funds' && (
                      <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded uppercase tracking-wider">Approved</span>
                    )}
                    {req.status === 'active' && req.phase !== 'approved_pending_funds' && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded uppercase tracking-wider">Funded</span>
                    )}
                  </div>
                  <p className="text-zinc-400 font-medium text-sm">Campaign: <span className="text-zinc-100 font-bold">{req.campaign_name}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Target Creators</p>
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Users size={16} className="text-admin-primary" />
                    <span>{req.campaign_creators?.length || 0} Influencers</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Escrow Budget</p>
                  <div className="flex items-center gap-2 text-emerald-400 font-black">
                    <IndianRupee size={16} />
                    <span>₹{req.budget?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="hidden md:block">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Submitted</p>
                  <p className="text-zinc-400 font-bold text-sm">{new Date(req.created_at).toLocaleTimeString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setInspecting(req)}
                  className="btn-admin-outline flex items-center gap-2 border-zinc-800 hover:border-zinc-600 group/btn"
                >
                  <Eye size={18} />
                  <span>Inspect</span>
                </button>
                {req.status === 'pending_admin' ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">CPV:</span>
                      <input 
                        type="number" 
                        min="0.1" 
                        step="0.1" 
                        value={cpvRates[req.id] !== undefined ? cpvRates[req.id] : 2.0} 
                        onChange={(e) => setCpvRates({ ...cpvRates, [req.id]: parseFloat(e.target.value) || 0 })}
                        className="bg-transparent text-white font-bold text-sm w-12 focus:outline-none" 
                      />
                      <span className="text-xs font-semibold text-zinc-400">₹</span>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          const cpvVal = cpvRates[req.id] !== undefined ? cpvRates[req.id] : 2.0;
                          const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/approve-campaign`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ campaignId: req.id, adminId: 'admin', cpvRate: cpvVal })
                          });
                          if (response.ok) {
                            alert(`Campaign Approved with CPV ₹${cpvVal.toFixed(2)}! Brand can now fund the wallet.`);
                            fetchRequests();
                          } else {
                            const errData = await response.json().catch(() => ({}));
                            alert(`Failed to approve campaign: ${errData.error || response.statusText}`);
                          }
                        } catch (err: any) {
                          alert(`Connection error: ${err.message}`);
                        }
                      }}
                      className="btn-admin-primary flex items-center gap-2 bg-admin-amber text-black hover:bg-white"
                    >
                      <CheckCircle2 size={18} />
                      <span>Approve</span>
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleLaunch(req.id)}
                    className="btn-admin-primary flex items-center gap-2 bg-zinc-100 text-zinc-900 hover:bg-white"
                  >
                    <CheckCircle2 size={18} />
                    <span>Launch</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inspection Modal */}
      {inspecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="admin-card w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl border-admin-primary/20">
            <div className="p-6 border-b border-admin-border flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-admin-primary/10 rounded-xl">
                  <Building2 className="text-admin-primary" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Campaign Blueprint</h2>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{inspecting.brands?.brand_name} &bull; {inspecting.campaign_name}</p>
                </div>
              </div>
              <button 
                onClick={() => setInspecting(null)}
                className="p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Product & Campaign Specifications */}
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-2">
                  <h3 className="text-sm font-black text-admin-amber uppercase tracking-widest">Campaign & Product Specs</h3>
                  <span className="text-xs font-bold text-white bg-zinc-800 border border-zinc-700 px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">
                    Niche: {inspecting.target_category || inspecting.campaign_type || 'General'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Product Details</p>
                      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Name:</span>
                          <span className="text-white font-bold">{inspecting.deliverables?.product_name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Type:</span>
                          <span className="text-white font-bold capitalize">{inspecting.deliverables?.product_type || 'N/A'}</span>
                        </div>
                        {inspecting.deliverables?.product_link && (
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Product URL:</span>
                            <a 
                              href={inspecting.deliverables.product_link} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-admin-amber hover:underline font-bold flex items-center gap-1"
                            >
                              Visit Page <ExternalLink size={12} />
                            </a>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Estimated Value:</span>
                          <span className="text-white font-bold">
                            {inspecting.deliverables?.product_value ? `₹${inspecting.deliverables.product_value}` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Deliverables & Tiers</p>
                      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Required format:</span>
                          <span className="text-white font-bold">{inspecting.deliverables?.content_type || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Target tier:</span>
                          <span className="text-white font-bold uppercase">{inspecting.deliverables?.creator_type || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Required quality:</span>
                          <span className="text-white font-bold">{inspecting.deliverables?.quality_level || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Campaign Description & Brief</p>
                  <p className="text-zinc-300 text-sm leading-relaxed bg-zinc-900/40 p-4 border border-zinc-800/50 rounded-xl whitespace-pre-wrap">
                    {inspecting.campaign_description || inspecting.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest">Selected Influencer Squad</h3>
                  <span className="text-xs font-bold text-admin-amber bg-admin-amber/10 border border-admin-amber/20 px-2.5 py-1 rounded-lg">
                    {inspecting.campaign_creators?.length || 0} Creators Selected
                  </span>
                </div>
                {inspecting.campaign_creators && inspecting.campaign_creators.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inspecting.campaign_creators.map((item, idx) => (
                      <div key={idx} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between group hover:border-zinc-700 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-400">
                            {(item.creators.name || item.creators.full_name)?.[0] || 'C'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{item.creators.name || item.creators.full_name || 'Anonymous Creator'}</p>
                            <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-bold">
                              <Instagram size={10} className="text-pink-500" />
                              <span>@{item.creators.ig_handle}</span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-zinc-800 group-hover:text-admin-amber group-hover:translate-x-1 transition-all" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-zinc-900/20 border border-dashed border-zinc-800 rounded-xl p-8 text-center text-zinc-500 font-bold uppercase tracking-wider text-xs">
                    No creators selected for this campaign yet.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-admin-border">
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Campaign Budget (Total)</p>
                  <p className="text-3xl font-black text-white italic tracking-tighter">₹{inspecting.budget.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
                    {inspecting.status === 'pending_admin' ? 'Assign CPV Rate (₹ per view)' : 'Approved CPV Rate'}
                  </p>
                  {inspecting.status === 'pending_admin' ? (
                    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 w-full max-w-[200px]">
                      <input 
                        type="number" 
                        min="0.1" 
                        step="0.1" 
                        value={cpvRates[inspecting.id] !== undefined ? cpvRates[inspecting.id] : 2.0} 
                        onChange={(e) => setCpvRates({ ...cpvRates, [inspecting.id]: parseFloat(e.target.value) || 0 })}
                        className="bg-transparent text-emerald-400 font-black text-2xl w-full focus:outline-none" 
                      />
                      <span className="text-lg font-bold text-zinc-500">₹</span>
                    </div>
                  ) : (
                    <p className="text-3xl font-black text-emerald-400 italic tracking-tighter">
                      ₹{inspecting.cpv_rate !== undefined ? inspecting.cpv_rate.toFixed(2) : '2.00'} / view
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-zinc-900/50 border-t border-admin-border flex items-center gap-4">
              <button 
                onClick={() => setInspecting(null)}
                className="flex-1 py-3 border border-zinc-800 rounded-xl font-bold text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all uppercase tracking-widest text-xs"
              >
                Close Inspection
              </button>
              {inspecting.status === 'pending_admin' ? (
                <button 
                  onClick={async () => {
                    try {
                      const cpvVal = cpvRates[inspecting.id] !== undefined ? cpvRates[inspecting.id] : 2.0;
                      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/approve-campaign`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ campaignId: inspecting.id, adminId: 'admin', cpvRate: cpvVal })
                      });
                      if (response.ok) {
                        alert(`Campaign Approved with CPV ₹${cpvVal.toFixed(2)}! Brand can now fund the wallet.`);
                        fetchRequests();
                        setInspecting(null);
                      } else {
                        const errData = await response.json().catch(() => ({}));
                        alert(`Failed to approve campaign: ${errData.error || response.statusText}`);
                      }
                    } catch (err: any) {
                      alert(`Connection error: ${err.message}`);
                    }
                  }}
                  className="flex-[2] py-3 bg-admin-amber text-black rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all shadow-xl shadow-white/5"
                >
                  Approve Campaign Details
                </button>
              ) : (
                <button 
                  onClick={() => handleLaunch(inspecting.id)}
                  className="flex-[2] py-3 bg-white text-zinc-900 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-admin-primary hover:text-white transition-all shadow-xl shadow-white/5"
                >
                  Confirm & Launch Campaign
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Launchpad;
