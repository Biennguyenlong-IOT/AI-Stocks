
import { GoogleGenAI, Type } from "@google/genai";
import { StockHolding, Transaction, AIAnalysisResponse } from "../types";

export interface StockTrendAnalysis {
  symbol: string;
  isBottoming: boolean;
  isUptrend: boolean;
  reasoning: string;
  confidenceScore: number;
  sources: { title: string; uri: string }[];
}

export const analyzePortfolio = async (
  holdings: StockHolding[], 
  transactions: Transaction[],
  stats: { totalAssets: number; totalCash: number; totalProfit: number; profitPercent: number }
): Promise<AIAnalysisResponse> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const model = "gemini-3-flash-preview";
  
  const holdingDetails = holdings.map(h => {
    const value = h.quantity * h.currentPrice;
    const weight = ((value / stats.totalAssets) * 100).toFixed(1);
    const pnl = h.avgPrice > 0 ? ((h.currentPrice - h.avgPrice) / h.avgPrice * 100).toFixed(1) : "0";
    return `- [${h.brokerage}] ${h.symbol}: Tỷ trọng ${weight}%, Lãi/Lỗ: ${pnl}%, Ngành: ${h.sector}`;
  }).join('\n');

  const prompt = `Bạn là một Giám đốc Quản lý Quỹ (Fund Manager) chuyên nghiệp. Hãy thực hiện phân tích danh mục này theo tiêu chuẩn quản trị rủi ro cao nhất.

DỮ LIỆU TÀI CHÍNH HIỆN TẠI:
- Tổng NAV: ${stats.totalAssets.toLocaleString('vi-VN')}đ
- Hiệu suất tổng: ${stats.profitPercent.toFixed(2)}%

DANH MỤC CHI TIẾT:
${holdingDetails}

YÊU CẦU TRẢ VỀ JSON chuẩn. Ngôn ngữ chuyên nghiệp, sắc bén.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "Bạn là chuyên gia phân tích tài chính cấp cao, chuyên về quản trị danh mục và tối ưu hóa lợi nhuận tại thị trường Việt Nam.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: { type: Type.NUMBER },
            tradeAnalysis: { type: Type.STRING },
            assetAnalysis: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["riskScore", "tradeAnalysis", "assetAnalysis", "recommendations"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI returned empty content");
    return JSON.parse(text) as AIAnalysisResponse;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const searchStockTrend = async (symbol: string): Promise<StockTrendAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const model = 'gemini-3-flash-preview';

  const prompt = `Phân tích mã cổ phiếu "${symbol}" tại thị trường chứng khoán Việt Nam. 
Xác định dựa trên các thông tin mới nhất:
1. Cổ phiếu có đang trong quá trình tạo đáy (forming a bottom) không?
2. Cổ phiếu có đang trong xu hướng tăng (uptrend) không?
3. Lý do cụ thể dựa trên phân tích kỹ thuật và tin tức gần đây.
4. Trả về kết quả dưới dạng JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "Bạn là một chuyên gia phân tích kỹ thuật chứng khoán. Hãy sử dụng Google Search để tìm dữ liệu giá và tin tức mới nhất về mã cổ phiếu được yêu cầu. Phân tích xu hướng và trả về kết quả JSON chính xác.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            symbol: { type: Type.STRING },
            isBottoming: { type: Type.BOOLEAN },
            isUptrend: { type: Type.BOOLEAN },
            reasoning: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER, description: "Từ 0 đến 100" }
          },
          required: ["symbol", "isBottoming", "isUptrend", "reasoning", "confidenceScore"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    const data = JSON.parse(text);
    
    // Trích xuất các nguồn từ grounding metadata
    const sources: { title: string; uri: string }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    return { ...data, sources };
  } catch (error) {
    console.error("Stock Trend Search Error:", error);
    throw error;
  }
};
