/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrictMode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '@/src/contexts/LanguageContext';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { ProtectedRoute } from '@/src/contexts/ProtectedRoute';
import { AppLayout } from '@/src/components/layout/AppLayout';
import { LandingPage } from '@/src/pages/LandingPage';
import { Dashboard } from '@/src/pages/Dashboard';
import { CaseView } from '@/src/pages/CaseView';
import { Pricing } from '@/src/pages/Pricing';

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<LandingPage />} />
              <Route path="pricing" element={<Pricing />} />
              <Route path="dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="case/:id" element={
                <ProtectedRoute>
                  <CaseView />
                </ProtectedRoute>
              } />
            </Route>
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}

