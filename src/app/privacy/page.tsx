'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Footer from '@/components/footer';
import { ArrowLeft } from 'lucide-react';

interface PrivacyPageProps {}

export default function PrivacyPage({}: PrivacyPageProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
       <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm w-full max-w-sm mx-auto p-4 flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold mx-auto">Privacy Policy</h1>
      </header>
      <main className="flex-grow flex flex-col items-center p-4 space-y-4 text-sm text-muted-foreground max-w-sm mx-auto">
        <p>
          Your privacy is important to us. It is Exnus Points' policy to respect your privacy regarding any information we may collect from you across our application.
        </p>

        <h2 className="text-lg font-semibold text-foreground self-start pt-4">1. Information We Collect</h2>
        <p>
          We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.
          The primary data we collect is your public Telegram profile information as provided by the Telegram Mini App API.
        </p>
        
        <h2 className="text-lg font-semibold text-foreground self-start pt-4">2. Data Retention</h2>
        <p>
          We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we’ll protect within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use, or modification.
        </p>

        <h2 className="text-lg font-semibold text-foreground self-start pt-4">3. Sharing of Information</h2>
        <p>
         We do not share any personally identifying information publicly or with third-parties, except when required to by law.
        </p>
        
        <h2 className="text-lg font-semibold text-foreground self-start pt-4">4. Links to Other Sites</h2>
        <p>
          Our application may link to external sites that are not operated by us. Please be aware that we have no control over the content and practices of these sites, and cannot accept responsibility or liability for their respective privacy policies.
        </p>

        <p className="pt-4">Last updated: {new Date().toLocaleDateString()}</p>
      </main>
      <Footer />
    </div>
  );
}
