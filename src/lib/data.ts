export interface Guest {
  id: string;
  name: string;
  time: string;
  major: string;
  method: 'Self Check-in' | 'Manual Input' | 'Spreadsheet';
  registrationNumber?: string;
  paymentStatus?: string;
  verifiedBy?: string;
  nominal?: string;
  contact?: string;
}

export const initialGuests: Guest[] = [
  { id: '1', name: 'Adrian Arifin', time: '10:45:22 AM', major: 'Computer Science', method: 'Self Check-in' },
  { id: '2', name: 'Budi Pratama', time: '10:42:15 AM', major: 'Visual Communication Design', method: 'Manual Input' },
  { id: '3', name: 'Siti Lestari', time: '10:38:04 AM', major: 'Information Systems', method: 'Self Check-in' },
  { id: '4', name: 'Dewi Kusuma', time: '10:35:48 AM', major: 'Computer Science', method: 'Manual Input' },
];
