'use client';

import { AttendanceProvider } from '@/contexts/AttendanceContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AttendanceProvider>
      {children}
    </AttendanceProvider>
  );
}
