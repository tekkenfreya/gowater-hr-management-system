'use client';

import { useState } from 'react';
import { LeadCategory, ProductType, LeadFormData } from '@/types/leads';
import { logger } from '@/lib/logger';
import { X } from 'lucide-react';

interface AddLeadModalProps {
  category: LeadCategory;
  onClose: () => void;
  onSuccess: () => void;
}

const PRODUCT_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'both', label: 'Both (Vending + Dispenser)' },
  { value: 'vending', label: 'Vending Machine' },
  { value: 'dispenser', label: 'Water Dispenser' },
];

const STATUS_OPTIONS = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'closed-deal', label: 'Closed Deal' },
  { value: 'rejected', label: 'Rejected' },
];

export default function AddLeadModal({ category, onClose, onSuccess }: AddLeadModalProps) {
  const [formData, setFormData] = useState<LeadFormData>({
    category,
    // LEAD FIELDS
    company_name: '',
    location: '',
    lead_source: '',
    type_of_business: '',
    number_of_employees: '',
    // EVENT FIELDS
    event_name: '',
    venue: '',
    event_date: '',
    event_time: '',
    number_of_attendees: '',
    // SHARED FIELDS
    contact_person: '',
    mobile_number: '',
    email_address: '',
    product: undefined,
    status: 'not-started',
    remarks: '',
    next_action: '',
    assigned_to: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate based on category
    if (category === 'lead' && !formData.company_name?.trim()) {
      alert('Company name is required for leads');
      return;
    }

    if (category === 'event' && !formData.event_name?.trim()) {
      alert('Event name is required for events');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        alert(`Failed to create ${category}: ${data.error}`);
        logger.error(`Failed to create ${category}`, data.error);
      }
    } catch (error) {
      alert(`An error occurred while creating the ${category}`);
      logger.error(`Error creating ${category}`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isLead = category === 'lead';
  const isEvent = category === 'event';
  const modalTitle = isLead ? 'Add New Lead' : 'Add New Event';
  const submitButtonText = loading ? 'Creating...' : isLead ? 'Create Lead' : 'Create Event';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E1DFDD] px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#323130]">{modalTitle}</h2>
            <button
              onClick={onClose}
              className="text-[#605E5C] hover:text-[#323130] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* LEAD FIELDS */}
          {isLead && (
            <>
              {/* Company Name */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">
                  Company Name <span className="text-[#D13438]">*</span>
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="Enter company name"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="Enter location"
                />
              </div>

              {/* Lead Source */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Lead Source</label>
                <input
                  type="text"
                  name="lead_source"
                  value={formData.lead_source}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="e.g., Referral, Website, Cold Call"
                />
              </div>

              {/* Type of Business */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Type of Business</label>
                <input
                  type="text"
                  name="type_of_business"
                  value={formData.type_of_business}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="e.g., Manufacturing, Education, Retail"
                />
              </div>

              {/* Number of Employees */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Number of Employees</label>
                <input
                  type="text"
                  name="number_of_employees"
                  value={formData.number_of_employees}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="e.g., 50-100, 200+"
                />
              </div>
            </>
          )}

          {/* EVENT FIELDS */}
          {isEvent && (
            <>
              {/* Event Name */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">
                  Event Name <span className="text-[#D13438]">*</span>
                </label>
                <input
                  type="text"
                  name="event_name"
                  value={formData.event_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="Enter event name"
                />
              </div>

              {/* Venue */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Venue</label>
                <input
                  type="text"
                  name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="Enter venue location"
                />
              </div>

              {/* Event Date */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Event Date</label>
                <input
                  type="date"
                  name="event_date"
                  value={formData.event_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                />
              </div>

              {/* Event Time */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Event Time</label>
                <input
                  type="time"
                  name="event_time"
                  value={formData.event_time}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                />
              </div>

              {/* Number of Attendees */}
              <div>
                <label className="block text-sm font-semibold text-[#323130] mb-1.5">Number of Attendees</label>
                <input
                  type="text"
                  name="number_of_attendees"
                  value={formData.number_of_attendees}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
                  placeholder="e.g., 200-300, 500+"
                />
              </div>
            </>
          )}

          {/* SHARED FIELDS (both lead and event) */}

          {/* Contact Person */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">Contact Person</label>
            <input
              type="text"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
              placeholder="Enter contact person name"
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">Mobile Number</label>
            <input
              type="text"
              name="mobile_number"
              value={formData.mobile_number}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
              placeholder="Enter mobile number"
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">Email Address</label>
            <input
              type="email"
              name="email_address"
              value={formData.email_address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
              placeholder="Enter email address"
            />
          </div>

          {/* Product */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">
              {isLead ? 'Product Interest' : 'Product Needed'}
            </label>
            <select
              name="product"
              value={formData.product || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
            >
              <option value="">Select product</option>
              {PRODUCT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">Assign To</label>
            <input
              type="text"
              name="assigned_to"
              value={formData.assigned_to}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130]"
              placeholder="Leave blank to auto-assign to yourself"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">Remarks</label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent resize-none text-[#323130]"
              placeholder="Add any additional notes"
            />
          </div>

          {/* Next Action */}
          <div>
            <label className="block text-sm font-semibold text-[#323130] mb-1.5">Next Action</label>
            <textarea
              name="next_action"
              value={formData.next_action}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-[#C8C6C4] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent resize-none text-[#323130]"
              placeholder={isLead ? 'What should be done next with this lead?' : 'What should be done next for this event?'}
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#C8C6C4] text-[#323130] rounded font-medium hover:bg-[#F3F2F1] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#0078D4] text-white rounded font-semibold hover:bg-[#005A9E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
