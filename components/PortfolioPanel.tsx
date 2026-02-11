
import React, { useState } from 'react';
import { analyzeStock } from '../geminiService';
import { PortfolioStockAnalysis, AppDataCloud } from '../types';
import { saveToCloud } from '../syncService';
import { Briefcase, Plus, Trash2, RefreshCw, TrendingUp, TrendingDown, Calendar, AlertTriangle, Cloud, Target, Shield, ArrowUpRight, Search } from 'lucide-react';

interface PortfolioPanelProps {
  cloudData: AppDataCloud;
  setCloudData: React.Dispatch<React.SetStateAction<AppDataCloud>>;
}

export const PortfolioPanel: React.FC<PortfolioPanelProps> = ({ cloudData, setCloudData }) => {
  const [newSymbol, setNewSymbol] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCloudData = async (newData: AppDataCloud) => {
    setCloudData(newData);
    const syncUrl = localStorage.getItem('vntrade_sync_url');
    if (syncUrl) {
      setIsSyncing(true);
      await saveToCloud(newData);
      setIsSyncing(false);
    }
  };

  const addStock = () => {
    const sym = newSymbol.trim().toUpperCase();
    if (sym && !cloudData.symbols.includes(sym)) {
      const newData = {
        ...cloudData,
        symbols: [...cloudData.symbols, sym]
      };
      updateCloudData(newData);
      setNewSymbol('');
    }
  };

  const removeStock = (sym: string) => {
    const newAnalyses = { ...cloudData.analyses };
    delete newAnalyses[sym];
    const newData = {
      ...cloudData,
      symbols: cloudData.symbols.filter(s => s !== sym),
      analyses: newAnalyses
    };
    updateCloudData(newData);
  };

  const updateAnalysis = async (sym: string) => {
    setLoading(sym);
    setError(null);
    try {
      const result = await analyzeStock(sym);
      const newData = {
        ...cloudData,
        analyses: {
          ...cloudData.analyses,
          [sym]: { ...result, lastUpdated: new Date().toLocaleDateString('vi-VN') }
        }
      };
      await updateCloudData(newData);
    } catch (err: any) {
      setError(`Lỗi khi phân tích mã ${sym}. Kiểm tra hạn mức API.`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Sync Status */}
      <div className="glass p-8 rounded-3xl border-indigo-500/20 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
              <Briefcase className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black">Danh Mục Đám Mây</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  {isSyncing ? 'Đang cập nhật Google Sheets Đa Dòng...' : 'Đã đồng bộ hóa dữ liệu'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nhập mã (VD: FPT)..."
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && addStock()}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-48 font-bold text-white placeholder:text-slate-600"
            />
            <button onClick={addStock} className="bg-indigo-600 hover:bg-indigo-500 p-3 rounded-xl shadow-lg shadow-indigo-900/20 transition-all active:scale-95">
              <Plus size={24} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm">
          <AlertTriangle size={20} /> {error}
        </div>
      )}

      {/* Portfolio List */}
      <div className="grid grid-cols-1 gap-6">
        {cloudData.symbols.map((sym) => {
          const data = cloudData.analyses[sym];
          const isPos = data?.trend === 'Uptrend';
          const isLoading = loading === sym;

          return (
            <div key={sym} className="glass rounded-[2rem] overflow-hidden group hover:border-indigo-500/40 transition-all border border-white/5 shadow-lg">
              <div className="p-8 flex flex-col lg:flex-row lg:items-center gap-8">
                {/* 1. Symbol & Metadata */}
                <div className="lg:w-1/4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <h4 className="text-4xl font-black text-white group-hover:text-indigo-400 transition-colors">{sym}</h4>
                      {!data && <span className="text-[10px] font-bold text-amber-500 uppercase mt-1">Chưa có phân tích</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateAnalysis(sym)}
                        disabled={!!loading}
                        className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 disabled:opacity-30 transition-colors"
                        title="Lấy dữ liệu AI mới"
                      >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                      </button>
                      <button
                        onClick={() => removeStock(sym)}
                        className="p-2.5 bg-slate-800/50 hover:bg-rose-900/30 rounded-xl text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  {data && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-tight bg-slate-900/50 p-2 rounded-lg w-fit">
                      <Calendar size={12} /> {data.lastUpdated}
                    </div>
                  )}
                </div>

                {/* 2. Central Data Block */}
                <div className="flex-1">
                  {!data ? (
                    <button 
                      onClick={() => updateAnalysis(sym)}
                      className="w-full h-28 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl text-slate-600 hover:text-indigo-400 hover:border-indigo-500/50 transition-all bg-slate-900/20 group/btn"
                    >
                      {isLoading ? (
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCw className="animate-spin text-indigo-500" size={32} />
                          <span className="font-black text-sm uppercase">AI Đang quét Google...</span>
                        </div>
                      ) : (
                        <>
                          <Search size={28} className="mb-2 group-hover/btn:scale-110 transition-transform" />
                          <span className="font-bold uppercase text-xs">Phân tích ngay bằng AI</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Trend Block */}
                      <div className="p-6 bg-slate-900/40 rounded-3xl border border-white/5 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3">Xu hướng AI</span>
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-2xl ${isPos ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {isPos ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                          </div>
                          <span className={`text-2xl font-black ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>{data.trend}</span>
                        </div>
                      </div>

                      {/* GIÁ VÀO LỆNH - GIỮ VỊ TRÍ TRUNG TÂM & NỔI BẬT */}
                      <div className="p-6 bg-indigo-600/20 rounded-3xl border border-indigo-500/50 flex flex-col justify-center relative group/entry shadow-2xl shadow-indigo-500/10">
                        <div className="absolute top-4 right-4 text-indigo-500/20 group-hover/entry:text-indigo-500/40 transition-colors">
                          <Target size={32} />
                        </div>
                        <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-2">GIÁ VÀO LỆNH</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-white tracking-tighter">{data.keyLevels.entry.toLocaleString()}</span>
                          <span className="text-[10px] font-bold text-indigo-400 uppercase">VND</span>
                        </div>
                        <div className="mt-2 text-[10px] font-bold text-slate-400 italic">
                          Tín hiệu AI đề xuất mua
                        </div>
                      </div>

                      {/* Market Status */}
                      <div className="p-6 bg-slate-900/40 rounded-3xl border border-white/5 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3">Tín hiệu vùng đáy</span>
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-2xl ${data.isBottom ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                            <Shield size={24} />
                          </div>
                          <span className="text-xl font-bold text-slate-200">{data.isBottom ? 'Đã tạo đáy' : 'Đang tìm đáy'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Tech Levels Sidecar */}
                {data && (
                  <div className="lg:w-1/5 bg-slate-950/80 p-6 rounded-[2rem] border border-white/5 flex flex-col justify-center gap-6">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase">
                        <span>Kháng cự</span>
                        <ArrowUpRight size={14} className="text-rose-400" />
                      </div>
                      <div className="text-xl font-black text-rose-400 font-mono tracking-tighter">
                        {data.keyLevels.resistance.toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="h-px bg-white/5" />
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase">
                        <span>Hỗ trợ mạnh</span>
                        <ArrowUpRight size={14} className="rotate-90 text-emerald-400" />
                      </div>
                      <div className="text-xl font-black text-emerald-400 font-mono tracking-tighter">
                        {data.keyLevels.support.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {cloudData.symbols.length === 0 && (
          <div className="py-24 text-center glass rounded-[3rem] border-dashed border-2 border-slate-800">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Cloud size={32} className="text-indigo-500" />
            </div>
            <h4 className="text-xl font-bold text-slate-300">Đám mây của bạn đang trống</h4>
            <p className="text-slate-500 text-sm mt-2">Dữ liệu sẽ được tự động đồng bộ khi bạn thêm mã và phân tích.</p>
          </div>
        )}
      </div>
    </div>
  );
};
