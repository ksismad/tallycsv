import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, Settings, CheckCircle, Download, ArrowRight, Loader2 } from 'lucide-react';
import { AccountDetails, Transaction } from './types';
import { detectCSVFormat, CSVMapping } from './services/geminiService';
import { parseTransactions } from './utils/csvParser';
import { generateAxisCSV } from './utils/csvGenerator';

const defaultAccountDetails: AccountDetails = {
  name: 'JOHN DOE',
  jointHolder: '-',
  address1: '123 MAIN STREET',
  address2: 'APT 4B',
  address3: 'METROPOLIS-10001',
  address4: 'STATE-COUNTRY',
  customerId: '123456789',
  ifsc: 'BANK0001234',
  micr: '123456789',
  nomineeReg: 'Y',
  nomineeName: 'JANE DOE',
  mobile: 'XXXXXX1234',
  email: 'JOHN.DOE@EXAMPLE.COM',
  pan: 'ABCDE1234F',
  ckyc: 'XXXXXXXXXX1234',
  accountNo: '123456789012345',
  fromDate: '01-01-2024',
  toDate: '31-01-2024'
};

export default function App() {
  const [step, setStep] = useState<number>(1);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [accountDetails, setAccountDetails] = useState<AccountDetails>(defaultAccountDetails);
  const [mapping, setMapping] = useState<CSVMapping | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        setCsvData(results.data as string[][]);
        setStep(2);
      },
      error: (error) => {
        setError(`Failed to parse CSV: ${error.message}`);
      }
    });
  };

  const handleDetectFormat = async () => {
    setIsDetecting(true);
    setError(null);
    try {
      // Get first 20 rows to send to Gemini
      const sample = Papa.unparse(csvData.slice(0, 20));
      const detectedMapping = await detectCSVFormat(sample);
      setMapping(detectedMapping);
      setStep(3);
    } catch (err: any) {
      if (err.message.includes("GEMINI_API_KEY")) {
        // Fallback to manual mapping if API key is missing
        setMapping({
          headerRowIndex: 0,
          dateColumnIndex: 0,
          dateFormat: 'dd/MM/yyyy',
          descriptionColumnIndex: 1,
          debitColumnIndex: 2,
          creditColumnIndex: 3,
          balanceColumnIndex: 4,
          chequeNoColumnIndex: -1,
          isSingleAmountColumn: false,
          amountColumnIndex: -1,
          typeColumnIndex: -1
        });
        setError("Gemini API key is missing. Falling back to manual mapping. Please configure the columns below.");
        setStep(3);
      } else {
        setError(`Failed to detect format: ${err.message}`);
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const handleGenerate = () => {
    if (!mapping) return;
    try {
      const parsedTransactions = parseTransactions(csvData, mapping);
      setTransactions(parsedTransactions);
      setStep(4);
    } catch (err: any) {
      setError(`Failed to process transactions: ${err.message}`);
    }
  };

  const handleDownload = () => {
    const csvString = generateAxisCSV(transactions, accountDetails);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Axis_Statement_${accountDetails.accountNo}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Axis CSV Converter</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stepper */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gray-200 -z-10"></div>
            {[
              { num: 1, label: 'Upload CSV', icon: Upload },
              { num: 2, label: 'Account Details', icon: Settings },
              { num: 3, label: 'Map Columns', icon: CheckCircle },
              { num: 4, label: 'Download', icon: Download }
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center bg-gray-50 px-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= s.num ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <span className={`mt-2 text-sm font-medium ${step >= s.num ? 'text-indigo-900' : 'text-gray-500'}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {step === 1 && (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="w-10 h-10 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Upload Bank Statement</h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Upload any bank's CSV statement. Our AI will automatically detect the format and map it to the Axis Bank structure.
              </p>
              <label className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer transition-colors shadow-sm">
                <span>Select CSV File</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="p-8">
              <h2 className="text-2xl font-semibold mb-6">Account Details</h2>
              <p className="text-gray-500 mb-8">These details will be printed at the top of the generated Axis Bank statement.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(accountDetails).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setAccountDetails({ ...accountDetails, [key]: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-10 flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setMapping({
                      headerRowIndex: 0,
                      dateColumnIndex: 0,
                      dateFormat: 'dd/MM/yyyy',
                      descriptionColumnIndex: 1,
                      debitColumnIndex: 2,
                      creditColumnIndex: 3,
                      balanceColumnIndex: 4,
                      chequeNoColumnIndex: -1,
                      isSingleAmountColumn: false,
                      amountColumnIndex: -1,
                      typeColumnIndex: -1
                    });
                    setStep(3);
                  }}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Map Manually
                </button>
                <button
                  onClick={handleDetectFormat}
                  disabled={isDetecting}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 transition-colors shadow-sm"
                >
                  {isDetecting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Detecting Format with AI...
                    </>
                  ) : (
                    <>
                      Auto Detect with AI
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 3 && mapping && (
            <div className="p-8">
              <h2 className="text-2xl font-semibold mb-6">Verify Column Mapping</h2>
              <p className="text-gray-500 mb-8">Please verify the column indices (0-based) for your CSV file. If you used AI detection, check if the values are correct.</p>
              
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Header Row Index (0-based)</label>
                    <input type="number" value={mapping.headerRowIndex} onChange={(e) => setMapping({...mapping, headerRowIndex: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                    <input type="text" value={mapping.dateFormat} onChange={(e) => setMapping({...mapping, dateFormat: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Column Index</label>
                    <input type="number" value={mapping.dateColumnIndex} onChange={(e) => setMapping({...mapping, dateColumnIndex: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description Column Index</label>
                    <input type="number" value={mapping.descriptionColumnIndex} onChange={(e) => setMapping({...mapping, descriptionColumnIndex: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cheque No Column Index</label>
                    <input type="number" value={mapping.chequeNoColumnIndex} onChange={(e) => setMapping({...mapping, chequeNoColumnIndex: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Balance Column Index</label>
                    <input type="number" value={mapping.balanceColumnIndex} onChange={(e) => setMapping({...mapping, balanceColumnIndex: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  
                  <div className="col-span-full border-t border-gray-200 pt-6 mt-2">
                    <label className="flex items-center space-x-3 mb-4">
                      <input type="checkbox" checked={mapping.isSingleAmountColumn} onChange={(e) => setMapping({...mapping, isSingleAmountColumn: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                      <span className="text-sm font-medium text-gray-900">Uses a single Amount column (instead of separate Dr/Cr)</span>
                    </label>
                  </div>

                  {mapping.isSingleAmountColumn ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount Column Index</label>
                        <input type="number" value={mapping.amountColumnIndex} onChange={(e) => setMapping({...mapping, amountColumnIndex: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type (Dr/Cr) Column Index (-1 if negative amounts used)</label>
                        <input type="number" value={mapping.typeColumnIndex} onChange={(e) => setMapping({...mapping, typeColumnIndex: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Debit Column Index</label>
                        <input type="number" value={mapping.debitColumnIndex} onChange={(e) => setMapping({...mapping, debitColumnIndex: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Credit Column Index</label>
                        <input type="number" value={mapping.creditColumnIndex} onChange={(e) => setMapping({...mapping, creditColumnIndex: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleGenerate}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Generate Axis Format
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Conversion Complete!</h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Successfully processed {transactions.length} transactions. Your file is ready to download in the exact Axis Bank format.
              </p>
              
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden mb-8 text-left max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Particulars</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.slice(0, 50).map((t, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={t.particulars}>{t.particulars}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">{t.dr}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">{t.cr}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{t.bal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.length > 50 && (
                  <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 border-t border-gray-200">
                    Showing first 50 of {transactions.length} transactions
                  </div>
                )}
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setStep(1);
                    setCsvData([]);
                    setMapping(null);
                    setTransactions([]);
                  }}
                  className="px-6 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Convert Another
                </button>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download CSV
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
