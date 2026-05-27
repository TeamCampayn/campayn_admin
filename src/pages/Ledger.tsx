import React, { useEffect, useState } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  IndianRupee, 
  ShieldCheck,
  Search,
  Download,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Transaction {
  id: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  description: string;
  created_at: string;
  wallets: {
    wallet_type: string;
    user_id: string;
  }
}

const Ledger: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCommission, setTotalCommission] = useState(0);

  const fetchLedger = async () => {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*, wallets(wallet_type, user_id)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTransactions(data as any);
      
      // Calculate total platform commission (credits to platform wallet)
      const commission = data
        .filter(t => t.wallets?.wallet_type === 'platform' && t.transaction_type === 'credit')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      setTotalCommission(commission);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLedger();

    const channel = supabase
      .channel('admin_ledger_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => fetchLedger())
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
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">The Ledger</h1>
          <p className="text-zinc-500 font-medium">Global financial transparency and startup commission tracking.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-zinc-800 transition-all">
            <Download size={18} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card p-8 bg-gradient-to-br from-violet-600/20 to-transparent border-violet-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet size={80} />
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Startup Commission</p>
          <div className="flex items-center gap-2">
            <IndianRupee className="text-admin-primary" size={24} />
            <h3 className="text-4xl font-black text-white italic tracking-tighter">₹{totalCommission.toLocaleString()}</h3>
          </div>
          <p className="text-xs text-zinc-500 mt-4 font-medium flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-500" />
            Verified platform earnings
          </p>
        </div>
        
        <div className="admin-card p-8 bg-zinc-900/30">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Total Disbursements</p>
          <div className="flex items-center gap-2">
            <IndianRupee className="text-zinc-500" size={20} />
            <h3 className="text-3xl font-black text-white italic tracking-tighter">
              ₹{transactions.filter(t => t.transaction_type === 'debit').reduce((sum, t) => sum + Number(t.amount), 0).toLocaleString()}
            </h3>
          </div>
          <p className="text-xs text-rose-500 mt-4 font-bold uppercase tracking-widest">Payouts Pending: ₹0</p>
        </div>

        <div className="admin-card p-8 bg-zinc-900/30">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Platform Balance</p>
          <div className="flex items-center gap-2">
            <IndianRupee className="text-zinc-500" size={20} />
            <h3 className="text-3xl font-black text-white italic tracking-tighter">
              ₹{totalCommission.toLocaleString()}
            </h3>
          </div>
          <p className="text-xs text-emerald-500 mt-4 font-bold uppercase tracking-widest">Secured in Supabase</p>
        </div>
      </div>

      <div className="admin-card">
        <div className="p-6 border-b border-admin-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-white uppercase italic tracking-tighter">Recent Transactions</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="Filter transactions..."
              className="bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 pl-10 pr-4 text-white text-xs outline-none focus:border-admin-primary"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-900/50">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Reference</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-[10px] text-zinc-500">TRX-{t.id.split('-')[0]}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-widest ${t.transaction_type === 'credit' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {t.transaction_type === 'credit' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {t.transaction_type}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-zinc-300 font-medium">{t.description}</p>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">{t.wallets?.wallet_type} WALLET</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-black text-sm ${t.transaction_type === 'credit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.transaction_type === 'credit' ? '+' : '-'}₹{Number(t.amount).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-zinc-500 text-xs font-bold">{new Date(t.created_at).toLocaleDateString()}</span>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-700 italic font-medium">
                    No financial records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Ledger;
