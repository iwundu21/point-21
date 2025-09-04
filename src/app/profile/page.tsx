

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Footer from '@/components/footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle, XCircle, Loader2, Copy, Upload } from 'lucide-react';
import Webcam from "react-webcam";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { verifyHumanFace } from '@/ai/flows/face-verification-flow';
import { getUserData, saveVerificationStatus, UserData, saveUserPhotoUrl } from '@/lib/database';
import { Separator } from '@/components/ui/separator';
import { v4 as uuidv4 } from 'uuid';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"


declare global {
  interface Window {
    Telegram: any;
  }
}

interface User {
    id: number | string;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
}

type VerificationStatus = 'unverified' | 'detecting' | 'verified' | 'failed';

interface ProfilePageProps {}

export default function ProfilePage({}: ProfilePageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
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
  const [isUploading, setIsUploading] = useState(false);

  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogDescription, setDialogDescription] = useState('');

  const showDialog = (title: string, description: string) => {
    setDialogTitle(title);
    setDialogDescription(description);
    setDialogOpen(true);
  };


  const loadInitialData = useCallback(async (currentUser: User) => {
      setIsLoading(true);
      try {
          const { userData: data } = await getUserData(currentUser);
          setUserData(data);
          setAccountStatus(data.verificationStatus);
      } catch (error) {
          console.error("Failed to load user data:", error);
          showDialog('Error', 'Failed to load user data.');
      } finally {
          setIsLoading(false);
      }
  }, []);

  useEffect(() => {
    const init = () => {
      let currentUser: User | null = null;
      if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
        const tg = window.Telegram.WebApp;
        currentUser = tg.initDataUnsafe.user;
        tg.ready();
      } else if (typeof window !== 'undefined') {
        let browserId = localStorage.getItem('browser_user_id');
        if (!browserId) {
            browserId = uuidv4();
            localStorage.setItem('browser_user_id', browserId);
        }
        currentUser = { id: browserId, first_name: 'Browser User' };
      }
      
      if (currentUser) {
        setUser(currentUser);
        loadInitialData(currentUser);
      } else {
        setIsLoading(false);
      }
    };
    init();
  }, [loadInitialData]);


  const getInitials = () => {
    if (!user) return '';
    const firstNameInitial = user.first_name ? user.first_name[0] : '';
    const lastNameInitial = user.last_name ? user.last_name[0] : '';
    return `${firstNameInitial}${lastNameInitial}`.toUpperCase() || 'BU';
  }
  
  const handleStartVerification = () => {
      if (user?.first_name === 'Browser User' && !userData?.customPhotoUrl) {
        showDialog('Avatar Required', 'Please upload an avatar by clicking on your profile picture before starting verification.');
        return;
      }
      
      setIsVerificationInProgress(true);
      setIsVerifying(true);
      setTimeout(async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                setHasCameraPermission(true);
                setIsCameraActive(true);
                stream.getTracks().forEach(track => track.stop());
            } catch (error) {
                console.error("Camera access denied:", error);
                setHasCameraPermission(false);
                setIsVerificationInProgress(false);
                showDialog('Camera Access Denied', 'Please enable camera permissions in your browser settings.');
            }
        } else {
            setHasCameraPermission(false);
            setIsVerificationInProgress(false);
            showDialog('Camera Not Supported', 'Your browser does not support camera access.');
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
          const userIdString = typeof user.id === 'number' ? `user_${user.id}` : `browser_${user.id}`;
          const result = await verifyHumanFace({ 
              photoDataUri: imageSrc,
              userId: userIdString,
              user: user
          });
          
          if (result.isHuman && result.isUnique) {
            setVerificationSuccess(true);
            setAccountStatus('verified');
            // This is the key change: save all data after successful verification
            await saveVerificationStatus(user, 'verified', result.faceVerificationUri, result.faceFingerprint);
            showDialog('Verification Successful', 'Your account has been verified.');
          } else {
            setAccountStatus('failed');
            setFailureReason(result.reason || 'Verification failed. Please try again.');
            await saveVerificationStatus(user, 'failed'); // Still save the failed status
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
  }, [webcamRef, user]);
  
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
  
  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    showDialog('Copied!', 'Copied to Clipboard!');
  };
  
  const handleAvatarClick = () => {
      if (user?.first_name === 'Browser User' && fileInputRef.current) {
          fileInputRef.current.click();
      }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = event.target.files?.[0];
    if (file) {
        setIsUploading(true);
        
        // --- Image Resizing Logic ---
        const reader = new FileReader();
        reader.onload = async (e) => {
            const img = document.createElement('img');
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 256;
                const MAX_HEIGHT = 256;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL(file.type); // Get resized data URI

                try {
                    await saveUserPhotoUrl(user, dataUrl);
                    setUserData(prev => prev ? { ...prev, customPhotoUrl: dataUrl } : null);
                    showDialog('Avatar Updated!', 'Your new avatar has been saved.');
                } catch (error) {
                    console.error("Failed to save avatar:", error);
                    showDialog('Error', 'Could not update your avatar.');
                } finally {
                    setIsUploading(false);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = ''; // Reset file input
                    }
                }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    }
  };


  const displayName = user ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Anonymous';
  const isBrowserUser = user?.first_name === 'Browser User';

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
                 <Button onClick={resetVerification} variant="secondary" className="w-full">
                    Try Again
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
                        <Camera className="w-8 h-8 text-primary" /> System Verification
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
                                videoConstraints={{ facingMode: "user" }}
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

  const avatarSrc = userData?.customPhotoUrl || user?.photo_url;


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <div className="flex-grow pb-32">
        {isLoading ? null : isVerificationInProgress ? renderVerificationContent() : (
          <main className="flex-grow flex flex-col items-center p-4 space-y-8 mt-8">
            <div className="w-full max-w-sm flex flex-col items-center text-center space-y-4">
                <div className="relative group">
                    <Avatar className="w-24 h-24 border-4 border-primary" onClick={handleAvatarClick} >
                        <AvatarImage src={avatarSrc} alt={displayName} />
                        <AvatarFallback className="text-3xl">{getInitials()}</AvatarFallback>
                    </Avatar>
                     {isBrowserUser && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={handleAvatarClick}>
                           {isUploading ? <Loader2 className="w-8 h-8 animate-spin text-white" /> : <Upload className="w-8 h-8 text-white" />}
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                </div>
                {isBrowserUser && <p className="text-xs text-muted-foreground">Click avatar to upload</p>}
                
                <div className="flex flex-col space-y-1">
                    <h2 className="text-2xl font-bold">{displayName}</h2>
                    {isBrowserUser ? (
                        <div className="flex items-center justify-center gap-2 font-mono text-muted-foreground pt-1">
                            <span className="truncate max-w-[200px]">ID: {user?.id}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(user?.id.toString() || '')}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                         <>
                            <p className="text-sm text-muted-foreground">@{user?.username || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground pt-2">ID: {user?.id}</p>
                        </>
                    )}
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
                        <Camera className="w-6 h-6 text-primary" /> System Verification
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
       <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {dialogDescription}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setDialogOpen(false)}>OK</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}

    