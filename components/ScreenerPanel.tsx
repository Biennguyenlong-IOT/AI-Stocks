
import React, { useState } from 'react';
import { screenStocks } from '../geminiService';
import { ScreenerResult } from '../types';
import { Filter, TrendingUp, Compass, Wallet, Loader2, Sparkles, ChevronRight } from 'lucide-react';

export const ScreenerPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [criteria, setCriteria] = useState({
    trend: 'Uptrend',
    bottom: true,
    priceRange: 'Dưới 50,000 VND'
  });

  const handleScreen = async () => {
    setLoading(true);
    try {
      const res = await screenStocks(criteria);
      setResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Filter Section */}
      <div className="glass p-8 rounded-3xl border-blue-500/20">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
            <Filter className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Lọc Cổ Phiếu Thông Minh</h2>
            <p className="text-slate-400 text-sm">Tìm kiếm cơ hội dựa trên chiến thuật AI</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <TrendingUp size={16} /> Xu hướng
            </label>
            <select 
              value={criteria.trend}
              onChange={(e) => setCriteria({...criteria, trend: e.target.value})}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Uptrend">Uptrend (Đang lên)</option>
              <option value="Sideways">Tích lũy (Đi ngang)</option>
              <option value="Reversal">Đảo chiều tăng</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Compass size={16} /> Trạng thái đáy
            </label>
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
              <button 
                onClick={() => setCriteria({...criteria, bottom: true})}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${criteria.bottom ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Đang tạo đáy
              </button>
              <button 
                onClick={() => setCriteria({...criteria, bottom: false})}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!criteria.bottom ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Tất cả
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Wallet size={16} /> Tầm giá
            </label>
            <select 
              value={criteria.priceRange}
              onChange={(e) => setCriteria({...criteria, priceRange: e.target.value})}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Dưới 20,000 VND">Penny (Dưới 20k)</option>
              <option value="Từ 20,000 - 50,000 VND">Midcap (20k - 50k)</option>
              <option value="Trên 50,000 VND">Bluechip (Trên 50k)</option>
            </select>
          </div>
        </div>

        <button 
          onClick={handleScreen}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 transition-all active:scale-[0.98]"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
          {loading ? 'Đang quét thị trường...' : 'Quét Mã Tiềm Năng'}
        </button>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((item, idx) => (
          <div key={idx} className="glass p-6 rounded-2xl hover:border-blue-500/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors">{item.symbol}</h3>
                <span className="text-slate-400 text-xs font-mono">{item.price} VND</span>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-bold ${item.change.startsWith('+') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {item.change}
              </div>
            </div>
            
            <p className="text-slate-300 text-sm mb-4 line-clamp-3 leading-relaxed">
              {item.reason}
            </p>

            <div className="flex flex-wrap gap-2 mt-auto">
              {item.tags.map((tag, tIdx) => (
                <span key={tIdx} className="bg-slate-800/50 text-slate-400 px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-tighter">
                  {tag}
                </span>
              ))}
            </div>

            <button className="w-full mt-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm flex items-center justify-center gap-1 transition-colors">
              Xem chi tiết <ChevronRight size={14} />
            </button>
          </div>
        ))}

        {!loading && results.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500">
            Hãy chọn các tiêu chí và nhấn Quét Mã để bắt đầu tìm kiếm cơ hội.
          </div>
        )}
      </div>
    </div>
  );
};
