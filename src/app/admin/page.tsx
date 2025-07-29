
'use client';

import { useState, useEffect } from 'react';
import { Shield, Loader2, Trash2, UserX, UserCheck, Lock, CameraOff } from 'lucide-react';
import Footer from '@/components/footer';
import { getAllUsers, updateUserStatus, deleteUser, UserData } from '@/lib/database';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { buttonVariants } from '@/components/ui/button';


// NOTE: Add your Telegram user ID here for admin access
const ADMIN_IDS = [123, 12345, 6954452147]; 
const ADMIN_ACCESS_CODE = '202020';

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
    photo_url?: string;
}

const getInitials = (user: UserData) => {
    if (!user.telegramUser) return '??';
    const firstNameInitial = user.telegramUser.first_name ? user.telegramUser.first_name[0] : '';
    const lastNameInitial = user.telegramUser.last_name ? user.telegramUser.last_name[0] : '';
    return `${firstNameInitial}${lastNameInitial}`.toUpperCase() || '??';
}

export default function AdminPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [currentUser, setCurrentUser] = useState<TelegramUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [codeAuthenticated, setCodeAuthenticated] = useState(false);

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
              setCurrentUser(telegramUser);
              if (ADMIN_IDS.includes(telegramUser.id)) {
                setIsAdmin(true);
              }
          } else {
              // Fallback for development
              const mockUser: TelegramUser = { id: 123, first_name: 'Dev', username: 'devuser', photo_url: 'https://placehold.co/128x128.png' };
              setCurrentUser(mockUser);
              if (ADMIN_IDS.includes(mockUser.id)) {
                setIsAdmin(true);
              }
          }
        };
        init();
    }, []);
    
    const fetchUsers = async () => {
        if (!hasMore || (!isAdmin && !codeAuthenticated)) return;
        setIsLoading(true);
        try {
            const { users: newUsers, lastDoc: newLastDoc } = await getAllUsers();
            setUsers(newUsers);
            setLastDoc(newLastDoc);
            if (!newLastDoc) {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
      if(isAdmin || codeAuthenticated) {
        fetchUsers();
      } else {
        setIsLoading(false);
      }
    }, [isAdmin, codeAuthenticated]);

    const handleLoadMore = async () => {
        if (!lastDoc || isFetchingMore) return;
        setIsFetchingMore(true);
        try {
            const { users: newUsers, lastDoc: newLastDoc } = await getAllUsers(lastDoc);
            setUsers(prev => [...prev, ...newUsers]);
            setLastDoc(newLastDoc);
            if (!newLastDoc) {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Failed to fetch more users:", error);
        } finally {
            setIsFetchingMore(false);
        }
    };

    const handleUpdateStatus = async (userId: string, status: 'active' | 'banned') => {
        await updateUserStatus(userId, status);
        setUsers(users.map(u => u.id === userId ? { ...u, status } : u));
        toast({ title: `User ${status === 'active' ? 'unbanned' : 'banned'}.`});
    }

    const handleDeleteUser = async (userId: string) => {
        await deleteUser(userId);
        setUsers(users.filter(u => u.id !== userId));
        toast({ variant: 'destructive', title: 'User Deleted', description: 'The user has been permanently removed.'});
    }
    
    const handleCodeSubmit = () => {
        if (accessCode === ADMIN_ACCESS_CODE) {
            setCodeAuthenticated(true);
            setIsLoading(true);
        } else {
            toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: 'The access code is incorrect.',
            });
            setAccessCode('');
        }
    }

    const renderAdminSkeleton = () => (
        <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-grow space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded-md" />
                </div>
            ))}
        </div>
    );
    
    if (!isAdmin && !codeAuthenticated) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
                <Card className="max-w-sm w-full">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2"><Lock className="w-6 h-6"/> Admin Access</CardTitle>
                        <CardDescription>Enter the access code to continue.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <Input 
                            type="password"
                            placeholder="Enter access code"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
                        />
                       <Button onClick={handleCodeSubmit} className="w-full">
                           Submit
                       </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
       <div className="flex-grow pb-24">
        <main className="flex-grow flex flex-col p-4 mt-8">
             <div className="w-full max-w-6xl mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                        <Shield className="w-8 h-8 text-primary" />
                        Admin Dashboard
                    </h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>User Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading && users.length === 0 ? (
                            renderAdminSkeleton()
                        ) : (
                          <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Photo</TableHead>
                                    <TableHead>Balance</TableHead>
                                    <TableHead>Referrals</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-10 h-10">
                                                    <AvatarImage src={user.telegramUser?.photo_url} />
                                                    <AvatarFallback>{getInitials(user)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium truncate max-w-[150px]">{user.telegramUser?.first_name || 'Anonymous'}</p>
                                                    <p className="text-xs text-muted-foreground">@{user.telegramUser?.username || 'N/A'}</p>
                                                    <p className="text-xs text-muted-foreground font-mono">ID: {user.telegramUser?.id}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {user.faceVerificationUri ? (
                                                <Avatar className="w-10 h-10 border">
                                                    <AvatarImage src={user.faceVerificationUri} />
                                                    <AvatarFallback><CameraOff className="w-4 h-4 text-muted-foreground" /></AvatarFallback>
                                                </Avatar>
                                            ) : (
                                                <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-full">
                                                  <CameraOff className="w-5 h-5 text-muted-foreground" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>{user.balance.toLocaleString()}</TableCell>
                                        <TableCell>{user.referrals}</TableCell>
                                        <TableCell>
                                            <Badge variant={user.status === 'active' ? 'default' : 'destructive'} className={cn(user.status === 'active' && 'bg-green-500/80')}>{user.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {user.status === 'active' ? (
                                                <Button variant="destructive" size="icon" onClick={() => handleUpdateStatus(user.id, 'banned')}><UserX className="h-4 w-4"/></Button>
                                            ) : (
                                                <Button variant="secondary" size="icon" onClick={() => handleUpdateStatus(user.id, 'active')}><UserCheck className="h-4 w-4"/></Button>
                                            )}

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This action cannot be undone. This will permanently delete the user and all their data.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className={cn(buttonVariants({variant: 'destructive'}))}>Delete User</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                           </Table>
                          </div>
                        )}
                         {hasMore && (
                            <div className="text-center mt-4">
                                <Button onClick={handleLoadMore} disabled={isFetchingMore}>
                                    {isFetchingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {isFetchingMore ? 'Loading...' : 'Load More'}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
       </div>
      <Footer />
    </div>
  );
}

