'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User } from '@/types/auth';

interface HeaderProps {
  user: User | null;
  onToggleSidebar: () => void;
  onLogout: () => void;
}

export default function Header({ user, onToggleSidebar, onLogout }: HeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null);

  // Update time every second for real-time display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Using Open-Meteo API (free, no key required)
        // Default location: Manila, Philippines (14.5995° N, 120.9842° E)
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=14.5995&longitude=120.9842&current=temperature_2m,weather_code&timezone=Asia/Manila'
        );
        const data = await response.json();

        // Map weather codes to conditions
        const weatherCode = data.current.weather_code;
        let condition = 'clear';
        if (weatherCode >= 51 && weatherCode <= 67) condition = 'rainy';
        else if (weatherCode >= 71 && weatherCode <= 77) condition = 'snowy';
        else if (weatherCode >= 80 && weatherCode <= 99) condition = 'rainy';
        else if (weatherCode >= 1 && weatherCode <= 3) condition = 'cloudy';

        setWeather({
          temp: Math.round(data.current.temperature_2m),
          condition
        });
      } catch (error) {
        // Silently fail - weather is not critical
        setWeather({ temp: 28, condition: 'clear' });
      }
    };

    fetchWeather();
    // Refresh weather every 30 minutes
    const weatherTimer = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(weatherTimer);
  }, []);

  // Database-driven notifications
  const notifications: {
    id: string;
    unread: boolean;
    type: string;
    title: string;
    message: string;
    time: string;
  }[] = [];
  const unreadCount = notifications?.filter(n => n?.unread)?.length || 0;

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30 relative">
      {/* Current Date & Time - Absolute Position Near Sidebar */}
      <div className="hidden lg:flex items-center space-x-3 absolute left-56 top-1/2 -translate-y-1/2 pl-4">
        {/* Time Display */}
        <span className="text-lg font-semibold text-gray-900 tabular-nums">
          {currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })}
        </span>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300"></div>

        {/* Date Display */}
        <span className="text-sm font-medium text-gray-600">
          {currentTime.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          })}
        </span>

        {/* Weather Icon with Box */}
        {weather && (
          <>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex items-center space-x-2 bg-gradient-to-br from-blue-50 to-sky-50 px-3 py-1.5 rounded-lg border border-blue-100">
              {weather.condition === 'clear' && <SunIcon className="w-5 h-5 text-amber-500" />}
              {weather.condition === 'cloudy' && <CloudIcon className="w-5 h-5 text-gray-500" />}
              {weather.condition === 'rainy' && <RainIcon className="w-5 h-5 text-blue-500" />}
              {weather.condition === 'snowy' && <SnowIcon className="w-5 h-5 text-blue-300" />}
              <span className="text-sm font-semibold text-gray-700">{weather.temp}°C</span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between px-4 lg:px-6 py-3">

        {/* Left Section - Mobile Menu */}
        <div className="flex items-center space-x-4 lg:invisible">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
          >
            <MenuIcon />
          </button>
        </div>

        {/* Center Section - Quick Actions */}
        <div className="hidden md:flex items-center space-x-2">
          <button className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <PlusIcon className="w-4 h-4" />
            <span>Quick Add</span>
          </button>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search attendance, leaves..."
              className="w-64 px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-800" />
          </div>
        </div>

        {/* Right Section - Actions & Profile */}
        <div className="flex items-center space-x-3">
          
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-800 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                  {unreadCount || 0}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-medium text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-800">
                        No notifications
                      </div>
                    ) : notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                          notification.unread ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-800 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-800 mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 text-center border-t border-gray-200">
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-500">
                      View all notifications
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Export Button */}
          <button className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <DownloadIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2 p-2 text-sm font-medium text-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-medium text-sm">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <ChevronDownIcon />
            </button>

            {/* Profile Menu */}
            {showProfileMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center overflow-hidden">
                        {user?.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-medium">
                            {user?.name?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user?.name}</p>
                        <p className="text-sm text-gray-800">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <UserIcon />
                      <span>Profile</span>
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <SettingsIcon />
                      <span>Settings</span>
                    </Link>
                    <Link
                      href="/dashboard/help"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <QuestionMarkCircleIcon />
                      <span>Help & Support</span>
                    </Link>
                    <hr className="my-2" />
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogoutIcon />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-800" />
        </div>
      </div>
    </header>
  );
}

// Icon Components
function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CalendarMiniIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function QuestionMarkCircleIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

// Weather Icons
function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
    </svg>
  );
}

function CloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" clipRule="evenodd" />
    </svg>
  );
}

function RainIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z M8 21l1-4m3 4l1-4m3 4l1-4" />
    </svg>
  );
}

function SnowIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20M2 12h20M6.34 6.34l11.32 11.32M17.66 6.34L6.34 17.66M8 12h8M12 8v8" />
    </svg>
  );
}