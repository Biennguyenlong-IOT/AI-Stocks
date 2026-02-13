
import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Minus,
  BrainCircuit, 
  LayoutDashboard,
  Settings, 
  CloudDownload,
  Wallet,
  Banknote,
  Gift,
  X,
  Loader2,
  Zap,
  ChevronRight,
  Activity,
  Sun,
  Moon,
  Building2,
  Copy,
  Check,
  Briefcase,
  PieChart as PieIcon,
  Edit3,
  ArrowUpRight,
  ZapIcon,
  LayoutGrid,
  Info,
  AlertCircle,
  History,
  Target,
  ArrowRightLeft,
  Percent,
  Database,
  Coins,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShieldCheck,
  LineChart,
  Table as TableIcon,
  ArrowUpRight as GainIcon,
  ArrowDownRight as LossIcon,
  BarChart3,
  Tag,
  Search,
  Compass,
  Link as LinkIcon,
  Sparkles,
  Menu,
  RefreshCw
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { StockHolding, Transaction, TransactionType, AIAnalysisResponse } from './types';
import { analyzePortfolio, searchStockTrend, StockTrendAnalysis, getLatestPrices } from './services/geminiService';

const HARDCODED_URL = ""; 

type ViewType = 'dashboard' | 'brokerages' | 'analysis';

const INITIAL_TRANSACTION_FORM = {
  symbol: '', quantity: '', price: '', taxFeePercent: '0,15', sector: '', type: 'BUY' as TransactionType, brokerage: '', note: ''
};

const INITIAL_CASH_FORM = { amount: '', type: 'DEPOSIT' as 'DEPOSIT' | 'WITHDRAW', brokerage: '' };
const INITIAL_DIVIDEND_FORM = { type: 'DIVIDEND_CASH' as 'DIVIDEND_CASH' | 'DIVIDEND_STOCK', amountPerShare: '', stockRatio: '' };
const INITIAL_ADJUST_FORM = { price: '' };

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('app_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [holdings, setHoldings] = useState<StockHolding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashBalances, setCashBalances] = useState<Record<string, number>>({});
  const [scriptUrl, setScriptUrl] = useState<string>(HARDCODED_URL || localStorage.getItem('google_script_url') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showDividendModal, setShowDividendModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  
  const [selectedStock, setSelectedStock] = useState<StockHolding | null>(null);
  const [cashActionForm, setCashActionForm] = useState(INITIAL_CASH_FORM);
  const [transactionForm, setTransactionForm] = useState(INITIAL_TRANSACTION_FORM);
  const [dividendForm, setDividendForm] = useState(INITIAL_DIVIDEND_FORM);
  const [adjustForm, setAdjustForm] = useState(INITIAL_ADJUST_FORM);

  const [searchSymbol, setSearchSymbol] = useState('');
  const [trendResult, setTrendResult] = useState<StockTrendAnalysis | null>(null);
  const [isSearchingTrend, setIsSearchingTrend] = useState(false);

  const GAS_CODE = `/* Mã Google Apps Script */`;

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  useEffect(() => {
    const local = localStorage.getItem('portfolio_full_state');
    if (local) {
      try {
        const saved = JSON.parse(local);
        setHoldings(saved.holdings || []);
        setTransactions(saved.transactions || []);
        setCashBalances(saved.cashBalances || {});
      } catch (e) { console.error("Local data corrupt", e); }
    }
    if (scriptUrl) fetchFromSheets(true);
  }, []);

  const stats = useMemo(() => {
    const stockValue = holdings.reduce((acc, curr) => acc + (curr.quantity * (curr.currentPrice || 0)), 0);
    const cashValues = Object.values(cashBalances) as number[];
    const totalCash = cashValues.reduce((a, b) => a + b, 0);
    const totalAssets = totalCash + stockValue;
    const totalDeposited = transactions.filter(t => t.type === 'DEPOSIT').reduce((acc, curr) => acc + curr.totalAmount, 0);
    const totalWithdrawn = transactions.filter(t => t.type === 'WITHDRAW').reduce((acc, curr) => acc + curr.totalAmount, 0);
    const netCapital = totalDeposited - totalWithdrawn;
    const profit = totalAssets - netCapital;
    const profitPercent = netCapital > 0 ? (profit / netCapital) * 100 : 0;
    return { totalCash, stockValue, totalAssets, netCapital, profit, profitPercent };
  }, [holdings, transactions, cashBalances]);

  const brokerageData = useMemo(() => {
    const bNames = Array.from(new Set([...Object.keys(cashBalances), ...holdings.map(h => h.brokerage)]));
    return bNames.map(name => {
      const cash = cashBalances[name] || 0;
      const stocks = holdings.filter(h => h.brokerage === name);
      const stockVal = stocks.reduce((acc, curr) => acc + (curr.quantity * curr.currentPrice), 0);
      const bTransactions = transactions.filter(t => t.brokerage === name);
      const deposited = bTransactions.filter(t => t.type === 'DEPOSIT').reduce((a, c) => a + c.totalAmount, 0);
      const withdrawn = bTransactions.filter(t => t.type === 'WITHDRAW').reduce((a, c) => a + c.totalAmount, 0);
      const netCapital = deposited - withdrawn;
      return { name, totalValue: cash + stockVal, cash, stockVal, netCapital, stocks };
    }).filter(b => b.totalValue > 0 || b.netCapital > 0);
  }, [cashBalances, holdings, transactions]);

  const fetchFromSheets = async (silent = false) => {
    const url = scriptUrl.trim();
    if (!url || !url.includes('/exec')) return;
    if (!silent) setIsSyncing(true);
    try {
      const response = await fetch(`${url}?t=${Date.now()}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data) {
        setHoldings(data.holdings || []);
        setTransactions(data.transactions || []);
        setCashBalances(data.cashBalances || {});
        setLastSynced(new Date().toLocaleTimeString());
        localStorage.setItem('portfolio_full_state', JSON.stringify(data));
      }
    } catch (e) { if (!silent) console.error("Sync Error", e); }
    finally { if (!silent) setIsSyncing(false); }
  };

  const pushToSheets = async (currentState: any) => {
    const url = scriptUrl.trim();
    if (!url || !url.includes('/exec')) return;
    setIsSyncing(true);
    try {
      localStorage.setItem('portfolio_full_state', JSON.stringify(currentState));
      await fetch(url, { 
        method: 'POST', 
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentState) 
      });
      setLastSynced(new Date().toLocaleTimeString());
      setTimeout(() => fetchFromSheets(true), 2500);
    } catch (e) { console.error("Push Error", e); }
    finally { setTimeout(() => setIsSyncing(false), 500); }
  };

  const handleRefreshPrices = async () => {
    if (holdings.length === 0) return;
    setIsRefreshingPrices(true);
    // Explicitly cast the unique symbols set to string[] to resolve the 'unknown[]' type mismatch error
    const symbols = Array.from(new Set(holdings.map(h => h.symbol))) as string[];
    try {
      const newPrices = await getLatestPrices(symbols);
      const updatedHoldings = holdings.map(h => ({
        ...h,
        currentPrice: newPrices[h.symbol] || h.currentPrice
      }));
      setHoldings(updatedHoldings);
      pushToSheets({ holdings: updatedHoldings, transactions, cashBalances });
    } catch (e) {
      alert("Không thể cập nhật giá hiện tại từ AI.");
    } finally {
      setIsRefreshingPrices(false);
    }
  };

  const parseNum = (val: string) => {
    if (!val) return 0;
    let cleaned = val.toString().replace(/\./g, ''); 
    cleaned = cleaned.replace(',', '.'); 
    return parseFloat(cleaned) || 0;
  };

  const handleBuy = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseNum(transactionForm.quantity);
    const price = parseNum(transactionForm.price);
    const symbol = transactionForm.symbol.toUpperCase();
    const brokerage = transactionForm.brokerage.trim().toUpperCase() || "CHƯA RÕ";
    const sector = transactionForm.sector.trim() || "Chưa phân loại";
    const note = transactionForm.note.trim() || `Mua tại ${brokerage}`;
    const fee = (qty * price) * (parseNum(transactionForm.taxFeePercent) / 100);
    const totalAmount = (qty * price) + fee;

    if (totalAmount > (cashBalances[brokerage] || 0)) return alert(`Hết tiền tại ${brokerage}!`);

    let newHoldings = [...holdings];
    const idx = newHoldings.findIndex(h => h.symbol === symbol && h.brokerage === brokerage);
    if (idx > -1) {
      const h = newHoldings[idx];
      const nQty = h.quantity + qty;
      const nAvg = ((h.quantity * h.avgPrice) + totalAmount) / nQty;
      newHoldings[idx] = { ...h, quantity: nQty, avgPrice: nAvg, sector: sector };
    } else {
      newHoldings.push({ id: Date.now().toString(), symbol, name: symbol, quantity: qty, avgPrice: totalAmount/qty, currentPrice: price, sector: sector, brokerage });
    }
    const newCash = { ...cashBalances, [brokerage]: (cashBalances[brokerage] || 0) - totalAmount };
    const newTs = [{ id: Date.now().toString(), date: new Date().toLocaleString(), type: 'BUY', symbol, quantity: qty, price, taxFee: fee, totalAmount, note, brokerage } as Transaction, ...transactions];
    
    setHoldings(newHoldings); setCashBalances(newCash); setTransactions(newTs);
    setTransactionForm(INITIAL_TRANSACTION_FORM);
    setShowBuyModal(false); pushToSheets({ holdings: newHoldings, transactions: newTs, cashBalances: newCash });
  };

  const handleSell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) return;
    const qty = parseNum(transactionForm.quantity);
    const price = parseNum(transactionForm.price);
    const note = transactionForm.note.trim() || `Bán tại ${selectedStock.brokerage}`;
    const fee = (qty * price) * (parseNum(transactionForm.taxFeePercent) / 100);
    const totalAmount = (qty * price) - fee;

    if (qty > selectedStock.quantity) return alert("Không đủ cổ phiếu!");

    const newHoldings = holdings.map(h => h.id === selectedStock.id ? { ...h, quantity: h.quantity - qty } : h).filter(h => h.quantity > 0);
    const newCash = { ...cashBalances, [selectedStock.brokerage]: (cashBalances[selectedStock.brokerage] || 0) + totalAmount };
    const newTs = [{ id: Date.now().toString(), date: new Date().toLocaleString(), type: 'SELL', symbol: selectedStock.symbol, quantity: qty, price, taxFee: fee, totalAmount, note, brokerage: selectedStock.brokerage } as Transaction, ...transactions];
    
    setHoldings(newHoldings); setCashBalances(newCash); setTransactions(newTs);
    setTransactionForm(INITIAL_TRANSACTION_FORM);
    setShowSellModal(false); pushToSheets({ holdings: newHoldings, transactions: newTs, cashBalances: newCash });
  };

  const handleCashAction = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseNum(cashActionForm.amount);
    const brokerage = cashActionForm.brokerage.toUpperCase() || "CHƯA RÕ";
    const isWithdraw = cashActionForm.type === 'WITHDRAW';
    const newCash = { ...cashBalances, [brokerage]: isWithdraw ? (cashBalances[brokerage] || 0) - amt : (cashBalances[brokerage] || 0) + amt };
    const newTs = [{ id: Date.now().toString(), date: new Date().toLocaleString(), type: cashActionForm.type, totalAmount: amt, taxFee: 0, brokerage } as Transaction, ...transactions];
    setCashBalances(newCash); setTransactions(newTs);
    setCashActionForm(INITIAL_CASH_FORM);
    setShowCashModal(false); pushToSheets({ holdings, transactions: newTs, cashBalances: newCash });
  };

  const handleTrendSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchSymbol) return;
    setIsSearchingTrend(true);
    setTrendResult(null);
    try {
      const result = await searchStockTrend(searchSymbol.toUpperCase());
      setTrendResult(result);
    } catch (e) {
      alert("Lỗi khi phân tích xu hướng.");
    } finally {
      setIsSearchingTrend(false);
    }
  };

  const handleAdjustPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) return;
    const newPrice = parseNum(adjustForm.price);
    const newHoldings = holdings.map(h => h.id === selectedStock.id ? { ...h, avgPrice: newPrice } : h);
    setHoldings(newHoldings);
    setAdjustForm(INITIAL_ADJUST_FORM);
    setShowAdjustModal(false); pushToSheets({ holdings: newHoldings, transactions, cashBalances });
  };

  const handleDividend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) return;
    let newHoldings = [...holdings];
    let newCash = { ...cashBalances };
    let newTs = [...transactions];
    const date = new Date().toLocaleString();

    if (dividendForm.type === 'DIVIDEND_CASH') {
      const netAmount = (selectedStock.quantity * parseNum(dividendForm.amountPerShare)) * 0.95;
      newCash[selectedStock.brokerage] = (newCash[selectedStock.brokerage] || 0) + netAmount;
      newTs = [{ id: Date.now().toString(), date, type: 'DIVIDEND_CASH', symbol: selectedStock.symbol, quantity: selectedStock.quantity, totalAmount: netAmount, taxFee: (netAmount/0.95)*0.05, brokerage: selectedStock.brokerage } as Transaction, ...newTs];
    } else {
      const ratio = parseNum(dividendForm.stockRatio) / 100;
      const newQty = selectedStock.quantity * (1 + ratio);
      const newAvg = (selectedStock.quantity * selectedStock.avgPrice) / newQty;
      newHoldings = holdings.map(h => h.id === selectedStock.id ? { ...h, quantity: newQty, avgPrice: newAvg } : h);
      newTs = [{ id: Date.now().toString(), date, type: 'DIVIDEND_STOCK', symbol: selectedStock.symbol, quantity: selectedStock.quantity * ratio, totalAmount: 0, taxFee: 0, brokerage: selectedStock.brokerage } as Transaction, ...newTs];
    }
    setHoldings(newHoldings); setCashBalances(newCash); setTransactions(newTs);
    setDividendForm(INITIAL_DIVIDEND_FORM);
    setShowDividendModal(false); pushToSheets({ holdings: newHoldings, transactions: newTs, cashBalances: newCash });
  };

  const handleSymbolChange = (val: string) => {
    const symbol = val.toUpperCase();
    const existing = holdings.find(h => h.symbol === symbol);
    if (existing) {
      setTransactionForm({ ...transactionForm, symbol, sector: existing.sector });
    } else {
      setTransactionForm({ ...transactionForm, symbol });
    }
  };

  const handleBrokerageChange = (val: string) => {
    const brokerage = val.toUpperCase();
    const currentNote = transactionForm.note;
    const isDefaultNote = currentNote === '' || currentNote.startsWith('Mua tại');
    
    setTransactionForm({ 
      ...transactionForm, 
      brokerage,
      note: isDefaultNote ? (brokerage ? `Mua tại ${brokerage}` : '') : currentNote
    });
  };

  const openBuyFromBrokerage = (brokerageName: string) => {
    setTransactionForm({
        ...INITIAL_TRANSACTION_FORM,
        brokerage: brokerageName.toUpperCase(),
        note: `Mua tại ${brokerageName.toUpperCase()}`
    });
    setShowBuyModal(true);
    setIsMobileMenuOpen(false);
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

  const getThemeColorClass = (color: string) => {
    const maps: Record<string, { bg: string, text: string }> = {
      indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-500' },
      blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
      amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
      emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
      rose: { bg: 'bg-rose-500/10', text: 'text-rose-500' },
    };
    return maps[color] || maps.indigo;
  };

  const navItems = (
    <nav className="flex-1 px-4 md:px-6 space-y-2 mt-4">
      <SidebarItem active={currentView === 'dashboard'} onClick={() => { setCurrentView('dashboard'); setIsMobileMenuOpen(false); }} icon={<LayoutDashboard size={20} />} label="Dashboard" />
      <SidebarItem active={currentView === 'brokerages'} onClick={() => { setCurrentView('brokerages'); setIsMobileMenuOpen(false); }} icon={<Briefcase size={20} />} label="Brokerages" />
      <SidebarItem active={currentView === 'analysis'} onClick={() => { setCurrentView('analysis'); setIsMobileMenuOpen(false); }} icon={<Compass size={20} />} label="Phân tích Xu hướng" />
      
      <div className="mt-8 mb-4 px-4 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Quản trị</div>
      <SidebarItem onClick={() => { setCashActionForm(INITIAL_CASH_FORM); setShowCashModal(true); setIsMobileMenuOpen(false); }} icon={<Banknote size={20} />} label="Nạp/Rút Vốn" />
      <SidebarItem onClick={() => { fetchFromSheets(); setIsMobileMenuOpen(false); }} disabled={isSyncing} icon={isSyncing ? <Loader2 size={20} className="animate-spin" /> : <CloudDownload size={20} />} label="Đồng bộ Dữ liệu" />
      <SidebarItem onClick={() => { setShowSettings(true); setIsMobileMenuOpen(false); }} icon={<Settings size={20} />} label="Cài đặt Cloud" />
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Sidebar Desktop */}
      <aside className="w-72 hidden lg:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617] transition-all relative z-10 shrink-0">
        <div className="p-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-xl shadow-indigo-500/30 animate-float">
                <TrendingUp size={24} className="text-white" />
            </div>
            <h1 className="font-black text-xl tracking-tighter uppercase italic">AI Stocks</h1>
          </div>
        </div>
        {navItems}
        <div className="p-8 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl"><Coins size={20} /></div>
            <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiền mặt tổng</div>
                <div className="text-xl font-black">{stats.totalCash.toLocaleString('vi-VN')} <span className="text-xs opacity-50">đ</span></div>
            </div>
          </div>
          <button 
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} 
            className={`w-full mt-6 flex items-center justify-center gap-3 p-4 rounded-2xl transition-all font-bold text-sm shadow-sm ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white hover:bg-slate-50 text-slate-700'}`}
          >
            {theme === 'dark' ? <><Sun size={18} className="text-amber-400" /> Chế độ sáng</> : <><Moon size={18} className="text-indigo-600" /> Chế độ tối</>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsMobileMenuOpen(false)}>
          <aside className="w-72 h-full bg-white dark:bg-[#020617] border-r border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp size={24} className="text-indigo-600" />
                <h1 className="font-black text-lg uppercase italic">AI Stocks</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400"><X size={24} /></button>
            </div>
            {navItems}
            <div className="p-8 mt-auto border-t border-slate-100 dark:border-slate-800">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tiền mặt tổng</div>
              <div className="text-xl font-black mb-4">{stats.totalCash.toLocaleString('vi-VN')} đ</div>
              <button 
                onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} 
                className="w-full flex items-center justify-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />} {theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar">
        {/* Mobile Header Bar */}
        <div className="lg:hidden p-4 flex items-center justify-between bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
           <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-100 dark:bg-slate-900 rounded-xl"><Menu size={24} /></button>
           <h1 className="font-black text-base uppercase italic tracking-tighter">AI Stocks</h1>
           <div className="w-10"></div> {/* Spacer */}
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12 space-y-8 md:space-y-12 pb-32">
          {currentView !== 'analysis' && (
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
                <div>
                  <h2 className="text-2xl md:text-4xl font-black tracking-tight flex items-center gap-3 md:gap-4">
                      {currentView === 'dashboard' ? <LayoutDashboard className="w-8 h-8 md:w-10 md:h-10 text-indigo-500" /> : <Briefcase className="w-8 h-8 md:w-10 md:h-10 text-indigo-500" />}
                      {currentView === 'dashboard' ? 'Tổng quan Đầu tư' : 'Quản lý Brokerages'}
                  </h2>
                  <p className="text-slate-500 text-xs md:text-sm mt-1 md:mt-2 font-medium">
                    {currentView === 'dashboard' ? 'Phân tích hiệu suất và cấu trúc danh mục.' : 'Theo dõi vốn và cổ phiếu tại từng sàn.'}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <button 
                    onClick={handleRefreshPrices} 
                    disabled={isRefreshingPrices || holdings.length === 0}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 md:py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm active:scale-95 disabled:opacity-50"
                  >
                      {isRefreshingPrices ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />} Cập nhật giá AI
                  </button>
                  <button onClick={() => { setTransactionForm(INITIAL_TRANSACTION_FORM); setShowBuyModal(true); }} className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 md:px-8 py-3 md:py-4 bg-indigo-600 text-white rounded-2xl md:rounded-[1.5rem] font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-95 group">
                      <Plus size={20} className="group-hover:rotate-90 transition-transform" /> Mua mới
                  </button>
                </div>
            </header>
          )}

          {currentView === 'dashboard' ? (
            <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                <StatCard label="Tài sản ròng" value={stats.totalAssets} icon={<Wallet />} color="indigo" classes={getThemeColorClass('indigo')} />
                <StatCard label="Giá trị cổ phiếu" value={stats.stockValue} icon={<LayoutGrid />} color="blue" classes={getThemeColorClass('blue')} />
                <StatCard label="Vốn đã nạp" value={stats.netCapital} icon={<Banknote />} color="amber" classes={getThemeColorClass('amber')} />
                <StatCard label="Lợi nhuận" value={stats.profit} subValue={`${stats.profitPercent.toFixed(2)}%`} trend={stats.profit >= 0 ? 'up' : 'down'} icon={stats.profit >= 0 ? <TrendingUp /> : <TrendingDown />} color={stats.profit >= 0 ? 'emerald' : 'rose'} classes={getThemeColorClass(stats.profit >= 0 ? 'emerald' : 'rose')} />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-10">
                <div className="xl:col-span-2 bg-white dark:bg-slate-900/40 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm glass-panel">
                  <h3 className="text-lg md:text-xl font-black mb-6 md:mb-10 flex items-center gap-3 uppercase tracking-tighter text-indigo-500"><PieIcon size={22} /> Phân bổ tỷ trọng</h3>
                  <div className="h-[300px] md:h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={brokerageData.map(b => ({ name: b.name, value: b.totalValue }))} cx="50%" cy="50%" innerRadius={window.innerWidth < 768 ? 60 : 100} outerRadius={window.innerWidth < 768 ? 90 : 150} paddingAngle={8} dataKey="value" stroke="none">
                          {brokerageData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => value.toLocaleString('vi-VN') + ' đ'}
                          contentStyle={{ 
                            borderRadius: '16px', 
                            border: 'none', 
                            background: '#1e293b', 
                            padding: '12px 16px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
                          }}
                          itemStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}
                          labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}
                        />
                        <Legend iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900/60 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-slate-200 dark:border-indigo-500/20 shadow-xl relative overflow-hidden glass-panel group">
                  <div className="absolute -top-10 -right-10 p-20 opacity-5 dark:opacity-10 text-indigo-500 rotate-12 hidden md:block"><ZapIcon size={180} /></div>
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-4 mb-6 md:mb-10">
                      <div className="p-3 md:p-4 bg-indigo-600 rounded-2xl md:rounded-3xl text-white"><BrainCircuit className="w-6 h-6 md:w-8 md:h-8" /></div>
                      <div>
                        <h3 className="font-black text-xl md:text-2xl tracking-tighter">AI Expert</h3>
                        <p className="text-[9px] md:text-[10px] uppercase font-black text-indigo-500 tracking-widest">Gemini Integrated</p>
                      </div>
                    </div>
                    {!aiAnalysis ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 md:py-10">
                            <Activity size={48} className="text-slate-300 dark:text-slate-800 animate-pulse" />
                            <p className="text-slate-500 text-xs md:text-sm font-medium italic leading-relaxed px-4 md:px-6">AI sẽ phân tích để đưa ra các khuyến nghị tối ưu nhất cho danh mục của bạn.</p>
                            <button onClick={async () => {
                                setIsAnalyzing(true);
                                try { 
                                  const res = await analyzePortfolio(holdings, transactions, {
                                    totalAssets: stats.totalAssets,
                                    totalCash: stats.totalCash,
                                    totalProfit: stats.profit,
                                    profitPercent: stats.profitPercent
                                  }); 
                                  setAiAnalysis(res); 
                                } 
                                catch (e) { alert("Lỗi hệ thống AI"); }
                                finally { setIsAnalyzing(false); }
                            }} disabled={holdings.length === 0 || isAnalyzing} className="w-full py-4 md:py-6 rounded-2xl md:rounded-3xl bg-indigo-600 text-white font-black shadow-lg">
                                {isAnalyzing ? <Loader2 className="animate-spin inline mr-2" /> : <Zap size={18} className="inline mr-2" />} PHÂN TÍCH NGAY
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 overflow-y-auto max-h-[400px] md:max-h-[500px] pr-2 custom-scrollbar">
                             <div className="p-6 md:p-8 bg-indigo-600 rounded-[1.5rem] md:rounded-[2.5rem] text-white shadow-lg flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] font-black uppercase opacity-70 mb-1 tracking-widest">Chỉ số rủi ro</div>
                                    <div className="text-4xl md:text-6xl font-black">{aiAnalysis.riskScore}<span className="text-sm opacity-50 ml-1">/10</span></div>
                                </div>
                                <ShieldCheck className="w-8 h-8 md:w-10 md:h-10 opacity-80" />
                             </div>
                             <AIBlock icon={<LineChart size={16} />} title="Phân tích giao dịch" content={aiAnalysis.tradeAnalysis} />
                             <AIBlock icon={<PieIcon size={16} />} title="Phân tích cấu trúc" content={aiAnalysis.assetAnalysis} />
                             <AIBlock icon={<Target size={16} />} title="Hành động" content={
                               <div className="space-y-3">
                                 {aiAnalysis.recommendations.map((rec, idx) => (
                                   <div key={idx} className="flex gap-3 items-start">
                                     <div className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-500 shrink-0 mt-0.5 flex items-center justify-center font-bold text-[10px]">{idx + 1}</div>
                                     <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{rec}</span>
                                   </div>
                                 ))}
                               </div>
                             } />
                             <button onClick={() => setAiAnalysis(null)} className="w-full p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest">Làm mới tư vấn</button>
                        </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : currentView === 'brokerages' ? (
            <div className="space-y-8 md:space-y-10 animate-in fade-in slide-in-from-right-4 duration-700">
               {brokerageData.map(b => (
                   <BrokerageCard 
                    key={b.name} 
                    {...b} 
                    onBuyNew={openBuyFromBrokerage}
                    onAction={(type, s) => {
                        setSelectedStock(s);
                        if (type === 'adjust') { setAdjustForm({ price: s.avgPrice.toString().replace('.', ',') }); setShowAdjustModal(true); }
                        if (type === 'dividend') { setDividendForm(INITIAL_DIVIDEND_FORM); setShowDividendModal(true); }
                        if (type === 'sell') { setTransactionForm({ ...INITIAL_TRANSACTION_FORM, symbol: s.symbol, brokerage: s.brokerage, quantity: s.quantity.toString().replace('.', ','), note: `Bán tại ${s.brokerage}` }); setShowSellModal(true); }
                    }}
                   />
               ))}
            </div>
          ) : (
            <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-right-4 duration-700">
              <header>
                <h2 className="text-2xl md:text-4xl font-black tracking-tight flex items-center gap-3 md:gap-4">
                  <Compass className="w-8 h-8 md:w-10 md:h-10 text-indigo-500" />
                  Xu hướng & Tạo đáy
                </h2>
                <p className="text-slate-500 text-xs md:text-sm mt-1 md:mt-2 font-medium">Sử dụng AI & Google Search để nhận định thị trường.</p>
              </header>

              <div className="max-w-3xl mx-auto space-y-8 md:space-y-12">
                <form onSubmit={handleTrendSearch} className="relative group">
                   <div className="absolute inset-y-0 left-4 md:left-8 flex items-center text-slate-400">
                      <Search className="w-5 h-5 md:w-6 md:h-6" />
                   </div>
                   <input 
                    type="text" 
                    placeholder="Mã cổ phiếu (HPG, FPT...)" 
                    value={searchSymbol}
                    onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                    className="w-full pl-12 md:pl-20 pr-24 md:pr-32 py-5 md:py-8 bg-white dark:bg-slate-900 rounded-2xl md:rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 text-base md:text-xl font-black outline-none focus:border-indigo-500 shadow-lg transition-all"
                   />
                   <button 
                    type="submit" 
                    disabled={isSearchingTrend || !searchSymbol}
                    className="absolute right-2 top-2 bottom-2 px-4 md:px-8 bg-indigo-600 text-white font-black rounded-xl md:rounded-[1.8rem] hover:bg-indigo-700 disabled:opacity-50 text-xs md:text-sm"
                   >
                     {isSearchingTrend ? <Loader2 className="animate-spin" size={16} /> : 'PHÂN TÍCH'}
                   </button>
                </form>

                {isSearchingTrend && (
                  <div className="flex flex-col items-center justify-center py-12 md:py-20 space-y-6 text-center">
                      <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-indigo-500 animate-pulse" />
                      <div className="space-y-1">
                        <h4 className="text-lg md:text-xl font-black uppercase tracking-tighter">Đang quét dữ liệu...</h4>
                        <p className="text-slate-500 text-xs animate-pulse">Tìm kiếm thông tin từ Google News & Search</p>
                      </div>
                  </div>
                )}

                {trendResult && (
                  <div className="space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                        <div className={`p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border-2 flex items-center gap-4 md:gap-6 ${trendResult.isBottoming ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-100 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'}`}>
                           <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl ${trendResult.isBottoming ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                              <ArrowDownToLine className="w-6 h-6 md:w-8 md:h-8" />
                           </div>
                           <div>
                              <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60">Trạng thái</div>
                              <div className="text-lg md:text-2xl font-black">{trendResult.isBottoming ? 'ĐANG TẠO ĐÁY' : 'CHƯA CÓ ĐÁY'}</div>
                           </div>
                        </div>

                        <div className={`p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border-2 flex items-center gap-4 md:gap-6 ${trendResult.isUptrend ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'}`}>
                           <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl ${trendResult.isUptrend ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                              <TrendingUp className="w-6 h-6 md:w-8 md:h-8" />
                           </div>
                           <div>
                              <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60">Xu hướng</div>
                              <div className="text-lg md:text-2xl font-black">{trendResult.isUptrend ? 'XU HƯỚNG TĂNG' : 'CHƯA TĂNG'}</div>
                           </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm">
                       <h3 className="text-lg md:text-xl font-black mb-4 flex items-center gap-3 text-indigo-500"><LineChart size={20} /> Nhận định cho {trendResult.symbol}</h3>
                       <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm md:text-base italic whitespace-pre-wrap">{trendResult.reasoning}</p>
                       <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                             <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60">Độ tin cậy:</div>
                             <div className="h-2 w-24 md:w-32 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: `${trendResult.confidenceScore}%` }}></div>
                             </div>
                             <span className="text-[10px] md:text-xs font-black">{trendResult.confidenceScore}%</span>
                          </div>
                       </div>
                    </div>

                    {trendResult.sources && trendResult.sources.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4">Nguồn tham khảo</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                           {trendResult.sources.map((s, i) => (
                             <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3 group">
                                <LinkIcon size={14} className="text-indigo-500" />
                                <span className="text-[10px] md:text-xs font-bold truncate group-hover:text-indigo-500">{s.title}</span>
                             </a>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals - Optimized for Mobile */}
      {showBuyModal && (
        <Modal icon={<Plus size={24} />} title="Mua Mới" onClose={() => setShowBuyModal(false)}>
          <form onSubmit={handleBuy} className="space-y-6 md:space-y-8">
            <Input label="Brokerage" icon={<Building2 size={18} />} value={transactionForm.brokerage} onChange={handleBrokerageChange} placeholder="VD: VPS, SSI..." required />
            <Input label="Mã CP" icon={<Activity size={18} />} value={transactionForm.symbol} onChange={handleSymbolChange} placeholder="VD: HPG..." uppercase required />
            <Input label="Ngành" icon={<LayoutGrid size={18} />} value={transactionForm.sector} onChange={v => setTransactionForm({...transactionForm, sector: v})} required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Số lượng" icon={<TableIcon size={18} />} value={transactionForm.quantity} onChange={v => setTransactionForm({...transactionForm, quantity: v})} isNumeric required />
                <Input label="Giá khớp" icon={<Banknote size={18} />} value={transactionForm.price} onChange={v => setTransactionForm({...transactionForm, price: v})} isNumeric required />
            </div>
            <Input label="Ghi chú" icon={<Edit3 size={18} />} value={transactionForm.note} onChange={v => setTransactionForm({...transactionForm, note: v})} />
            <button type="submit" className="w-full bg-indigo-600 py-4 md:py-6 rounded-2xl font-black text-white hover:bg-indigo-700 shadow-lg uppercase tracking-widest text-sm">Xác nhận mua</button>
          </form>
        </Modal>
      )}

      {showSellModal && selectedStock && (
         <Modal icon={<Minus size={24} />} title={`Bán: ${selectedStock.symbol}`} onClose={() => setShowSellModal(false)}>
            <form onSubmit={handleSell} className="space-y-6 md:space-y-8">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs italic text-slate-500">
                    Bán tại <strong>{selectedStock.brokerage}</strong>. Khối lượng: {selectedStock.quantity.toLocaleString('vi-VN')}.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Số lượng" icon={<TableIcon size={18} />} value={transactionForm.quantity} onChange={v => setTransactionForm({...transactionForm, quantity: v})} isNumeric required />
                    <Input label="Giá bán" icon={<Banknote size={18} />} value={transactionForm.price} onChange={v => setTransactionForm({...transactionForm, price: v})} isNumeric required />
                </div>
                <button type="submit" className="w-full bg-rose-600 py-4 md:py-6 rounded-2xl font-black text-white shadow-lg uppercase tracking-widest text-sm">Xác nhận bán</button>
            </form>
         </Modal>
      )}

      {showCashModal && (
        <Modal icon={<Banknote size={24} />} title="Nạp/Rút Vốn" onClose={() => setShowCashModal(false)}>
          <form onSubmit={handleCashAction} className="space-y-6 md:space-y-8">
            <Input label="Tên Brokerage" icon={<Building2 size={18} />} value={cashActionForm.brokerage} onChange={v => setCashActionForm({...cashActionForm, brokerage: v})} required />
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setCashActionForm({...cashActionForm, type: 'DEPOSIT'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${cashActionForm.type === 'DEPOSIT' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Nạp Vốn</button>
                <button type="button" onClick={() => setCashActionForm({...cashActionForm, type: 'WITHDRAW'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${cashActionForm.type === 'WITHDRAW' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Rút Vốn</button>
            </div>
            <Input label="Số tiền" icon={<Coins size={18} />} value={cashActionForm.amount} onChange={v => setCashActionForm({...cashActionForm, amount: v})} isNumeric required />
            <button type="submit" className="w-full bg-indigo-600 py-4 md:py-6 rounded-2xl font-black text-white uppercase tracking-widest text-sm">Xác nhận</button>
          </form>
        </Modal>
      )}

      {showSettings && (
        <Modal icon={<Database size={24} />} title="Kết nối Cloud" onClose={() => setShowSettings(false)} wide>
           <div className="space-y-6 md:space-y-8">
              <div className="bg-slate-950 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-800 shadow-inner overflow-hidden">
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-[9px] md:text-[10px] font-black uppercase text-indigo-500 tracking-widest">Google Apps Script</span>
                    <button onClick={() => { navigator.clipboard.writeText(GAS_CODE); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }} className="text-[10px] text-white bg-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        {isCopied ? <Check size={12}/> : <Copy size={12}/>} {isCopied ? 'Đã sao chép' : 'Sao chép mã'}
                    </button>
                 </div>
                 <pre className="text-[9px] text-slate-500 font-mono overflow-auto max-h-40 leading-relaxed custom-scrollbar bg-slate-900 p-3 rounded-xl"><code>{GAS_CODE}</code></pre>
              </div>
              <Input label="WebApp URL" icon={<CloudDownload size={18} />} value={scriptUrl} onChange={setScriptUrl} placeholder="https://..." />
              <button onClick={() => { localStorage.setItem('google_script_url', scriptUrl); setShowSettings(false); fetchFromSheets(); }} className="w-full py-4 md:py-6 bg-indigo-600 text-white font-black rounded-2xl md:rounded-[1.5rem] shadow-xl text-sm uppercase">Lưu cấu hình</button>
           </div>
        </Modal>
      )}

      {showAdjustModal && selectedStock && (
        <Modal icon={<Edit3 size={24} />} title="Giá Vốn" onClose={() => setShowAdjustModal(false)}>
            <form onSubmit={handleAdjustPrice} className="space-y-6">
                <Input label="Giá vốn mới" icon={<Banknote size={18} />} value={adjustForm.price} onChange={v => setAdjustForm({price: v})} isNumeric required />
                <button type="submit" className="w-full bg-amber-500 py-4 md:py-6 rounded-2xl font-black text-white text-sm uppercase">Cập nhật</button>
            </form>
        </Modal>
      )}

      {showDividendModal && selectedStock && (
        <Modal icon={<Gift size={24} />} title="Cổ tức" onClose={() => setShowDividendModal(false)}>
            <form onSubmit={handleDividend} className="space-y-6 md:space-y-8">
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl">
                    <button type="button" onClick={() => setDividendForm({...dividendForm, type: 'DIVIDEND_CASH'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${dividendForm.type === 'DIVIDEND_CASH' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Tiền Mặt</button>
                    <button type="button" onClick={() => setDividendForm({...dividendForm, type: 'DIVIDEND_STOCK'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${dividendForm.type === 'DIVIDEND_STOCK' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Cổ Phiếu</button>
                </div>
                {dividendForm.type === 'DIVIDEND_CASH' ? (
                    <Input label="Tiền mặt/CP" icon={<Banknote size={18} />} value={dividendForm.amountPerShare} onChange={v => setDividendForm({...dividendForm, amountPerShare: v})} isNumeric required />
                ) : (
                    <Input label="Tỉ lệ thưởng (%)" icon={<Percent size={18} />} value={dividendForm.stockRatio} onChange={v => setDividendForm({...dividendForm, stockRatio: v})} isNumeric required />
                )}
                <button type="submit" className="w-full bg-indigo-600 py-4 md:py-6 rounded-2xl font-black text-white uppercase text-sm">Xác nhận</button>
            </form>
        </Modal>
      )}
    </div>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; disabled?: boolean }> = ({ icon, label, active, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} className={`flex items-center gap-4 w-full px-5 py-4 rounded-xl font-bold text-sm transition-all group ${active ? 'bg-indigo-600 text-white shadow-lg active:scale-95' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-indigo-500'} ${disabled ? 'opacity-30' : ''}`}>
    <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500 transition-transform group-hover:scale-110'}`}>{icon}</span> {label}
  </button>
);

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; subValue?: string; trend?: 'up' | 'down'; color: string; classes: any }> = ({ label, value, icon, subValue, trend, color, classes }) => (
  <div className="bg-white dark:bg-slate-900/40 rounded-2xl md:rounded-[3rem] p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-500/50 transition-all glass-panel">
    <div className="flex items-center justify-between mb-4 md:mb-6 relative z-10">
      <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl ${classes.bg} ${classes.text} group-hover:scale-110 transition-transform`}>{icon}</div>
      <span className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
    <div className="relative z-10">
      <div className="text-xl md:text-2xl font-black tracking-tight">{value.toLocaleString('vi-VN')} <span className="text-[10px] opacity-50 font-bold ml-0.5">đ</span></div>
      {subValue && (
        <div className={`text-[10px] md:text-[11px] font-black flex items-center gap-1.5 mt-1 md:mt-2 ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend === 'up' ? <TrendingUp size={12}/> : <TrendingDown size={12}/>} {subValue}
        </div>
      )}
    </div>
  </div>
);

const BrokerageCard: React.FC<{ name: string; cash: number; netCapital: number; stocks: StockHolding[]; onAction: (type: string, s: StockHolding) => void; onBuyNew: (brokerage: string) => void }> = ({ name, cash, netCapital, stocks, onAction, onBuyNew }) => {
    const stockValue = stocks.reduce((acc, curr) => acc + (curr.quantity * curr.currentPrice), 0);
    const totalValue = cash + stockValue;
    const profit = totalValue - netCapital;
    const profitPercent = netCapital > 0 ? (profit / netCapital) * 100 : 0;
    return (
        <div className="bg-white dark:bg-slate-900/40 rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm glass-panel">
            <div className="p-6 md:p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10 flex flex-col lg:flex-row justify-between gap-6 md:gap-8">
                <div className="flex items-center gap-4 md:gap-6">
                    <div className="p-4 md:p-6 rounded-2xl md:rounded-[2rem] bg-indigo-600 text-white shadow-lg relative">
                        <Building2 className="w-6 h-6 md:w-9 md:h-9" />
                        <button 
                            onClick={(e) => { e.stopPropagation(); onBuyNew(name); }} 
                            className="absolute -top-2 -right-2 p-1.5 bg-emerald-500 text-white rounded-full shadow-lg border-2 border-white dark:border-slate-900"
                        >
                            <Plus size={12} strokeWidth={4} />
                        </button>
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl md:text-3xl font-black tracking-tighter uppercase">{name}</h3>
                            <button 
                                onClick={() => onBuyNew(name)}
                                className="hidden md:flex px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all items-center gap-2"
                            >
                                <Plus size={12} /> Mua mới
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 md:gap-3 mt-2 md:mt-4">
                             <span className="text-[8px] md:text-[10px] font-black uppercase bg-indigo-500/10 px-3 py-1.5 rounded-lg text-indigo-500">Vốn: {netCapital.toLocaleString('vi-VN')} đ</span>
                             <span className="text-[8px] md:text-[10px] font-black uppercase bg-emerald-500/10 px-3 py-1.5 rounded-lg text-emerald-600">Tiền: {cash.toLocaleString('vi-VN')} đ</span>
                        </div>
                    </div>
                </div>
                <div className="lg:text-right">
                    <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tài sản sàn</div>
                    <div className="text-2xl md:text-4xl font-black tracking-tight mb-2 md:mb-3">{totalValue.toLocaleString('vi-VN')} đ</div>
                    <div className={`text-[10px] md:text-xs font-black px-4 py-2 rounded-xl inline-flex items-center gap-2 ${profit >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {profit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {profit >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                    </div>
                </div>
            </div>
            {stocks.length > 0 ? (
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
                        <thead className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 md:px-10 py-4 md:py-6">Mã CP</th>
                                <th className="px-4 md:px-6 py-4 md:py-6 text-right">Khối lượng</th>
                                <th className="px-4 md:px-6 py-4 md:py-6 text-right">Vốn / HT</th>
                                <th className="px-4 md:px-6 py-4 md:py-6 text-right">Lãi dự tính</th>
                                <th className="px-6 md:px-10 py-4 md:py-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                            {stocks.map(s => {
                                const gain = (s.currentPrice - s.avgPrice) * s.quantity;
                                const gainPP = s.avgPrice > 0 ? ((s.currentPrice - s.avgPrice) / s.avgPrice) * 100 : 0;
                                
                                let symbolColorClass = "text-indigo-600 dark:text-indigo-400";
                                let bgColorClass = "bg-indigo-500/10";
                                if (gainPP < -7) {
                                  symbolColorClass = "text-red-600 dark:text-red-500";
                                  bgColorClass = "bg-red-500/10";
                                } else if (gainPP < 0) {
                                  symbolColorClass = "text-amber-500 dark:text-amber-400";
                                  bgColorClass = "bg-amber-500/10";
                                } else if (gainPP < 7) {
                                  symbolColorClass = "text-emerald-500 dark:text-emerald-400";
                                  bgColorClass = "bg-emerald-500/10";
                                } else if (gainPP >= 7) {
                                  symbolColorClass = "text-purple-600 dark:text-purple-400";
                                  bgColorClass = "bg-purple-500/10";
                                }

                                return (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group/row">
                                        <td className="px-6 md:px-10 py-6 md:py-8">
                                            <div className="flex items-center gap-3 md:gap-4">
                                                <div className={`p-2 md:p-4 rounded-xl md:rounded-2xl ${bgColorClass} ${symbolColorClass}`}>
                                                    {gainPP >= 0 ? <GainIcon className="w-4 h-4 md:w-6 h-6" /> : <LossIcon className="w-4 h-4 md:w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`font-black text-xl md:text-3xl tracking-tighter italic ${symbolColorClass}`}>
                                                          {s.symbol}
                                                        </div>
                                                        {gainPP < -7 && <AlertCircle size={16} className="text-red-500 animate-pulse" />}
                                                    </div>
                                                    <div className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase mt-1">
                                                        {s.sector}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-6 md:py-8 text-right font-mono font-black text-lg md:text-2xl">{s.quantity.toLocaleString('vi-VN')}</td>
                                        <td className="px-4 md:px-6 py-6 md:py-8 text-right">
                                            <div className="text-[9px] md:text-[11px] font-bold text-slate-400 mb-1">Vốn: {s.avgPrice.toLocaleString('vi-VN')}</div>
                                            <div className="text-sm md:text-xl font-black text-slate-800 dark:text-slate-100">HT: {s.currentPrice.toLocaleString('vi-VN')}</div>
                                        </td>
                                        <td className={`px-4 md:px-6 py-6 md:py-8 text-right font-black ${gain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            <div className="flex flex-col items-end">
                                                <div className="text-sm md:text-2xl flex items-center gap-1 md:gap-2">
                                                    {gain.toLocaleString('vi-VN')}
                                                </div>
                                                <div className="text-[9px] md:text-[11px] font-black opacity-80 uppercase tracking-tighter bg-current/10 px-2 py-0.5 rounded-md">{gainPP.toFixed(2)}%</div>
                                            </div>
                                        </td>
                                        <td className="px-6 md:px-10 py-6 md:py-8 text-right">
                                            <div className="flex gap-2 md:gap-3 justify-end lg:opacity-0 group-hover/row:opacity-100 transition-all">
                                                <button onClick={() => onAction('adjust', s)} className="p-2 md:p-3.5 rounded-lg md:rounded-2xl bg-amber-500/10 text-amber-500"><Edit3 className="w-4 h-4 md:w-5 md:h-5" /></button>
                                                <button onClick={() => onAction('dividend', s)} className="p-2 md:p-3.5 rounded-lg md:rounded-2xl bg-indigo-500/10 text-indigo-500"><Gift className="w-4 h-4 md:w-5 md:h-5" /></button>
                                                <button onClick={() => onAction('sell', s)} className="p-2 md:p-3.5 rounded-lg md:rounded-2xl bg-rose-500/10 text-rose-500"><Minus className="w-4 h-4 md:w-5 md:h-5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-12 text-center text-slate-400 italic text-sm">Trống</div>
            )}
        </div>
    );
};

const AIBlock: React.FC<{ title: string; content: React.ReactNode; icon?: React.ReactNode }> = ({ title, content, icon }) => (
    <div className="space-y-2">
        <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-widest flex items-center gap-2">
            {icon || <ChevronRight size={14} />} {title}
        </h4>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic shadow-inner">
          {content}
        </div>
    </div>
);

const Modal: React.FC<{ title: string; children: React.ReactNode; onClose: () => void; wide?: boolean; icon?: React.ReactNode }> = ({ title, children, onClose, wide, icon }) => (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
        <div className={`bg-white dark:bg-[#0f172a] w-full ${wide ? 'max-w-5xl' : 'max-w-xl'} p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-slate-200 dark:border-slate-800 relative shadow-2xl animate-in zoom-in-95 duration-300 max-h-[95vh] overflow-y-auto custom-scrollbar`}>
            <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-rose-500 transition-all"><X className="w-6 h-6 md:w-7 md:h-7" /></button>
            <div className="flex items-center gap-4 md:gap-6 mb-8 md:mb-12">
                {icon && <div className="p-3 md:p-5 bg-indigo-600 rounded-2xl md:rounded-3xl text-white shadow-xl">{icon}</div>}
                <h3 className="text-2xl md:text-4xl font-black tracking-tighter uppercase italic">{title}</h3>
            </div>
            {children}
        </div>
    </div>
);

const Input: React.FC<{ 
  label: string; 
  value: string; 
  onChange: (v: string) => void; 
  placeholder?: string; 
  required?: boolean; 
  uppercase?: boolean;
  isNumeric?: boolean;
  icon?: React.ReactNode;
}> = ({ label, value, onChange, placeholder, required, uppercase, isNumeric, icon }) => {
    const displayValue = useMemo(() => {
        if (!value) return '';
        if (!isNumeric) return value;
        const parts = value.toString().split(',');
        const rawInt = parts[0].replace(/\./g, '');
        const numInt = parseInt(rawInt);
        if (isNaN(numInt) && rawInt !== "") return value;
        let formattedInt = rawInt === "" ? "" : numInt.toLocaleString('vi-VN');
        return parts.length > 1 ? formattedInt + ',' + parts[1] : formattedInt;
    }, [value, isNumeric]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        if (isNumeric) {
            val = val.replace(/\./g, '');
            const firstComma = val.indexOf(',');
            if (firstComma !== -1) val = val.substring(0, firstComma + 1) + val.substring(firstComma + 1).replace(/,/g, '');
            val = val.replace(/[^0-9,]/g, '');
        }
        if (uppercase) val = val.toUpperCase();
        onChange(val);
    };

    return (
        <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                {icon} {label}
            </label>
            <div className="relative">
                <input 
                    type="text" 
                    required={required} 
                    value={isNumeric ? displayValue : value} 
                    onChange={handleChange} 
                    placeholder={placeholder} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-900 rounded-xl md:rounded-[1.5rem] px-5 md:px-8 py-4 md:py-6 text-sm md:text-base font-bold outline-none focus:border-indigo-500 transition-all text-slate-800 dark:text-white" 
                />
            </div>
        </div>
    );
};

export default App;
