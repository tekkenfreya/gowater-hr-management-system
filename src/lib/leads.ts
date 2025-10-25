import { getDb } from './supabase';
import { Lead, LeadActivity, LeadFormData, ActivityFormData, LeadWithActivities, DashboardStats, LeadCategory } from '@/types/leads';
import { randomUUID } from 'crypto';

export class LeadService {
  private db = getDb();

  // ============ LEAD MANAGEMENT ============

  async createLead(employeeName: string, leadData: LeadFormData): Promise<Lead> {
    const now = new Date().toISOString();
    const lead: Lead = {
      id: randomUUID(),
      category: leadData.category,
      company_name: leadData.company_name,
      location: leadData.location || null,
      contact_person: leadData.contact_person || null,
      mobile_number: leadData.mobile_number || null,
      email_address: leadData.email_address || null,
      lead_source: leadData.lead_source || null,
      type_of_business: leadData.type_of_business || null,
      number_of_employees: leadData.number_of_employees || null,
      product: leadData.product || null,
      status: leadData.status || 'not-started',
      remarks: leadData.remarks || null,
      assigned_to: leadData.assigned_to || employeeName,
      created_by: employeeName,
      created_at: now,
      updated_at: now,
    };

    await this.db.insert('leads', lead as unknown as Record<string, unknown>);
    return lead;
  }

  async getLeadsByCategory(category: LeadCategory): Promise<Lead[]> {
    const leads = await this.db.all('leads', { category }, 'created_at');
    return (leads || []) as Lead[];
  }

  async getAllLeads(): Promise<Lead[]> {
    const leads = await this.db.all('leads', {}, 'created_at');
    return (leads || []) as Lead[];
  }

  async getLeadById(leadId: string): Promise<Lead | null> {
    const lead = await this.db.get('leads', { id: leadId });
    return lead as Lead | null;
  }

  async updateLead(leadId: string, updates: Partial<LeadFormData>): Promise<void> {
    const updateData: Record<string, string | number | null> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.company_name !== undefined) updateData.company_name = updates.company_name;
    if (updates.location !== undefined) updateData.location = updates.location || null;
    if (updates.contact_person !== undefined) updateData.contact_person = updates.contact_person || null;
    if (updates.mobile_number !== undefined) updateData.mobile_number = updates.mobile_number || null;
    if (updates.email_address !== undefined) updateData.email_address = updates.email_address || null;
    if (updates.lead_source !== undefined) updateData.lead_source = updates.lead_source || null;
    if (updates.type_of_business !== undefined) updateData.type_of_business = updates.type_of_business || null;
    if (updates.number_of_employees !== undefined) updateData.number_of_employees = updates.number_of_employees || null;
    if (updates.product !== undefined) updateData.product = updates.product || null;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.remarks !== undefined) updateData.remarks = updates.remarks || null;
    if (updates.assigned_to !== undefined) updateData.assigned_to = updates.assigned_to || null;

    await this.db.update('leads', updateData, { id: leadId });
  }

  async deleteLead(leadId: string): Promise<void> {
    await this.db.delete('leads', { id: leadId });
  }

  // ============ ACTIVITY LOGGING ============

  async logActivity(leadId: string, employeeName: string, activityData: ActivityFormData): Promise<LeadActivity> {
    const activity: LeadActivity = {
      id: randomUUID(),
      lead_id: leadId,
      employee_name: employeeName,
      activity_type: activityData.activity_type,
      activity_description: activityData.activity_description,
      start_date: activityData.start_date || null,
      end_date: activityData.end_date || null,
      status_update: activityData.status_update || null,
      created_at: new Date().toISOString(),
    };

    await this.db.insert('lead_activities', activity as unknown as Record<string, unknown>);

    // Update lead's updated_at timestamp
    await this.db.update('leads', { updated_at: new Date().toISOString() }, { id: leadId });

    // If status update is provided, update lead status
    if (activityData.status_update) {
      await this.db.update('leads', { status: activityData.status_update }, { id: leadId });
    }

    return activity;
  }

  async getActivitiesForLead(leadId: string): Promise<LeadActivity[]> {
    const activities = await this.db.all('lead_activities', { lead_id: leadId }, 'created_at');
    return (activities || []) as LeadActivity[];
  }

  async getAllActivities(): Promise<LeadActivity[]> {
    const activities = await this.db.all('lead_activities', {}, 'created_at');
    return (activities || []) as LeadActivity[];
  }

  async deleteActivity(activityId: string): Promise<void> {
    await this.db.delete('lead_activities', { id: activityId });
  }

  // ============ COMBINED QUERIES ============

  async getLeadsWithActivities(category?: LeadCategory): Promise<LeadWithActivities[]> {
    const leads = category
      ? await this.getLeadsByCategory(category)
      : await this.getAllLeads();

    const leadsWithActivities: LeadWithActivities[] = await Promise.all(
      leads.map(async (lead) => {
        const activities = await this.getActivitiesForLead(lead.id);
        const sortedActivities = activities.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return {
          ...lead,
          activities: sortedActivities,
          activity_count: activities.length,
          last_activity: sortedActivities[0] || undefined,
        };
      })
    );

    return leadsWithActivities;
  }

  // ============ DASHBOARD STATS ============

  async getDashboardStats(): Promise<DashboardStats> {
    const leads = await this.getAllLeads();
    const activities = await this.getAllActivities();

    // Total and active leads
    const total_leads = leads.length;
    const active_leads = leads.filter(l => l.status !== 'closed-deal').length;
    const closed_deals = leads.filter(l => l.status === 'closed-deal').length;

    // Activity stats
    const total_activities = activities.length;
    const today = new Date().toISOString().split('T')[0];
    const activities_today = activities.filter(a =>
      a.created_at.split('T')[0] === today
    ).length;

    // Leads by category
    const categoryCounts: Record<LeadCategory, number> = {
      factory: 0,
      school: 0,
      cooperative: 0,
      dti: 0,
      rotary: 0,
      event: 0,
    };

    leads.forEach(lead => {
      categoryCounts[lead.category] = (categoryCounts[lead.category] || 0) + 1;
    });

    const by_category = Object.entries(categoryCounts).map(([category, count]) => ({
      category: category as LeadCategory,
      count,
      percentage: total_leads > 0 ? Math.round((count / total_leads) * 100) : 0,
    })).filter(c => c.count > 0);

    // Leads by status
    const statusCounts: Record<string, number> = {};
    leads.forEach(lead => {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    });

    const by_status = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // Employee activity stats
    const employeeStats: Record<string, {
      total_activities: number;
      calls: number;
      emails: number;
      meetings: number;
      site_visits: number;
      leads_assigned: number;
    }> = {};

    activities.forEach(activity => {
      if (!employeeStats[activity.employee_name]) {
        employeeStats[activity.employee_name] = {
          total_activities: 0,
          calls: 0,
          emails: 0,
          meetings: 0,
          site_visits: 0,
          leads_assigned: leads.filter(l => l.assigned_to === activity.employee_name).length,
        };
      }

      const stats = employeeStats[activity.employee_name];
      stats.total_activities += 1;

      if (activity.activity_type === 'call') stats.calls += 1;
      else if (activity.activity_type === 'email') stats.emails += 1;
      else if (activity.activity_type === 'meeting') stats.meetings += 1;
      else if (activity.activity_type === 'site-visit') stats.site_visits += 1;
    });

    const employee_activities = Object.entries(employeeStats)
      .map(([employee_name, stats]) => ({
        employee_name,
        ...stats,
      }))
      .sort((a, b) => b.total_activities - a.total_activities);

    // Recent activities with lead info
    const recent_activities = await Promise.all(
      activities.slice(0, 20).map(async (activity) => {
        const lead = await this.getLeadById(activity.lead_id);
        return {
          ...activity,
          company_name: lead?.company_name || 'Unknown',
          category: lead?.category || 'factory' as LeadCategory,
        };
      })
    );

    // Stale leads (no activity in 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leadsWithActivities = await this.getLeadsWithActivities();
    const stale_leads = leadsWithActivities.filter(lead => {
      if (lead.status === 'closed-deal') return false;
      if (lead.activity_count === 0) return true;
      if (!lead.last_activity) return true;

      const lastActivityDate = new Date(lead.last_activity.created_at);
      return lastActivityDate < thirtyDaysAgo;
    });

    return {
      total_leads,
      active_leads,
      total_activities,
      activities_today,
      closed_deals,
      by_category,
      by_status,
      employee_activities,
      recent_activities,
      stale_leads,
    };
  }
}

export function getLeadService(): LeadService {
  return new LeadService();
}
