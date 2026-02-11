
import React, { useEffect, useState } from 'react';
import { getMarketOverview } from '../geminiService';
import { MarketOverview } from '../types';
import { LayoutDashboard, TrendingUp, Users, Info, RefreshCw, ExternalLink, Globe, PieChart, Activity } from 'lucide-react';

export const MarketPanel: React.FC = () => {
  const [data, setData] = useState<MarketOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMarketData = async () => {
    setLoading(true);
    try {
      const result = await getMarketOverview();
      setData(result);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu thị trường:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <RefreshCw className="animate-spin text-blue-500 w-10 h-10" />
        <p className="text-slate-400 animate-pulse font-medium uppercase tracking-widest text-xs">Đang cập nhật diễn biến thị trường...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Market Indices Table */}
      <div className="glass rounded-3xl overflow-hidden border-white/5 shadow-2xl">
        <div className="bg-slate-800/50 p-6 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-xl">
              <Activity className="text-blue-400" size={20} />
            </div>
            <h3 className="font-bold text-lg uppercase tracking-tight">Chỉ số thị trường</h3>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md font-bold animate-pulse">LIVE</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/30 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Chỉ số</th>
                <th className="px-6 py-4">Giá trị</th>
                <th className="px-6 py-4">Thay đổi</th>
                <th className="px-6 py-4">% Thay đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.indices.map((idx, i) => {
                const isPositive = !idx.change.startsWith('-');
                return (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-5 font-black text-slate-200">{idx.name}</td>
                    <td className="px-6 py-5 font-mono text-lg">{idx.value}</td>
                    <td className={`px-6 py-5 font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {idx.change}
                    </td>
                    <td className={`px-6 py-5 font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <span className={`px-2 py-1 rounded-lg ${isPositive ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                        {idx.percent}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-3xl border-l-4 border-l-amber-500">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Tâm Lý Thị Trường</h3>
          <p className="text-2xl font-black text-amber-400">{data.sentiment}</p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
            <div 
              className="bg-amber-500 h-full transition-all duration-1000" 
              style={{ width: data.sentiment === 'Hưng phấn' ? '90%' : data.sentiment === 'Tích cực' ? '70%' : '50%' }}
            />
          </div>
        </div>

        <div className="glass p-6 rounded-3xl border-l-4 border-l-indigo-500 md:col-span-2">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Giao dịch Khối Ngoại</h3>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
              <Globe size={24} />
            </div>
            <p className="text-xl font-bold text-slate-200 leading-tight">{data.foreignFlow}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Summary Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <LayoutDashboard size={120} />
            </div>
            <h3 className="text-xl font-bold flex items-center gap-3 mb-8 text-blue-400">
              <Activity size={24} /> Phân Tích Diễn Biến
            </h3>
            <div className="prose prose-invert max-w-none">
              <p className="text-slate-300 leading-relaxed text-lg whitespace-pre-line italic">
                {data.summary}
              </p>
            </div>
            
            <div className="mt-10 p-6 bg-gradient-to-r from-blue-600/10 to-transparent rounded-2xl border border-blue-500/20">
              <h4 className="flex items-center gap-2 font-black text-blue-400 mb-3 uppercase text-xs tracking-widest">
                <Info size={16} /> Chiến lược hành động
              </h4>
              <p className="text-slate-200 font-medium">"{data.recommendation}"</p>
            </div>
          </div>

          <div className="glass p-6 rounded-3xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Nguồn dữ liệu tham chiếu</h3>
            <div className="flex flex-wrap gap-2">
              {data.sources.map((src, i) => (
                <a 
                  key={i} 
                  href={src.uri} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 text-[10px] bg-slate-900/50 hover:bg-slate-800 px-4 py-2 rounded-xl border border-white/5 text-blue-400 transition-all font-bold uppercase"
                >
                  {src.title} <ExternalLink size={10} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Sectors and Actions */}
        <div className="space-y-6">
          <div className="glass p-6 rounded-3xl border-t-4 border-t-emerald-500">
            <h3 className="text-xl font-bold flex items-center gap-3 mb-6 text-emerald-400">
              <PieChart size={24} /> Sức Mạnh Nhóm Ngành
            </h3>
            <div className="space-y-4">
              {data.topSectors.map((sector, i) => (
                <div key={i} className="group flex flex-col gap-2 p-4 bg-slate-900/40 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{sector.name}</span>
                    <span className={`text-sm font-black ${sector.performance.includes('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {sector.performance}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${sector.performance.includes('+') ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                      style={{ width: '65%' }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-8 rounded-3xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border-blue-500/30">
            <h3 className="font-black text-lg mb-2 flex items-center gap-2 text-white uppercase tracking-tighter">
              Cộng đồng Nhà Đầu Tư
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              VNTrade AI cập nhật dữ liệu tự động từ các sàn HOSE, HNX và UPCoM để mang lại cái nhìn khách quan nhất.
            </p>
            <button 
              onClick={fetchMarketData}
              className="w-full py-4 bg-white text-slate-950 hover:bg-slate-200 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-2xl shadow-white/10 active:scale-[0.97]"
            >
              <RefreshCw size={18} /> Cập nhật lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
