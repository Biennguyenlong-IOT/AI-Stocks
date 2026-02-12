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

  const prompt = `Bạn là một Giám đốc Quản lý Quỹ (Fund Manager) chuyên nghiệp. Hãy thực hiện phân tích danh mục này theo tiêu chuẩn quản trị rủi ro cao nhất.

DỮ LIỆU TÀI CHÍNH HIỆN TẠI:
- Tổng NAV: ${stats.totalAssets.toLocaleString('vi-VN')}đ
- Tiền mặt: ${stats.totalCash.toLocaleString('vi-VN')}đ (Chiếm ${((stats.totalCash/stats.totalAssets)*100).toFixed(1)}% NAV)
- Hiệu suất tổng: ${stats.profitPercent.toFixed(2)}%

DANH MỤC CHI TIẾT:
${holdingDetails}

LỊCH SỬ GIAO DỊCH GẦN ĐÂY:
${transactions.slice(0, 8).map(t => `- ${t.date}: ${t.type} ${t.symbol || ''}, Khối lượng: ${t.quantity || 0}, Ghi chú: ${t.note || ''}`).join('\n')}

YÊU CẦU PHÂN TÍCH CHUYÊN SÂU:
1. ĐÁNH GIÁ CẤU TRÚC (Asset Analysis):
   - Phân tích sự cân bằng giữa các nhóm ngành (Ngân hàng, BĐS, Thép, v.v.).
   - Chỉ ra mã nào đang chiếm tỷ trọng quá lớn gây rủi ro tập trung.
   - Nhận xét về tỷ lệ Tiền/Cổ phiếu trong bối cảnh thị trường hiện tại.

2. PHÂN TÍCH CHIẾN THUẬT (Trade Analysis):
   - Đánh giá các lệnh mua/bán gần đây. Bạn có đang "gồng lỗ" hay "chốt lời non" không?
   - Nhận diện tâm lý qua ghi chú (Fomo, hoảng loạn hay kỷ luật?).

3. CHỈ SỐ RỦI RO (Risk Score): Thang điểm 1-10.

4. KHUYẾN NGHỊ CƠ CẤU (Recommendations): 
   - Đưa ra 3 hành động cụ thể để tối ưu danh mục.
   - Nếu tỷ trọng ngành nào quá cao, hãy đề xuất con số tỷ trọng mục tiêu (ví dụ: hạ BĐS xuống dưới 20%).

Yêu cầu trả về JSON chuẩn theo schema. Ngôn ngữ chuyên nghiệp, sắc bén.`;

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