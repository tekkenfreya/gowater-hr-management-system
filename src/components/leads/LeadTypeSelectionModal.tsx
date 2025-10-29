'use client';

import { LeadType } from '@/types/leads';

interface LeadTypeSelectionModalProps {
  onSelect: (type: LeadType) => void;
  onClose: () => void;
}

export default function LeadTypeSelectionModal({ onSelect, onClose }: LeadTypeSelectionModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-zinc-900">Choose Lead Type</h2>
          <p className="text-zinc-600 mt-2">Select whether this lead is a company or an individual</p>
        </div>

        {/* Side-by-side Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Company Card */}
          <button
            onClick={() => onSelect('company')}
            className="group p-8 border-2 border-zinc-200 rounded-xl hover:border-emerald-500 hover:bg-zinc-50 transition-all duration-200 flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <svg
                className="w-8 h-8 text-zinc-600 group-hover:text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-lg text-zinc-900">Company</div>
              <div className="text-sm text-zinc-600 mt-1">Business or organization</div>
            </div>
          </button>

          {/* Individual Card */}
          <button
            onClick={() => onSelect('individual')}
            className="group p-8 border-2 border-zinc-200 rounded-xl hover:border-emerald-500 hover:bg-zinc-50 transition-all duration-200 flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <svg
                className="w-8 h-8 text-zinc-600 group-hover:text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-lg text-zinc-900">Individual</div>
              <div className="text-sm text-zinc-600 mt-1">Single person or contact</div>
            </div>
          </button>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 text-zinc-600 hover:bg-zinc-100 border border-zinc-200 rounded-lg font-medium transition-all duration-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
