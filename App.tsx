
import React, { useState, useEffect } from 'react';
import { AppTab, AppDataCloud } from './types';
import { MarketPanel } from './components/MarketPanel';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ScreenerPanel } from './components/ScreenerPanel';
import { StrategyPanel } from './components/StrategyPanel';
import { PortfolioPanel } from './components/PortfolioPanel';
import { loadFromCloud, saveToCloud } from './syncService';
import { 
  BarChart3, Search, Lightbulb, LineChart, LayoutDashboard, Briefcase, 
  Settings, X, Cpu, Key, HelpCircle, ExternalLink, ShieldCheck, 
  AlertCircle, Info, Database, Cloud, CloudOff, RefreshCw, ChevronRight, Copy, CheckCircle2
} from 'lucide-react';

const AI_MODELS = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', equivalent: 'Tương đương GPT-4o', description: 'Phân tích sâu nhất.' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', equivalent: 'Tương đương GPT-4o-mini', description: 'Tốc độ cực nhanh.' },
  { id: 'gemini-2.5-flash-latest', name: 'Gemini 2.5 Flash', equivalent: 'Ổn định nhất', description: 'Hỗ trợ Search tốt.' }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.MARKET);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showReadme, setShowReadme] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Khởi tạo URL từ localStorage để lưu lại cho những lần sau
  const [syncUrl, setSyncUrl] = useState(localStorage.getItem('vntrade_sync_url') || '');
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem('vntrade_custom_model_id') || 'gemini-3-flash-preview');
  const [customModelInput, setCustomModelInput] = useState(localStorage.getItem('vntrade_custom_model') || '');

  const [cloudData, setCloudData] = useState<AppDataCloud>({
    symbols: [],
    analyses: {},
    settings: { modelId: 'gemini-3-flash-preview', customModel: '' }
  });

  useEffect(() => {
    if (syncUrl) {
      handleInitialLoad();
    }
  }, []);

  const handleInitialLoad = async () => {
    setIsSyncing(true);
    const data = await loadFromCloud();
    if (data) {
      setCloudData(data);
    }
    setIsSyncing(false);
  };

  const saveSettings = async () => {
    setIsSyncing(true);
    // Lưu URL vào localStorage vĩnh viễn
    localStorage.setItem('vntrade_sync_url', syncUrl.trim());
    
    const finalModel = selectedModel === 'custom' ? customModelInput : selectedModel;
    const newData: AppDataCloud = {
      ...cloudData,
      settings: { modelId: selectedModel, customModel: finalModel }
    };

    localStorage.setItem('vntrade_custom_model_id', selectedModel);
    localStorage.setItem('vntrade_custom_model', finalModel);

    if (syncUrl.trim()) {
      await saveToCloud(newData);
    }
    
    setCloudData(newData);
    setIsSyncing(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsSettingsOpen(false);
    }, 1500);
  };

  const copyCode = () => {
    const code = `/**
 * VNTrade AI Cloud Sync V5 - PHIÊN BẢN ỔN ĐỊNH NHẤT
 * Sửa lỗi Syntax Error, tự động tách dòng và định dạng bảng.
 */
function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Sheet dữ liệu thô (Ẩn để App đọc)
    var rawSheet = ss.getSheetByName("APP_DATA") || ss.insertSheet("APP_DATA");
    rawSheet.clear().getRange(1, 1).setValue(rawData);
    
    // 2. Sheet Danh mục (Để người dùng xem)
    var pSheet = ss.getSheetByName("DANH_MUC") || ss.insertSheet("DANH_MUC");
    pSheet.clear();
    
    var headers = [["MÃ CP", "XU HƯỚNG", "ĐÁY", "GIÁ VÀO", "HỖ TRỢ", "KHÁNG CỰ", "CẬP NHẬT"]];
    pSheet.getRange(1, 1, 1, 7).setValues(headers)
      .setFontWeight("bold")
      .setBackground("#1e40af")
      .setFontColor("#ffffff")
      .setHorizontalAlignment("center");

    var analyses = data.analyses || {};
    var symbols = Object.keys(analyses);
    var rows = [];
    
    for (var i = 0; i < symbols.length; i++) {
      var sym = symbols[i];
      var a = analyses[sym];
      var kl = a.keyLevels || { entry: 0, support: 0, resistance: 0 };
      
      rows.push([
        sym,
        (a.trend || "N/A"),
        (a.isBottom ? "✅ ĐÁY" : "🔍 THEO DÕI"),
        (kl.entry || 0),
        (kl.support || 0),
        (kl.resistance || 0),
        (a.lastUpdated || "")
      ]);
    }
    
    if (rows.length > 0) {
      pSheet.getRange(2, 1, rows.length, 7).setValues(rows).setHorizontalAlignment("center");
      pSheet.getRange(2, 4, rows.length, 3).setNumberFormat("#,##0");
      pSheet.getRange(1, 1, rows.length + 1, 7).setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
    }
    
    pSheet.setFrozenRows(1);
    pSheet.autoResizeColumns(1, 7);
    return ContentService.createTextOutput("OK");
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.message);
  }
}

function doGet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("APP_DATA");
  var data = sheet ? sheet.getRange(1, 1).getValue() : "{}";
  return ContentService.createTextOutput(data).setMimeType(ContentService.MimeType.JSON);
}`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen pb-20 relative">
      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-4 lg:px-8 py-4 mb-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 group">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2.5 rounded-xl shadow-lg">
                <BarChart3 className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white uppercase tracking-tighter">VNTrade <span className="text-blue-500">Cloud</span></h1>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">Ổn định V5 - Tự động lưu URL</span>
                  {syncUrl ? <Cloud className="text-emerald-400 w-3 h-3" /> : <CloudOff className="text-rose-400 w-3 h-3" />}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-900/80 p-1 rounded-2xl border border-slate-700/50 backdrop-blur-md">
              {[
                { id: AppTab.MARKET, icon: LayoutDashboard, label: 'Thị Trường' },
                { id: AppTab.PORTFOLIO, icon: Briefcase, label: 'Danh Mục' },
                { id: AppTab.ANALYSIS, icon: LineChart, label: 'Phân Tích' },
                { id: AppTab.SCREENER, icon: Search, label: 'Tìm Mã' },
                { id: AppTab.STRATEGY, icon: Lightbulb, label: 'Chiến Lược' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <tab.icon size={16} />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 border border-white/5 relative"
            >
              <Settings size={20} />
              {isSyncing && <RefreshCw className="absolute -top-1 -right-1 w-4 h-4 text-blue-400 animate-spin bg-slate-900 rounded-full" />}
            </button>
          </div>
        </div>
      </nav>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-5xl p-0 rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
                  <Database size={24} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight">Cấu hình đồng bộ Đa Dòng V5</h2>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
              <div className="w-56 bg-slate-900/30 border-r border-white/5 p-4 flex flex-col gap-2">
                <button onClick={() => setShowReadme(false)} className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold ${!showReadme ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
                  <Settings size={18} /> Cài đặt
                </button>
                <button onClick={() => setShowReadme(true)} className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold ${showReadme ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
                  <HelpCircle size={18} /> Hướng dẫn
                </button>
              </div>

              <div className="flex-1 p-8 overflow-y-auto">
                {!showReadme ? (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-4">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Database size={14} /> URL Web App (Sẽ được lưu vĩnh viễn)
                      </label>
                      <input 
                        type="text"
                        value={syncUrl}
                        onChange={(e) => setSyncUrl(e.target.value)}
                        placeholder="Dán link script.google.com vào đây..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-indigo-400"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Cpu size={14} /> Model AI
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {AI_MODELS.map(m => (
                          <button
                            key={m.id}
                            onClick={() => setSelectedModel(m.id)}
                            className={`text-left p-5 rounded-3xl border transition-all ${selectedModel === m.id ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-900 border-white/5'}`}
                          >
                            <div className="font-black text-sm text-white mb-1">{m.name}</div>
                            <div className="text-[10px] text-slate-400">{m.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={saveSettings}
                      disabled={saveSuccess}
                      className={`w-full py-5 rounded-[2rem] font-black text-sm transition-all shadow-2xl flex items-center justify-center gap-3 ${
                        saveSuccess ? 'bg-emerald-600 text-white' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                      }`}
                    >
                      {saveSuccess ? <CheckCircle2 size={20} /> : <Cloud size={20} />}
                      {saveSuccess ? 'Đã lưu URL vĩnh viễn!' : 'Lưu cấu hình & Đồng bộ'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 text-sm text-slate-400 leading-relaxed max-w-2xl mx-auto">
                    <h3 className="text-white text-xl font-black flex items-center gap-2"><CheckCircle2 className="text-emerald-400" /> Sửa lỗi "missing ) after argument list"</h3>
                    <div className="space-y-4">
                      <p>Lỗi này xảy ra khi có ký tự lạ hoặc dấu ngoặc bị thiếu trong quá trình copy-paste. Phiên bản V5 này đã được đóng gói kỹ lưỡng để tránh lỗi này.</p>
                      <p><strong>Bước 1:</strong> Copy mã V5 bên dưới.</p>
                      <p><strong>Bước 2:</strong> Xóa sạch toàn bộ mã cũ trong Google Apps Script.</p>
                      <p><strong>Bước 3:</strong> Dán mã mới và nhấn biểu tượng 💾 (Save).</p>
                      <p><strong>Bước 4:</strong> Deploy &gt; New Deployment (Đảm bảo chọn "Anyone").</p>
                    </div>
                    
                    <div className="p-6 bg-slate-900 rounded-3xl border border-white/5 space-y-4 relative group">
                      <button 
                        onClick={copyCode}
                        className="absolute right-6 top-6 flex items-center gap-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-blue-400 text-[10px] font-bold transition-all"
                      >
                        {copied ? 'Đã copy' : 'Copy mã V5'}
                      </button>
                      <pre className="bg-black p-4 rounded-xl text-[10px] font-mono overflow-x-auto text-emerald-400/80 max-h-[300px]">
{`/** VNTrade AI V5 **/
function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var rawSheet = ss.getSheetByName("APP_DATA") || ss.insertSheet("APP_DATA");
    rawSheet.clear().getRange(1, 1).setValue(rawData);
    
    var pSheet = ss.getSheetByName("DANH_MUC") || ss.insertSheet("DANH_MUC");
    pSheet.clear();
    
    var h = [["MÃ CP", "XU HƯỚNG", "ĐÁY", "GIÁ VÀO", "HỖ TRỢ", "KHÁNG CỰ", "CẬP NHẬT"]];
    pSheet.getRange(1, 1, 1, 7).setValues(h).setFontWeight("bold").setBackground("#1e40af").setFontColor("#fff").setHorizontalAlignment("center");

    var analyses = data.analyses || {};
    var symbols = Object.keys(analyses);
    var rows = [];
    
    for (var i = 0; i < symbols.length; i++) {
      var sym = symbols[i];
      var a = analyses[sym];
      var kl = a.keyLevels || { entry: 0, support: 0, resistance: 0 };
      rows.push([sym, (a.trend || "N/A"), (a.isBottom ? "✅ ĐÁY" : "🔍 THEO DÕI"), (kl.entry || 0), (kl.support || 0), (kl.resistance || 0), (a.lastUpdated || "")]);
    }
    
    if (rows.length > 0) {
      pSheet.getRange(2, 1, rows.length, 7).setValues(rows).setHorizontalAlignment("center");
      pSheet.getRange(2, 4, rows.length, 3).setNumberFormat("#,##0");
      pSheet.getRange(1, 1, rows.length + 1, 7).setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
    }
    
    pSheet.setFrozenRows(1);
    pSheet.autoResizeColumns(1, 7);
    return ContentService.createTextOutput("OK");
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.message);
  }
}

function doGet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("APP_DATA");
  var data = sheet ? sheet.getRange(1, 1).getValue() : "{}";
  return ContentService.createTextOutput(data).setMimeType(ContentService.MimeType.JSON);
}`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="min-h-[600px]">
          {activeTab === AppTab.MARKET && <MarketPanel />}
          {activeTab === AppTab.PORTFOLIO && <PortfolioPanel cloudData={cloudData} setCloudData={setCloudData} />}
          {activeTab === AppTab.ANALYSIS && <AnalysisPanel />}
          {activeTab === AppTab.SCREENER && <ScreenerPanel />}
          {activeTab === AppTab.STRATEGY && <StrategyPanel />}
        </div>
      </main>
    </div>
  );
};

export default App;
