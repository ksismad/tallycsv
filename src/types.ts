export interface AccountDetails {
  name: string;
  jointHolder: string;
  address1: string;
  address2: string;
  address3: string;
  address4: string;
  customerId: string;
  ifsc: string;
  micr: string;
  nomineeReg: string;
  nomineeName: string;
  mobile: string;
  email: string;
  pan: string;
  ckyc: string;
  accountNo: string;
  fromDate: string;
  toDate: string;
}

export interface Transaction {
  date: string; // DD-MM-YYYY format required by Axis
  chqNo: string;
  particulars: string;
  dr: string;
  cr: string;
  bal: string;
  sol: string;
}
