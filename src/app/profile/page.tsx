
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Footer from '@/components/footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Webcam from "react-webcam";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { verifyHumanFace } from '@/ai/flows/face-verification-flow';
import { Toaster } from '@/components/ui/toaster';
import { getVerificationStatus, saveVerificationStatus } from '@/lib/database';
import { Separator } from '@/components/ui/separator';

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

type VerificationStatus = 'unverified' | 'detecting' | 'verified' | 'failed';

interface ProfilePageProps {}

export default function ProfilePage({}: ProfilePageProps) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProcessingVerification, setIsProcessingVerification] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [accountStatus, setAccountStatus] = useState<VerificationStatus>('unverified');
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [isVerificationInProgress, setIsVerificationInProgress] = useState(false);

  const webcamRef = useRef<Webcam>(null);
  const { toast } = useToast();

  useEffect(() => {
    const init = () => {
      let telegramUser: TelegramUser | null = null;
      if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        if (tg.initDataUnsafe?.user) {
            telegramUser = tg.initDataUnsafe.user;
            tg.ready();
        }
      }
      
      if (telegramUser) {
        setUser(telegramUser);
      } else {
        // Fallback for development
        const mockUser: TelegramUser = { id: 123, first_name: 'Dev', username: 'devuser', language_code: 'en', photo_url: 'https://placehold.co/128x128.png' };
        setUser(mockUser);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const loadStatus = async () => {
        if (user) {
            setIsLoading(true);
            try {
                const storedStatus = await getVerificationStatus(user);
                setAccountStatus(storedStatus);
            } catch (error) {
                console.error("Failed to load verification status:", error);
            } finally {
                setIsLoading(false);
            }
        }
    };
    loadStatus();
  }, [user]);

  const getInitials = () => {
    if (!user) return '';
    const firstNameInitial = user.first_name ? user.first_name[0] : '';
    const lastNameInitial = user.last_name ? user.last_name[0] : '';
    return `${firstNameInitial}${lastNameInitial}`.toUpperCase();
  }
  
  const handleStartVerification = () => {
      setIsVerificationInProgress(true);
      setIsVerifying(true);
      setTimeout(async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                setHasCameraPermission(true);
                setIsCameraActive(true);
                // The stream is automatically handled by the Webcam component
            } catch (error) {
                console.error("Camera access denied:", error);
                setHasCameraPermission(false);
                setIsVerificationInProgress(false);
                toast({
                    variant: 'destructive',
                    title: 'Camera Access Denied',
                    description: 'Please enable camera permissions in your browser settings.',
                });
            }
        } else {
            setHasCameraPermission(false);
            setIsVerificationInProgress(false);
            toast({
                variant: 'destructive',
                title: 'Camera Not Supported',
                description: 'Your browser does not support camera access.',
            });
        }
        setIsVerifying(false);
      }, 1000);
  };

  const capture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc && user) {
        setCapturedImage(imageSrc);
        setIsCameraActive(false);
        setIsProcessingVerification(true);
        setAccountStatus('detecting');

        try {
          const result = await verifyHumanFace({ 
              photoDataUri: imageSrc,
              userId: `tg_user_${user.id}`
          });
          
          if (result.isHuman && result.isUnique) {
            setVerificationSuccess(true);
            setAccountStatus('verified');
            await saveVerificationStatus(user, 'verified');
             toast({
              title: 'Verification Successful',
              description: 'Your account has been verified.',
            });
          } else {
            setAccountStatus('failed');
            setFailureReason(result.reason || 'Verification failed. Please try again.');
            await saveVerificationStatus(user, 'failed');
          }
        } catch (error) {
           console.error('Verification error:', error);
           setAccountStatus('failed');
           setFailureReason('An unexpected error occurred. Please try again later.');
           await saveVerificationStatus(user, 'failed');
        } finally {
            setIsProcessingVerification(false);
        }
    }
  }, [webcamRef, toast, user]);
  
  const handleDone = () => {
    setVerificationSuccess(false);
    setCapturedImage(null);
    setIsVerificationInProgress(false);
  };

  const resetVerification = async () => {
    setCapturedImage(null);
    setHasCameraPermission(null);
    setVerificationSuccess(false);
    setIsProcessingVerification(false);
    setAccountStatus('unverified');
    setFailureReason(null);
    setIsVerificationInProgress(false);
    if(user) {
        await saveVerificationStatus(user, 'unverified');
    }
  }

  const displayName = user ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Anonymous';

  if (isLoading || !user) {
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
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Verification in Progress...
                </span>
            );
        case 'failed':
             return (
                <span className="text-red-500 font-bold flex items-center text-sm">
                    <XCircle className="w-4 h-4 mr-1" /> Verification Failed
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
  
  const renderVerificationFailure = () => {
    if (accountStatus !== 'failed' || isProcessingVerification || !failureReason) return null;

    return (
        <div className="text-center space-y-4 p-4 border border-destructive/50 bg-destructive/10 rounded-lg w-full max-w-sm">
             <AlertTitle className="font-bold flex items-center justify-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" />
                Verification Failed
            </AlertTitle>
            <AlertDescription>
                {failureReason}
            </AlertDescription>
            <div className="flex justify-center gap-4 pt-2">
                <Button onClick={() => {
                  resetVerification();
                  handleStartVerification();
                }} variant="outline" className="w-full">
                    Try Again
                </Button>
                 <Button onClick={resetVerification} variant="secondary" className="w-full">
                    Cancel
                </Button>
            </div>
        </div>
    );
  }

  const renderVerificationContent = () => {
    return (
        <main className="flex-grow flex flex-col items-center justify-center p-4 w-full max-w-sm mx-auto">
            <div className="w-full space-y-4">
                <div className="text-center">
                  {accountStatus === 'verified' && verificationSuccess ? (
                    <h2 className="text-2xl font-bold flex items-center justify-center gap-2 text-green-500">
                        <CheckCircle className="w-8 h-8" /> Verified
                    </h2>
                  ) : (
                    <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                        <Camera className="w-8 h-8" /> System Verification
                    </h2>
                  )}
                </div>

                {hasCameraPermission === false && !isVerificationInProgress && (
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
                       {renderVerificationFailure()}
                    </div>
                ) : verificationSuccess ? (
                    <div className='flex flex-col items-center justify-center gap-4 text-green-400 text-center p-4'>
                        <CheckCircle className="w-12 h-12" />
                        <h3 className="text-xl font-semibold">Account Verified</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">Your account has been successfully verified. You can now close this message.</p>
                        <Button onClick={handleDone} className="w-full max-w-xs">Done</Button>
                    </div>
                ) : (
                     accountStatus === 'failed' ? renderVerificationFailure() : (
                        <div className='text-center space-y-4'>
                            <p className="text-sm text-muted-foreground">Verify your identity by taking a photo of your face.</p>
                            <Button onClick={handleStartVerification} className="w-full">
                               <Camera className="mr-2 h-4 w-4" /> Start Verification
                            </Button>
                        </div>
                    )
                )}
            </div>
        </main>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <Toaster />
      <div className="flex-grow pb-32">
        {isVerificationInProgress ? renderVerificationContent() : (
          <main className="flex-grow flex flex-col items-center p-4 space-y-8 mt-8">
            <div className="w-full max-w-sm flex flex-col items-center text-center space-y-4">
                <Avatar className="w-24 h-24 border-4 border-primary">
                    <AvatarImage src={user.photo_url} alt={displayName} />
                    <AvatarFallback className="text-3xl">{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                    <h2 className="text-2xl font-bold">{displayName}</h2>
                    <p className="text-sm text-muted-foreground">@{user.username || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground pt-2">ID: {user.id}</p>
                    <div className="flex items-center justify-center pt-2">
                        <p className="text-sm font-semibold mr-2">Status:</p>
                        {renderAccountStatus()}
                    </div>
                </div>
            </div>

            <Separator className="w-full max-w-sm" />
            
            <div className="w-full max-w-sm space-y-4">
                <div className="text-center">
                  {accountStatus === 'verified' ? (
                    <h2 className="text-xl font-bold flex items-center justify-center gap-2 text-green-500">
                        <CheckCircle className="w-6 h-6" /> Account Verified
                    </h2>
                  ) : (
                    <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                        <Camera className="w-6 h-6" /> System Verification
                    </h2>
                  )}
                </div>

                 {accountStatus === 'unverified' || accountStatus === 'failed' ? (
                     accountStatus === 'failed' && failureReason ? renderVerificationFailure() : (
                        <div className='text-center space-y-4'>
                            <p className="text-sm text-muted-foreground">Verify your identity by taking a photo of your face.</p>
                            <Button onClick={handleStartVerification} className="w-full">
                               <Camera className="mr-2 h-4 w-4" /> Start Verification
                            </Button>
                        </div>
                    )
                ) : (
                    <div className='flex flex-col items-center justify-center gap-4 text-green-400 text-center p-4'>
                        <CheckCircle className="w-12 h-12" />
                        <p className="text-muted-foreground">You have successfully verified your account.</p>
                    </div>
                )}
            </div>
          </main>
        )}
         <div className="text-center text-xs text-muted-foreground p-4 mt-8">
            <div className="flex justify-center items-center space-x-4">
                <Link href="/terms" className="hover:text-primary">Terms & Conditions</Link>
                <span>|</span>
                <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
            </div>
            <p className="mt-2">© 2025 Exnus Points. All rights reserved.</p>
         </div>
      </div>
      <Footer />
    </div>
  );
}
