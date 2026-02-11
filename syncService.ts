
import { AppDataCloud } from "./types";

/**
 * Lấy URL Webhook từ localStorage
 */
const getSyncUrl = () => localStorage.getItem('vntrade_sync_url') || '';

/**
 * Lưu dữ liệu lên Google Sheets.
 * Gửi toàn bộ đối tượng dữ liệu dưới dạng JSON.
 * Apps Script doPost V3 sẽ nhận JSON này và tự động phân tách thành các dòng.
 */
export const saveToCloud = async (data: AppDataCloud): Promise<boolean> => {
  const url = getSyncUrl();
  if (!url) return false;

  try {
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain'
      }
    });
    return true;
  } catch (error) {
    console.error("Lỗi khi đồng bộ lên Google Sheets:", error);
    return false;
  }
};

/**
 * Tải dữ liệu từ Google Sheets.
 * Apps Script doGet sẽ trả về dữ liệu thô từ Sheet "APP_DATA".
 */
export const loadFromCloud = async (): Promise<AppDataCloud | null> => {
  const url = getSyncUrl();
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Lỗi khi tải từ Google Sheets:", error);
    return null;
  }
};
