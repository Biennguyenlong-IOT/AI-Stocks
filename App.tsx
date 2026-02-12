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
  Info
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { StockHolding, Transaction, TransactionType, AIAnalysisResponse } from './types';
import { analyzePortfolio } from './services/geminiService';

type ViewType = 'dashboard' | 'brokerages';

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
  const [holdings, setHoldings] = useState<StockHolding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashBalances, setCashBalances] = useState<Record<string, number>>({});
  const [scriptUrl, setScriptUrl] = useState<string>(localStorage.getItem('google_script_url') || '');
  const [isSyncing, setIsSyncing] = useState(false);
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

  const GAS_CODE = `function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dataSheet = ss.getSheetByName("APP_DATA") || ss.insertSheet("APP_DATA");
  var values = dataSheet.getDataRange().getValues();
  var state = { totalCash: 0, cashBalances: {}, holdings: [], transactions: [] };
  var section = "";
  
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    if (row[0] === "CASH_BALANCES") {
       try { state.cashBalances = JSON.parse(row[1]); } catch(e) { state.cashBalances = {}; }
       state.totalCash = Object.values(state.cashBalances).reduce((a, b) => a + b, 0);
    }
    else if (row[0] === "--- HOLDINGS ---") { section = "HOLDINGS"; i++; continue; }
    else if (row[0] === "--- TRANSACTIONS ---") { section = "TRANSACTIONS"; i++; continue; }
    
    if (section === "HOLDINGS" && row[0] && row[0] !== "ID") {
      state.holdings.push({ 
        id: row[0].toString(), symbol: row[1], name: row[2], quantity: parseFloat(row[3]), 
        avgPrice: parseFloat(row[4]), currentPrice: parseFloat(row[5]), sector: row[6], brokerage: row[7] || "CHƯA RÕ"
      });
    } else if (section === "TRANSACTIONS" && row[0] && row[0] !== "ID") {
      state.transactions.push({ 
        id: row[0].toString(), date: row[1], type: row[2], symbol: row[3], 
        quantity: parseFloat(row[4]), price: parseFloat(row[5]), taxFee: parseFloat(row[6]), 
        totalAmount: parseFloat(row[7]), note: row[8], brokerage: row[9] || "CHƯA RÕ"
      });
    }
  }

  var viewSheet = ss.getSheetByName("DANH_MUC");
  if (viewSheet && state.holdings.length > 0) {
    var viewData = viewSheet.getDataRange().getValues();
    for (var i = 0; i < state.holdings.length; i++) {
      var symbol = state.holdings[i].symbol;
      var brokerage = state.holdings[i].brokerage;
      for (var j = 1; j < viewData.length; j++) {
        if (viewData[j][0] == symbol && viewData[j][6] == brokerage) {
          var price = parseFloat(viewData[j][3]);
          if (!isNaN(price) && price > 0) state.holdings[i].currentPrice = price;
          break;
        }
      }
    }
  }

  return ContentService.createTextOutput(JSON.stringify(state)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var state = JSON.parse(e.postData.contents);
  var dataSheet = ss.getSheetByName("APP_DATA") || ss.insertSheet("APP_DATA");
  dataSheet.clear();
  
  dataSheet.getRange("A1").setValue("CASH_BALANCES");
  dataSheet.getRange("B1").setValue(JSON.stringify(state.cashBalances || {}));
  
  dataSheet.getRange("A3").setValue("--- HOLDINGS ---");
  var hHeaders = ["ID", "Mã CP", "Tên", "Số lượng", "Giá vốn", "Giá hiện tại", "Ngành", "Công ty CK"];
  dataSheet.getRange(4, 1, 1, hHeaders.length).setValues([hHeaders]);
  
  if (state.holdings && state.holdings.length > 0) {
    var hData = state.holdings.map(function(h) {
     return [h.id, h.symbol, h.name, h.quantity, h.avgPrice, h.currentPrice, h.sector, h.brokerage]; 
    });
    dataSheet.getRange(5, 1, hData.length, hHeaders.length).setValues(hData);
  }
  
  var tStartRow = (state.holdings ? state.holdings.length : 0) + 7;
  dataSheet.getRange(tStartRow, 1).setValue("--- TRANSACTIONS ---");
  var tHeaders = ["ID", "Ngày", "Loại", "Mã", "SL", "Giá", "Phí", "Tổng", "Ghi chú", "Công ty CK"];
  dataSheet.getRange(tStartRow + 1, 1, 1, tHeaders.length).setValues([tHeaders]);
  
  if (state.transactions && state.transactions.length > 0) {
    var tData = state.transactions.map(function(t) { 
      return [t.id, t.date, t.type, t.symbol || "", t.quantity || 0, t.price || 0, t.taxFee, t.totalAmount, t.note || "", t.brokerage || ""]; 
    });
    dataSheet.getRange(tStartRow + 2, 1, tData.length, tHeaders.length).setValues(tData);
  }

  var viewSheet = ss.getSheetByName("DANH_MUC") || ss.insertSheet("DANH_MUC");
  viewSheet.clear();
  viewSheet.appendRow(["MÃ CP", "SỐ LƯỢNG", "GIÁ VỐN", "GIÁ HIỆN TẠI", "NGÀNH", "TỔNG VỐN", "CÔNG TY CK"]);
  if (state.holdings && state.holdings.length > 0) {
    state.holdings.forEach(function(item, index) {
      var row = index + 2;
      var pForm = '=IFERROR(SUBSTITUTE(IMPORTXML("https://www.cophieu68.vn/quote/profile.php?id=' + item.symbol + '"; "//*[@id=\\'stockname_close\\']"); "."; ",")*1000; 0)';
      var sForm = '=IFERROR(IMPORTXML("https://www.cophieu68.vn/quote/profile.php?id=' + item.symbol + '"; "//tr[contains(@class,\\'border_bottom\\')]/td[contains(text(),\\'CTCP\\')]"); "Chưa rõ")';
      viewSheet.appendRow([item.symbol, item.quantity, item.avgPrice, pForm, sForm, "=B" + row + "*C" + row, item.brokerage]);
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
}`;

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
    // FIX: Ép kiểu explicitly sang number[] để tránh lỗi unknown
    const totalCash = (Object.values(cashBalances) as number[]).reduce((a, b) => a + b, 0);
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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <aside className="w-72 hidden lg:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617] transition-all relative z-10 shrink-0">
        <div className="p-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-xl shadow-indigo-500/30 animate-float">
                <TrendingUp size={24} className="text-white" />
            </div>
            <h1 className="font-black text-xl tracking-tighter uppercase italic">AI Stocks</h1>
          </div>
        </div>
        <nav className="flex-1 px-6 space-y-2">
          <SidebarItem active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <SidebarItem active={currentView === 'brokerages'} onClick={() => setCurrentView('brokerages')} icon={<Briefcase size={20} />} label="Brokerages" />
          <div className="mt-10 mb-4 px-4 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Quản trị</div>
          <SidebarItem onClick={() => { setCashActionForm(INITIAL_CASH_FORM); setShowCashModal(true); }} icon={<Banknote size={20} />} label="Nạp/Rút Vốn" />
          <SidebarItem onClick={() => fetchFromSheets()} disabled={isSyncing} icon={isSyncing ? <Loader2 size={20} className="animate-spin" /> : <CloudDownload size={20} />} label="Đồng bộ Dữ liệu" />
          <SidebarItem onClick={() => setShowSettings(true)} icon={<Settings size={20} />} label="Cài đặt Cloud" />
        </nav>
        <div className="p-8 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-5 border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Tiền mặt tổng</div>
            <div className="text-xl font-black">{stats.totalCash.toLocaleString('vi-VN')} <span className="text-xs opacity-50">đ</span></div>
          </div>
          <button 
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} 
            className={`w-full mt-6 flex items-center justify-center gap-3 p-4 rounded-2xl transition-all font-bold text-sm shadow-sm ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white hover:bg-slate-50 text-slate-700'}`}
          >
            {theme === 'dark' ? <><Sun size={18} className="text-amber-400" /> Chế độ sáng</> : <><Moon size={18} className="text-indigo-600" /> Chế độ tối</>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar">
        <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12 pb-32">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <h2 className="text-4xl font-black tracking-tight">{currentView === 'dashboard' ? 'Tổng quan Đầu tư' : 'Quản lý Brokerages'}</h2>
              <p className="text-slate-500 text-sm mt-2 font-medium">{currentView === 'dashboard' ? 'Phân tích hiệu suất và cấu trúc danh mục thông minh.' : 'Theo dõi vốn nạp, tiền mặt và cổ phiếu tại từng sàn.'}</p>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => { setTransactionForm(INITIAL_TRANSACTION_FORM); setShowBuyModal(true); }} className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-bold hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-600/20 active:scale-95 group">
                <Plus size={22} className="group-hover:rotate-90 transition-transform" /> Mua mới
              </button>
            </div>
          </header>

          {currentView === 'dashboard' ? (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard label="Tài sản ròng" value={stats.totalAssets} icon={<Wallet />} color="indigo" classes={getThemeColorClass('indigo')} />
                <StatCard label="Giá trị cổ phiếu" value={stats.stockValue} icon={<LayoutGrid />} color="blue" classes={getThemeColorClass('blue')} />
                <StatCard label="Vốn đã nạp" value={stats.netCapital} icon={<Banknote />} color="amber" classes={getThemeColorClass('amber')} />
                <StatCard label="Lợi nhuận" value={stats.profit} subValue={`${stats.profitPercent.toFixed(2)}%`} trend={stats.profit >= 0 ? 'up' : 'down'} icon={stats.profit >= 0 ? <TrendingUp /> : <TrendingDown />} color={stats.profit >= 0 ? 'emerald' : 'rose'} classes={getThemeColorClass(stats.profit >= 0 ? 'emerald' : 'rose')} />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                <div className="xl:col-span-2 bg-white dark:bg-slate-900/40 rounded-[3rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm glass-panel">
                  <h3 className="text-xl font-black mb-10 flex items-center gap-3 uppercase tracking-tighter text-indigo-500"><PieIcon size={24} /> Phân bổ tỷ trọng sàn</h3>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={brokerageData.map(b => ({ name: b.name, value: b.totalValue }))} cx="50%" cy="50%" innerRadius={100} outerRadius={150} paddingAngle={8} dataKey="value" stroke="none">
                          {brokerageData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => value.toLocaleString('vi-VN') + ' đ'}
                          contentStyle={{ borderRadius: '24px', border: 'none', background: '#0f172a', color: '#f8fafc', padding: '12px 20px' }}
                          itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                          labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontWeight: '900', textTransform: 'uppercase', fontSize: '10px' }}
                        />
                        <Legend iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900/60 rounded-[3rem] p-10 border border-slate-200 dark:border-indigo-500/20 shadow-2xl relative overflow-hidden glass-panel group">
                  <div className="absolute -top-10 -right-10 p-20 opacity-5 dark:opacity-10 text-indigo-500 rotate-12 group-hover:rotate-45 transition-transform duration-1000"><ZapIcon size={180} /></div>
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-2xl shadow-indigo-600/40"><BrainCircuit size={32} /></div>
                      <div>
                        <h3 className="font-black text-2xl tracking-tighter">AI Portfolio Expert</h3>
                        <p className="text-[10px] uppercase font-black text-indigo-500 tracking-[0.2em] opacity-80">Gemini Integrated</p>
                      </div>
                    </div>
                    {!aiAnalysis ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-10">
                            <Activity size={60} className="text-slate-300 dark:text-slate-800 animate-pulse" />
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic leading-relaxed px-6">Trí tuệ nhân tạo sẽ quét danh mục và lịch sử giao dịch để đưa ra các khuyến nghị tối ưu nhất.</p>
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
                            }} disabled={holdings.length === 0 || isAnalyzing} className="w-full py-6 rounded-3xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-600/30 active:scale-95">
                                {isAnalyzing ? <Loader2 className="animate-spin" /> : <Zap size={20} />} PHÂN TÍCH NGAY
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                             <div className="p-8 bg-indigo-600 rounded-[2.5rem] text-white shadow-xl">
                                <div className="text-[10px] font-black uppercase opacity-70 mb-2 tracking-widest">Chỉ số rủi ro</div>
                                <div className="text-6xl font-black">{aiAnalysis.riskScore}<span className="text-base opacity-50 ml-1">/10</span></div>
                             </div>
                             <AIBlock title="Phân tích giao dịch" content={aiAnalysis.tradeAnalysis} />
                             <AIBlock title="Phân tích cấu trúc" content={aiAnalysis.assetAnalysis} />
                             {/* Bổ sung Khuyến nghị chiến lược tại đây */}
                             <AIBlock title="Chiến lược hành động" content={
                               <div className="space-y-4">
                                 {aiAnalysis.recommendations.map((rec, idx) => (
                                   <div key={idx} className="flex gap-4 items-start group/rec">
                                     <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2.5 group-hover/rec:scale-150 transition-transform" />
                                     <span className="font-medium text-slate-700 dark:text-slate-300">{rec}</span>
                                   </div>
                                 ))}
                               </div>
                             } />
                             <button onClick={() => setAiAnalysis(null)} className="w-full p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-[11px] font-black uppercase hover:bg-slate-50 dark:hover:bg-slate-800 transition-all tracking-widest">Làm mới tư vấn</button>
                        </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900/40 rounded-[3rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm glass-panel">
                 <h3 className="text-xl font-black mb-8 uppercase tracking-tighter flex items-center gap-3 text-emerald-500"><Activity size={24} /> Giao dịch gần đây</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {transactions.slice(0, 6).map(t => (
                        <div key={t.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/50 transition-all cursor-default">
                            <div className="flex items-center gap-5">
                                <div className={`p-4 rounded-2xl ${t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : t.type === 'SELL' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                    {t.type === 'BUY' ? <Plus size={20} /> : t.type === 'SELL' ? <Minus size={20} /> : <Banknote size={20} />}
                                </div>
                                <div>
                                    <div className="font-black text-base">{t.symbol || t.type}</div>
                                    <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{t.date}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-black text-base">{t.totalAmount.toLocaleString('vi-VN')} <span className="text-[10px] opacity-50">đ</span></div>
                                <div className="text-[10px] text-indigo-500 font-black uppercase tracking-tighter">{t.brokerage}</div>
                            </div>
                        </div>
                    ))}
                 </div>
              </div>
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
               {brokerageData.map(b => (
                   <BrokerageCard 
                    key={b.name} 
                    {...b} 
                    onAction={(type, s) => {
                        setSelectedStock(s);
                        if (type === 'adjust') { setAdjustForm({ price: s.avgPrice.toString().replace('.', ',') }); setShowAdjustModal(true); }
                        if (type === 'dividend') { setDividendForm(INITIAL_DIVIDEND_FORM); setShowDividendModal(true); }
                        if (type === 'sell') { setTransactionForm({ ...INITIAL_TRANSACTION_FORM, symbol: s.symbol, brokerage: s.brokerage, quantity: s.quantity.toString().replace('.', ','), note: `Bán tại ${s.brokerage}` }); setShowSellModal(true); }
                    }}
                   />
               ))}
            </div>
          )}
        </div>
      </main>

      {showBuyModal && (
        <Modal title="Lệnh Mua Mới" onClose={() => setShowBuyModal(false)}>
          <form onSubmit={handleBuy} className="space-y-8">
            <Input label="Brokerage thực hiện" value={transactionForm.brokerage} onChange={handleBrokerageChange} placeholder="Ví dụ: VPS, SSI, TCBS..." required />
            <Input label="Mã Cổ Phiếu" value={transactionForm.symbol} onChange={handleSymbolChange} placeholder="VD: HPG, FPT..." uppercase required />
            <Input label="Ngành nghề" value={transactionForm.sector} onChange={v => setTransactionForm({...transactionForm, sector: v})} placeholder="VD: Tài chính, Bất động sản..." required />
            <div className="grid grid-cols-2 gap-6">
                <Input label="Số lượng" value={transactionForm.quantity} onChange={v => setTransactionForm({...transactionForm, quantity: v})} isNumeric required />
                <Input label="Giá khớp (VNĐ)" value={transactionForm.price} onChange={v => setTransactionForm({...transactionForm, price: v})} isNumeric required />
            </div>
            <Input label="Phí dự kiến (%)" value={transactionForm.taxFeePercent} onChange={v => setTransactionForm({...transactionForm, taxFeePercent: v})} isNumeric />
            <Input label="Ghi chú" value={transactionForm.note} onChange={v => setTransactionForm({...transactionForm, note: v})} placeholder="Ví dụ: Mua tại VND, mua theo tín hiệu..." />
            <button type="submit" className="w-full bg-indigo-600 py-6 rounded-[1.5rem] font-black text-white hover:bg-indigo-700 shadow-2xl shadow-indigo-600/40 transition-all uppercase tracking-widest">Xác nhận mua</button>
          </form>
        </Modal>
      )}

      {showSellModal && selectedStock && (
         <Modal title={`Lệnh Bán: ${selectedStock.symbol}`} onClose={() => setShowSellModal(false)}>
            <form onSubmit={handleSell} className="space-y-8">
                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-sm italic text-slate-500">
                    Bán cổ phiếu từ sàn <strong>{selectedStock.brokerage}</strong>. Khối lượng hiện có: {selectedStock.quantity.toLocaleString('vi-VN')}.
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <Input label="Số lượng bán" value={transactionForm.quantity} onChange={v => setTransactionForm({...transactionForm, quantity: v})} isNumeric required />
                    <Input label="Giá bán (VNĐ)" value={transactionForm.price} onChange={v => setTransactionForm({...transactionForm, price: v})} isNumeric required />
                </div>
                <Input label="Thuế & Phí (%)" value={transactionForm.taxFeePercent} onChange={v => setTransactionForm({...transactionForm, taxFeePercent: v})} isNumeric />
                <Input label="Ghi chú" value={transactionForm.note} onChange={v => setTransactionForm({...transactionForm, note: v})} placeholder="Ví dụ: Bán tại VND, chốt lời..." />
                <button type="submit" className="w-full bg-rose-600 py-6 rounded-[1.5rem] font-black text-white hover:bg-rose-700 shadow-2xl shadow-rose-600/40 uppercase tracking-widest">Xác nhận bán</button>
            </form>
         </Modal>
      )}

      {showCashModal && (
        <Modal title="Quản lý Vốn nạp/rút" onClose={() => setShowCashModal(false)}>
          <form onSubmit={handleCashAction} className="space-y-8">
            <Input label="Tên Brokerage" value={cashActionForm.brokerage} onChange={v => setCashActionForm({...cashActionForm, brokerage: v})} placeholder="Nhập tên sàn giao dịch..." required />
            <div className="flex gap-4 p-2 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setCashActionForm({...cashActionForm, type: 'DEPOSIT'})} className={`flex-1 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all ${cashActionForm.type === 'DEPOSIT' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400'}`}>Nạp Vốn</button>
                <button type="button" onClick={() => setCashActionForm({...cashActionForm, type: 'WITHDRAW'})} className={`flex-1 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all ${cashActionForm.type === 'WITHDRAW' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400'}`}>Rút Vốn</button>
            </div>
            <Input label="Số tiền" value={cashActionForm.amount} onChange={v => setCashActionForm({...cashActionForm, amount: v})} isNumeric required />
            <button type="submit" className="w-full bg-indigo-600 py-6 rounded-[1.5rem] font-black text-white hover:bg-indigo-700 transition-all shadow-xl uppercase tracking-widest">Xác nhận</button>
          </form>
        </Modal>
      )}

      {showSettings && (
        <Modal title="Kết nối Cloud" onClose={() => setShowSettings(false)} wide>
           <div className="space-y-8">
              <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 shadow-inner overflow-hidden">
                 <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em]">Google Apps Script Code</span>
                    <button onClick={() => { navigator.clipboard.writeText(GAS_CODE); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }} className="text-xs text-white bg-slate-800 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-700 transition-colors">
                        {isCopied ? <><Check size={14}/> Đã sao chép</> : <><Copy size={14}/> Sao chép mã</>}
                    </button>
                 </div>
                 <pre className="text-[10px] text-slate-500 font-mono overflow-auto max-h-60 leading-relaxed custom-scrollbar bg-slate-900 p-4 rounded-xl border border-slate-800"><code>{GAS_CODE}</code></pre>
              </div>
              <Input label="WebApp URL" value={scriptUrl} onChange={setScriptUrl} placeholder="https://script.google.com/macros/s/.../exec" />
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3 text-xs text-amber-600 italic">
                <Info size={16} className="shrink-0" /> Dán URL mới từ phần Triển khai (Deploy) để đồng bộ.
              </div>
              <button onClick={() => { localStorage.setItem('google_script_url', scriptUrl); setShowSettings(false); fetchFromSheets(); }} className="w-full py-6 bg-indigo-600 text-white font-black rounded-[1.5rem] hover:bg-indigo-700 shadow-2xl transition-all uppercase tracking-widest">Lưu cấu hình</button>
           </div>
        </Modal>
      )}

      {showAdjustModal && selectedStock && (
        <Modal title="Điều chỉnh Giá Vốn" onClose={() => setShowAdjustModal(false)}>
            <form onSubmit={handleAdjustPrice} className="space-y-8">
                <Input label="Giá vốn mới (VNĐ)" value={adjustForm.price} onChange={v => setAdjustForm({price: v})} isNumeric required />
                <button type="submit" className="w-full bg-amber-500 py-6 rounded-[1.5rem] font-black text-white hover:bg-amber-600 shadow-xl transition-all uppercase tracking-widest">Cập nhật</button>
            </form>
        </Modal>
      )}

      {showDividendModal && selectedStock && (
        <Modal title={`Cổ tức: ${selectedStock.symbol}`} onClose={() => setShowDividendModal(false)}>
            <form onSubmit={handleDividend} className="space-y-8">
                <div className="flex gap-4 p-2 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                    <button type="button" onClick={() => setDividendForm({...dividendForm, type: 'DIVIDEND_CASH'})} className={`flex-1 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all ${dividendForm.type === 'DIVIDEND_CASH' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400'}`}>Tiền Mặt</button>
                    <button type="button" onClick={() => setDividendForm({...dividendForm, type: 'DIVIDEND_STOCK'})} className={`flex-1 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all ${dividendForm.type === 'DIVIDEND_STOCK' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400'}`}>Cổ Phiếu</button>
                </div>
                {dividendForm.type === 'DIVIDEND_CASH' ? (
                    <Input label="Số tiền mặt/CP" value={dividendForm.amountPerShare} onChange={v => setDividendForm({...dividendForm, amountPerShare: v})} isNumeric required />
                ) : (
                    <Input label="Tỉ lệ thưởng (%)" value={dividendForm.stockRatio} onChange={v => setDividendForm({...dividendForm, stockRatio: v})} isNumeric required />
                )}
                <button type="submit" className="w-full bg-indigo-600 py-6 rounded-[1.5rem] font-black text-white hover:bg-indigo-700 transition-all uppercase tracking-widest">Xác nhận</button>
            </form>
        </Modal>
      )}
    </div>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; disabled?: boolean }> = ({ icon, label, active, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} className={`flex items-center gap-4 w-full px-6 py-5 rounded-2xl font-bold text-sm transition-all group ${active ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/25 active:scale-95' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-indigo-500'} ${disabled ? 'opacity-30' : ''}`}>
    <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500 transition-transform group-hover:scale-110'}`}>{icon}</span> {label}
  </button>
);

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; subValue?: string; trend?: 'up' | 'down'; color: string; classes: any }> = ({ label, value, icon, subValue, trend, color, classes }) => (
  <div className="bg-white dark:bg-slate-900/40 rounded-[3rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-500/50 transition-all glass-panel">
    <div className="flex items-center justify-between mb-6 relative z-10">
      <div className={`p-4 rounded-2xl ${classes.bg} ${classes.text} group-hover:scale-110 group-hover:rotate-6 transition-transform`}>{icon}</div>
      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
    <div className="relative z-10">
      <div className="text-2xl font-black tracking-tight">{value.toLocaleString('vi-VN')} <span className="text-[10px] opacity-50 font-bold ml-0.5">đ</span></div>
      {subValue && (
        <div className={`text-[11px] font-black flex items-center gap-1.5 mt-2 ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend === 'up' ? <TrendingUp size={14}/> : <TrendingDown size={14}/>} {subValue}
        </div>
      )}
    </div>
  </div>
);

const BrokerageCard: React.FC<{ name: string; cash: number; netCapital: number; stocks: StockHolding[]; onAction: (type: string, s: StockHolding) => void }> = ({ name, cash, netCapital, stocks, onAction }) => {
    const stockValue = stocks.reduce((acc, curr) => acc + (curr.quantity * curr.currentPrice), 0);
    const totalValue = cash + stockValue;
    const profit = totalValue - netCapital;
    const profitPercent = netCapital > 0 ? (profit / netCapital) * 100 : 0;
    return (
        <div className="bg-white dark:bg-slate-900/40 rounded-[3rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all group glass-panel">
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10 flex flex-col lg:flex-row justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className="p-6 rounded-[2rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30 group-hover:scale-105 group-hover:-rotate-3 transition-transform"><Building2 size={36} /></div>
                    <div>
                        <h3 className="text-3xl font-black tracking-tighter uppercase">{name}</h3>
                        <div className="flex flex-wrap gap-3 mt-4">
                             <span className="text-[10px] font-black uppercase bg-indigo-500/10 dark:bg-indigo-500/5 px-4 py-2 rounded-xl text-indigo-500 flex items-center gap-2"><ArrowUpRight size={14} /> Vốn: {netCapital.toLocaleString('vi-VN')} đ</span>
                             <span className="text-[10px] font-black uppercase bg-emerald-500/10 dark:bg-emerald-500/5 px-4 py-2 rounded-xl text-emerald-600 flex items-center gap-2"><Wallet size={14} /> Tiền: {cash.toLocaleString('vi-VN')} đ</span>
                        </div>
                    </div>
                </div>
                <div className="lg:text-right">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tài sản sàn</div>
                    <div className="text-4xl font-black tracking-tight mb-3">{totalValue.toLocaleString('vi-VN')} <span className="text-sm font-bold opacity-40">đ</span></div>
                    <div className={`text-xs font-black px-5 py-2.5 rounded-2xl inline-flex items-center gap-2 ${profit >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {profit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {profit >= 0 ? '+' : ''}{profit.toLocaleString('vi-VN')} ({profitPercent.toFixed(2)}%)
                    </div>
                </div>
            </div>
            {stocks.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-10 py-6">Mã Cổ Phiếu</th>
                                <th className="px-6 py-6 text-right">Khối lượng</th>
                                <th className="px-6 py-6 text-right">Vốn / Hiện tại</th>
                                <th className="px-6 py-6 text-right">Lãi dự tính</th>
                                <th className="px-10 py-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                            {stocks.map(s => {
                                const gain = (s.currentPrice - s.avgPrice) * s.quantity;
                                const gainPP = s.avgPrice > 0 ? ((s.currentPrice - s.avgPrice) / s.avgPrice) * 100 : 0;
                                return (
                                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group/row">
                                        <td className="px-10 py-8">
                                            <div className="font-black text-3xl text-indigo-600 dark:text-indigo-400 tracking-tighter italic">{s.symbol}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{s.sector}</div>
                                        </td>
                                        <td className="px-6 py-8 text-right font-mono font-black text-2xl">{s.quantity.toLocaleString('vi-VN')}</td>
                                        <td className="px-6 py-8 text-right">
                                            <div className="text-[11px] font-bold text-slate-400 mb-1">Vốn: {s.avgPrice.toLocaleString('vi-VN')}</div>
                                            <div className="text-xl font-black text-slate-800 dark:text-slate-100">HT: {s.currentPrice.toLocaleString('vi-VN')}</div>
                                        </td>
                                        <td className={`px-6 py-8 text-right font-black ${gain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            <div className="text-2xl">{gain >= 0 ? '+' : ''}{gain.toLocaleString('vi-VN')}</div>
                                            <div className="text-[11px] font-black opacity-80 uppercase tracking-tighter">{gainPP.toFixed(2)}%</div>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex gap-3 justify-end opacity-0 group-hover/row:opacity-100 transition-all">
                                                <button onClick={() => onAction('adjust', s)} title="Sửa giá vốn" className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all"><Edit3 size={20} /></button>
                                                <button onClick={() => onAction('dividend', s)} title="Cổ tức" className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all"><Gift size={20} /></button>
                                                <button onClick={() => onAction('sell', s)} title="Bán" className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><Minus size={20} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-16 text-center text-slate-400 italic text-sm font-medium">Trống</div>
            )}
        </div>
    );
};

// Cập nhật AIBlock để hỗ trợ truyền nội dung dạng JSX/ReactNode
const AIBlock: React.FC<{ title: string; content: React.ReactNode }> = ({ title, content }) => (
    <div className="space-y-3">
        <h4 className="text-[11px] font-black uppercase text-indigo-500 tracking-[0.2em] flex items-center gap-2"><ChevronRight size={14} className="animate-pulse"/> {title}</h4>
        <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic shadow-inner">
          {content}
        </div>
    </div>
);

const Modal: React.FC<{ title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }> = ({ title, children, onClose, wide }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-500">
        <div className={`bg-white dark:bg-[#0f172a] w-full ${wide ? 'max-w-5xl' : 'max-w-2xl'} p-12 rounded-[3.5rem] border border-slate-200 dark:border-slate-800 relative shadow-2xl animate-in zoom-in-95 duration-500 max-h-[92vh] overflow-y-auto custom-scrollbar`}>
            <button onClick={onClose} className="absolute top-12 right-12 p-3 text-slate-400 hover:text-rose-500 transition-all hover:rotate-90"><X size={28} /></button>
            <h3 className="text-4xl font-black mb-12 tracking-tighter uppercase italic">{title}</h3>
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
}> = ({ label, value, onChange, placeholder, required, uppercase, isNumeric }) => {
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
        <div className="space-y-3 group">
            <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 uppercase tracking-widest px-2 transition-colors">{label}</label>
            <div className="relative">
                <input 
                    type="text" 
                    required={required} 
                    value={isNumeric ? displayValue : value} 
                    onChange={handleChange} 
                    placeholder={placeholder} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-900 rounded-[1.5rem] px-8 py-6 text-base font-bold outline-none focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all text-slate-800 dark:text-white" 
                />
            </div>
        </div>
    );
};

export default App;