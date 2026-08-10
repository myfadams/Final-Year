import { supabase } from "./supabaseConfig";

export interface OcrExtractedData {
  fullName: string | null;
  ReferenceNumber: string | null;
  studentID: string | null;
  dateOfExpiry: Date | null;
  course: string | null;
  rawText: string;
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/**
 * Converts a raw date string (e.g. "NOVEMBER, 2026", "11/2026", "2026-11-20")
 * into a valid JavaScript Date object.
 */
export const parseToJsDate = (dateStr: string | null): Date | null => {
  if (!dateStr) return null;

  const cleanStr = dateStr.trim();
  if (!cleanStr) return null;

  // Normalize commas and extra spaces (e.g. "NOVEMBER, 2026" -> "NOVEMBER 2026")
  const normalized = cleanStr.replace(/,/g, " ").replace(/\s+/g, " ").trim();

  // 1. Try standard JS Date constructor
  const directDate = new Date(normalized);
  if (!isNaN(directDate.getTime())) {
    return directDate;
  }

  // 2. Match Month Name + Year (e.g. "NOVEMBER 2026" or "NOV 2026")
  const monthYearMatch = normalized.match(/^([a-z]+)\s+(\d{4})$/i);
  if (monthYearMatch) {
    const monthName = monthYearMatch[1].toLowerCase();
    const year = parseInt(monthYearMatch[2], 10);
    if (MONTH_MAP[monthName] !== undefined) {
      return new Date(year, MONTH_MAP[monthName], 1);
    }
  }

  // 3. Match Year + Month Name (e.g. "2026 NOVEMBER")
  const yearMonthMatch = normalized.match(/^(\d{4})\s+([a-z]+)$/i);
  if (yearMonthMatch) {
    const year = parseInt(yearMonthMatch[1], 10);
    const monthName = yearMonthMatch[2].toLowerCase();
    if (MONTH_MAP[monthName] !== undefined) {
      return new Date(year, MONTH_MAP[monthName], 1);
    }
  }

  // 4. Match MM/YYYY or MM/YY or YYYY/MM (e.g. "11/2026" or "11/26")
  const slashMatch = normalized.match(/^(\d{1,2})[\/\-](\d{2,4})$/);
  if (slashMatch) {
    const m = parseInt(slashMatch[1], 10);
    let y = parseInt(slashMatch[2], 10);
    if (y < 100) y += 2000;
    if (m >= 1 && m <= 12) {
      return new Date(y, m - 1, 1);
    }
  }

  // 5. Match just 4-digit Year (e.g. "2026")
  const yearMatch = normalized.match(/^(\d{4})$/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[1], 10), 0, 1);
  }

  return null;
};

/**
 * Parses raw text extracted from a Student ID card image
 * to identify key details like Student/Ref No, Exam/Index No, Expiry/Validity, and Course.
 */
export const parseStudentIdText = (rawText: string): OcrExtractedData => {
  const result: OcrExtractedData = {
    fullName: null,
    ReferenceNumber: null,
    studentID: null,
    dateOfExpiry: null,
    course: null,
    rawText: rawText,
  };

  if (!rawText) return result;

  let rawDateStr: string | null = null;

  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Extract Full Name: 2 lines following the line containing "studen"
  if (!result.fullName) {
    let studentIndex = lines.findIndex(
      (line) => /studen/i.test(line) && !/(?:no|num|number|#|\d{5,})/i.test(line)
    );
    if (studentIndex === -1) {
      studentIndex = lines.findIndex((line) => /studen/i.test(line));
    }

    if (studentIndex !== -1) {
      const nameParts: string[] = [];
      for (
        let i = studentIndex + 1;
        i < lines.length && nameParts.length < 2;
        i++
      ) {
        const candidate = lines[i].trim();
        // Skip lines that look like label fields, pure numbers, or dates
        const isOtherField =
          /(?:ref|student\s*no|exam|index|validity|expiry|exp|course|b\.?sc|b\.?a|bachelor|diploma|m\.?sc|\d{5,})/i.test(
            candidate
          );
        if (!isOtherField && candidate.length > 0) {
          nameParts.push(candidate);
        } else if (nameParts.length > 0) {
          break;
        }
      }
      if (nameParts.length > 0) {
        result.fullName = nameParts.join(" ").trim();
      }
    }
  }

  for (const line of lines) {
    // Reference Number / Student No (e.g. "Ref No: 20789123" or "Student No: 20789123")
    if (!result.ReferenceNumber) {
      const refMatch = line.match(
        /(?:ref(?:erence)?|student)\s*(?:no|num|number|#)?[:\s.]*(\d{7,10})/i
      );
      if (refMatch) {
        result.ReferenceNumber = refMatch[1];
      }
    }

    // Student ID / Exam No / Index No (e.g. "Exam No: 981234" or "Index No: 456789")
    if (!result.studentID) {
      const examMatch = line.match(
        /(?:exam|index|id)\s*(?:no|num|number|#)?[:\s.]*([A-Z0-9]{5,10})/i
      );
      if (examMatch) {
        result.studentID = examMatch[1];
      }
    }

    // Date of Expiry / Validity (e.g. "Validity: 2024/2025" or "Expiry: 08/2026")
    if (!rawDateStr) {
      const validMatch = line.match(
        /(?:validity|valid|expiry|exp)[:\s.]*([^\n]+)/i
      );
      if (validMatch) {
        rawDateStr = validMatch[1].trim();
      } else {
        const dateMatch = line.match(
          /\b(\d{4}\/\d{4}|\d{2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/
        );
        if (dateMatch) {
          rawDateStr = dateMatch[1];
        }
      }
    }

    // Course / Programme (e.g. "BSc Computer Engineering" or "Bachelor of Science...")
    if (!result.course) {
      const courseMatch = line.match(
        /\b(b\.?sc|b\.?a|bachelor|diploma|m\.?sc|eng|programme|course)[:\s.]*([^\n]+)/i
      );
      if (courseMatch) {
        result.course = courseMatch[0].trim();
      } else if (/\b(b\.?sc|b\.?a|bachelor)\b/i.test(line)) {
        result.course = line;
      }
    }
  }

  // Fallbacks if labeled patterns were not caught
  if (!result.ReferenceNumber) {
    const standaloneRef = rawText.match(/\b(2\d{7})\b/);
    if (standaloneRef) result.ReferenceNumber = standaloneRef[1];
  }

  if (!result.studentID) {
    const standaloneExam = rawText.match(/\b(\d{6,7})\b/);
    if (standaloneExam && standaloneExam[1] !== result.ReferenceNumber) {
      result.studentID = standaloneExam[1];
    }
  }

  if (rawDateStr) {
    // If date of expiry is a range like "NOVEMBER, 2022 - NOVEMBER, 2026",
    // extract only the end date (after the hyphen) unless it's a single ISO date (YYYY-MM-DD).
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDateStr)) {
      const parts = rawDateStr.split(/\s*[-–—]\s*/);
      if (parts.length > 1) {
        rawDateStr = parts[parts.length - 1].trim();
      }
    }
    result.dateOfExpiry = parseToJsDate(rawDateStr);
  }

  return result;
};

/**
 * Takes an uploaded image URL and sends it to OCR.space API for text extraction,
 * logging the structured OCR results to the console.
 */
export const processStudentIdOcr = async (
  imageUrl: string
): Promise<OcrExtractedData | null> => {
  console.log("----------------------------------------");
  console.log("📷 Starting OCR.space processing for uploaded image:");
  console.log("URL:", imageUrl);

  try {
    const apiKey = process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY || "helloworld";

    const formData = new FormData();
    formData.append("url", imageUrl);
    formData.append("apikey", apiKey);
    formData.append("isTable", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "2");

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.IsErroredOnProcessing) {
      console.error(
        "❌ OCR.space Error:",
        data.ErrorMessage || data.ErrorDetails
      );
      return null;
    }

    const parsedResults = data.ParsedResults;
    if (!parsedResults || parsedResults.length === 0) {
      console.warn("⚠️ OCR.space returned no parsed text results.");
      return null;
    }

    const rawText: string = parsedResults[0].ParsedText || "";

    const extracted = parseStudentIdText(rawText);

    console.log("\n📄 --- RAW EXTRACTED OCR TEXT ---");
    console.log(rawText);
    console.log("----------------------------------\n");

    console.log("✨ === OCR EXTRACTED RESULT OBJECT ===");
    console.log({
      fullName: extracted.fullName,
      ReferenceNumber: extracted.ReferenceNumber,
      studentID: extracted.studentID,
      dateOfExpiry: extracted.dateOfExpiry,
      course: extracted.course,
      rawText: rawText,
    });
    console.log("----------------------------------------\n");

    return extracted;
  } catch (error) {
    console.error("❌ Error requesting OCR.space API:", error);
    return null;
  }
};

