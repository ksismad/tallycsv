import { format, parse } from 'date-fns';
import { CSVMapping } from '../services/geminiService';
import { Transaction } from '../types';

export function parseTransactions(
  data: string[][],
  mapping: CSVMapping
): Transaction[] {
  const transactions: Transaction[] = [];

  // Start from the row after the header
  const startIndex = mapping.headerRowIndex + 1;

  for (let i = startIndex; i < data.length; i++) {
    const row = data[i];

    // Skip empty rows
    if (!row || row.length === 0 || row.every(cell => !cell || cell.trim() === '')) {
      continue;
    }

    try {
      let dateStr = row[mapping.dateColumnIndex]?.trim() || '';
      if (!dateStr) continue;

      // Try to parse and format the date to DD-MM-YYYY
      let formattedDate = dateStr;
      if (mapping.dateFormat) {
        try {
          const parsedDate = parse(dateStr, mapping.dateFormat, new Date());
          if (!isNaN(parsedDate.getTime())) {
            formattedDate = format(parsedDate, 'dd-MM-yyyy');
          }
        } catch (e) {
          console.warn('Failed to parse date:', dateStr, e);
        }
      }

      const particulars = row[mapping.descriptionColumnIndex]?.trim() || '';
      const chqNo = mapping.chequeNoColumnIndex >= 0 ? row[mapping.chequeNoColumnIndex]?.trim() || '-' : '-';
      let dr = '';
      let cr = '';

      if (mapping.isSingleAmountColumn) {
        const amountStr = row[mapping.amountColumnIndex]?.trim() || '';
        const amount = parseFloat(amountStr.replace(/,/g, ''));
        
        if (!isNaN(amount)) {
          if (mapping.typeColumnIndex >= 0) {
            const typeStr = row[mapping.typeColumnIndex]?.trim().toUpperCase() || '';
            if (typeStr === 'DR' || typeStr === 'DEBIT' || typeStr === 'WITHDRAWAL') {
              dr = Math.abs(amount).toFixed(2);
            } else {
              cr = Math.abs(amount).toFixed(2);
            }
          } else {
            if (amount < 0) {
              dr = Math.abs(amount).toFixed(2);
            } else {
              cr = Math.abs(amount).toFixed(2);
            }
          }
        }
      } else {
        const drStr = mapping.debitColumnIndex >= 0 ? row[mapping.debitColumnIndex]?.trim() || '' : '';
        const crStr = mapping.creditColumnIndex >= 0 ? row[mapping.creditColumnIndex]?.trim() || '' : '';
        
        const parsedDr = parseFloat(drStr.replace(/,/g, ''));
        const parsedCr = parseFloat(crStr.replace(/,/g, ''));

        if (!isNaN(parsedDr) && parsedDr > 0) dr = parsedDr.toFixed(2);
        if (!isNaN(parsedCr) && parsedCr > 0) cr = parsedCr.toFixed(2);
      }

      const balStr = mapping.balanceColumnIndex >= 0 ? row[mapping.balanceColumnIndex]?.trim() || '' : '';
      const parsedBal = parseFloat(balStr.replace(/,/g, ''));
      const bal = !isNaN(parsedBal) ? parsedBal.toFixed(2) : balStr;

      transactions.push({
        date: formattedDate,
        chqNo,
        particulars,
        dr,
        cr,
        bal,
        sol: '100' // Default SOL ID
      });
    } catch (e) {
      console.error('Error parsing row', i, row, e);
    }
  }

  return transactions;
}
