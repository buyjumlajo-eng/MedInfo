import React, { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/src/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { FileText, Plus, ArrowRight, Zap, Loader2 } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/src/firebase';

export function Dashboard() {
  const { t, dir } = useLanguage();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'cases'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const casesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in memory by createdAt desc
      casesData.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setCases(casesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching cases:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleUploadClick = () => {
    if (userProfile?.tier === 'free' && cases.length >= 1) {
      navigate('/pricing');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && user) {
      setIsUploading(true);
      setUploadError(null);
      
      try {
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        // Upload to Firebase Storage
        let fileUrl = '';
        try {
          const storageRef = ref(storage, `users/${user.uid}/reports/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          fileUrl = await getDownloadURL(snapshot.ref);
        } catch (storageErr: any) {
          console.error("Storage upload failed, continuing without saving file:", storageErr);
          // Don't fail the whole process if just the storage upload fails, maybe rules aren't set
        }

        // Call the real Gemini AI backend
        const response = await fetch('/api/analyze-report', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to analyze report using AI. Ensure the file is a clear image or PDF.');
        }

        const aiData = await response.json();
        
        // Generate a new document ID
        const newCaseRef = doc(collection(db, 'cases'));
        
        // Add IDs to markers
        const markersWithIds = aiData.markers.map((m: any, index: number) => ({
          ...m,
          id: `m${index}`
        }));

        const reviewCount = markersWithIds.filter((m: any) => m.status !== 'normal').length;

        const extractedData = {
          id: newCaseRef.id,
          userId: user.uid,
          title: `Report - ${file.name}`,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          status: 'analyzed',
          reviewCount: reviewCount,
          markers: markersWithIds,
          fileUrl: fileUrl,  // Keep the url
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await setDoc(newCaseRef, extractedData);
        
        setIsUploading(false);
        navigate(`/case/${newCaseRef.id}`);
      } catch (error: any) {
        console.error("Error uploading case:", error);
        setUploadError(`Failed to process report: ${error.message}`);
        setIsUploading(false);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const getUrgencyInfo = (reviewCount: number) => {
    if (reviewCount > 7) return { variant: 'danger' as const, label: 'case.status.critical', dotClass: 'bg-[var(--color-urgency-critical)]' };
    if (reviewCount > 3) return { variant: 'warning' as const, label: 'case.status.warning', dotClass: 'bg-[var(--color-urgency-warning)]' };
    if (reviewCount > 0) return { variant: 'warning' as const, label: 'case.status.review', dotClass: 'bg-[var(--color-urgency-warning)]' };
    return { variant: 'success' as const, label: 'case.status.normal', dotClass: 'bg-[var(--color-urgency-normal)]' };
  };

  const filteredCases = cases.filter(c => {
    if (filterType === 'all') return true;
    const reviewCount = c.reviewCount || 0;
    if (filterType === 'normal') return reviewCount === 0;
    if (filterType === 'review') return reviewCount > 0 && reviewCount <= 3;
    if (filterType === 'warning') return reviewCount > 3 && reviewCount <= 7;
    if (filterType === 'critical') return reviewCount > 7;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto">
      {userProfile?.tier === 'free' && (
        <div className="mb-8 rounded-lg bg-[var(--color-primary-50)] border border-[var(--color-primary-200)] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-full shadow-sm">
              <Zap className="h-5 w-5 text-[var(--color-primary-600)]" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-primary-900)]">You are on the Free Plan</h3>
              <p className="text-sm text-[var(--color-primary-700)]">You have reached your limit of 1 case analysis. Upgrade to Pro for unlimited access.</p>
            </div>
          </div>
          <Button onClick={() => navigate('/pricing')} className="shrink-0 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white">
            Upgrade to Pro
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('dashboard.title')}</h1>
          <p className="text-slate-500 mt-1">Manage your medical reports and AI analyses.</p>
        </div>
        <Button className="flex items-center gap-2" onClick={handleUploadClick} disabled={isUploading || loading}>
          <Plus className="h-4 w-4" />
          {isUploading ? 'Uploading...' : t('nav.newCase')}
        </Button>
      </div>

      {uploadError && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 shrink-0 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex gap-3">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-red-500 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-red-800 text-sm">Upload Processing Error</h3>
              <p className="mt-1 flex text-sm text-red-700 leading-relaxed block">{uploadError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-6" dir={dir}>
        <Button variant={filterType === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('all')}>
          {t('dashboard.filter.all')}
        </Button>
        <Button variant={filterType === 'normal' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('normal')}>
          {t('case.status.normal')}
        </Button>
        <Button variant={filterType === 'review' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('review')}>
          {t('case.status.review')}
        </Button>
        <Button variant={filterType === 'warning' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('warning')}>
          {t('case.status.warning')}
        </Button>
        <Button variant={filterType === 'critical' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('critical')}>
          {t('case.status.critical')}
        </Button>
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange} 
        accept=".pdf,.jpg,.jpeg,.png" 
      />

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary-600)]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Upload Card */}
          {(filterType === 'all' || cases.length === 0) && (
            <Card 
              onClick={handleUploadClick}
              className={`border-dashed border-2 border-slate-300 bg-slate-50 transition-colors flex flex-col items-center justify-center min-h-[200px] ${isUploading ? 'opacity-70 cursor-wait' : 'hover:bg-slate-100 cursor-pointer'}`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-slate-200 mb-4"></div>
                  <p className="font-medium text-slate-900">Processing...</p>
                </div>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center mb-4">
                    <Plus className="h-6 w-6 text-slate-600" />
                  </div>
                  <p className="font-medium text-slate-900">{t('case.upload')}</p>
                  <p className="text-sm text-slate-500 mt-1">PDF, JPG, PNG</p>
                </>
              )}
            </Card>
          )}

          {/* Case Cards */}
          {filteredCases.map((c) => {
            const urgency = getUrgencyInfo(c.reviewCount || 0);
            return (
              <Link key={c.id} to={`/case/${c.id}`} className="block group">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-2 bg-[var(--color-primary-50)] rounded-lg relative">
                        <FileText className="h-5 w-5 text-[var(--color-primary-600)]" />
                        {/* Urgency Dot Indicator */}
                        {c.reviewCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            {c.reviewCount > 3 && (
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${urgency.dotClass}`}></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${urgency.dotClass}`}></span>
                          </span>
                        )}
                      </div>
                      <Badge variant={urgency.variant}>
                        {t(urgency.label)}
                      </Badge>
                    </div>
                    <CardTitle className="group-hover:text-[var(--color-primary-600)] transition-colors line-clamp-1">
                      {c.title}
                    </CardTitle>
                    <CardDescription>{c.date}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-slate-600 border-t border-slate-100 pt-4">
                      <div className="flex flex-col">
                        <span>{c.markers?.length || 0} markers analyzed</span>
                        {c.reviewCount > 0 && (
                          <span className={`text-xs mt-0.5 ${urgency.variant === 'danger' ? 'text-[var(--color-urgency-critical)] font-medium' : urgency.variant === 'warning' ? 'text-[var(--color-urgency-warning)] font-medium' : ''}`}>
                            {c.reviewCount} finding{c.reviewCount !== 1 ? 's' : ''} need{c.reviewCount === 1 ? 's' : ''} review
                          </span>
                        )}
                      </div>
                      <ArrowRight className={`h-4 w-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          
          {/* Empty State for Filters */}
          {cases.length > 0 && filteredCases.length === 0 && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 py-10 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
              <FileText className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No cases found matching this filter.</p>
              <Button variant="ghost" className="mt-2 text-slate-600" onClick={() => setFilterType('all')}>
                Clear Filter
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
