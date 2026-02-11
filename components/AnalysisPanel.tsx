
import React, { useState } from 'react';
import { analyzeStock } from '../geminiService';
import { StockAnalysis } from '../types';
import { TrendingUp, TrendingDown, Target, Shield, Zap, Search, Loader2, ExternalLink } from 'lucide-react';

export const AnalysisPanel: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StockAnalysis | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!symbol) return;
    setLoading(true);
    setError('');
    try {
      const res = await analyzeStock(symbol);
      setData(res);
    } catch (err) {
      setError('Không thể phân tích mã này. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Nhập mã cổ phiếu (VD: HPG, SSI, VNM...)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 rounded-xl font-semibold flex items-center gap-2 transition-colors"
        >
          {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Phân Tích'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200">
          {error}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Main Trend Info */}
          <div className="md:col-span-2 space-y-6">
            <div className="glass p-6 rounded-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold">{data.symbol}</h2>
                  <p className="text-slate-400">Phân tích xu hướng thông minh</p>
                </div>
                <div className={`px-4 py-2 rounded-full flex items-center gap-2 font-bold ${
                  data.trend === 'Uptrend' ? 'bg-emerald-500/20 text-emerald-400' : 
                  data.trend === 'Downtrend' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {data.trend === 'Uptrend' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  {data.trend}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900/50 p-4 rounded-xl">
                  <span className="text-sm text-slate-400 block mb-1 uppercase tracking-wider">Xu hướng tuần</span>
                  <p className="text-slate-200 text-sm leading-relaxed">{data.weeklyOutlook}</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl">
                  <span className="text-sm text-slate-400 block mb-1 uppercase tracking-wider">Xu hướng tháng</span>
                  <p className="text-slate-200 text-sm leading-relaxed">{data.monthlyOutlook}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Zap className="text-yellow-400" size={18} /> Nhận định AI
                </h3>
                <p className="text-slate-300 italic leading-relaxed">"{data.reasoning}"</p>
              </div>
            </div>

            {data.sources.length > 0 && (
              <div className="glass p-6 rounded-2xl">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Nguồn tham khảo</h3>
                <div className="flex flex-wrap gap-2">
                  {data.sources.map((src, i) => (
                    <a key={i} href={src.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 text-blue-400 transition-colors">
                      {src.title} <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Key Levels & Indicators */}
          <div className="space-y-6">
            <div className="glass p-6 rounded-2xl border-l-4 border-l-blue-500">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Target size={20} className="text-blue-400" /> Vùng giá mục tiêu
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-700">
                  <span className="text-slate-400">Giá vào lệnh</span>
                  <span className="text-xl font-bold text-blue-400">{data.keyLevels.entry.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-700">
                  <span className="text-slate-400">Kháng cự</span>
                  <span className="text-xl font-bold text-rose-400">{data.keyLevels.resistance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-700">
                  <span className="text-slate-400">Hỗ trợ</span>
                  <span className="text-xl font-bold text-emerald-400">{data.keyLevels.support.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-2xl border ${
              data.isBottom ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/30 border-slate-700'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${data.isBottom ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                  <Shield size={24} />
                </div>
                <div>
                  <h4 className="font-bold">{data.isBottom ? 'Đang tạo đáy' : 'Chưa tạo đáy rõ rệt'}</h4>
                  <p className="text-xs text-slate-400">{data.isBottom ? 'Cơ hội giải ngân tốt' : 'Theo dõi thêm tín hiệu'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
