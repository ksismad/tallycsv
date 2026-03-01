import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAiClient() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in your deployment settings (Vercel/Netlify/GitHub).");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export interface CSVMapping {
  headerRowIndex: number;
  dateColumnIndex: number;
  dateFormat: string;
  descriptionColumnIndex: number;
  debitColumnIndex: number;
  creditColumnIndex: number;
  balanceColumnIndex: number;
  chequeNoColumnIndex: number;
  isSingleAmountColumn: boolean;
  amountColumnIndex: number;
  typeColumnIndex: number;
}

export async function detectCSVFormat(csvSample: string): Promise<CSVMapping> {
  const client = getAiClient();
  const prompt = `
I have a CSV file from a bank statement. I need to map its columns to a standard format.
Here are the first 20 rows of the CSV:
${csvSample}

Please analyze the data and identify the column indices (0-based) for the following fields:
- Date
- Description / Particulars / Narration
- Debit / Withdrawal amount
- Credit / Deposit amount
- Balance
- Cheque No / Ref No

Also, identify:
- The date format used in the Date column (e.g., "dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "dd-MM-yyyy"). Use date-fns format tokens.
- If the bank uses a single "Amount" column instead of separate Debit/Credit columns.
- If it uses a single Amount column, which column indicates the transaction type (Dr/Cr), or if negative amounts indicate debits.
- The index of the header row (the row containing column names like "Date", "Description", etc.).

Return the result as a JSON object. If a field is not found, return -1.
`;

  const response = await client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          headerRowIndex: { type: Type.INTEGER, description: "The 0-based index of the row containing column headers." },
          dateColumnIndex: { type: Type.INTEGER },
          dateFormat: { type: Type.STRING, description: "Date format string compatible with date-fns, e.g. dd/MM/yyyy, dd-MM-yyyy, yyyy-MM-dd" },
          descriptionColumnIndex: { type: Type.INTEGER },
          debitColumnIndex: { type: Type.INTEGER },
          creditColumnIndex: { type: Type.INTEGER },
          balanceColumnIndex: { type: Type.INTEGER },
          chequeNoColumnIndex: { type: Type.INTEGER },
          isSingleAmountColumn: { type: Type.BOOLEAN },
          amountColumnIndex: { type: Type.INTEGER },
          typeColumnIndex: { type: Type.INTEGER, description: "Index of column indicating Dr/Cr if single amount column is used. -1 if negative amounts are used instead." }
        },
        required: [
          "headerRowIndex",
          "dateColumnIndex",
          "dateFormat",
          "descriptionColumnIndex",
          "debitColumnIndex",
          "creditColumnIndex",
          "balanceColumnIndex",
          "chequeNoColumnIndex",
          "isSingleAmountColumn",
          "amountColumnIndex",
          "typeColumnIndex"
        ]
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("Failed to generate mapping from Gemini.");
  }

  return JSON.parse(text) as CSVMapping;
}
