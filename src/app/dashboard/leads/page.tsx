'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Lead, LeadCategory, LeadWithActivities } from '@/types/leads';
import { logger } from '@/lib/logger';
import AddLeadModal from '@/components/leads/AddLeadModal';
import LogActivityModal from '@/components/leads/LogActivityModal';
import ViewActivitiesModal from '@/components/leads/ViewActivitiesModal';

const CATEGORIES: { value: LeadCategory; label: string }[] = [
  { value: 'factory', label: 'Factory' },
  { value: 'school', label: 'School' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'dti', label: 'DTI' },
  { value: 'rotary', label: 'Rotary' },
  { value: 'event', label: 'Events' },
];

const STATUS_COLORS: Record<string, string> = {
  'not-started': 'bg-gray-100 text-gray-800',
  'contacted': 'bg-blue-100 text-blue-800',
  'quoted': 'bg-yellow-100 text-yellow-800',
  'negotiating': 'bg-purple-100 text-purple-800',
  'closed': 'bg-green-100 text-green-800',
  'rejected': 'bg-red-100 text-red-800',
};

export default function LeadsPage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<LeadCategory>('factory');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
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

  const openActivityModal = (lead: Lead) => {
    setSelectedLead(lead);
    setShowActivityModal(true);
  };

  const openViewActivitiesModal = (lead: Lead) => {
    setSelectedLead(lead);
    setShowViewActivitiesModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Leads</h1>
            <p className="text-gray-600">Manage and track your sales leads</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            + Add Lead
          </button>
        </div>

        {/* Category Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 mb-8">
          <div className="flex space-x-2 overflow-x-auto">
            {CATEGORIES.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                  selectedCategory === category.value
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading leads...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">No leads found in {CATEGORIES.find(c => c.value === selectedCategory)?.label}</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                Add First Lead
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Assigned To</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{lead.company_name}</div>
                        <div className="text-sm text-gray-500">{lead.type_of_business || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{lead.contact_person || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{lead.mobile_number || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{lead.location || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 capitalize">{lead.product || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-800'}`}>
                          {lead.status.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{lead.assigned_to || 'Unassigned'}</td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openActivityModal(lead)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Log Activity
                          </button>
                          <button
                            onClick={() => openViewActivitiesModal(lead)}
                            className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddLeadModal
          category={selectedCategory}
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchLeads}
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
