import type { Metadata } from 'next';
import '../index.css';

export const metadata: Metadata = {
  title: 'Quản lý sinh viên',
  description: 'Hệ thống quản lý sinh viên',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
