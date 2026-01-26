import * as XLSX from "xlsx";

export interface ParsedTireRow {
  size: string;
  brand: string;
  model: string;
  load_index: string;
  speed_rating: string;
  price: string;
  dots: {
    dot_code: string;
    quantity: string;
    promotion: string;
  }[];
}

export interface ColumnMapping {
  size: string | null;
  brand: string | null;
  model: string | null;
  load_index: string | null;
  price: string | null;
  dot1: string | null;
  qty1: string | null;
  promo1: string | null;
  dot2: string | null;
  qty2: string | null;
  promo2: string | null;
  dot3: string | null;
  qty3: string | null;
  promo3: string | null;
  dot4: string | null;
  qty4: string | null;
  promo4: string | null;
}

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  suggestedMapping: ColumnMapping;
}

// Common column name patterns for auto-detection
const columnPatterns = {
  size: ["size", "ขนาด", "ไซส์", "ไซด์"],
  brand: ["brand", "ยี่ห้อ", "ยี่ห้อยาง", "แบรนด์"],
  model: ["model", "รุ่น", "โมเดล"],
  load_index: ["load", "load_index", "load index", "โหลด"],
  price: ["price", "ราคา"],
  dot1: ["dot 1", "dot1", "dot_1", "dot"],
  qty1: ["จำนวน 1", "qty 1", "qty1", "จำนวน", "quantity 1"],
  promo1: ["โปรโมชั่น 1", "promo 1", "promo1", "โปรโมชั่น", "promotion 1"],
  dot2: ["dot 2", "dot2", "dot_2"],
  qty2: ["จำนวน 2", "qty 2", "qty2", "quantity 2"],
  promo2: ["โปรโมชั่น 2", "promo 2", "promo2", "promotion 2"],
  dot3: ["dot 3", "dot3", "dot_3"],
  qty3: ["จำนวน 3", "qty 3", "qty3", "quantity 3"],
  promo3: ["โปรโมชั่น 3", "promo 3", "promo3", "promotion 3"],
  dot4: ["dot 4", "dot4", "dot_4"],
  qty4: ["จำนวน 4", "qty 4", "qty4", "quantity 4"],
  promo4: ["โปรโมชั่น 4", "promo 4", "promo4", "promotion 4"],
};

function findMatchingColumn(
  headers: string[],
  patterns: string[]
): string | null {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
  for (const pattern of patterns) {
    const idx = normalizedHeaders.findIndex(
      (h) => h.includes(pattern.toLowerCase())
    );
    if (idx !== -1) {
      return headers[idx];
    }
  }
  return null;
}

export function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          defval: "",
        }) as string[][];

        if (jsonData.length < 2) {
          reject(new Error("File must have at least a header row and one data row"));
          return;
        }

        const headers = jsonData[0].map((h) => String(h).trim());
        const rows = jsonData.slice(1).map((row) => {
          const obj: Record<string, string> = {};
          headers.forEach((header, idx) => {
            obj[header] = String(row[idx] || "").trim();
          });
          return obj;
        });

        // Filter out empty rows
        const validRows = rows.filter((row) =>
          Object.values(row).some((v) => v !== "")
        );

        // Auto-detect column mapping
        const suggestedMapping: ColumnMapping = {
          size: findMatchingColumn(headers, columnPatterns.size),
          brand: findMatchingColumn(headers, columnPatterns.brand),
          model: findMatchingColumn(headers, columnPatterns.model),
          load_index: findMatchingColumn(headers, columnPatterns.load_index),
          price: findMatchingColumn(headers, columnPatterns.price),
          dot1: findMatchingColumn(headers, columnPatterns.dot1),
          qty1: findMatchingColumn(headers, columnPatterns.qty1),
          promo1: findMatchingColumn(headers, columnPatterns.promo1),
          dot2: findMatchingColumn(headers, columnPatterns.dot2),
          qty2: findMatchingColumn(headers, columnPatterns.qty2),
          promo2: findMatchingColumn(headers, columnPatterns.promo2),
          dot3: findMatchingColumn(headers, columnPatterns.dot3),
          qty3: findMatchingColumn(headers, columnPatterns.qty3),
          promo3: findMatchingColumn(headers, columnPatterns.promo3),
          dot4: findMatchingColumn(headers, columnPatterns.dot4),
          qty4: findMatchingColumn(headers, columnPatterns.qty4),
          promo4: findMatchingColumn(headers, columnPatterns.promo4),
        };

        resolve({
          headers,
          rows: validRows,
          suggestedMapping,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsBinaryString(file);
  });
}

export function applyMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): ParsedTireRow[] {
  return rows.map((row) => {
    const dots: ParsedTireRow["dots"] = [];

    // Process up to 4 DOT codes
    for (let i = 1; i <= 4; i++) {
      const dotKey = `dot${i}` as keyof ColumnMapping;
      const qtyKey = `qty${i}` as keyof ColumnMapping;
      const promoKey = `promo${i}` as keyof ColumnMapping;

      const dotCol = mapping[dotKey];
      const qtyCol = mapping[qtyKey];
      const promoCol = mapping[promoKey];

      const dotCode = dotCol ? row[dotCol] : "";
      const quantity = qtyCol ? row[qtyCol] : "0";
      const promotion = promoCol ? row[promoCol] : "";

      if (dotCode) {
        dots.push({
          dot_code: dotCode,
          quantity: String(parseInt(quantity) || 0),
          promotion,
        });
      }
    }

    // Parse load index - may contain speed rating
    let loadIndex = mapping.load_index ? row[mapping.load_index] : "";
    let speedRating = "";

    // Try to extract speed rating from load index (e.g., "91V" -> load=91, speed=V)
    const loadMatch = loadIndex.match(/^(\d+)([A-Z])$/i);
    if (loadMatch) {
      loadIndex = loadMatch[1];
      speedRating = loadMatch[2].toUpperCase();
    }

    return {
      size: mapping.size ? row[mapping.size] : "",
      brand: mapping.brand ? row[mapping.brand] : "",
      model: mapping.model ? row[mapping.model] : "",
      load_index: loadIndex,
      speed_rating: speedRating,
      price: mapping.price ? row[mapping.price] : "",
      dots: dots.length > 0 ? dots : [{ dot_code: "", quantity: "0", promotion: "" }],
    };
  });
}
