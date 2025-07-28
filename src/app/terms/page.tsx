
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Footer from '@/components/footer';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm w-full max-w-sm mx-auto p-4 flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold mx-auto">Terms & Conditions</h1>
      </header>
      <main className="flex-grow flex flex-col items-center p-4 space-y-4 text-sm text-muted-foreground max-w-sm mx-auto">
        <p>
          Welcome to Exnus Points. These terms and conditions outline the rules and regulations for the use of our application.
          By accessing this app, we assume you accept these terms and conditions. Do not continue to use Exnus Points if you do not agree to all of the terms and conditions stated on this page.
        </p>

        <h2 className="text-lg font-semibold text-foreground self-start pt-4">1. Points and Rewards</h2>
        <p>
          Points accumulated within the Exnus Points application hold no cash value and cannot be exchanged for real-world currency.
          Points are for in-app purposes only, such as tracking engagement and unlocking features.
          We reserve the right to modify, suspend, or terminate the points system at any time without notice.
        </p>

        <h2 className="text-lg font-semibold text-foreground self-start pt-4">2. User Conduct</h2>
        <p>
          You agree not to use the application for any unlawful purpose or any purpose prohibited under this clause. You agree not to use the application in any way that could damage the app, services, or general business of Exnus Points.
          This includes, but is not limited to, using automated systems or software to extract data from the application for commercial purposes ('screen scraping').
        </p>
        
        <h2 className="text-lg font-semibold text-foreground self-start pt-4">3. Verification</h2>
        <p>
          To prevent abuse of the system, users are required to complete a one-time facial verification process.
          Each individual is permitted to have only one account. Any attempt to create multiple accounts will result in a permanent ban and forfeiture of all accumulated points.
          The facial data is used solely for the purpose of ensuring uniqueness and is not shared with third parties.
        </p>

        <h2 className="text-lg font-semibold text-foreground self-start pt-4">4. Limitation of Liability</h2>
        <p>
          In no event shall Exnus Points, nor any of its officers, directors, and employees, be held liable for anything arising out of or in any way connected with your use of this application whether such liability is under contract.
          Exnus Points, including its officers, directors, and employees shall not be held liable for any indirect, consequential, or special liability arising out of or in any way related to your use of this application.
        </p>
        
        <h2 className="text-lg font-semibold text-foreground self-start pt-4">5. Changes to Terms</h2>
        <p>
          We reserve the right, in our sole discretion, to change these Terms and Conditions at any time. We will provide notice of any changes by posting the new Terms and Conditions on this page.
        </p>
        
        <p className="pt-4">Last updated: {new Date().toLocaleDateString()}</p>
      </main>
      <Footer />
    </div>
  );
}
