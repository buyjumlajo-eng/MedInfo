import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/src/components/ui/Button';
import { FileText, ShieldCheck, Zap } from 'lucide-react';

export function LandingPage() {
  const { t, dir } = useLanguage();
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [demoMessage, setDemoMessage] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleGetStarted = async () => {
    if (user) {
      navigate('/dashboard');
    } else {
      try {
        await signInWithGoogle();
        navigate('/dashboard');
      } catch (error) {
        console.error("Login failed:", error);
      }
    }
  };

  const handleViewDemo = async () => {
    if (user) {
      navigate('/case/1');
    } else {
      // Sign in first, then redirect to demo — ProtectedRoute requires auth
      try {
        await signInWithGoogle();
        navigate('/case/1');
      } catch (error) {
        console.error("Login failed:", error);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600 mb-8">
        <ShieldCheck className="h-4 w-4 me-2 text-[var(--color-primary-500)]" />
        Secure & Private Medical AI
      </div>
      
      <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl mb-6">
        {t('hero.title')}
      </h1>
      
      <p className="text-xl text-slate-600 max-w-2xl mb-10 leading-relaxed">
        {t('hero.subtitle')}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8" onClick={handleGetStarted}>
          {t('hero.cta')}
        </Button>
        <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-12 px-8" onClick={handleViewDemo}>
          View Demo
        </Button>
      </div>

      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-start max-w-5xl w-full">
        <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="h-12 w-12 rounded-lg bg-[var(--color-primary-50)] flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-[var(--color-primary-600)]" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Upload Any Report</h3>
          <p className="text-slate-600">PDFs, images, or scanned documents. We extract the medical data accurately.</p>
        </div>
        <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="h-12 w-12 rounded-lg bg-[var(--color-primary-50)] flex items-center justify-center mb-4">
            <Zap className="h-6 w-6 text-[var(--color-primary-600)]" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Instant Explanations</h3>
          <p className="text-slate-600">Complex medical jargon translated into simple, easy-to-understand language.</p>
        </div>
        <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="h-12 w-12 rounded-lg bg-[var(--color-primary-50)] flex items-center justify-center mb-4">
            <ShieldCheck className="h-6 w-6 text-[var(--color-primary-600)]" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Safe & Compliant</h3>
          <p className="text-slate-600">Strictly informational. We never diagnose or provide medical advice.</p>
        </div>
      </div>
    </div>
  );
}
