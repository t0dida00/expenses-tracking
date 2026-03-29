import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BankingProvider } from '../contexts/BankingContext';
import QueryProvider from '../providers/QueryProvider';
import Sidebar from '../components/Sidebar';
import ChatBot from '../components/ChatBot';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MLog",
  description: "Your modern financial ledger",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body style={{ backgroundColor: '#05070a', color: 'white', minHeight: '100vh', margin: 0, padding: 0 }}>
        <QueryProvider>
          <BankingProvider>
            <div style={{ display: 'flex', minHeight: '100vh' }}>
              <Sidebar />
              {/* Main Content Area */}
              <main style={{ marginLeft: '260px', flex: 1, minHeight: '100vh', backgroundColor: '#05070a' }}>
                {children}
              </main>
              <ChatBot />
            </div>
          </BankingProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
