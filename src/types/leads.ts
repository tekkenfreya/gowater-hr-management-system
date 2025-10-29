export type LeadCategory = 'factory' | 'school' | 'cooperative' | 'dti' | 'rotary' | 'event';
export type LeadType = 'company' | 'individual';
export type ProductType = 'both' | 'vending' | 'dispenser';
export type ActivityType = 'call' | 'email' | 'meeting' | 'site-visit' | 'follow-up' | 'remark' | 'other';

export interface Lead {
  id: string;
  category: LeadCategory;
  lead_type: LeadType;
  company_name: string;
  location: string | null;
  contact_person: string | null;
  mobile_number: string | null;
  email_address: string | null;
  lead_source: string | null;
  type_of_business: string | null;
  number_of_employees: string | null;
  product: ProductType | null;
  status: string;
  remarks: string | null;
  next_action: string | null;
  assigned_to: string | null; // Employee name
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  employee_name: string;
  activity_type: ActivityType;
  activity_description: string;
  start_date: string | null;
  end_date: string | null;
  status_update: string | null;
  created_at: string;
}

export interface LeadWithActivities extends Lead {
  activities: LeadActivity[];
  activity_count: number;
  last_activity?: LeadActivity;
}

export interface LeadFormData {
  category: LeadCategory;
  lead_type?: LeadType;
  company_name: string;
  location?: string;
  contact_person?: string;
  mobile_number?: string;
  email_address?: string;
  lead_source?: string;
  type_of_business?: string;
  number_of_employees?: string;
  product?: ProductType;
  status?: string;
  remarks?: string;
  next_action?: string;
  assigned_to?: string;
}

export interface ActivityFormData {
  activity_type: ActivityType;
  activity_description: string;
  start_date?: string;
  end_date?: string;
  status_update?: string;
}

export interface DashboardStats {
  total_leads: number;
  active_leads: number;
  total_activities: number;
  activities_today: number;
  closed_deals: number;
  by_category: {
    category: LeadCategory;
    count: number;
    percentage: number;
  }[];
  by_status: {
    status: string;
    count: number;
  }[];
  employee_activities: {
    employee_name: string;
    total_activities: number;
    calls: number;
    emails: number;
    meetings: number;
    site_visits: number;
    leads_assigned: number;
  }[];
  recent_activities: (LeadActivity & { company_name: string; category: LeadCategory })[];
  stale_leads: LeadWithActivities[];
}
