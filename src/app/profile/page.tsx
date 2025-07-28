
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Footer from '@/components/footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Webcam from "react-webcam";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

declare global {
  interface Window {
    Telegram: any;
  }
}

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code: string;
    is_premium?: boolean;
    photo_url?: string;
}

type VerificationStatus = 'unverified' | 'detecting' | 'verified';

export default function ProfilePage() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProcessingVerification, setIsProcessingVerification] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [accountStatus, setAccountStatus] = useState<VerificationStatus>('unverified');
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      const telegramUser = tg.initDataUnsafe?.user;
      if (telegramUser) {
        setUser(telegramUser);
      }
    }
  }, []);

  const getInitials = () => {
    if (!user) return '';
    const firstNameInitial = user.first_name ? user.first_name[0] : '';
    const lastNameInitial = user.last_name ? user.last_name[0] : '';
    return `${firstNameInitial}${lastNameInitial}`.toUpperCase();
  }
  
  const handleStartVerification = () => {
      setIsVerifying(true);
      setTimeout(async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
                setHasCameraPermission(true);
                setIsCameraActive(true);
            } catch (error) {
                console.error("Camera access denied:", error);
                setHasCameraPermission(false);
            }
        } else {
            setHasCameraPermission(false);
        }
        setIsVerifying(false);
      }, 6000);
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
        setCapturedImage(imageSrc);
        setIsCameraActive(false);
        setIsProcessingVerification(true);
        setAccountStatus('detecting');

        setTimeout(() => {
            setIsProcessingVerification(false);
            setVerificationSuccess(true);
            setAccountStatus('verified');
        }, 10000); 
    }
  }, [webcamRef]);
  
  const handleDone = () => {
    setVerificationSuccess(false);
    setCapturedImage(null);
  };

  const resetVerification = () => {
    setCapturedImage(null);
    setHasCameraPermission(null);
    setVerificationSuccess(false);
    setIsProcessingVerification(false);
    setAccountStatus('unverified');
  }

  const displayName = user ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Anonymous';

  if (!isClient || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
        <main className="flex-grow flex flex-col items-center justify-center p-4 space-y-8">
          <Skeleton className="w-full max-w-sm h-48" />
          <Skeleton className="w-full max-w-sm h-64" />
        </main>
        <Footer />
      </div>
    );
  }

  const renderAccountStatus = () => {
    switch (accountStatus) {
        case 'verified':
            return (
                <span className="text-green-500 font-bold flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 mr-1" /> Verified
                </span>
            );
        case 'detecting':
            return (
                <span className="text-yellow-500 font-bold flex items-center text-sm">
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Verification detection...
                </span>
            );
        case 'unverified':
        default:
            return (
                <span className="text-red-500 font-bold flex items-center text-sm">
                    <XCircle className="w-4 h-4 mr-1" /> Unverified
                </span>
            );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <main className="flex-grow flex flex-col items-center p-4 space-y-8 mt-8">
        <Card className="w-full max-w-sm bg-primary/5 border-primary/20 p-6">
            <CardContent className="flex items-center space-x-6">
                <Avatar className="w-24 h-24 border-4 border-primary">
                    <AvatarImage src={user.photo_url} alt={displayName} />
                    <AvatarFallback className="text-3xl">{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                    <h2 className="text-2xl font-bold">{displayName}</h2>
                    <p className="text-sm text-muted-foreground">@{user.username || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground pt-2">ID: {user.id}</p>
                    <div className="flex items-center pt-2">
                        <p className="text-sm font-semibold mr-2">Status:</p>
                        {renderAccountStatus()}
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card className="w-full max-w-sm bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Camera className="w-6 h-6" /> System Verification
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {hasCameraPermission === false && (
                    <Alert variant="destructive">
                      <AlertTitle>Camera Access Denied</AlertTitle>
                      <AlertDescription>
                        Please enable camera permissions in your browser settings to use this feature.
                      </AlertDescription>
                    </Alert>
                )}
                
                {isVerifying ? (
                    <div className="flex flex-col items-center justify-center space-y-4 p-8">
                      <Loader2 className="w-12 h-12 animate-spin text-primary" />
                      <p className="text-muted-foreground">Please wait...</p>
                    </div>
                ) : isCameraActive ? (
                    <div className="space-y-4 flex flex-col items-center">
                        <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-primary">
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <Button onClick={capture} className="w-full max-w-xs">
                            <Camera className="mr-2 h-4 w-4" /> Capture
                        </Button>
                    </div>
                ) : capturedImage && !verificationSuccess ? (
                    <div className="space-y-4 text-center">
                       <div className="relative w-64 h-64 mx-auto">
                            <img src={capturedImage} alt="Captured" className="rounded-full w-full h-full object-cover" />
                            {isProcessingVerification && (
                                <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center">
                                    <Loader2 className="w-12 h-12 animate-spin text-white" />
                                    <p className="text-white mt-2 font-semibold">Verifying...</p>
                                </div>
                            )}
                       </div>
                       {!isProcessingVerification && (
                             <Button onClick={resetVerification} variant="outline">
                                Retake Photo
                            </Button>
                        )}
                    </div>
                ) : verificationSuccess ? (
                    <div className='flex flex-col items-center justify-center gap-4 text-green-400 text-center p-4'>
                        <CheckCircle className="w-12 h-12" />
                        <h3 className="text-xl font-semibold">Account Verified</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">Your account has been successfully verified. You can now close this message.</p>
                        <Button onClick={handleDone} className="w-full max-w-xs">Done</Button>
                    </div>
                ) : accountStatus === 'unverified' ? (
                    <div className='text-center space-y-4'>
                        <p className="text-sm text-muted-foreground">Verify your identity by taking a photo of your face.</p>
                        <Button onClick={handleStartVerification} className="w-full">
                           <Camera className="mr-2 h-4 w-4" /> Start Verification
                        </Button>
                    </div>
                ) : null}
            </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
