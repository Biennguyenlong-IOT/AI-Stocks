
import { GoogleGenAI, Type } from "@google/genai";
import { StockAnalysis, ScreenerResult, MarketOverview } from "./types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Ánh xạ các tên thông dụng sang Model ID đầy đủ theo quy định
 */
const getModelId = (): string => {
  const savedModel = localStorage.getItem('vntrade_custom_model');
  if (!savedModel) return 'gemini-3-flash-preview';

  const lower = savedModel.toLowerCase().trim();
  if (lower.includes('flash-lite')) return 'gemini-flash-lite-latest';
  if (lower.includes('flash')) return 'gemini-flash-latest';
  if (lower.includes('pro')) return 'gemini-3-pro-preview';
  
  return savedModel;
};

/**
 * Hàm hỗ trợ gọi API với cơ chế retry khi gặp lỗi 429
 */
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error?.message || '';
    const isQuotaError = error?.status === 429 || errorMsg.includes('429') || errorMsg.includes('quota');
    
    if (retries > 0 && isQuotaError) {
      console.warn(`Vượt hạn mức API. Đang thử lại sau ${delay}ms... (Còn ${retries} lần thử)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }

    // Nếu lỗi "Requested entity was not found", có thể do Key selection hoặc Model ID sai
    if (errorMsg.includes("Requested entity was not found")) {
      throw new Error("Lỗi xác thực hoặc Model không tồn tại. Vui lòng kiểm tra lại API Key hoặc chọn Model khác.");
    }

    throw error;
  }
}

export const getMarketOverview = async (): Promise<MarketOverview> => {
  return callWithRetry(async () => {
    const ai = getAI();
    const model = getModelId();
    const prompt = `Phân tích tổng quan thị trường chứng khoán Việt Nam hôm nay.
    Sử dụng Google Search để lấy dữ liệu mới nhất về:
    1. Danh sách các chỉ số chính: VN-Index, HNX-Index, UPCoM-Index (giá trị, điểm thay đổi, % thay đổi).
    2. Tâm lý thị trường hiện tại (Hưng phấn, Tích cực, Trung lập, Tiêu cực, Hoảng loạn).
    3. Các nhóm ngành dẫn dắt hoặc bị ảnh hưởng mạnh.
    4. Xu hướng dòng vốn ngoại (mua/bán ròng).
    5. Tóm tắt diễn biến chính và lời khuyên chung.
    Trả về kết quả chính xác theo cấu trúc JSON.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            indices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.STRING },
                  change: { type: Type.STRING },
                  percent: { type: Type.STRING }
                },
                required: ['name', 'value', 'change', 'percent']
              }
            },
            sentiment: { type: Type.STRING },
            summary: { type: Type.STRING },
            topSectors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  performance: { type: Type.STRING }
                },
                required: ['name', 'performance']
              }
            },
            foreignFlow: { type: Type.STRING },
            recommendation: { type: Type.STRING }
          },
          required: ['indices', 'sentiment', 'summary', 'topSectors', 'foreignFlow', 'recommendation']
        }
      }
    });

    const overview: MarketOverview = JSON.parse(response.text || '{}');
    overview.sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter(c => c.web)
      ?.map(c => ({ title: c.web!.title || 'Source', uri: c.web!.uri || '' })) || [];

    return overview;
  });
};

export const analyzeStock = async (symbol: string): Promise<StockAnalysis> => {
  return callWithRetry(async () => {
    const ai = getAI();
    const model = getModelId();
    const prompt = `Phân tích chi tiết cổ phiếu Việt Nam mã: ${symbol.toUpperCase()}. 
    Hãy tìm kiếm thông tin mới nhất trên Google Search về diễn biến giá tuần và tháng gần đây.
    Xác định: 
    1. Xu hướng hiện tại (Uptrend/Downtrend/Sideways).
    2. Đã tạo đáy chưa? (isBottom: true/false).
    3. Triển vọng tuần và tháng.
    4. Các mức giá: Kháng cự gần nhất, Hỗ trợ gần nhất, Giá vào lệnh khuyến nghị.
    Trả về kết quả chính xác theo cấu trúc JSON.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            symbol: { type: Type.STRING },
            trend: { type: Type.STRING },
            isBottom: { type: Type.BOOLEAN },
            weeklyOutlook: { type: Type.STRING },
            monthlyOutlook: { type: Type.STRING },
            keyLevels: {
              type: Type.OBJECT,
              properties: {
                support: { type: Type.NUMBER },
                resistance: { type: Type.NUMBER },
                entry: { type: Type.NUMBER }
              },
              required: ['support', 'resistance', 'entry']
            },
            reasoning: { type: Type.STRING }
          },
          required: ['symbol', 'trend', 'isBottom', 'weeklyOutlook', 'monthlyOutlook', 'keyLevels', 'reasoning']
        }
      }
    });

    const analysis: StockAnalysis = JSON.parse(response.text || '{}');
    analysis.sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter(c => c.web)
      ?.map(c => ({ title: c.web!.title || 'Source', uri: c.web!.uri || '' })) || [];

    return analysis;
  });
};

export const screenStocks = async (criteria: { trend: string; bottom: boolean; priceRange: string }): Promise<ScreenerResult[]> => {
  return callWithRetry(async () => {
    const ai = getAI();
    const model = getModelId();
    const prompt = `Tìm danh sách top 5 cổ phiếu Việt Nam thỏa mãn: 
    - Xu hướng: ${criteria.trend}
    - Trạng thái: ${criteria.bottom ? 'Đang tạo đáy/Tích lũy' : 'Bất kỳ'}
    - Tầm giá: ${criteria.priceRange}
    Sử dụng dữ liệu thực tế từ thị trường chứng khoán Việt Nam qua Google Search.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              price: { type: Type.STRING },
              change: { type: Type.STRING },
              reason: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['symbol', 'price', 'change', 'reason', 'tags']
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  });
};
