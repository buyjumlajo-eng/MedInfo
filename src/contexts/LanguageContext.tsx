import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const translations = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.newCase': 'New Case',
    'hero.title': 'Understand Your Medical Reports',
    'hero.subtitle': 'AI-powered explanations for your lab results and medical documents. Safe, secure, and easy to understand.',
    'hero.cta': 'Start Free Analysis',
    'dashboard.title': 'Your Cases',
    'dashboard.empty': 'No cases yet. Upload a report to get started.',
    'dashboard.filter.all': 'All Cases',
    'case.status.normal': 'Normal',
    'case.status.review': 'Needs Review',
    'case.status.warning': 'Warning',
    'case.status.critical': 'Critical',
    'case.upload': 'Upload Report',
    'chat.placeholder': 'Ask a follow-up question...',
    'chat.send': 'Send',
    'report.findings': 'Key Findings',
    'report.download': 'Download PDF',
  },
  ar: {
    'nav.dashboard': 'لوحة القيادة',
    'nav.newCase': 'حالة جديدة',
    'hero.title': 'افهم تقاريرك الطبية',
    'hero.subtitle': 'تفسيرات مدعومة بالذكاء الاصطناعي لنتائج المختبر والمستندات الطبية. آمنة وموثوقة وسهلة الفهم.',
    'hero.cta': 'ابدأ التحليل مجاناً',
    'dashboard.title': 'حالاتك',
    'dashboard.empty': 'لا توجد حالات بعد. قم برفع تقرير للبدء.',
    'dashboard.filter.all': 'جميع الحالات',
    'case.status.normal': 'طبيعي',
    'case.status.review': 'يحتاج مراجعة',
    'case.status.warning': 'تحذير',
    'case.status.critical': 'حرج',
    'case.upload': 'رفع تقرير',
    'chat.placeholder': 'اسأل سؤالاً إضافياً...',
    'chat.send': 'إرسال',
    'report.findings': 'النتائج الرئيسية',
    'report.download': 'تحميل PDF',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir: language === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
