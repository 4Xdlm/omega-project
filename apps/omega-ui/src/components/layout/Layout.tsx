/**
 * Layout Component for OMEGA UI
 * @module components/layout/Layout
 * @description Main application layout wrapper
 */

import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import type { ReactNode } from 'react';

/**
 * Layout props
 */
interface LayoutProps {
  children: ReactNode;
}

/**
 * Main layout component
 * @param props - Layout properties
 * @returns Layout wrapper element
 */
export function Layout({ children }: LayoutProps): JSX.Element {
  return (
    <div className="omega-app">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 bg-omega-bg">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
