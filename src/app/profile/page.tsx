
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Footer from '@/components/footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Copy, Upload } from 'lucide-react';
import { getUserData, UserData, saveUserPhotoUrl } from '@/lib/database';
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
import { getInitials, TelegramUser } from '@/lib/user-utils';
import LoadingDots from '@/components/loading-dots';
import { Card, CardContent } from '@/components/ui/card';

interface ProfilePageProps {}

export default function ProfilePage({}: ProfilePageProps) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogDescription, setDialogDescription] = useState('');

  const showDialog = (title: string, description: string) => {
    setDialogTitle(title);
    setDialogDescription(description);
    setDialogOpen(true);
  };


  const loadInitialData = useCallback(async (currentUser: TelegramUser) => {
      setIsLoading(true);
      try {
          const { userData: data } = await getUserData(currentUser);
          setUserData(data);
      } catch (error) {
          console.error("Failed to load user data:", error);
          showDialog('Error', 'Failed to load user data.');
      } finally {
          setIsLoading(false);
      }
  }, []);

  useEffect(() => {
    const init = () => {
      let currentUser: TelegramUser | null = null;
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

  const avatarSrc = userData?.customPhotoUrl || user?.photo_url;


  return (
    <div className="flex flex-col min-h-screen text-foreground font-body bg-background">
        <div className="relative z-10 flex-grow flex flex-col">
            <div className="flex-grow pb-32">
                {isLoading ? (
                    <div className="flex justify-center items-center h-screen">
                        <LoadingDots />
                    </div>
                ) : (
                <main className="flex-grow flex flex-col items-center p-4 space-y-8 mt-8">
                    <Card className="w-full max-w-sm glass-card">
                        <CardContent className="flex flex-col items-center text-center space-y-4 p-6">
                            <div className="relative group">
                                <Avatar className="w-24 h-24 border-4 border-primary" onClick={handleAvatarClick} >
                                    <AvatarImage src={avatarSrc} alt={displayName} />
                                    <AvatarFallback className="text-3xl bg-black/80">{getInitials(user)}</AvatarFallback>
                                </Avatar>
                                {isBrowserUser && (
                                    <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={handleAvatarClick}>
                                    {isUploading ? <LoadingDots /> : <Upload className="w-8 h-8 text-white" />}
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            </div>
                            {isBrowserUser && <p className="text-xs text-white/70">Click avatar to upload</p>}
                            
                            <div className="flex flex-col space-y-1">
                                <h2 className="text-2xl font-bold">{displayName}</h2>
                                {isBrowserUser ? (
                                    <div className="flex items-center justify-center gap-2 font-mono text-white/70 pt-1">
                                        <span className="truncate max-w-[200px]">ID: {user?.id}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-white/70 hover:bg-white/10 hover:text-white" onClick={() => handleCopy(user?.id.toString() || '')}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm text-white/70">@{user?.username || 'N/A'}</p>
                                        <p className="text-xs text-white/70 pt-2">ID: {user?.id}</p>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Separator className="w-full max-w-sm" />
                    
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
