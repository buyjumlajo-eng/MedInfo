import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/src/components/ui/Button';
import { Activity, Globe, LogOut, LogIn, Zap } from 'lucide-react';

export function AppLayout() {
  const { language, setLanguage, t } = useLanguage();
  const { user, userProfile, signInWithGoogle, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-[var(--color-primary-600)]">
              <Activity className="h-6 w-6" />
              <span>MedInfo</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              {user && (
                <Link to="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                  {t('nav.dashboard')}
                </Link>
              )}
              <Link to="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                Pricing
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="flex items-center gap-2 hidden sm:flex"
            >
              <Globe className="h-4 w-4" />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </Button>
            
            {user ? (
              <>
                {userProfile?.tier === 'pro' ? (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-100)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary-700)]">
                    <Zap className="h-3 w-3" />
                    Pro
                  </span>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => navigate('/pricing')} className="hidden sm:flex text-[var(--color-primary-600)] border-[var(--color-primary-200)] hover:bg-[var(--color-primary-50)]">
                    Upgrade to Pro
                  </Button>
                )}
                <Button size="sm" onClick={() => navigate('/dashboard')}>{t('nav.newCase')}</Button>
                <Button variant="ghost" size="sm" onClick={logout} className="text-slate-600">
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handleLogin} className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
