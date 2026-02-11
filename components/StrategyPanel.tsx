
import React, { useState } from 'react';
import { analyzeStock } from '../geminiService';
import { StockAnalysis } from '../types';
import { Sword, Target, ShieldAlert, BadgeDollarSign, Loader2 } from 'lucide-react';

export const StrategyPanel: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<StockAnalysis | null>(null);

  const generateStrategy = async () => {
    if (!symbol) return;
    setLoading(true);
    try {
      const res = await analyzeStock(symbol);
      setStrategy(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white">Lập Kế Hoạch Giao Dịch</h2>
        <p className="text-slate-400">Xác định điểm vào, mục tiêu và quản trị rủi ro ngay lập tức</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <input 
          type="text"
          placeholder="Mã cổ phiếu..."
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-bold"
        />
        <button 
          onClick={generateStrategy}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 px-8 rounded-2xl font-bold flex items-center justify-center gap-2 whitespace-nowrap transition-all"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Sword size={20} />}
          Tạo Chiến Lược
        </button>
      </div>

      {strategy && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in zoom-in-95 duration-300">
          <div className="glass p-6 rounded-3xl border-b-4 border-b-blue-500">
            <div className="bg-blue-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <BadgeDollarSign className="text-blue-400" />
            </div>
            <h4 className="text-slate-400 text-sm font-semibold uppercase mb-1">Vùng Mua</h4>
            <p className="text-3xl font-black">{strategy.keyLevels.entry.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-2 italic">Giải ngân tại vùng này khi có tín hiệu dòng tiền.</p>
          </div>

          <div className="glass p-6 rounded-3xl border-b-4 border-b-rose-500">
            <div className="bg-rose-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <Target className="text-rose-400" />
            </div>
            <h4 className="text-slate-400 text-sm font-semibold uppercase mb-1">Mục Tiêu (Kháng cự)</h4>
            <p className="text-3xl font-black">{strategy.keyLevels.resistance.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-2 italic">Chốt lời từng phần khi chạm ngưỡng kháng cự.</p>
          </div>

          <div className="glass p-6 rounded-3xl border-b-4 border-b-emerald-500">
            <div className="bg-emerald-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <ShieldAlert className="text-emerald-400" />
            </div>
            <h4 className="text-slate-400 text-sm font-semibold uppercase mb-1">Cắt Lỗ (Hỗ trợ)</h4>
            <p className="text-3xl font-black">{strategy.keyLevels.support.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-2 italic">Thoát vị thế nếu giá đóng cửa dưới ngưỡng này.</p>
          </div>

          <div className="md:col-span-3 glass p-8 rounded-3xl">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Sparkles className="text-yellow-400" size={20} /> Lý do đề xuất
            </h3>
            <div className="text-slate-300 space-y-4 leading-relaxed">
              <p>{strategy.reasoning}</p>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <h5 className="text-xs font-bold text-indigo-400 uppercase mb-2">Tóm lược thị trường</h5>
                <ul className="text-sm space-y-2">
                  <li className="flex gap-2">
                    <span className="text-indigo-500">•</span> Xu hướng: {strategy.trend}
                  </li>
                  <li className="flex gap-2">
                    <span className="text-indigo-500">•</span> Trạng thái đáy: {strategy.isBottom ? 'Khả quan' : 'Đang tìm kiếm'}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { Sparkles } from 'lucide-react';
