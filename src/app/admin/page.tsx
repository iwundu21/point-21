
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Shield, Loader2, Trash2, UserX, UserCheck, Lock, CameraOff, Copy, Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, PlusCircle, MessageCircle, ThumbsUp, Repeat, Coins, Users, Star, Download, Pencil, Wallet, Server, Bot, Monitor, Zap, LogOut } from 'lucide-react';
import { getAllUsers, updateUserStatus, deleteUser, UserData, addSocialTask, getSocialTasks, deleteSocialTask, SocialTask, updateUserBalance, saveWalletAddress, findUserByWalletAddress, getTotalUsersCount, getTotalActivePoints, getTotalTelegramUsersCount, getTotalBrowserUsersCount } from '@/lib/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast';
import { buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { renderIcon } from '@/app/tasks/page';
import Papa from 'papaparse';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';


// NOTE: Add your Telegram user ID here for admin access
const ADMIN_IDS = [123, 12345, 6954452147]; 
const ADMIN_ACCESS_CODE = '202020';
const USERS_PER_PAGE = 20;
const TOTAL_AIRDROP = 105_000_000;


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
    if (!user.telegramUser) return 'BU';
    const firstNameInitial = user.telegramUser.first_name ? user.telegramUser.first_name[0] : '';
    const lastNameInitial = user.telegramUser.last_name ? user.telegramUser.last_name[0] : '';
    return `${firstNameInitial}${lastNameInitial}`.toUpperCase() || '??';
}

const isValidSolanaAddress = (address: string): boolean => {
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solanaAddressRegex.test(address);
};

const EditWalletDialog = ({ user, onWalletUpdated }: { user: UserData, onWalletUpdated: (userId: string, newAddress: string) => void }) => {
    const [newAddress, setNewAddress] = useState(user.walletAddress || '');
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!user.telegramUser && !user.id.startsWith('browser_')) return;
        
        const trimmedAddress = newAddress.trim();
        if (!trimmedAddress) {
            toast({ variant: 'destructive', title: 'Invalid Address', description: 'Wallet address cannot be empty.' });
            return;
        }

        if (!isValidSolanaAddress(trimmedAddress)) {
            toast({ variant: 'destructive', title: 'Invalid Solana Address', description: 'Please enter a valid Solana wallet address.' });
            return;
        }

        setIsSaving(true);
        try {
            // Check if wallet is already used by another user
            const existingUser = await findUserByWalletAddress(trimmedAddress);
            if(existingUser && existingUser.id !== user.id){
                toast({ variant: 'destructive', title: 'Wallet In Use', description: 'This wallet is already registered to another user.' });
                setIsSaving(false);
                return;
            }
            const userIdentifier = user.telegramUser || { id: user.id };
            await saveWalletAddress(userIdentifier, trimmedAddress);
            onWalletUpdated(user.id, trimmedAddress);
            toast({ title: 'Wallet Updated', description: `${user.telegramUser?.first_name || 'Browser User'}'s wallet address has been updated.` });
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to update wallet address:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update the wallet address.' });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Pencil className="h-3 w-3" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Wallet for {user.telegramUser?.first_name || 'Browser User'}</DialogTitle>
                    <DialogDescription>
                        Set a new Solana wallet address for this user. This action should be used with caution.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="wallet" className="text-right">Wallet</Label>
                        <Input 
                            id="wallet" 
                            value={newAddress} 
                            onChange={e => setNewAddress(e.target.value)} 
                            className="col-span-3"
                            placeholder="Enter Solana wallet address"
                        />
                    </div>
                </div>
                <DialogFooter>
                     <Button type="submit" onClick={handleSubmit} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const EditBalanceDialog = ({ user, onBalanceUpdated }: { user: UserData, onBalanceUpdated: (userId: string, newBalance: number) => void }) => {
    const [newBalance, setNewBalance] = useState(user.balance.toString());
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
         if (!user.telegramUser && !user.id.startsWith('browser_')) return;
        
        const balanceValue = parseInt(newBalance, 10);
        if (isNaN(balanceValue) || balanceValue < 0) {
            toast({ variant: 'destructive', title: 'Invalid Balance', description: 'Please enter a valid positive number.' });
            return;
        }

        setIsSaving(true);
        try {
            const userIdentifier = user.telegramUser || { id: user.id };
            await updateUserBalance(userIdentifier, balanceValue);
            onBalanceUpdated(user.id, balanceValue);
            toast({ title: 'Balance Updated', description: `${user.telegramUser?.first_name || 'Browser User'}'s balance has been updated.` });
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to update balance:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update the balance.' });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Pencil className="h-3 w-3" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Balance for {user.telegramUser?.first_name || 'Browser User'}</DialogTitle>
                    <DialogDescription>
                        Set a new point balance for this user.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="balance" className="text-right">Balance</Label>
                        <Input 
                            id="balance" 
                            type="number" 
                            value={newBalance} 
                            onChange={e => setNewBalance(e.target.value)} 
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                     <Button type="submit" onClick={handleSubmit} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


const AddTaskDialog = ({ onTaskAdded }: { onTaskAdded: () => void }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [link, setLink] = useState('');
    const [points, setPoints] = useState(100);
    const [icon, setIcon] = useState('MessageCircle');
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!title || !description || !link || !points || !icon) {
            toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill out all fields.' });
            return;
        }
        setIsSaving(true);
        try {
            await addSocialTask({ title, description, link, points: Number(points), icon });
            toast({ title: 'Task Added', description: 'The new social task has been created.' });
            onTaskAdded();
            setIsOpen(false);
            // Reset form
            setTitle(''); setDescription(''); setLink(''); setPoints(100); setIcon('MessageCircle');
        } catch (error) {
            console.error("Failed to add task:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not add the task.' });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Task
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Social Task</DialogTitle>
                    <DialogDescription>
                        Create a new task for users to complete. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">Title</Label>
                        <Input id="title" value={title} onChange={e => setTitle(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Description</Label>
                        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="link" className="text-right">Link</Label>
                        <Input id="link" value={link} onChange={e => setLink(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="points" className="text-right">Points</Label>
                        <Input id="points" type="number" value={points} onChange={e => setPoints(Number(e.target.value))} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="icon" className="text-right">Icon</Label>
                        <Select onValueChange={setIcon} defaultValue={icon}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select an icon" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MessageCircle"><MessageCircle className="inline-block mr-2 h-4 w-4" /> Comment</SelectItem>
                                <SelectItem value="ThumbsUp"><ThumbsUp className="inline-block mr-2 h-4 w-4" /> Like</SelectItem>
                                <SelectItem value="Repeat"><Repeat className="inline-block mr-2 h-4 w-4" /> Retweet</SelectItem>
                                <SelectItem value="XIcon">X / Twitter</SelectItem>
                                <SelectItem value="TelegramIcon">Telegram</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSubmit} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Task
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const UserTable = ({
    users,
    onUpdateStatus,
    onDeleteUser,
    onCopy,
    totalPoints,
    onBalanceUpdated,
    onWalletUpdated
}: {
    users: UserData[],
    onUpdateStatus: (user: UserData, status: 'active' | 'banned', reason?: string) => void,
    onDeleteUser: (user: UserData) => void,
    onCopy: (text: string) => void,
    totalPoints: number,
    onBalanceUpdated: (userId: string, newBalance: number) => void,
    onWalletUpdated: (userId: string, newAddress: string) => void
}) => {
   
    return (
        <div>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Photo</TableHead>
                            <TableHead>Wallet</TableHead>
                            <TableHead>Balance</TableHead>
                            <TableHead>Referrals</TableHead>
                            <TableHead>Airdrop Allocation</TableHead>
                            <TableHead>Mining Status</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => {
                          const userAirdrop = totalPoints > 0 ? (user.balance / totalPoints) * TOTAL_AIRDROP : 0;
                          const isMiningActive = user.forgingEndTime && user.forgingEndTime > Date.now();
                          return (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-10 h-10">
                                            <AvatarImage src={user.customPhotoUrl || user.telegramUser?.photo_url} />
                                            <AvatarFallback>{getInitials(user)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium truncate max-w-[150px]">{user.telegramUser?.first_name || 'Browser User'}</p>
                                            <p className="text-xs text-muted-foreground">@{user.telegramUser?.username || 'N/A'}</p>
                                            <p className="text-xs text-muted-foreground font-mono">ID: {user.telegramUser?.id || user.id}</p>
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
                                <TableCell>
                                    {user.walletAddress ? (
                                        <div className="flex items-center gap-1 font-mono text-xs">
                                            <Wallet className="w-4 h-4 text-primary" />
                                            <span className="truncate max-w-[100px]">{user.walletAddress}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onCopy(user.walletAddress as string)}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                            <EditWalletDialog user={user} onWalletUpdated={onWalletUpdated} />
                                        </div>
                                    ) : (
                                         <div className="flex items-center gap-1">
                                            <span className="text-xs text-muted-foreground">N/A</span>
                                            <EditWalletDialog user={user} onWalletUpdated={onWalletUpdated} />
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <span className="text-gold font-bold">{user.balance.toLocaleString()}</span>
                                        <EditBalanceDialog user={user} onBalanceUpdated={onBalanceUpdated} />
                                    </div>
                                </TableCell>
                                <TableCell>{user.referrals}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 text-gold">
                                      <Coins className="w-4 h-4" />
                                      {userAirdrop.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                  </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={isMiningActive ? 'default' : 'secondary'} className={cn('flex items-center gap-1', isMiningActive ? 'bg-green-500/80' : 'bg-gray-500/80')}>
                                        <Zap className="w-3 h-3" />
                                        {isMiningActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={user.status === 'active' ? 'default' : 'destructive'} className={cn(user.status === 'active' && 'bg-green-500/80')}>{user.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    {user.status === 'active' ? (
                                        <Button variant="destructive" size="icon" onClick={() => onUpdateStatus(user, 'banned', 'Your account is blocked. If you think this is a mistake, please contact support.')}><UserX className="h-4 w-4"/></Button>
                                    ) : (
                                        <Button variant="secondary" size="icon" onClick={() => onUpdateStatus(user, 'active')}><UserCheck className="h-4 w-4"/></Button>
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
                                                <AlertDialogAction onClick={() => onDeleteUser(user)} className={cn(buttonVariants({variant: 'destructive'}))}>Delete User</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};


export default function AdminPage() {
    const [allUsers, setAllUsers] = useState<UserData[]>([]);
    const [totalUserCount, setTotalUserCount] = useState(0);
    const [totalTelegramCount, setTotalTelegramCount] = useState(0);
    const [totalBrowserCount, setTotalBrowserCount] = useState(0);
    const [currentUser, setCurrentUser] = useState<TelegramUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [codeAuthenticated, setCodeAuthenticated] = useState(false);
    const [socialTasks, setSocialTasks] = useState<SocialTask[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [taskCompletionCounts, setTaskCompletionCounts] = useState<{[taskId: string]: number}>({});
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [totalPoints, setTotalPoints] = useState(0);
    const [isExporting, setIsExporting] = useState(false);

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
          }
        };
        init();
    }, []);
    
    const fetchInitialData = async () => {
        setIsLoading(true);
        setIsLoadingTasks(true);
        try {
            const [usersResponse, tasks, totalCount, totalTgCount, totalBrowser, totalActivePoints] = await Promise.all([
                getAllUsers(undefined, USERS_PER_PAGE),
                getSocialTasks(),
                getTotalUsersCount(),
                getTotalTelegramUsersCount(),
                getTotalBrowserUsersCount(),
                getTotalActivePoints()
            ]);
            
            const fetchedUsers = usersResponse.users;
            const counts: {[taskId: string]: number} = {};
            tasks.forEach(task => {
                counts[task.id] = 0;
            });
            
            fetchedUsers.forEach(user => {
                user.completedSocialTasks?.forEach(taskId => {
                    if (counts[taskId] !== undefined) {
                        counts[taskId]++;
                    }
                })
            });

            setTaskCompletionCounts(counts);
            setAllUsers(fetchedUsers);
            setSocialTasks(tasks);
            setTotalUserCount(totalCount);
            setTotalTelegramCount(totalTgCount);
            setTotalBrowserCount(totalBrowser);
            setLastVisible(usersResponse.lastVisible);
            setTotalPoints(totalActivePoints);
        } catch (error) {
            console.error("Failed to fetch admin data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch admin data.' });
        } finally {
            setIsLoading(false);
            setIsLoadingTasks(false);
        }
    };
    
    const fetchMoreUsers = async () => {
        if (!lastVisible || isFetchingMore) return;
        setIsFetchingMore(true);
         try {
            const { users: newUsers, lastVisible: newLastVisible } = await getAllUsers(lastVisible, USERS_PER_PAGE);
            setAllUsers(prevUsers => [...prevUsers, ...newUsers]);
            setLastVisible(newLastVisible);
        } catch (error) {
            console.error("Failed to fetch more users:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch more users.' });
        } finally {
            setIsFetchingMore(false);
        }
    }


    useEffect(() => {
      if(isAdmin || codeAuthenticated) {
        fetchInitialData();
      } else {
        setIsLoading(false);
      }
    }, [isAdmin, codeAuthenticated]);
    
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return allUsers;
        return allUsers.filter(user => {
            const term = searchTerm.toLowerCase();
            const telegramId = user.telegramUser?.id.toString() || '';
            const walletAddress = user.walletAddress?.toLowerCase() || '';
            const username = user.telegramUser?.username?.toLowerCase() || '';
            const firstName = user.telegramUser?.first_name?.toLowerCase() || '';
            const browserId = user.id.startsWith('browser_') ? user.id.toLowerCase() : '';
            return telegramId.includes(term) || walletAddress.includes(term) || username.includes(term) || firstName.includes(term) || browserId.includes(term);
        });
    }, [allUsers, searchTerm]);
    
    const telegramUsers = useMemo(() => filteredUsers.filter(u => u.id.startsWith('user_')), [filteredUsers]);
    const browserUsers = useMemo(() => filteredUsers.filter(u => u.id.startsWith('browser_')), [filteredUsers]);

    const activeTelegramUsers = useMemo(() => telegramUsers.filter(u => u.status === 'active'), [telegramUsers]);
    const bannedTelegramUsers = useMemo(() => telegramUsers.filter(u => u.status === 'banned'), [telegramUsers]);
    const activeBrowserUsers = useMemo(() => browserUsers.filter(u => u.status === 'active'), [browserUsers]);
    const bannedBrowserUsers = useMemo(() => browserUsers.filter(u => u.status === 'banned'), [browserUsers]);

    const handleUpdateStatus = async (user: UserData, status: 'active' | 'banned', reason?: string) => {
        const userIdentifier = user.telegramUser || { id: user.id };

        const originalUsers = allUsers;
        const updatedUsers = originalUsers.map(u =>
            u.id === user.id ? { ...u, status: status, banReason: reason } : u
        );
        setAllUsers(updatedUsers);
        
        try {
            await updateUserStatus(userIdentifier, status, reason);
            
            // Refetch total points
            const newTotalPoints = await getTotalActivePoints();
            setTotalPoints(newTotalPoints);

            toast({ title: `User ${status === 'active' ? 'unbanned' : 'banned'}.`});
        } catch(error) {
            setAllUsers(originalUsers); // Revert on failure
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update user status.' });
        }
    }

    const handleBalanceUpdated = async (userId: string, newBalance: number) => {
        const updatedUsers = allUsers.map(u => {
            if (u.id === userId) {
                return { ...u, balance: newBalance };
            }
            return u;
        });

        const sortedUsers = updatedUsers.sort((a, b) => b.balance - a.balance);
        setAllUsers(sortedUsers);
        
        // Refetch total points as balance was changed
        const newTotalPoints = await getTotalActivePoints();
        setTotalPoints(newTotalPoints);
    };


    const handleWalletUpdated = (userId: string, newAddress: string) => {
        setAllUsers(currentUsers =>
            currentUsers.map(u =>
                u.id === userId ? { ...u, walletAddress: newAddress } : u
            )
        );
    };

    const handleDeleteUser = async (user: UserData) => {
        const userIdentifier = user.telegramUser || { id: user.id };
        
        const originalUsers = allUsers;
        setAllUsers(allUsers.filter(u => u.id !== user.id));
        setTotalUserCount(prev => prev - 1);

        try {
            await deleteUser(userIdentifier);
            const newTotalPoints = await getTotalActivePoints();
            setTotalPoints(newTotalPoints);
            toast({ variant: 'destructive', title: 'User Deleted', description: 'The user has been permanently removed.'});
        } catch(error) {
            setAllUsers(originalUsers); // Revert on error
            setTotalUserCount(prev => prev + 1);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete user.' });
        }
    }

    const handleDeleteTask = async (taskId: string) => {
        await deleteSocialTask(taskId);
        setSocialTasks(socialTasks.filter(t => t.id !== taskId));
        toast({ variant: 'destructive', title: 'Task Deleted'});
    }
    
    const handleCodeSubmit = () => {
        if (accessCode === ADMIN_ACCESS_CODE) {
            setCodeAuthenticated(true);
        } else {
            toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: 'The access code is incorrect.',
            });
            setAccessCode('');
        }
    }
    
    const handleLogout = () => {
        setCodeAuthenticated(false);
        setAccessCode('');
    }

    const handleCopy = (textToCopy: string) => {
        navigator.clipboard.writeText(textToCopy);
        toast({
          title: 'Copied to Clipboard!',
        });
      };


    const handleExportAirdrop = () => {
        const airdropData = allUsers
            .filter(user => user.walletAddress && user.status === 'active' && isValidSolanaAddress(user.walletAddress)) // Only include active users with a valid wallet address
            .map(user => {
                const airdropAmount = totalPoints > 0 ? (user.balance / totalPoints) * TOTAL_AIRDROP : 0;
                return {
                    walletAddress: user.walletAddress,
                    airdropAmount: airdropAmount.toFixed(4) // Adjust precision as needed
                };
            });

        const csv = Papa.unparse(airdropData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'airdrop_distribution_active_users.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleExportAllUsers = async () => {
        setIsExporting(true);
        toast({ title: 'Exporting...', description: 'Fetching all user data. This may take a moment.' });
        try {
            let allUsersToExport: UserData[] = [];
            let lastDoc: QueryDocumentSnapshot<DocumentData> | undefined = undefined;
            
            // Loop through all pages of users
            do {
                const response = await getAllUsers(lastDoc, 1000); // Fetch in larger chunks for export
                allUsersToExport = allUsersToExport.concat(response.users);
                lastDoc = response.lastVisible as QueryDocumentSnapshot<DocumentData> | undefined;
            } while (lastDoc);

            const userData = allUsersToExport.map(user => ({
                userId: user.id,
                telegramId: user.telegramUser?.id,
                username: user.telegramUser?.username,
                firstName: user.telegramUser?.first_name,
                lastName: user.telegramUser?.last_name,
                balance: user.balance,
                walletAddress: user.walletAddress,
                referrals: user.referrals,
                referredBy: user.referredBy,
                verificationStatus: user.verificationStatus,
                status: user.status,
                banReason: user.banReason || '',
                referralCode: user.referralCode,
            }));

            const csv = Papa.unparse(userData);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'all_users_export.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: 'Export Complete!', description: `${userData.length} users have been exported.` });

        } catch (error) {
            console.error("Failed to export all users:", error);
            toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not export user data.' });
        } finally {
            setIsExporting(false);
        }
    };

    if (!isAdmin && !codeAuthenticated) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
                <Card className="max-w-sm w-full">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2"><Lock className="w-6 h-6"/> Admin Access</CardTitle>
                        <CardDescription>Enter the access code to continue.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground text-center px-2">
                           This is the central hub for managing the Exnus Points application. From here, you can oversee user activity, manage the airdrop, create new social engagement tasks, and ensure the overall health of the ecosystem.
                        </p>
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
      <main className="flex-grow flex flex-col p-4 mt-8 relative">
        {isLoading ? (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        ) : (
        <div className="w-full max-w-7xl mx-auto space-y-6">
            <div className="text-center relative">
                <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                    <Shield className="w-8 h-8 text-primary" />
                    Admin Dashboard
                </h1>
                 {codeAuthenticated && !isAdmin && (
                    <Button onClick={handleLogout} variant="destructive" size="sm" className="absolute top-0 right-0">
                        <LogOut className="mr-2 h-4 w-4" /> Logout
                    </Button>
                )}
            </div>

            <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Social Task Management</CardTitle>
                    <AddTaskDialog onTaskAdded={fetchInitialData} />
                </div>
                <CardDescription>Create and manage social engagement tasks for users.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingTasks ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Icon</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Points</TableHead>
                                    <TableHead>Completions</TableHead>
                                    <TableHead>Link</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {socialTasks.map((task) => (
                                    <TableRow key={task.id}>
                                        <TableCell>{renderIcon(task.icon, "w-6 h-6")}</TableCell>
                                        <TableCell className="font-medium">{task.title}</TableCell>
                                        <TableCell className="text-gold">{task.points}</TableCell>
                                        <TableCell className="font-bold">{taskCompletionCounts[task.id] || 0}</TableCell>
                                        <TableCell>
                                            <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[200px] block">
                                                {task.link}
                                            </a>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This will permanently delete this social task.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteTask(task.id)} className={cn(buttonVariants({variant: 'destructive'}))}>Delete Task</AlertDialogAction>
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
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                    Search, manage, and export user data. The export button will generate a CSV of all active users eligible for the airdrop. Displaying {allUsers.length} of {totalUserCount} users.
                </CardDescription>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 pt-4">
                     <Card className="bg-primary/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalUserCount.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Telegram Users</CardTitle>
                            <Bot className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalTelegramCount.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Browser Users</CardTitle>
                            <Monitor className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalBrowserCount.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Points (Active)</CardTitle>
                            <Star className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                                <div className="text-2xl font-bold text-gold">{totalPoints.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Airdrop</CardTitle>
                                <Coins className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                                <div className="text-2xl font-bold">{TOTAL_AIRDROP.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 py-4 flex-wrap">
                    <div className="relative flex-grow min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by ID, Wallet, Username..."
                            className="pl-9 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button onClick={handleExportAirdrop} variant="outline" className="flex-shrink-0">
                            <Download className="mr-2 h-4 w-4" />
                            Export Airdrop List
                        </Button>
                         <Button onClick={handleExportAllUsers} disabled={isExporting} variant="outline" className="flex-shrink-0">
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Export All Users
                        </Button>
                    </div>
                </div>
                <Tabs defaultValue="tg-active" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                        <TabsTrigger value="tg-active">Telegram - Active ({activeTelegramUsers.length})</TabsTrigger>
                        <TabsTrigger value="tg-banned">Telegram - Banned ({bannedTelegramUsers.length})</TabsTrigger>
                        <TabsTrigger value="browser-active">Browser - Active ({activeBrowserUsers.length})</TabsTrigger>
                        <TabsTrigger value="browser-banned">Browser - Banned ({bannedBrowserUsers.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="tg-active" className="mt-4">
                        <UserTable
                            users={activeTelegramUsers}
                            onUpdateStatus={handleUpdateStatus}
                            onDeleteUser={handleDeleteUser}
                            onCopy={handleCopy}
                            totalPoints={totalPoints}
                            onBalanceUpdated={handleBalanceUpdated}
                            onWalletUpdated={handleWalletUpdated}
                        />
                    </TabsContent>
                    <TabsContent value="tg-banned" className="mt-4">
                        <UserTable
                            users={bannedTelegramUsers}
                            onUpdateStatus={handleUpdateStatus}
                            onDeleteUser={handleDeleteUser}
                            onCopy={handleCopy}
                            totalPoints={totalPoints}
                            onBalanceUpdated={handleBalanceUpdated}
                            onWalletUpdated={handleWalletUpdated}
                        />
                    </TabsContent>
                    <TabsContent value="browser-active" className="mt-4">
                        <UserTable
                            users={activeBrowserUsers}
                            onUpdateStatus={handleUpdateStatus}
                            onDeleteUser={handleDeleteUser}
                            onCopy={handleCopy}
                            totalPoints={totalPoints}
                            onBalanceUpdated={handleBalanceUpdated}
                            onWalletUpdated={handleWalletUpdated}
                        />
                    </TabsContent>
                     <TabsContent value="browser-banned" className="mt-4">
                        <UserTable
                            users={bannedBrowserUsers}
                            onUpdateStatus={handleUpdateStatus}
                            onDeleteUser={handleDeleteUser}
                            onCopy={handleCopy}
                            totalPoints={totalPoints}
                            onBalanceUpdated={handleBalanceUpdated}
                            onWalletUpdated={handleWalletUpdated}
                        />
                    </TabsContent>
                </Tabs>
                {lastVisible && allUsers.length < totalUserCount && !searchTerm && (
                     <div className="flex justify-center mt-4">
                        <Button onClick={fetchMoreUsers} disabled={isFetchingMore}>
                            {isFetchingMore ? (
                                <>
                                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Loading...
                                </>
                            ) : 'Load More'}
                        </Button>
                    </div>
                )}
            </CardContent>
            </Card>
        </div>
        )}
      </main>
    </div>
  );
}
