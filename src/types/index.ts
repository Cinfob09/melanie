export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'user';
  payment_status: 'active' | 'inactive' | 'suspended' | 'unpaid' | 'overdue';
  subscription_status: 'basic' | 'pro' | 'enterprise';
  created_at: string;
  updated_at: string;
}

export interface Passkey {
  id: string;
  user_id: string;
  name: string;
  credential_id: string;
  public_key: string;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  contactPersonName: string;
  contactPersonPhone: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom';
  customFrequencyDays?: number;
  createdAt: string;
  notes?: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  service: string;
  notes: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  price?: number;
}

export interface Service {
  id: string;
  name: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  clientId: string;
  clientName: string;
  type: 'monthly_reminder';
  message: string;
  lastAppointment: string;
  createdAt: string;
  read: boolean;
  isFirstAppointmentReminder: boolean;
}

export interface ClientListProps {
  clients: Client[];
  appointments: Appointment[];
  onAddClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  onUpdateClient: (id: string, client: Partial<Client>) => void;
  onDeleteClient: (id: string) => void;
}
