import React from 'react';
import { Button } from '@/src/components/ui/Button';
import { useLanguage } from '@/src/contexts/LanguageContext';

interface WhatsAppCTAProps {
  caseId: string;
  caseTitle: string;
  reviewCount: number;
  shareToken: string;
}

export function WhatsAppCTA({ caseId, caseTitle, reviewCount, shareToken }: WhatsAppCTAProps) {
  const { language, dir } = useLanguage();
  
  const WHATSAPP_NUMBER = "12345678900"; 
  const APP_DOMAIN = "https://medinfo.com";

  const generateMessage = () => {
    const secureLink = `${APP_DOMAIN}/shared/${shareToken}`;
    
    if (language === 'ar') {
      return `مرحباً! 👋 استخدمت MedInfo لتحليل تقريري الطبي الأخير (*حالة: ${caseTitle}*).\n\nأشار الذكاء الاصطناعي إلى وجود *${reviewCount} نتائج* تحتاج إلى مراجعة. أود تحديد موعد لاستشارة طبيب لمناقشة هذه النتائج.\n\nإليك الرابط الآمن لملخص حالتي: ${secureLink}`;
    }
    
    return `Hello! 👋 I used MedInfo to analyze my recent medical report (*Case: ${caseTitle}*).\n\nThe AI flagged *${reviewCount} findings* that need review. I would like to schedule a consultation with a doctor to discuss these results.\n\nHere is my secure case summary link: ${secureLink}`;
  };

  const [isRedirecting, setIsRedirecting] = React.useState(false);

  const handleWhatsAppClick = () => {
    setIsRedirecting(true);
    console.log('Tracking Event: whatsapp_lead_clicked', { caseId, reviewCount, language });
    const text = encodeURIComponent(generateMessage());
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => setIsRedirecting(false), 2000);
  };

  return (
    <Button 
      onClick={handleWhatsAppClick}
      disabled={isRedirecting}
      className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 transition-all hover:scale-[1.02]"
      size="lg"
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
      <span dir={dir}>
        {isRedirecting ? 'Opening WhatsApp...' : (language === 'en' ? 'Consult a Doctor on WhatsApp' : 'استشر طبيباً عبر واتساب')}
      </span>
    </Button>
  );
}
