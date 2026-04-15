import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { CheckCircle2, Zap, Loader2 } from 'lucide-react';

export function Pricing() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) {
      navigate('/');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
        }),
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to initiate checkout. Please try again later.');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Choose Your Plan</h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Get the most out of MedInfo with our Pro plan. Upgrade today for unlimited medical report analysis.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Tier */}
        <Card className={`p-8 flex flex-col ${userProfile?.tier === 'free' ? 'border-2 border-slate-300' : 'border border-slate-200'}`}>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Free</h2>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold">
              $0
              <span className="ml-1 text-xl font-medium text-slate-500">/mo</span>
            </div>
            <p className="mt-4 text-slate-500">Perfect for trying out the platform.</p>
          </div>
          
          <ul className="flex-1 space-y-4 mb-8">
            <li className="flex items-start">
              <CheckCircle2 className="h-6 w-6 text-slate-400 shrink-0 mr-3" />
              <span className="text-slate-600">1 Case Analysis Limit</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="h-6 w-6 text-slate-400 shrink-0 mr-3" />
              <span className="text-slate-600">Basic AI Insights</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="h-6 w-6 text-slate-400 shrink-0 mr-3" />
              <span className="text-slate-600">Standard Support</span>
            </li>
          </ul>

          <Button 
            variant={userProfile?.tier === 'free' ? 'outline' : 'outline'} 
            className="w-full"
            disabled={userProfile?.tier === 'free'}
            onClick={() => navigate('/dashboard')}
          >
            {userProfile?.tier === 'free' ? 'Current Plan' : 'Get Started'}
          </Button>
        </Card>

        {/* Pro Tier */}
        <Card className={`p-8 flex flex-col relative ${userProfile?.tier === 'pro' ? 'border-2 border-[var(--color-primary-500)]' : 'border-2 border-[var(--color-primary-500)] shadow-xl'}`}>
          {userProfile?.tier !== 'pro' && (
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-100)] px-3 py-1 text-sm font-semibold text-[var(--color-primary-700)]">
                <Zap className="h-4 w-4" />
                Recommended
              </span>
            </div>
          )}
          
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[var(--color-primary-700)]">Pro</h2>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold text-slate-900">
              $19
              <span className="ml-1 text-xl font-medium text-slate-500">/mo</span>
            </div>
            <p className="mt-4 text-slate-500">For ongoing health monitoring and unlimited analysis.</p>
          </div>
          
          <ul className="flex-1 space-y-4 mb-8">
            <li className="flex items-start">
              <CheckCircle2 className="h-6 w-6 text-[var(--color-primary-500)] shrink-0 mr-3" />
              <span className="text-slate-700 font-medium">Unlimited Case Analyses</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="h-6 w-6 text-[var(--color-primary-500)] shrink-0 mr-3" />
              <span className="text-slate-700">Advanced AI Insights & Explanations</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="h-6 w-6 text-[var(--color-primary-500)] shrink-0 mr-3" />
              <span className="text-slate-700">Priority Email Support</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="h-6 w-6 text-[var(--color-primary-500)] shrink-0 mr-3" />
              <span className="text-slate-700">Export to PDF</span>
            </li>
          </ul>

          <Button 
            className="w-full bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white"
            onClick={userProfile?.tier === 'pro' ? () => navigate('/dashboard') : handleUpgrade}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </span>
            ) : userProfile?.tier === 'pro' ? (
              'Current Plan'
            ) : (
              'Upgrade to Pro'
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
}
