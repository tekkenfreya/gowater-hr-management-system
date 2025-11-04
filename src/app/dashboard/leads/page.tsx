'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Lead, LeadCategory, LeadWithActivities } from '@/types/leads';
import { logger } from '@/lib/logger';
import AddLeadModal from '@/components/leads/AddLeadModal';
import LeadTypeSelectionModal from '@/components/leads/LeadTypeSelectionModal';
import LogActivityModal from '@/components/leads/LogActivityModal';
import ViewActivitiesModal from '@/components/leads/ViewActivitiesModal';

const CATEGORIES: { value: LeadCategory; label: string }[] = [
  { value: 'lead', label: 'Leads' },
  { value: 'event', label: 'Events' },
];

const STATUS_COLORS: Record<string, string> = {
  'not-started': 'bg-zinc-100 text-zinc-700 border border-zinc-200',
  'contacted': 'bg-sky-100 text-sky-700 border border-sky-200',
  'quoted': 'bg-amber-100 text-amber-700 border border-amber-200',
  'negotiating': 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  'closed-deal': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'rejected': 'bg-rose-100 text-rose-700 border border-rose-200',
};

export default function LeadsPage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<LeadCategory>('lead');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategorySelection, setShowCategorySelection] = useState(false);
  const [selectedCategoryForAdd, setSelectedCategoryForAdd] = useState<LeadCategory | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showViewActivitiesModal, setShowViewActivitiesModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetchLeads();
  }, [selectedCategory]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leads?category=${selectedCategory}`);
      const data = await response.json();

      if (response.ok) {
        setLeads(data.leads);
      } else {
        logger.error('Failed to fetch leads', data.error);
      }
    } catch (error) {
      logger.error('Error fetching leads', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddFlow = () => {
    setShowCategorySelection(true);
  };

  const handleCategorySelection = (category: LeadCategory) => {
    setSelectedCategoryForAdd(category);
    setShowCategorySelection(false);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setSelectedCategoryForAdd(null);
  };

  const openActivityModal = (lead: Lead) => {
    setSelectedLead(lead);
    setShowActivityModal(true);
  };

  const openViewActivitiesModal = (lead: Lead) => {
    setSelectedLead(lead);
    setShowViewActivitiesModal(true);
  };

  const isLeadCategory = selectedCategory === 'lead';
  const isEventCategory = selectedCategory === 'event';
  const categoryLabel = CATEGORIES.find(c => c.value === selectedCategory)?.label || '';

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white shadow-sm border-r border-zinc-200 p-6 flex flex-col">
        <h2 className="text-xl font-bold text-zinc-900 mb-4">Categories</h2>

        {/* Add Item Button */}
        <button
          onClick={openAddFlow}
          className="w-full px-4 py-2.5 mb-6 bg-white border-2 border-dashed border-zinc-300 text-slate-700 rounded-lg font-medium hover:bg-emerald-50 hover:border-emerald-600 hover:text-emerald-700 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </button>

        {/* Category Navigation */}
        <nav className="flex-1 space-y-1.5">
          {CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition-all duration-200 relative ${
                selectedCategory === category.value
                  ? 'bg-slate-700 text-white shadow-sm before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:bg-emerald-500 before:rounded-r'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              {category.label}
            </button>
          ))}
        </nav>

        {/* Back to Dashboard Button */}
        <a
          href="/dashboard"
          className="w-full px-4 py-2.5 mt-4 text-zinc-600 hover:bg-zinc-100 border border-zinc-200 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </a>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8">
        <div className="max-w-full">
          {/* Category Title Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-zinc-900 mb-2">{categoryLabel}</h1>
              <p className="text-zinc-600">Manage and track your {categoryLabel.toLowerCase()}</p>
            </div>
            <button
              onClick={openAddFlow}
              className="px-6 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-800 hover:shadow-md transform hover:scale-[1.02] transition-all duration-200"
            >
              Add {isLeadCategory ? 'Lead' : 'Event'}
            </button>
          </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
              <p className="mt-4 text-zinc-600">Loading {categoryLabel.toLowerCase()}...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-zinc-500 text-lg">No {categoryLabel.toLowerCase()} found</p>
              <button
                onClick={openAddFlow}
                className="mt-4 px-6 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-all duration-200"
              >
                Add First {isLeadCategory ? 'Lead' : 'Event'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    {/* Dynamic headers based on category */}
                    {isLeadCategory && (
                      <>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Company Name</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Location</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Contact</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Mobile</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Lead Source</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Business Type</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Product</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Assigned To</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Next Action</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Actions</th>
                      </>
                    )}
                    {isEventCategory && (
                      <>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Event Name</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Venue</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Time</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Contact</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Mobile</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Attendees</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Product Needed</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Assigned To</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Next Action</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-zinc-50 transition-colors duration-150">
                      {/* Dynamic row data based on category */}
                      {isLeadCategory && (
                        <>
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-zinc-900 text-sm">{lead.company_name || 'N/A'}</div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-zinc-900 max-w-xs">
                            <div className="truncate" title={lead.location || ''}>
                              {lead.location || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-zinc-900">{lead.contact_person || 'N/A'}</td>
                          <td className="px-4 py-3.5 text-sm text-zinc-900">{lead.mobile_number || 'N/A'}</td>
                          <td className="px-4 py-3.5 text-sm text-zinc-900 max-w-xs">
                            <div className="truncate" title={lead.email_address || ''}>
                              {lead.email_address || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-zinc-900">{lead.lead_source || 'N/A'}</td>
                          <td className="px-4 py-3.5 text-sm text-zinc-900 max-w-xs">
                            <div className="truncate" title={lead.type_of_business || ''}>
                              {lead.type_of_business || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-sm text-zinc-900 capitalize">{lead.product || 'N/A'}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[lead.status] || 'bg-zinc-100 text-zinc-800'}`}>
                              {lead.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-zinc-900">{lead.assigned_to || 'Unassigned'}</td>
                          <td className="px-4 py-3.5 text-sm text-zinc-900 max-w-xs">
                            <div className="truncate" title={lead.next_action || ''}>
                              {lead.next_action || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => openActivityModal(lead)}
                                className="px-3 py-1.5 bg-slate-700 text-white text-xs rounded-lg font-medium hover:bg-slate-800 hover:shadow-sm transition-all duration-200"
                              >
                                Log Activity
                              </button>
                              <button
                                onClick={() => openViewActivitiesModal(lead)}
                                className="px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs rounded-lg font-medium hover:bg-zinc-200 transition-all duration-200 border border-zinc-200"
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                      {isEventCategory && (
                        <>
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-zinc-900 text-sm">{lead.event_name || 'N/A'}</div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-zinc-900 max-w-xs">
                            <div className="truncate" title={lead.venue || ''}>
                              {lead.venue || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-zinc-900">
                            {lead.event_date ? new Date(lead.event_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-zinc-900">{lead.event_time || 'N/A'}</td>
                          <td className="px-4 py-3.5 text-sm text-zinc-900">{lead.contact_person || 'N/A'}</td>
                          <td className="px-4 py-3.5 text-sm text-zinc-900">{lead.mobile_number || 'N/A'}</td>
                          <td className="px-4 py-3.5 text-sm text-zinc-900 max-w-xs">
                            <div className="truncate" title={lead.email_address || ''}>
                              {lead.email_address || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-zinc-900">{lead.number_of_attendees || 'N/A'}</td>
                          <td className="px-4 py-3.5">
                            <span className="text-sm text-zinc-900 capitalize">{lead.product || 'N/A'}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[lead.status] || 'bg-zinc-100 text-zinc-800'}`}>
                              {lead.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-zinc-900">{lead.assigned_to || 'Unassigned'}</td>
                          <td className="px-4 py-3.5 text-sm text-zinc-900 max-w-xs">
                            <div className="truncate" title={lead.next_action || ''}>
                              {lead.next_action || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => openActivityModal(lead)}
                                className="px-3 py-1.5 bg-slate-700 text-white text-xs rounded-lg font-medium hover:bg-slate-800 hover:shadow-sm transition-all duration-200"
                              >
                                Log Activity
                              </button>
                              <button
                                onClick={() => openViewActivitiesModal(lead)}
                                className="px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs rounded-lg font-medium hover:bg-zinc-200 transition-all duration-200 border border-zinc-200"
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Modals */}
      {showCategorySelection && (
        <LeadTypeSelectionModal
          onSelect={handleCategorySelection}
          onClose={() => setShowCategorySelection(false)}
        />
      )}
      {showAddModal && selectedCategoryForAdd && (
        <AddLeadModal
          category={selectedCategoryForAdd}
          onClose={closeAddModal}
          onSuccess={() => {
            fetchLeads();
            closeAddModal();
          }}
        />
      )}
      {showActivityModal && selectedLead && (
        <LogActivityModal
          lead={selectedLead}
          onClose={() => {
            setShowActivityModal(false);
            setSelectedLead(null);
          }}
          onSuccess={fetchLeads}
        />
      )}
      {showViewActivitiesModal && selectedLead && (
        <ViewActivitiesModal
          lead={selectedLead}
          onClose={() => {
            setShowViewActivitiesModal(false);
            setSelectedLead(null);
          }}
        />
      )}
    </div>
  );
}
