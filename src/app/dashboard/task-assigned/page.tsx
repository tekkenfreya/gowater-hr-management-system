'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Lead, LeadCategory, LeadWithActivities } from '@/types/leads';
import { logger } from '@/lib/logger';
import AddLeadModal from '@/components/leads/AddLeadModal';
import EditLeadModal from '@/components/leads/EditLeadModal';
import LogActivityModal from '@/components/leads/LogActivityModal';
import ViewActivitiesModal from '@/components/leads/ViewActivitiesModal';
import DeleteConfirmationModal from '@/components/leads/DeleteConfirmationModal';
import { Plus, ArrowLeft, Building2, Calendar, FileText, Eye, Package, Pencil, Trash2 } from 'lucide-react';

const CATEGORIES: { value: LeadCategory; label: string }[] = [
  { value: 'lead', label: 'Leads' },
  { value: 'event', label: 'Events' },
  { value: 'supplier', label: 'Supplier' },
];

// Microsoft 365 Status Colors
const STATUS_COLORS: Record<string, string> = {
  'not-started': 'bg-[#F3F2F1] text-[#605E5C] border border-[#C8C6C4]',
  'contacted': 'bg-[#E6F3FF] text-[#005A9E] border border-[#0078D4]',
  'quoted': 'bg-[#FFF4E5] text-[#8A5100] border border-[#F59B00]',
  'negotiating': 'bg-[#F0E6FF] text-[#5A2D91] border border-[#8764B8]',
  'closed-deal': 'bg-[#E6F4EA] text-[#0B5A10] border border-[#107C10]',
  'rejected': 'bg-[#FDE7E9] text-[#A4262C] border border-[#D13438]',
};

export default function LeadsPage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<LeadCategory>('lead');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryForAdd, setSelectedCategoryForAdd] = useState<LeadCategory | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
    // Directly open the add modal with the current category
    setSelectedCategoryForAdd(selectedCategory);
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

  const openEditModal = (lead: Lead) => {
    setSelectedLead(lead);
    setShowEditModal(true);
  };

  const openDeleteModal = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDeleteModal(true);
  };

  const handleEditSuccess = () => {
    fetchLeads(); // Refresh the leads list
  };

  const handleDeleteSuccess = () => {
    fetchLeads(); // Refresh the leads list
  };

  const isLeadCategory = selectedCategory === 'lead';
  const isEventCategory = selectedCategory === 'event';
  const isSupplierCategory = selectedCategory === 'supplier';
  const categoryLabel = CATEGORIES.find(c => c.value === selectedCategory)?.label || '';

  return (
    <div className="min-h-screen bg-[#F3F2F1] flex">
      {/* Sidebar Navigation - Microsoft Style */}
      <div className="w-64 bg-white border-r border-[#E1DFDD] p-6 flex flex-col">
        <h2 className="text-lg font-semibold text-[#323130] mb-6">Categories</h2>

        {/* Add Item Button - Microsoft Primary */}
        <button
          onClick={openAddFlow}
          className="w-full px-4 py-2 mb-6 bg-[#0078D4] text-white rounded font-semibold hover:bg-[#005A9E] transition-colors duration-150 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>

        {/* Category Navigation */}
        <nav className="space-y-1 mb-6">
          {CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`w-full text-left px-3 py-2 rounded font-medium transition-colors duration-150 text-sm flex items-center gap-2 ${
                selectedCategory === category.value
                  ? 'bg-[#E6F3FF] text-[#0078D4] border-l-4 border-[#0078D4]'
                  : 'text-[#323130] hover:bg-[#F3F2F1]'
              }`}
            >
              {category.value === 'lead' ? <Building2 className="w-4 h-4" /> :
               category.value === 'event' ? <Calendar className="w-4 h-4" /> :
               <Package className="w-4 h-4" />}
              {category.label}
            </button>
          ))}
        </nav>

        {/* Back to Dashboard Button */}
        <a
          href="/dashboard"
          className="w-full px-4 py-2 text-[#323130] hover:bg-[#F3F2F1] border border-[#C8C6C4] rounded font-medium transition-colors duration-150 flex items-center justify-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </a>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8">
        <div className="max-w-full">
          {/* Category Title Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-[#323130] mb-1">{categoryLabel}</h1>
              <p className="text-[#605E5C] text-sm">Manage and track your {categoryLabel.toLowerCase()}</p>
            </div>
            <button
              onClick={openAddFlow}
              className="px-4 py-2 bg-[#0078D4] text-white rounded font-semibold hover:bg-[#005A9E] transition-colors duration-150 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add {isLeadCategory ? 'Lead' : isEventCategory ? 'Event' : 'Supplier'}
            </button>
          </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-[#E1DFDD] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#0078D4]"></div>
              <p className="mt-4 text-[#605E5C] text-sm">Loading {categoryLabel.toLowerCase()}...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[#605E5C] text-base">No {categoryLabel.toLowerCase()} found</p>
              <button
                onClick={openAddFlow}
                className="mt-4 px-4 py-2 bg-[#0078D4] text-white rounded hover:bg-[#005A9E] transition-colors duration-150"
              >
                Add First {isLeadCategory ? 'Lead' : isEventCategory ? 'Event' : 'Supplier'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F3F2F1] border-b border-[#E1DFDD]">
                  <tr>
                    {/* Dynamic headers based on category */}
                    {isLeadCategory && (
                      <>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Company Name</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Location</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Contact</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Mobile</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Email</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Lead Source</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Business Type</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Product</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Status</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Assigned To</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Next Action</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Actions</th>
                      </>
                    )}
                    {isEventCategory && (
                      <>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Event Name</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Venue</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Date</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Time</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Contact</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Mobile</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Email</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Attendees</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Product Needed</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Status</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Assigned To</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Next Action</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Actions</th>
                      </>
                    )}
                    {isSupplierCategory && (
                      <>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Supplier Name</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Location</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Product</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Price</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Unit Type</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Contact</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Mobile</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Email</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Status</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Assigned To</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Next Action</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#605E5C] uppercase tracking-wide">Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1DFDD]">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#F3F2F1] transition-colors duration-100">
                      {/* Dynamic row data based on category */}
                      {isLeadCategory && (
                        <>
                          <td className="px-3 py-3">
                            <div className="font-medium text-[#323130] text-sm">{lead.company_name || 'N/A'}</div>
                          </td>
                          <td className="px-3 py-3 text-sm text-[#323130] max-w-xs">
                            <div className="truncate" title={lead.location || ''}>
                              {lead.location || 'N/A'}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-[#323130]">{lead.contact_person || 'N/A'}</td>
                          <td className="px-3 py-3 text-sm text-[#323130]">{lead.mobile_number || 'N/A'}</td>
                          <td className="px-3 py-3 text-sm text-[#323130] max-w-xs">
                            <div className="truncate" title={lead.email_address || ''}>
                              {lead.email_address || 'N/A'}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-[#323130]">{lead.lead_source || 'N/A'}</td>
                          <td className="px-3 py-3 text-sm text-[#323130] max-w-xs">
                            <div className="truncate" title={lead.type_of_business || ''}>
                              {lead.type_of_business || 'N/A'}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-sm text-[#323130] capitalize">{lead.product || 'N/A'}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-normal whitespace-nowrap uppercase tracking-wide ${STATUS_COLORS[lead.status] || 'bg-[#F3F2F1] text-[#605E5C] border border-[#C8C6C4]'}`}>
                              {lead.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-[#323130]">{lead.assigned_to || 'Unassigned'}</td>
                          <td className="px-3 py-3 text-sm text-[#323130] max-w-xs">
                            <div className="truncate" title={lead.next_action || ''}>
                              {lead.next_action || '-'}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => openActivityModal(lead)}
                                className="px-3 py-1.5 bg-[#0078D4] text-white text-xs rounded font-semibold hover:bg-[#005A9E] transition-colors duration-150 flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                Log Activity
                              </button>
                              <button
                                onClick={() => openViewActivitiesModal(lead)}
                                className="px-3 py-1.5 bg-white text-[#323130] text-xs rounded font-medium hover:bg-[#F3F2F1] transition-colors duration-150 border border-[#C8C6C4] flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </button>
                              <button
                                onClick={() => openEditModal(lead)}
                                className="px-3 py-1.5 bg-white text-[#323130] text-xs rounded font-medium hover:bg-[#F3F2F1] transition-colors duration-150 border border-[#C8C6C4] flex items-center gap-1"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => openDeleteModal(lead)}
                                className="px-3 py-1.5 bg-white text-[#D13438] text-xs rounded font-medium hover:bg-[#FEF0F1] transition-colors duration-150 border border-[#D13438] flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                      {isEventCategory && (
                        <>
                          <td className="px-3 py-3">
                            <div className="font-medium text-[#323130] text-sm">{lead.event_name || 'N/A'}</div>
                          </td>
                          <td className="px-3 py-3 text-sm text-[#323130] max-w-xs">
                            <div className="truncate" title={lead.venue || ''}>
                              {lead.venue || 'N/A'}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-[#323130]">
                            {lead.event_date ? new Date(lead.event_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-3 py-3 text-sm text-[#323130]">{lead.event_time || 'N/A'}</td>
                          <td className="px-3 py-3 text-sm text-[#323130]">{lead.contact_person || 'N/A'}</td>
                          <td className="px-3 py-3 text-sm text-[#323130]">{lead.mobile_number || 'N/A'}</td>
                          <td className="px-3 py-3 text-sm text-[#323130] max-w-xs">
                            <div className="truncate" title={lead.email_address || ''}>
                              {lead.email_address || 'N/A'}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-[#323130]">{lead.number_of_attendees || 'N/A'}</td>
                          <td className="px-3 py-3">
                            <span className="text-sm text-[#323130] capitalize">{lead.product || 'N/A'}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-normal whitespace-nowrap uppercase tracking-wide ${STATUS_COLORS[lead.status] || 'bg-[#F3F2F1] text-[#605E5C] border border-[#C8C6C4]'}`}>
                              {lead.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-[#323130]">{lead.assigned_to || 'Unassigned'}</td>
                          <td className="px-3 py-3 text-sm text-[#323130] max-w-xs">
                            <div className="truncate" title={lead.next_action || ''}>
                              {lead.next_action || '-'}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => openActivityModal(lead)}
                                className="px-3 py-1.5 bg-[#0078D4] text-white text-xs rounded font-semibold hover:bg-[#005A9E] transition-colors duration-150 flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                Log Activity
                              </button>
                              <button
                                onClick={() => openViewActivitiesModal(lead)}
                                className="px-3 py-1.5 bg-white text-[#323130] text-xs rounded font-medium hover:bg-[#F3F2F1] transition-colors duration-150 border border-[#C8C6C4] flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </button>
                              <button
                                onClick={() => openEditModal(lead)}
                                className="px-3 py-1.5 bg-white text-[#323130] text-xs rounded font-medium hover:bg-[#F3F2F1] transition-colors duration-150 border border-[#C8C6C4] flex items-center gap-1"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => openDeleteModal(lead)}
                                className="px-3 py-1.5 bg-white text-[#D13438] text-xs rounded font-medium hover:bg-[#FEF0F1] transition-colors duration-150 border border-[#D13438] flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                      {isSupplierCategory && (
                        <>
                          <td className="px-3 py-3">
                            <div className="font-medium text-[#323130] text-sm">{lead.supplier_name || 'N/A'}</div>
                          </td>
                          <td className="px-3 py-3 text-sm text-[#323130] max-w-xs">
                            <div className="truncate" title={lead.supplier_location || ''}>
                              {lead.supplier_location || 'N/A'}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-[#323130]">{lead.supplier_product || 'N/A'}</td>
                          <td className="px-3 py-3 text-sm text-[#323130]">{lead.price || 'N/A'}</td>
                          <td className="px-3 py-3 text-sm text-[#323130]">{lead.unit_type || 'N/A'}</td>
                          <td className="px-3 py-3 text-sm text-[#323130]">{lead.contact_person || 'N/A'}</td>
                          <td className="px-3 py-3 text-sm text-[#323130]">{lead.mobile_number || 'N/A'}</td>
                          <td className="px-3 py-3 text-sm text-[#323130] max-w-xs">
                            <div className="truncate" title={lead.email_address || ''}>
                              {lead.email_address || 'N/A'}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-normal whitespace-nowrap uppercase tracking-wide ${STATUS_COLORS[lead.status] || 'bg-[#F3F2F1] text-[#605E5C] border border-[#C8C6C4]'}`}>
                              {lead.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-[#323130]">{lead.assigned_to || 'Unassigned'}</td>
                          <td className="px-3 py-3 text-sm text-[#323130] max-w-xs">
                            <div className="truncate" title={lead.next_action || ''}>
                              {lead.next_action || '-'}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => openActivityModal(lead)}
                                className="px-3 py-1.5 bg-[#0078D4] text-white text-xs rounded font-semibold hover:bg-[#005A9E] transition-colors duration-150 flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                Log Activity
                              </button>
                              <button
                                onClick={() => openViewActivitiesModal(lead)}
                                className="px-3 py-1.5 bg-white text-[#323130] text-xs rounded font-medium hover:bg-[#F3F2F1] transition-colors duration-150 border border-[#C8C6C4] flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </button>
                              <button
                                onClick={() => openEditModal(lead)}
                                className="px-3 py-1.5 bg-white text-[#323130] text-xs rounded font-medium hover:bg-[#F3F2F1] transition-colors duration-150 border border-[#C8C6C4] flex items-center gap-1"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => openDeleteModal(lead)}
                                className="px-3 py-1.5 bg-white text-[#D13438] text-xs rounded font-medium hover:bg-[#FEF0F1] transition-colors duration-150 border border-[#D13438] flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
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
      {showEditModal && selectedLead && (
        <EditLeadModal
          lead={selectedLead}
          onClose={() => {
            setShowEditModal(false);
            setSelectedLead(null);
          }}
          onSuccess={() => {
            handleEditSuccess();
            setShowEditModal(false);
            setSelectedLead(null);
          }}
        />
      )}
      {showDeleteModal && selectedLead && (
        <DeleteConfirmationModal
          lead={selectedLead}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedLead(null);
          }}
          onSuccess={() => {
            handleDeleteSuccess();
            setShowDeleteModal(false);
            setSelectedLead(null);
          }}
        />
      )}
    </div>
  );
}
