import React, { useEffect, useState } from 'react';
import { 
  Coins, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Building2, 
  Loader2, 
  ExternalLink,
  ShieldCheck,
  Check,
  Copy,
  Clock,
  XCircle,
  TrendingUp,
  ArrowDownToLine
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Application {
  id: string;
  status: 'applied' | 'approved' | 'script_submitted' | 'script_approved' | 'video_submitted' | 'video_approved' | 'posted' | 'verified' | 'paid' | 'rejected';
  verified_views: number | null;
  final_earning_inr: number | null;
  user_id: string;
  applied_at: string;
  post_url: string | null;
  updated_at: string;
  profiles: {
    display_name: string | null;
    coin_balance: number | null;
  } | null;
  legacy_campaigns: {
    id: string;
    title: string;
    brand_name: string;
    created_by: string;
  } | null;
}

interface Withdrawal {
  id: string;
  user_id: string;
  amount_inr: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  destination_kind: string;
  destination_value: string;
  created_at: string;
  reference: string | null;
  profiles: {
    display_name: string | null;
    coin_balance: number | null;
  } | null;
}

const Payouts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'escrow' | 'withdrawals'>('escrow');
  const [applications, setApplications] = useState<Application[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [brands, setBrands] = useState<Record<string, number>>({}); // maps creator user_id -> balance
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingWdId, setProcessingWdId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'paid'>('all');
  const [wdStatusFilter, setWdStatusFilter] = useState<'all' | 'pending' | 'processing' | 'paid' | 'failed'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // 1. Fetch applications in verified or paid status
      const { data: appsData, error: appsErr } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          verified_views,
          final_earning_inr,
          user_id,
          applied_at,
          post_url,
          updated_at,
          profiles!user_id(display_name, coin_balance),
          legacy_campaigns!campaign_id(id, title, brand_name, created_by)
        `)
        .in('status', ['verified', 'paid'])
        .order('updated_at', { ascending: false });

      if (appsErr) throw appsErr;

      // 2. Fetch brands with wallets
      const { data: brandsData, error: brandsErr } = await supabase
        .from('brands')
        .select(`
          id,
          user_id,
          brand_name,
          brand_wallets(balance)
        `);

      if (brandsErr) throw brandsErr;

      // Map brand balances in memory for easy lookup
      // key: brand's user_id (created_by in legacy_campaigns) -> balance
      const balanceMap: Record<string, number> = {};
      if (brandsData) {
        brandsData.forEach((b: any) => {
          let balance = 0;
          if (b.brand_wallets) {
            if (Array.isArray(b.brand_wallets)) {
              balance = Number(b.brand_wallets[0]?.balance || 0);
            } else {
              balance = Number((b.brand_wallets as any).balance || 0);
            }
          }
          if (b.user_id) {
            balanceMap[b.user_id] = balance;
          }
        });
      }

      // 3. Fetch creator withdrawals
      const { data: wdData, error: wdErr } = await supabase
        .from('withdrawals')
        .select(`
          id,
          user_id,
          amount_inr,
          status,
          destination_kind,
          destination_value,
          created_at,
          reference,
          profiles!withdrawals_user_id_profiles_fkey(display_name, coin_balance)
        `)
        .order('created_at', { ascending: false });

      if (wdErr) throw wdErr;

      setApplications(appsData || []);
      setBrands(balanceMap);
      setWithdrawals(wdData || []);
    } catch (err) {
      console.error('Error fetching payouts data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime application updates
    const channel = supabase
      .channel('admin_payouts_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brand_wallets' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDisburse = async (app: Application) => {
    if (!app.final_earning_inr) return;
    
    // Safety verification check
    const confirmRelease = window.confirm(
      `Confirm release of ₹${app.final_earning_inr.toLocaleString()} to ${app.profiles?.display_name || 'Creator'}? This action is atomic and irreversible.`
    );
    if (!confirmRelease) return;

    setProcessingId(app.id);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
      const response = await fetch(`${backendUrl}/api/admin/disburse-funds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: app.id })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        alert('Payout released successfully! Funds debited from Brand and credited to Creator.');
        fetchData();
      } else {
        alert(data.error || 'Failed to release payout.');
      }
    } catch (err: any) {
      alert(`Connection error: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleProcessWithdrawal = async (w: Withdrawal, status: 'paid' | 'processing' | 'failed') => {
    let confirmMsg = '';
    if (status === 'paid') {
      confirmMsg = `Confirm marking withdrawal of ₹${w.amount_inr.toLocaleString()} to ${w.profiles?.display_name || 'Creator'} as PAID? This will debit their wallet balance.`;
    } else if (status === 'failed') {
      confirmMsg = `Confirm REJECTING/FAILING withdrawal of ₹${w.amount_inr.toLocaleString()} to ${w.profiles?.display_name || 'Creator'}?`;
    } else {
      confirmMsg = `Confirm marking withdrawal of ₹${w.amount_inr.toLocaleString()} to ${w.profiles?.display_name || 'Creator'} as PROCESSING?`;
    }

    if (!window.confirm(confirmMsg)) return;

    setProcessingWdId(w.id);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
      const response = await fetch(`${backendUrl}/api/admin/process-withdrawal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId: w.id, status })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        alert(`Withdrawal marked as ${status} successfully!`);
        fetchData();
      } else {
        alert(data.error || 'Failed to process withdrawal.');
      }
    } catch (err: any) {
      alert(`Connection error: ${err.message}`);
    } finally {
      setProcessingWdId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Stats calculation - Escrow
  const pendingApps = applications.filter(a => a.status === 'verified');
  const disbursedApps = applications.filter(a => a.status === 'paid');
  const totalPendingAmt = pendingApps.reduce((sum, a) => sum + (a.final_earning_inr || 0), 0);
  const totalDisbursedAmt = disbursedApps.reduce((sum, a) => sum + (a.final_earning_inr || 0), 0);

  // Stats calculation - Withdrawals
  const pendingWds = withdrawals.filter(w => w.status === 'pending');
  const processingWds = withdrawals.filter(w => w.status === 'processing');
  const paidWds = withdrawals.filter(w => w.status === 'paid');
  const failedWds = withdrawals.filter(w => w.status === 'failed');

  const totalPendingWdAmt = pendingWds.reduce((sum, w) => sum + w.amount_inr, 0) + processingWds.reduce((sum, w) => sum + w.amount_inr, 0);
  const totalPaidWdAmt = paidWds.reduce((sum, w) => sum + w.amount_inr, 0);

  // Filtering - Escrow
  const filteredApps = applications.filter(app => {
    const creatorName = app.profiles?.display_name || '';
    const campaignTitle = app.legacy_campaigns?.title || '';
    const brandName = app.legacy_campaigns?.brand_name || '';
    
    const matchesSearch = 
      creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaignTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brandName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ? true : app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filtering - Withdrawals
  const filteredWds = withdrawals.filter(wd => {
    const creatorName = wd.profiles?.display_name || '';
    const dest = wd.destination_value || '';
    
    const matchesSearch = 
      creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dest.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      wdStatusFilter === 'all' ? true : wd.status === wdStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const STAT_WD_CHIP: Record<string, string> = {
    pending: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    processing: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    paid: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    failed: 'bg-rose-500/10 border-rose-500/20 text-rose-400'
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
            <Coins className="text-admin-primary" size={32} />
            Financial Dashboard
          </h1>
          <p className="text-zinc-500 font-medium mt-1">
            Review brand escrow releases, manage creator wallet withdrawals, and track transaction safety records.
          </p>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => { setActiveTab('escrow'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold tracking-tight border-b-2 uppercase italic transition-all ${
            activeTab === 'escrow'
              ? 'border-admin-primary text-white bg-zinc-900/10'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Building2 size={16} />
          Campaign Escrow Payouts
        </button>
        <button
          onClick={() => { setActiveTab('withdrawals'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold tracking-tight border-b-2 uppercase italic transition-all ${
            activeTab === 'withdrawals'
              ? 'border-admin-primary text-white bg-zinc-900/10'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <ArrowDownToLine size={16} />
          Creator Wallet Withdrawals
        </button>
      </div>

      {activeTab === 'escrow' ? (
        <>
          {/* Stats Cards - Escrow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="admin-card p-6 bg-gradient-to-br from-violet-600/10 to-transparent border-violet-500/10 relative overflow-hidden">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Escrow Pending Release</p>
              <div className="flex items-center gap-1.5">
                <h3 className="text-3xl font-black text-white italic tracking-tighter">
                  ₹{totalPendingAmt.toLocaleString()}
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-3 font-semibold">
                {pendingApps.length} payouts waiting for admin authorization
              </p>
            </div>

            <div className="admin-card p-6 bg-gradient-to-br from-emerald-600/10 to-transparent border-emerald-500/10 relative overflow-hidden">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Successfully Disbursed</p>
              <div className="flex items-center gap-1.5">
                <h3 className="text-3xl font-black text-white italic tracking-tighter">
                  ₹{totalDisbursedAmt.toLocaleString()}
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-3 font-semibold">
                {disbursedApps.length} payouts securely processed to creators
              </p>
            </div>

            <div className="admin-card p-6 bg-gradient-to-br from-zinc-800/20 to-transparent border-zinc-700/20 relative overflow-hidden">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Authorization Success Rate</p>
              <div className="flex items-center gap-1.5">
                <h3 className="text-3xl font-black text-white italic tracking-tighter">
                  {applications.length > 0 
                    ? `${Math.round((disbursedApps.length / applications.length) * 100)}%` 
                    : '100%'}
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-3 font-semibold">
                Platform payout processing verification rate
              </p>
            </div>
          </div>

          {/* Filters and search - Escrow */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-admin-surface/30 p-4 rounded-xl border border-admin-border">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Search campaign, creator, brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-admin-primary transition-colors"
              />
            </div>

            {/* Tab Filters */}
            <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800 w-full md:w-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-admin-primary text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('verified')}
                className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  statusFilter === 'verified'
                    ? 'bg-admin-primary text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Pending Release
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  statusFilter === 'paid'
                    ? 'bg-admin-primary text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Disbursed
              </button>
            </div>
          </div>

          {/* Payout Table */}
          <div className="admin-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-admin-border bg-zinc-900/30 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Campaign & Brand</th>
                    <th className="px-6 py-4">Creator Details</th>
                    <th className="px-6 py-4">Performance Insights</th>
                    <th className="px-6 py-4">Required Payout</th>
                    <th className="px-6 py-4">Brand Wallet Balance</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border text-sm">
                  {filteredApps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-medium">
                        No payouts matching the filter criteria found.
                      </td>
                    </tr>
                  ) : (
                    filteredApps.map((app) => {
                      const brandCreatorId = app.legacy_campaigns?.created_by || '';
                      const brandBalance = brands[brandCreatorId] || 0;
                      const payoutAmt = app.final_earning_inr || 0;
                      const isInsufficient = app.status === 'verified' && brandBalance < payoutAmt;
                      const isPending = app.status === 'verified';
                      const isDisbursed = app.status === 'paid';

                      return (
                        <tr 
                          key={app.id} 
                          className={`hover:bg-zinc-900/20 transition-all ${
                            isInsufficient ? 'bg-amber-950/5' : ''
                          }`}
                        >
                          {/* Campaign & Brand */}
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="font-bold text-white tracking-tight leading-tight">
                                {app.legacy_campaigns?.title || 'Unknown Campaign'}
                              </span>
                              <span className="text-xs text-zinc-500 font-semibold mt-1 flex items-center gap-1">
                                <Building2 size={12} className="text-zinc-600" />
                                {app.legacy_campaigns?.brand_name || 'Unknown Brand'}
                              </span>
                            </div>
                          </td>

                          {/* Creator */}
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-400 text-xs">
                                {app.profiles?.display_name ? app.profiles.display_name.substring(0, 2).toUpperCase() : 'CR'}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-white">
                                  {app.profiles?.display_name || 'Creator'}
                                </span>
                                <span className="text-xs text-zinc-500 font-medium">
                                  ID: {app.user_id.substring(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Performance */}
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="font-semibold text-zinc-300">
                                {app.verified_views?.toLocaleString() || 0} views
                              </span>
                              {app.post_url ? (
                                <a
                                  href={app.post_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-admin-primary hover:underline flex items-center gap-1 mt-1 font-semibold"
                                >
                                  View Submission <ExternalLink size={10} />
                                </a>
                              ) : (
                                <span className="text-xs text-zinc-600">No Post Link</span>
                              )}
                            </div>
                          </td>

                          {/* Required Payout */}
                          <td className="px-6 py-5 font-black text-white italic">
                            ₹{payoutAmt.toLocaleString()}
                          </td>

                          {/* Brand Balance */}
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className={`font-semibold ${
                                isInsufficient ? 'text-rose-400' : 'text-zinc-300'
                              }`}>
                                ₹{brandBalance.toLocaleString()}
                              </span>
                              {isInsufficient && (
                                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                                  <AlertCircle size={10} />
                                  Shortfall: ₹{(payoutAmt - brandBalance).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-5 text-right">
                            {isDisbursed ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                                <CheckCircle2 size={14} />
                                Disbursed
                              </div>
                            ) : isInsufficient ? (
                              <button
                                disabled
                                className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-600 rounded-lg text-xs font-bold uppercase cursor-not-allowed flex items-center gap-2 inline-flex"
                              >
                                <AlertCircle size={14} />
                                Escrow Blocked
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDisburse(app)}
                                disabled={processingId === app.id}
                                className="px-4 py-2 bg-admin-primary hover:bg-violet-600 disabled:bg-violet-800/50 text-white rounded-lg text-xs font-bold uppercase active:scale-95 transition-all flex items-center gap-2 inline-flex"
                              >
                                {processingId === app.id ? (
                                  <>
                                    <Loader2 className="animate-spin" size={14} />
                                    Releasing...
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck size={14} />
                                    Release Funds
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Stats Cards - Withdrawals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="admin-card p-6 bg-gradient-to-br from-amber-600/10 to-transparent border-amber-500/10 relative overflow-hidden">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Pending/Processing Withdrawals</p>
              <div className="flex items-center gap-1.5">
                <h3 className="text-3xl font-black text-white italic tracking-tighter">
                  ₹{totalPendingWdAmt.toLocaleString()}
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-3 font-semibold">
                {pendingWds.length + processingWds.length} requests waiting for transfer
              </p>
            </div>

            <div className="admin-card p-6 bg-gradient-to-br from-emerald-600/10 to-transparent border-emerald-500/10 relative overflow-hidden">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Successfully Transferred</p>
              <div className="flex items-center gap-1.5">
                <h3 className="text-3xl font-black text-white italic tracking-tighter">
                  ₹{totalPaidWdAmt.toLocaleString()}
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-3 font-semibold">
                {paidWds.length} requests paid and settled out
              </p>
            </div>

            <div className="admin-card p-6 bg-gradient-to-br from-rose-800/10 to-transparent border-rose-700/10 relative overflow-hidden">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Failed/Rejected requests</p>
              <div className="flex items-center gap-1.5">
                <h3 className="text-3xl font-black text-white italic tracking-tighter">
                  {failedWds.length}
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-3 font-semibold">
                Rejected or failed creator withdrawal requests
              </p>
            </div>
          </div>

          {/* Filters and search - Withdrawals */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-admin-surface/30 p-4 rounded-xl border border-admin-border">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Search creator name, UPI ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-admin-primary transition-colors"
              />
            </div>

            {/* Tab Filters */}
            <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800 w-full md:w-auto flex-wrap">
              {(['all', 'pending', 'processing', 'paid', 'failed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setWdStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all uppercase ${
                    wdStatusFilter === st
                      ? 'bg-admin-primary text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Withdrawals Table */}
          <div className="admin-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-admin-border bg-zinc-900/30 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Request Date</th>
                    <th className="px-6 py-4">Creator Details</th>
                    <th className="px-6 py-4">Actual Wallet Balance</th>
                    <th className="px-6 py-4">Requested Payout</th>
                    <th className="px-6 py-4">UPI Destination</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border text-sm">
                  {filteredWds.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 font-medium">
                        No withdrawal requests found matching constraints.
                      </td>
                    </tr>
                  ) : (
                    filteredWds.map((w) => {
                      const coinBal = w.profiles?.coin_balance ?? 0;
                      const hasSufficient = coinBal >= w.amount_inr;
                      const isPending = w.status === 'pending';
                      const isProcessing = w.status === 'processing';
                      const isActionable = isPending || isProcessing;

                      return (
                        <tr 
                          key={w.id} 
                          className={`hover:bg-zinc-900/20 transition-all ${
                            !hasSufficient && isActionable ? 'bg-rose-950/10' : ''
                          }`}
                        >
                          {/* Request Date */}
                          <td className="px-6 py-5 text-zinc-400 font-medium">
                            {new Date(w.created_at).toLocaleDateString()}
                            <div className="text-[10px] text-zinc-600 mt-0.5">
                              {new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          {/* Creator Details */}
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-400 text-xs">
                                {w.profiles?.display_name ? w.profiles.display_name.substring(0, 2).toUpperCase() : 'CR'}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-white">
                                  {w.profiles?.display_name || 'Creator'}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  {w.user_id.substring(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Creator Wallet Balance */}
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className={`font-black ${hasSufficient ? 'text-zinc-300' : 'text-rose-400 font-bold'}`}>
                                ₹{coinBal.toLocaleString()}
                              </span>
                              {!hasSufficient && isActionable && (
                                <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                                  <AlertCircle size={10} />
                                  Insufficient Balance
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Requested Amount */}
                          <td className="px-6 py-5 font-black text-white text-base">
                            ₹{w.amount_inr.toLocaleString()}
                          </td>

                          {/* UPI ID */}
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-zinc-300 font-semibold bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">
                                {w.destination_value}
                              </span>
                              <button
                                onClick={() => copyToClipboard(w.destination_value, w.id)}
                                className="p-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500 hover:text-white transition-colors"
                                title="Copy UPI ID"
                              >
                                {copiedId === w.id ? (
                                  <Check size={14} className="text-emerald-400" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-lg text-xs font-bold uppercase tracking-wider ${STAT_WD_CHIP[w.status] || ''}`}>
                              {w.status === 'pending' && <Clock size={12} />}
                              {w.status === 'processing' && <Loader2 size={12} className="animate-spin" />}
                              {w.status === 'paid' && <CheckCircle2 size={12} />}
                              {w.status === 'failed' && <XCircle size={12} />}
                              {w.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-5 text-right">
                            {isActionable ? (
                              <div className="flex items-center justify-end gap-2">
                                {isPending && (
                                  <button
                                    onClick={() => handleProcessWithdrawal(w, 'processing')}
                                    disabled={processingWdId === w.id}
                                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold uppercase transition-colors"
                                  >
                                    Processing
                                  </button>
                                )}
                                <button
                                  onClick={() => handleProcessWithdrawal(w, 'paid')}
                                  disabled={processingWdId === w.id}
                                  className="px-3 py-1.5 bg-coin hover:bg-amber-600 disabled:opacity-50 text-coin-foreground rounded-lg text-xs font-bold uppercase active:scale-95 transition-all flex items-center gap-1"
                                >
                                  {processingWdId === w.id ? (
                                    <Loader2 className="animate-spin" size={12} />
                                  ) : (
                                    <ShieldCheck size={12} />
                                  )}
                                  Mark Paid
                                </button>
                                <button
                                  onClick={() => handleProcessWithdrawal(w, 'failed')}
                                  disabled={processingWdId === w.id}
                                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-lg text-xs font-bold uppercase transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-zinc-500 text-xs font-semibold italic">Processed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Payouts;
