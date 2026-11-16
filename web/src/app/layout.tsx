import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Friend App — Anonymous Calls, Celebrities & Local Events',
  description: 'Connect with random people online via voice/video, subscribe to verified celebrities, and discover hyper-local events with 100% privacy-protected phone authentication.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
