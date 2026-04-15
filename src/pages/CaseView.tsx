import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { ArrowLeft, Download, Send, Info, AlertCircle, CheckCircle2, FileText, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/firebase';

import { WhatsAppCTA } from '@/src/components/ui/WhatsAppCTA';

function MarkerAccordion({ marker, language, getStatusIcon, getStatusBadge, dir }: any) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className={`overflow-hidden transition-all duration-200 border ${isOpen ? 'border-slate-300 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-4 sm:p-5 flex items-center justify-between focus:outline-none bg-white hover:bg-slate-50/50 transition-colors"
        dir={dir}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="shrink-0 p-2 bg-slate-50 rounded-full">
            {getStatusIcon(marker.status)}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 text-base">
              {language === 'en' ? marker.nameEn : marker.nameAr}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-bold text-slate-900">{marker.value}</span>
              <span className="text-sm text-slate-500">{marker.unit}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 shrink-0">
          <div className={`hidden sm:block ${dir === 'rtl' ? 'text-left ml-4' : 'text-right mr-4'}`}>
            <p className="text-xs text-slate-500 mb-1">{language === 'en' ? 'Reference' : 'المرجع'}</p>
            <p className="text-sm font-medium text-slate-700">{marker.range}</p>
          </div>
          <div className="w-20 flex justify-end">
            {getStatusBadge(marker.status)}
          </div>
          <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-slate-100 bg-slate-50/80" dir={dir}>
              <div className="sm:hidden mb-4 pb-4 border-b border-slate-200">
                 <p className="text-xs text-slate-500 mb-1">{language === 'en' ? 'Reference Range' : 'النطاق المرجعي'}</p>
                 <p className="text-sm font-medium text-slate-700">{marker.range} {marker.unit}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  <Zap className="h-4 w-4 text-[var(--color-primary-500)]" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-primary-800)] mb-1">
                    {language === 'en' ? 'AI Analysis' : 'تحليل الذكاء الاصطناعي'}
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {language === 'en' ? marker.explanationEn : marker.explanationAr}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

import { Zap } from 'lucide-react';

export function CaseView() {
  const { id } = useParams();
  const { t, language, dir } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: language === 'en' ? 'Hello! I have analyzed your report. Do you have any questions about the findings?' : 'مرحباً! لقد قمت بتحليل تقريرك. هل لديك أي أسئلة حول النتائج؟' }
  ]);

  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!user || !id) return;

    const unsubscribe = onSnapshot(doc(db, 'cases', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.userId !== user.uid) {
          setError('Unauthorized access');
          navigate('/dashboard');
          return;
        }
        setCaseData({ id: docSnap.id, ...data });
        setLoading(false);
      } else {
        setError('Case not found');
        setLoading(false);
      }
    }, (err) => {
      console.error("Error fetching case:", err);
      setError('Failed to load case data');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, user, navigate]);

  const handleDownload = () => {
    window.print();
  };

  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    
    const userMessage = chatInput;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          caseData,
          language
        })
      });

      if (!response.ok) throw new Error('Failed to get response');
      
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: language === 'en' ? 'Sorry, I encountered an error processing your request.' : 'عذراً، واجهت خطأ أثناء معالجة طلبك.' 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'normal': return <CheckCircle2 className="h-5 w-5 text-[var(--color-urgency-normal)]" />;
      case 'low': 
      case 'high': return <AlertCircle className="h-5 w-5 text-[var(--color-urgency-warning)]" />;
      default: return <Info className="h-5 w-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'normal': return <Badge variant="success">{language === 'en' ? 'Normal' : 'طبيعي'}</Badge>;
      case 'low': return <Badge variant="warning">{language === 'en' ? 'Low' : 'منخفض'}</Badge>;
      case 'high': return <Badge variant="warning">{language === 'en' ? 'High' : 'مرتفع'}</Badge>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary-600)]" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Report Not Found</h2>
        <p className="text-slate-600 mb-6">{error || "The medical report you're looking for doesn't exist or you don't have access to it."}</p>
        <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
      </div>
    );
  }

  const reviewCount = caseData.markers?.filter((m: any) => m.status !== 'normal').length || 0;

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className={`h-5 w-5 text-slate-600 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{caseData.title}</h1>
            <p className="text-sm text-slate-500">{caseData.date}</p>
          </div>
        </div>
        <Button variant="outline" className="flex items-center gap-2" onClick={handleDownload} disabled={isDownloading}>
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">{isDownloading ? 'Downloading...' : t('report.download')}</span>
        </Button>
      </div>

      {/* Main Content Split */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* Left: Report Findings */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[var(--color-primary-600)]" />
              {t('report.findings')}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>
                {language === 'en' 
                  ? 'This AI-generated explanation is for informational purposes only. It is not a diagnosis. Always consult a physician.' 
                  : 'هذا التفسير المولد بالذكاء الاصطناعي هو لأغراض إعلامية فقط. إنه ليس تشخيصاً. استشر طبيباً دائماً.'}
              </p>
            </div>

            {/* Markers Accordion List */}
            <div className="space-y-3">
              {caseData.markers?.map((marker: any) => (
                <MarkerAccordion 
                  key={marker.id} 
                  marker={marker} 
                  language={language} 
                  getStatusIcon={getStatusIcon} 
                  getStatusBadge={getStatusBadge}
                  dir={dir}
                />
              ))}
              {(!caseData.markers || caseData.markers.length === 0) && (
                <div className="text-center py-8 text-slate-500">
                  No markers found in this report.
                </div>
              )}
            </div>

            {/* WhatsApp CTA */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <WhatsAppCTA 
                caseId={id || 'unknown'} 
                caseTitle={caseData.title} 
                reviewCount={reviewCount} 
                shareToken="demo-token-123" 
              />
            </div>
          </div>
        </div>

        {/* Right: Chat Interface */}
        <div className="w-full lg:w-[400px] xl:w-[450px] flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <h2 className="font-semibold text-slate-800">AI Assistant</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-[var(--color-primary-600)] text-white rounded-tr-sm rtl:rounded-tr-2xl rtl:rounded-tl-sm' 
                    : 'bg-slate-100 text-slate-800 rounded-tl-sm rtl:rounded-tl-2xl rtl:rounded-tr-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-100 bg-white shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isChatLoading ? (language === 'en' ? 'AI is thinking...' : 'الذكاء الاصطناعي يفكر...') : t('chat.placeholder')}
                disabled={isChatLoading}
                className="flex-1 h-10 rounded-full border border-slate-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent disabled:opacity-50 disabled:bg-slate-50"
                dir={dir}
              />
              <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={isChatLoading || !chatInput.trim()}>
                {isChatLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Send className={`h-4 w-4 ${dir === 'rtl' ? 'rotate-180' : ''} ${chatInput ? 'text-white' : 'text-white/70'}`} />
                )}
              </Button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
