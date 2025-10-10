'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

interface AttendanceContextType {
  isTimedIn: boolean;
  isOnBreak: boolean;
  workDuration: number;
  breakDuration: number;
  checkInTime: Date | null;
  handleTimeIn: () => Promise<void>;
  handleTimeOut: () => Promise<void>;
  handleStartBreak: () => Promise<void>;
  handleEndBreak: () => Promise<void>;
  fetchTodayAttendance: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isTimedIn, setIsTimedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [workDuration, setWorkDuration] = useState(0);
  const [breakDuration, setBreakDuration] = useState(0);
  const [workInterval, setWorkInterval] = useState<NodeJS.Timeout | null>(null);
  const [breakInterval, setBreakInterval] = useState<NodeJS.Timeout | null>(null);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);

  // Fetch attendance when user is available
  useEffect(() => {
    if (user) {
      fetchTodayAttendance();
    }
  }, [user]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (workInterval) clearInterval(workInterval);
      if (breakInterval) clearInterval(breakInterval);
    };
  }, [workInterval, breakInterval]);

  const fetchTodayAttendance = async () => {
    try {
      const response = await fetch('/api/attendance');
      if (response.ok) {
        const data = await response.json();
        const attendance = data.attendance;

        if (attendance && attendance.checkInTime && !attendance.checkOutTime) {
          setIsTimedIn(true);
          const checkIn = new Date(attendance.checkInTime);
          setCheckInTime(checkIn);
          const currentTime = new Date();
          const durationInSeconds = Math.floor((currentTime.getTime() - checkIn.getTime()) / 1000);
          setWorkDuration(durationInSeconds);

          const interval = setInterval(() => {
            setWorkDuration(prev => prev + 1);
          }, 1000);
          setWorkInterval(interval);

          // Check break state
          if (attendance.breakStartTime && !attendance.breakEndTime) {
            setIsOnBreak(true);
            const breakStartTime = new Date(attendance.breakStartTime);
            const currentBreakDuration = Math.floor((currentTime.getTime() - breakStartTime.getTime()) / 1000);
            setBreakDuration(currentBreakDuration);
            const breakInt = setInterval(() => {
              setBreakDuration(prev => prev + 1);
            }, 1000);
            setBreakInterval(breakInt);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to fetch attendance', error);
    }
  };

  const handleTimeIn = async () => {
    try {
      const response = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workLocation: 'WFH' })
      });

      if (response.ok) {
        setIsTimedIn(true);
        setCheckInTime(new Date());
        setWorkDuration(0);
        const interval = setInterval(() => {
          setWorkDuration(prev => prev + 1);
        }, 1000);
        setWorkInterval(interval);
      } else {
        const errorData = await response.json();
        logger.error('Failed to time in', errorData);
      }
    } catch (error) {
      logger.error('Failed to time in', error);
    }
  };

  const handleTimeOut = async () => {
    try {
      const response = await fetch('/api/attendance/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '' })
      });

      if (response.ok) {
        setIsTimedIn(false);
        if (workInterval) clearInterval(workInterval);
        setWorkDuration(0);
        setCheckInTime(null);
      } else {
        const errorData = await response.json();
        logger.error('Failed to time out', errorData);
      }
    } catch (error) {
      logger.error('Failed to time out', error);
    }
  };

  const handleStartBreak = async () => {
    try {
      const response = await fetch('/api/attendance/break/start', {
        method: 'POST'
      });

      if (response.ok) {
        setIsOnBreak(true);
        setBreakDuration(0);
        if (workInterval) clearInterval(workInterval);
        const breakInt = setInterval(() => {
          setBreakDuration(prev => prev + 1);
        }, 1000);
        setBreakInterval(breakInt);
      }
    } catch (error) {
      logger.error('Failed to start break', error);
    }
  };

  const handleEndBreak = async () => {
    try {
      const response = await fetch('/api/attendance/break/end', {
        method: 'POST'
      });

      if (response.ok) {
        setIsOnBreak(false);
        if (breakInterval) clearInterval(breakInterval);
        const interval = setInterval(() => {
          setWorkDuration(prev => prev + 1);
        }, 1000);
        setWorkInterval(interval);
      }
    } catch (error) {
      logger.error('Failed to end break', error);
    }
  };

  const value: AttendanceContextType = {
    isTimedIn,
    isOnBreak,
    workDuration,
    breakDuration,
    checkInTime,
    handleTimeIn,
    handleTimeOut,
    handleStartBreak,
    handleEndBreak,
    fetchTodayAttendance
  };

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (context === undefined) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
}
