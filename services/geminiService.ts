
import { GoogleGenAI, Type } from "@google/genai";
import { StockHolding, Transaction, AIAnalysisResponse } from "../types";

export const analyzePortfolio = async (
  holdings: StockHolding[], 
  transactions: Transaction[],
  stats: { totalAssets: number; totalCash: number; totalProfit: number; profitPercent: number }
): Promise<AIAnalysisResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-3-flash-preview";
  
  // Tính toán tỷ trọng mã để AI thấy được mức độ tập trung vốn
  const holdingDetails = holdings.map(h => {
    const value = h.quantity * h.currentPrice;
    const weight = ((value / stats.totalAssets) * 100).toFixed(1);
    const pnl = ((h.currentPrice - h.avgPrice) / h.avgPrice * 100).toFixed(1);
    return `- [${h.brokerage}] ${h.symbol}: Tỷ trọng ${weight}%, Lãi/Lỗ: ${pnl}%, Ngành: ${h.sector}`;
  }).join('\n');

  const prompt = `Bạn là một Giám đốc Quản lý Quỹ cấp cao với hơn 20 năm kinh nghiệm tại thị trường chứng khoán Việt Nam. Hãy thực hiện phân tích danh mục đầu tư dưới đây một cách cực kỳ chuyên sâu và thực chiến.

TỔNG QUAN TÀI CHÍNH:
- Tổng tài sản: ${stats.totalAssets.toLocaleString('vi-VN')}đ
- Tiền mặt hiện có: ${stats.totalCash.toLocaleString('vi-VN')}đ (Tỷ lệ: ${((stats.totalCash/stats.totalAssets)*100).toFixed(1)}%)
- Lợi nhuận tổng: ${stats.totalProfit.toLocaleString('vi-VN')}đ (${stats.profitPercent.toFixed(2)}%)

CHI TIẾT DANH MỤC (HOLDINGS):
${holdingDetails}

LỊCH SỬ 10 GIAO DỊCH GẦN NHẤT:
${transactions.slice(0, 10).map(t => `- ${t.date}: ${t.type} ${t.symbol || ''}, Khối lượng: ${t.quantity || 0}, Giá: ${t.price || 0}đ, Ghi chú: ${t.note || 'Không có'}`).join('\n')}

YÊU CẦU PHÂN TÍCH CHUYÊN SÂU:
1. ĐÁNH GIÁ CƠ CẤU (Asset Analysis): Nhận xét về sự phân bổ vốn giữa các mã và ngành. Có đang bị quá tập trung (concentration risk) vào một mã hay một sàn (brokerage) nào không?
2. PHÂN TÍCH HÀNH VI (Trade Analysis): Dựa trên lịch sử giao dịch và ghi chú, hãy đánh giá phong cách đầu tư (đầu cơ, tích sản, hay hoảng loạn?). Các lệnh Buy/Sell có hợp lý về mặt quản trị vị thế không?
3. CHỈ SỐ RỦI RO (Risk Score): Đưa ra điểm số từ 1-10 (1: Rất an toàn, 10: Cực kỳ rủi ro/All-in).
4. CHIẾN LƯỢC HÀNH ĐỘNG: Đề xuất 3-4 hành động cụ thể (ví dụ: cơ cấu mã yếu, hạ tỷ trọng ngành nào, hoặc gia tăng tiền mặt dự phòng).

Lưu ý: Ngôn ngữ chuyên nghiệp, sắc bén, không nói nước đôi. Trả về JSON theo schema.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "Bạn là chuyên gia phân tích tài chính chuyên nghiệp, sử dụng ngôn từ thực chiến và am hiểu thị trường chứng khoán Việt Nam.",
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
    if (!text) throw new Error("AI trả về rỗng");
    return JSON.parse(text) as AIAnalysisResponse;
  } catch (error) {
    console.error("Gemini Deep Analysis Error:", error);
    throw error;
  }
};
