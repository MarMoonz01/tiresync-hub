import * as XLSX from "xlsx";

export interface TireImportRow {
  brand: string;
  model: string;
  size: string;
  load_index: string;
  speed_rating: string;
  price: number;
  cost: number;        // ต้นทุน (avg_cost)
  quantity: number;    // จำนวนรวม (sum of DOTs, or a plain quantity column)
  dots: {
    code: string;
    quantity: number;
    promotion?: string;
  }[];
}

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  parsedData: TireImportRow[]; // ข้อมูลที่แปลงเสร็จแล้วพร้อมใช้
}

// Keyword สำหรับจับคู่คอลัมน์หลัก (Standard Columns)
const stdColPatterns = {
  size: ["size", "ขนาด", "ไซส์"],
  brand: ["brand", "ยี่ห้อ", "ยี่ห้อยาง", "แบรนด์"],
  model: ["model", "รุ่น", "ลายดอก"],
  load_index: ["load", "load_index", "li", "ดัชนีรับน้ำหนัก"],
  price: ["price", "ราคาขาย", "sell price", "ราคา", "unit price"],
  cost: ["cost", "ต้นทุน", "ทุน", "cost price", "ราคาทุน"],
};

// ฟังก์ชันช่วยหาชื่อคอลัมน์จริงจาก Keyword
function findColumnName(headers: string[], patterns: string[]): string | undefined {
  return headers.find(h => patterns.some(p => h.toLowerCase().includes(p.toLowerCase())));
}

export function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

        // อ่านข้อมูลแบบ JSON (Array of Objects)
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

        if (jsonData.length === 0) {
          reject(new Error("File is empty"));
          return;
        }

        // ดึงหัวตารางทั้งหมดจากแถวแรก
        const headers = Object.keys(jsonData[0] as object);

        // Map ข้อมูลเข้าสู่โครงสร้าง TireImportRow
        const parsedData: TireImportRow[] = (jsonData as any[]).map((row) => {

          // 1. หาคอลัมน์พื้นฐาน (Basic Info)
          const sizeKey = findColumnName(headers, stdColPatterns.size);
          const brandKey = findColumnName(headers, stdColPatterns.brand);
          const modelKey = findColumnName(headers, stdColPatterns.model);
          const loadKey = findColumnName(headers, stdColPatterns.load_index);
          const priceKey = findColumnName(headers, stdColPatterns.price);
          const costKey = findColumnName(headers, stdColPatterns.cost);

          // แปลง Size Format (เช่น 1955515 -> 195/55R15)
          let fmtSize = sizeKey ? String(row[sizeKey] || "").trim() : "";
          if (/^\d{7}$/.test(fmtSize)) {
            fmtSize = `${fmtSize.substring(0, 3)}/${fmtSize.substring(3, 5)}R${fmtSize.substring(5, 7)}`;
          }

          // แยก Load Index & Speed Rating (เช่น "82T" -> LI: "82", SR: "T")
          let rawLoad = loadKey ? String(row[loadKey] || "").trim() : "";
          let loadIndex = "";
          let speedRating = "";

          if (rawLoad) {
            // Regex: จับคู่ตัวเลข (อาจมี /) ตามด้วยตัวอักษร 1-2 ตัวด้านหลัง
            // กลุ่ม 1: (\d+(?:\/\d+)?) -> 91 หรือ 106/104
            // กลุ่ม 2: ([a-zA-Z]+) -> H, V, R
            const loadMatch = rawLoad.match(/^(\d+(?:\/\d+)?)\s*([a-zA-Z]+)$/);
            if (loadMatch) {
              loadIndex = loadMatch[1];
              speedRating = loadMatch[2].toUpperCase();
            } else {
              // ถ้าไม่ตรง Format ให้ใส่เป็น Load Index ทั้งก้อนไปก่อน
              loadIndex = rawLoad;
            }
          }

          // 2. กวาด DOT แบบ Dynamic (Unlimited)
          const dots: { code: string; quantity: number; promotion?: string }[] = [];

          // หาคอลัมน์ที่ขึ้นต้นด้วย "DOT" ทั้งหมด (ไม่สนตัวพิมพ์เล็กใหญ่)
          const dotColumns = headers.filter(h => /^(DOT)/i.test(h.trim()));

          dotColumns.forEach(dotColKey => {
            // ดึง "ตัวเลข" ท้ายชื่อคอลัมน์ (เช่น "DOT 1" -> "1", "DOT 99" -> "99")
            const match = dotColKey.match(/(\d+)$/);
            if (!match) return;

            const suffix = match[1]; // เลขต่อท้าย

            // หาคู่ของมัน: "จำนวน X" หรือ "Qty X" ที่มีเลขท้ายตรงกัน
            const qtyColKey = headers.find(h =>
              new RegExp(`(จำนวน|Qty|Amount|Quantity).*?${suffix}$`, 'i').test(h.trim())
            );

            // หาคู่ของมัน: "โปรโมชั่น X" (ถ้ามี)
            const promoColKey = headers.find(h =>
              new RegExp(`(โปรโมชั่น|Promotion|Promo).*?${suffix}$`, 'i').test(h.trim())
            );

            // ดึงค่าออกมา
            const dotCode = row[dotColKey];
            const qty = qtyColKey ? row[qtyColKey] : 0;
            const promo = promoColKey ? row[promoColKey] : "";

            // ถ้ามี DOT และมีจำนวน > 0 ให้เก็บ
            if (dotCode && qty && Number(qty) > 0) {
              dots.push({
                code: String(dotCode).trim(),
                quantity: Number(qty),
                promotion: promo ? String(promo).trim() : ""
              });
            }
          });

          // Total quantity: sum of DOT quantities, else a plain quantity column.
          const totalDots = dots.reduce((s, d) => s + d.quantity, 0);
          const plainQtyKey = headers.find((h) =>
            /^(quantity|qty|จำนวน|stock|คงเหลือ|สต็อก)$/i.test(h.trim())
          );
          const quantity = totalDots > 0
            ? totalDots
            : (plainQtyKey ? Number(row[plainQtyKey] || 0) : 0);

          return {
            brand: brandKey ? String(row[brandKey] || "").trim() : "",
            model: modelKey ? String(row[modelKey] || "").trim() : "",
            size: fmtSize,
            load_index: loadIndex,
            speed_rating: speedRating,
            price: priceKey ? Number(row[priceKey] || 0) : 0,
            cost: costKey ? Number(row[costKey] || 0) : 0,
            quantity,
            dots: dots
          };
        });

        // กรองแถวว่างทิ้ง (ต้องมี Brand และ Size เป็นอย่างน้อย)
        const validData = parsedData.filter(d => d.brand && d.size);

        resolve({
          headers,
          rows: jsonData as Record<string, string>[], // เก็บ Raw Data ไว้เผื่อ Debug
          parsedData: validData // ข้อมูลที่พร้อมใช้งาน
        });

      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsBinaryString(file);
  });
}