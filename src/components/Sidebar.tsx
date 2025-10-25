'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from '@/types/auth';
import { useAttendance } from '@/contexts/AttendanceContext';
import { logger } from '@/lib/logger';

interface SidebarProps {
  user: User | null;
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactElement;
  href: string;
  active?: boolean;
  badge?: number;
  subItems?: NavItem[];
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  position: string;
  department: string;
  isOnline: boolean;
}

export default function Sidebar({
  user,
  isCollapsed,
  onToggle
}: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [bosses, setBosses] = useState<TeamMember[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Get attendance state from context
  const {
    isTimedIn,
    isOnBreak,
    workDuration,
    breakDuration,
    handleTimeIn: onTimeIn,
    handleTimeOut: onTimeOut,
    handleStartBreak: onStartBreak,
    handleEndBreak: onEndBreak
  } = useAttendance();

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const response = await fetch('/api/team/members');
        if (response.ok) {
          const data = await response.json();
          setBosses(data.bosses || []);
          setTeamMembers(data.teamMembers || []);
        }
      } catch (error) {
        logger.error('Failed to fetch team members', error);
      }
    };

    fetchTeamMembers();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTeamMembers, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <HomeIcon />,
      href: '/dashboard'
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <TaskIcon />,
      href: '/dashboard/tasks'
    },
    {
      id: 'leave',
      label: 'Leave Tracker',
      icon: <CalendarDaysIcon />,
      href: '/dashboard/leave'
    },
    {
      id: 'leads',
      label: 'Leads',
      icon: <LeadsIcon />,
      href: '/dashboard/leads'
    },
    ...((user?.role === 'admin' || user?.role === 'manager') ? [{
      id: 'team',
      label: 'Team',
      icon: <UsersIcon />,
      href: '/dashboard/team',
      subItems: [
        {
          id: 'team-attendance',
          label: 'Team Attendance',
          icon: <ClockIcon />,
          href: '/dashboard/team/attendance'
        },
        {
          id: 'team-leave',
          label: 'Leave Approvals',
          icon: <CalendarIcon />,
          href: '/dashboard/team/leave'
        },
        {
          id: 'team-reports',
          label: 'Reports',
          icon: <ReportsIcon />,
          href: '/dashboard/team/reports'
        }
      ]
    }] : []),
    ...((user?.role === 'admin' || user?.role === 'manager' || user?.role === 'boss') ? [{
      id: 'lead-analytics',
      label: 'Lead Analytics',
      icon: <ChartIcon />,
      href: '/dashboard/leads/analytics'
    }] : []),
    {
      id: 'files',
      label: 'Files',
      icon: <FolderIcon />,
      href: '/dashboard/files'
    },
    ...(user?.role === 'admin' ? [{
      id: 'admin',
      label: 'Admin Panel',
      icon: <AdminIcon />,
      href: '/dashboard/admin'
    }] : [])
  ];

  const settingsItem: NavItem = {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon />,
    href: '/dashboard/settings'
  };

  const isActive = (href: string) => {
    // Exact match for home/dashboard
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    // For other routes, check if pathname matches exactly or starts with the href + /
    return pathname === href || pathname.startsWith(href + '/');
  };

  const hasActiveSubItem = (item: NavItem) => {
    return item.subItems?.some(subItem => isActive(subItem.href)) || false;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Overlay for mobile */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-30"
          onClick={onToggle}
        />
      )}

      {/* Sidebar - Modern Glassy Dark Gradient */}
      <div className={`
        fixed left-0 top-0 h-full bg-gradient-to-b from-[#1a2332] via-[#0f1824] to-[#0a111c] border-r border-gray-700/30 shadow-2xl z-40 transition-transform duration-300 overflow-y-auto flex flex-col backdrop-blur-xl
        ${isCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'translate-x-0 w-52'}
      `}>
        {/* Header with Compact Logo */}
        <div className="flex flex-col items-center justify-center border-b border-gray-700/30">
          {!isCollapsed && (
            <Link
              href="/dashboard"
              className="bg-white p-6 w-full flex items-center justify-center group transition-all duration-300 hover:shadow-xl"
            >
              <img
                src="/gowater new logo.png"
                alt="GoWater"
                className="h-32 w-auto object-contain transform transition-all duration-500 group-hover:scale-110 animate-fade-in"
               />
            </Link>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors lg:hidden absolute top-2 right-2"
          >
            <XIcon className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="py-6 flex-1">
          <div className="px-4 mb-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Navigation</p>
          </div>
          <div className="px-4 space-y-1">
            {navItems.map((item) => (
              <div key={item.id}>
                {/* Main Item */}
                <div className="relative">
                  {item.subItems ? (
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className={`
                        w-full flex items-center justify-between px-4 py-3 text-base font-normal rounded-xl transition-all
                        ${isActive(item.href) || hasActiveSubItem(item) || expandedItems.includes(item.id)
                          ? 'bg-white/10 text-white backdrop-blur-sm'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 flex-shrink-0">
                          {item.icon}
                        </div>
                        {!isCollapsed && <span>{item.label}</span>}
                      </div>
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={`
                        flex items-center px-4 py-3 text-base font-normal rounded-xl transition-all
                        ${isActive(item.href)
                          ? 'bg-white/10 text-white backdrop-blur-sm'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 flex-shrink-0">
                          {item.icon}
                        </div>
                        {!isCollapsed && <span>{item.label}</span>}
                      </div>
                    </Link>
                  )}

                </div>

                {/* Sub Items */}
                {item.subItems && expandedItems.includes(item.id) && !isCollapsed && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.id}
                        href={subItem.href}
                        className={`
                          flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors
                          ${isActive(subItem.href)
                            ? 'bg-blue-600 text-white font-medium'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          }
                        `}
                      >
                        <div className="w-4 h-4 flex-shrink-0">
                          {subItem.icon}
                        </div>
                        <span>{subItem.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Team Members Section */}
        {!isCollapsed && (
          <div className="p-4 space-y-4">
            {/* Bosses Section */}
            {bosses.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Bosses
                </h3>
                <div className="space-y-2">
                  {bosses.map((boss) => (
                    <div key={boss.id} className="flex items-center space-x-3 p-2 bg-gray-800 rounded-lg">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-xs">
                          {getInitials(boss.name)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {boss.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {boss.position}
                        </p>
                      </div>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${boss.isOnline ? 'bg-green-500' : 'bg-gray-600'}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Team Members Section */}
            {teamMembers.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Team Members
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center space-x-3 p-2 bg-gray-800 rounded-lg">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-xs">
                          {getInitials(member.name)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {member.position}
                        </p>
                      </div>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${member.isOnline ? 'bg-green-500' : 'bg-gray-600'}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings at Bottom */}
        <div className="mt-auto border-t border-gray-700/30">
          <div className="p-4">
            <Link
              href={settingsItem.href}
              className={`
                flex items-center justify-between px-4 py-3 text-base font-normal rounded-xl transition-all
                ${isActive(settingsItem.href)
                  ? 'bg-white/10 text-white backdrop-blur-sm'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 flex-shrink-0">
                  {settingsItem.icon}
                </div>
                {!isCollapsed && <span>{settingsItem.label}</span>}
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

// Icon Components
function HomeIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m3 7 5.119-4.094a1.628 1.628 0 0 1 2.123 0L16 7v11a1 1 0 0 1-1 1H9v-5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v5H5a1 1 0 0 1-1-1V7z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function CalendarDaysIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008ZM14.25 15h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008ZM16.5 15h.008v.008H16.5V15Zm0 2.25h.008v.008H16.5v-.008Z" />
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function LeadsIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
  );
}
