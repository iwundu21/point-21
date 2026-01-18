

'use client';

import { useState, useEffect, useMemo, FormEvent } from 'react';
import { Shield, Loader2, Trash2, UserX, UserCheck, Lock, CameraOff, Copy, Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, PlusCircle, MessageCircle, ThumbsUp, Repeat, Coins, Users, Star, Download, Pencil, Wallet, Server, Bot, Monitor, Zap, LogOut, Settings, PowerOff, PlayCircle, Gift } from 'lucide-react';
import { getAllUsers, updateUserStatus, deleteUser, UserData, addSocialTask, getSocialTasks, deleteSocialTask, deleteAllSocialTasks, SocialTask, updateUserBalance, saveWalletAddress, findUserByWalletAddress, getTotalUsersCount, getTotalActivePoints, getTotalTelegramUsersCount, getTotalBrowserUsersCount, unbanAllUsers, forceAddBoosterPack1, getAirdropStats, updateAirdropStats as saveAirdropTotal, getAirdropStatus, updateAirdropStatus, grantMassBonusToAllUsers, getAllocationCheckStatus } from '@/lib/database';
import { toggleAirdrop } from '@/ai/flows/toggle-airdrop-flow';
import { toggleAllocationCheck } from '@/ai/flows/toggle-allocation-check-flow';
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
import { getInitials, getDisplayName } from '@/lib/user-utils';
import LoadingDots from '@/components/loading-dots';
import { Separator } from '@/components/ui/separator';


// NOTE: Add your Telegram user ID here for admin access
const ADMIN_IDS = [123, 12345, 6954452147]; 
const ADMIN_ACCESS_CODE = '202020';
const USERS_PER_PAGE = 20;


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
            toast({ title: 'Wallet Updated', description: `${getDisplayName(user)}'s wallet address has been updated.` });
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
                    <DialogTitle>Edit Wallet for {getDisplayName(user)}</DialogTitle>
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
    const [balanceValue, setBalanceValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (operation: 'set' | 'increment') => {
        if (!user.telegramUser && !user.id.startsWith('browser_')) return;

        const amount = parseInt(balanceValue, 10);
        if (isNaN(amount)) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid number.' });
            return;
        }

        setIsSaving(true);
        try {
            const userIdentifier = user.telegramUser || { id: user.id };
            const newBalance = await updateUserBalance(userIdentifier, amount, operation);
            onBalanceUpdated(user.id, newBalance);
            toast({ title: 'Balance Updated', description: `${getDisplayName(user)}'s balance has been updated to ${newBalance.toLocaleString()}.` });
            setIsOpen(false);
            setBalanceValue(''); // Reset input
        } catch (error: any) {
            console.error("Failed to update balance:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not update the balance.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Pencil className="h-3 w-3" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Balance for {getDisplayName(user)}</DialogTitle>
                    <DialogDescription>
                        Current balance: {user.balance.toLocaleString()} Points. Add to or set a new balance.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="balance" className="text-right">Amount</Label>
                        <Input
                            id="balance"
                            type="number"
                            value={balanceValue}
                            onChange={e => setBalanceValue(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g., 5000"
                        />
                    </div>
                </div>
                <DialogFooter className="sm:justify-between">
                    <Button type="button" onClick={() => handleSubmit('increment')} disabled={isSaving || !balanceValue}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add to Balance
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => handleSubmit('set')} disabled={isSaving || !balanceValue}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Set as New Balance
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


const AddTaskDialog = ({ onTaskAdded }: { onTaskAdded: () => void }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [link, setLink] = useState('');
    const [points, setPoints] = useState(80);
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
            setTitle(''); setDescription(''); setLink(''); setPoints(80); setIcon('MessageCircle');
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
                                <SelectItem value="Star"><Star className="inline-block mr-2 h-4 w-4" /> React</SelectItem>
                                <SelectItem value="XIcon">X / Twitter</SelectItem>
                                <SelectItem value="TelegramIcon">Telegram</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" onClick={handleSubmit} disabled={isSaving}>
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
    onBalanceUpdated,
    onWalletUpdated,
    onForceBoost,
}: {
    users: UserData[],
    onUpdateStatus: (user: UserData, status: 'active' | 'banned', reason?: string) => void,
    onDeleteUser: (user: UserData) => void,
    onCopy: (text: string) => void,
    onBalanceUpdated: (userId: string, newBalance: number) => void,
    onWalletUpdated: (userId: string, newAddress: string) => void,
    onForceBoost: (user: UserData) => void,
}) => {
   
    return (
        <div>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Wallet</TableHead>
                            <TableHead>Balance</TableHead>
                            <TableHead>Referrals</TableHead>
                            <TableHead>Airdrop</TableHead>
                            <TableHead>Mining Status</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => {
                          const isMiningActive = user.miningEndTime && user.miningEndTime > Date.now();
                          const isBrowserUser = !user.telegramUser;
                          const hasAirdropSlot = user.purchasedBoosts?.includes('boost_1');

                          return (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-10 h-10">
                                            <AvatarImage src={user.customPhotoUrl || user.telegramUser?.photo_url} />
                                            <AvatarFallback>{getInitials(user)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium truncate max-w-[150px]">{getDisplayName(user)}</p>
                                            <p className="text-xs text-muted-foreground">@{user.telegramUser?.username || 'N/A'}</p>
                                            <p className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">ID: {isBrowserUser ? user.id : user.telegramUser?.id}</p>
                                        </div>
                                    </div>
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
                                    
                                        <div>
                                            <span className="text-gold font-bold">{user.balance.toLocaleString()}</span>
                                            <span className="text-xs text-gold ml-1">Points</span>
                                        </div>
                                    
                                    <EditBalanceDialog user={user} onBalanceUpdated={onBalanceUpdated} />
                                    </div>
                                </TableCell>
                                <TableCell>{user.referrals}</TableCell>
                                 <TableCell>
                                    <Badge variant={hasAirdropSlot ? 'default' : 'secondary'} className={cn('flex items-center gap-1', hasAirdropSlot ? 'bg-yellow-500/80' : 'bg-gray-500/80')}>
                                        <Star className="w-3 h-3" />
                                        {hasAirdropSlot ? 'Yes' : 'No'}
                                    </Badge>
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
                                    {!hasAirdropSlot && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="icon">
                                                    <Star className="h-4 w-4 text-yellow-500"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Grant Airdrop Slot?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will grant the user an airdrop slot and credit them with 5,000 Points. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => onForceBoost(user)} className={cn(buttonVariants({variant: 'default'}))}>Confirm</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
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

const EditAirdropDialog = ({ currentTotal, onAirdropUpdated }: { currentTotal: number, onAirdropUpdated: (newTotal: number) => void }) => {
    const [newTotal, setNewTotal] = useState(currentTotal.toString());
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setNewTotal(currentTotal.toString());
    }, [currentTotal]);

    const handleSubmit = async () => {
        const totalValue = parseInt(newTotal, 10);
        if (isNaN(totalValue) || totalValue < 0) {
            toast({ variant: 'destructive', title: 'Invalid Total', description: 'Please enter a valid positive number.' });
            return;
        }

        setIsSaving(true);
        try {
            await saveAirdropTotal(totalValue);
            onAirdropUpdated(totalValue);
            toast({ title: 'Airdrop Total Updated', description: 'The total airdrop amount has been updated.' });
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to update airdrop total:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update the airdrop total.' });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Pencil className="mr-2 h-3 w-3" /> Edit Total
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Total Airdrop Amount</DialogTitle>
                    <DialogDescription>
                        Set the total number of EXN to be distributed in the airdrop.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="airdrop-total" className="text-right">Total EXN</Label>
                        <Input
                            id="airdrop-total"
                            type="number"
                            value={newTotal}
                            onChange={e => setNewTotal(e.target.value)}
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
    const [searchedUsers, setSearchedUsers] = useState<UserData[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [taskCompletionCounts, setTaskCompletionCounts] = useState<{[taskId: string]: number}>({});
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [totalPoints, setTotalPoints] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [isExportingAirdrop, setIsExportingAirdrop] = useState(false);
    const [isUnbanning, setIsUnbanning] = useState(false);
    const [isDeletingAllTasks, setIsDeletingAllTasks] = useState(false);
    const [isAirdropEnded, setIsAirdropEnded] = useState(false);
    const [isTogglingAirdrop, setIsTogglingAirdrop] = useState(false);
    const [isApplyingMassBonus, setIsApplyingMassBonus] = useState(false);
    const [isAllocationCheckEnabled, setIsAllocationCheckEnabled] = useState(false);
    const [isTogglingAllocationCheck, setIsTogglingAllocationCheck] = useState(false);
    const [airdropTotal, setAirdropTotal] = useState(0);
    
    const { toast } = useToast();

    const fetchInitialData = async () => {
        setIsLoading(true);
        setIsLoadingTasks(true);
        try {
            const [usersResponse, tasks, totalCount, totalTgCount, totalBrowser, totalActivePoints, airdropStatus, allocationCheckStatus, airdropStats] = await Promise.all([
                getAllUsers(undefined, USERS_PER_PAGE),
                getSocialTasks(),
                getTotalUsersCount(),
                getTotalTelegramUsersCount(),
                getTotalBrowserUsersCount(),
                getTotalActivePoints(),
                getAirdropStatus(),
                getAllocationCheckStatus(),
                getAirdropStats(),
            ]);
            
            const fetchedUsers = usersResponse.users;
            const counts: {[taskId: string]: number} = {};
            // The `completionCount` is now directly on the task object from the database.
            tasks.forEach(task => {
                counts[task.id] = task.completionCount || 0;
            });
            
            setTaskCompletionCounts(counts);
            setAllUsers(fetchedUsers);
            setSocialTasks(tasks);
            setTotalUserCount(totalCount);
            setTotalTelegramCount(totalTgCount);
            setTotalBrowserCount(totalBrowser);
            setLastVisible(usersResponse.lastVisible);
            setTotalPoints(totalActivePoints);
            setIsAirdropEnded(airdropStatus.isAirdropEnded);
            setIsAllocationCheckEnabled(allocationCheckStatus.isEnabled);
            setAirdropTotal(airdropStats.totalAirdrop);

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

    useEffect(() => {
      if(isAdmin || codeAuthenticated) {
        fetchInitialData();
      } else {
        setIsLoading(false);
      }
    }, [isAdmin, codeAuthenticated]);

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (!term.trim()) {
            setSearchedUsers([]);
            return;
        }

        setIsSearching(true);
        try {
            let allFetchedUsers: UserData[] = [];
            let lastDoc: QueryDocumentSnapshot<DocumentData> | undefined = undefined;

            // Loop through all pages of users
            do {
                const response = await getAllUsers(lastDoc, 1000); // Fetch in large chunks for searching
                allFetchedUsers = allFetchedUsers.concat(response.users);
                lastDoc = response.lastVisible as QueryDocumentSnapshot<DocumentData> | undefined;
            } while (lastDoc);
            
            const lowercasedTerm = term.toLowerCase();
            const filtered = allFetchedUsers.filter(user => {
                 const telegramId = user.telegramUser?.id.toString() || '';
                 const walletAddress = user.walletAddress?.toLowerCase() || '';
                 const username = user.telegramUser?.username?.toLowerCase() || '';
                 const firstName = user.telegramUser?.first_name?.toLowerCase() || '';
                 const browserId = user.id.toLowerCase();
            
                 return telegramId.includes(lowercasedTerm) || 
                        walletAddress.includes(lowercasedTerm) || 
                        username.includes(lowercasedTerm) || 
                        firstName.includes(lowercasedTerm) || 
                        browserId.includes(lowercasedTerm);
            });
            setSearchedUsers(filtered);

        } catch (error) {
             console.error("Failed to search users:", error);
             toast({ variant: 'destructive', title: 'Error', description: 'Could not perform user search.' });
        } finally {
            setIsSearching(false);
        }
    };
    
    const usersToDisplay = searchTerm.trim() ? searchedUsers : allUsers;

    const telegramUsers = useMemo(() => usersToDisplay.filter(u => u.telegramUser), [usersToDisplay]);
    const browserUsers = useMemo(() => usersToDisplay.filter(u => !u.telegramUser), [usersToDisplay]);

    const activeTelegramUsers = useMemo(() => telegramUsers.filter(u => u.status === 'active'), [telegramUsers]);
    const bannedTelegramUsers = useMemo(() => telegramUsers.filter(u => u.status === 'banned'), [telegramUsers]);
    const activeBrowserUsers = useMemo(() => browserUsers.filter(u => u.status === 'active'), [browserUsers]);
    const bannedBrowserUsers = useMemo(() => browserUsers.filter(u => u.status === 'banned'), [browserUsers]);

    const activeTelegramCount = activeTelegramUsers.length;
    const activeBrowserCount = activeBrowserUsers.length;


    const handleUpdateStatus = async (user: UserData, status: 'active' | 'banned', reason?: string) => {
        const userIdentifier = user.telegramUser || { id: user.id };

        const originalUsers = searchTerm.trim() ? searchedUsers : allUsers;
        const setUsers = searchTerm.trim() ? setSearchedUsers : setAllUsers;
        
        const updatedUsers = originalUsers.map(u =>
            u.id === user.id ? { ...u, status: status, banReason: reason } : u
        );
        setUsers(updatedUsers);
        
        try {
            await updateUserStatus(userIdentifier, status, reason);
            
            await fetchInitialData(); // Refetch all data to keep stats consistent

            toast({ title: `User ${status === 'active' ? 'unbanned' : 'banned'}.`});
        } catch(error) {
            setUsers(originalUsers); 
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update user status.' });
        }
    }

    const handleBalanceUpdated = async (userId: string, newBalance: number) => {
         const setUsers = searchTerm.trim() ? setSearchedUsers : setAllUsers;

        setUsers(currentUsers => {
            const updated = currentUsers.map(u => {
                if (u.id === userId) {
                    return { ...u, balance: newBalance };
                }
                return u;
            });
            return updated.sort((a, b) => b.balance - a.balance);
        });
        
        const newTotalPoints = await getTotalActivePoints();
        setTotalPoints(newTotalPoints);
    };

    const handleForceBoost = async (user: UserData) => {
        const userIdentifier = user.telegramUser || { id: user.id };
        const setUsers = searchTerm.trim() ? setSearchedUsers : setAllUsers;

        try {
            const newBalance = await forceAddBoosterPack1(userIdentifier);
            setUsers(currentUsers =>
                currentUsers.map(u =>
                    u.id === user.id ? { ...u, purchasedBoosts: [...(u.purchasedBoosts || []), 'boost_1'], balance: newBalance } : u
                )
            );
            toast({ title: 'Airdrop Slot Granted', description: `${getDisplayName(user)} has been granted an airdrop slot and 5,000 Points.` });
            const newTotalPoints = await getTotalActivePoints();
            setTotalPoints(newTotalPoints);
        } catch (error) {
            console.error("Failed to force boost:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not grant the airdrop slot.' });
        }
    };


    const handleWalletUpdated = (userId: string, newAddress: string) => {
         const setUsers = searchTerm.trim() ? setSearchedUsers : setAllUsers;
        setUsers(currentUsers =>
            currentUsers.map(u =>
                u.id === userId ? { ...u, walletAddress: newAddress } : u
            )
        );
    };

    const handleDeleteUser = async (user: UserData) => {
        const userIdentifier = user.telegramUser || { id: user.id };
        
        const originalUsers = searchTerm.trim() ? searchedUsers : allUsers;
        const setUsers = searchTerm.trim() ? setSearchedUsers : setAllUsers;

        setUsers(originalUsers.filter(u => u.id !== user.id));
        
        try {
            await deleteUser(userIdentifier);
             await fetchInitialData();
            toast({ variant: 'destructive', title: 'User Deleted', description: 'The user has been permanently removed.'});
        } catch(error) {
            setUsers(originalUsers); 
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete user.' });
        }
    }

    const handleDeleteTask = async (taskId: string) => {
        await deleteSocialTask(taskId);
        setSocialTasks(socialTasks.filter(t => t.id !== taskId));
        toast({ variant: 'destructive', title: 'Task Deleted'});
    }

    const handleDeleteAllTasks = async () => {
        setIsDeletingAllTasks(true);
        try {
            const deletedCount = await deleteAllSocialTasks();
            toast({ variant: 'destructive', title: 'All Tasks Deleted', description: `${deletedCount} tasks have been removed.` });
            setSocialTasks([]);
        } catch (error) {
            console.error("Failed to delete all tasks:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete all tasks.' });
        } finally {
            setIsDeletingAllTasks(false);
        }
    }
    
    const handleCodeSubmit = (e: FormEvent) => {
        e.preventDefault();
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


    const handleExportAirdrop = async () => {
        setIsExportingAirdrop(true);
        toast({ title: 'Exporting Airdrop List...', description: 'Fetching all user data. This may take a moment.' });
        try {
            let allUsersToExport: UserData[] = [];
            let lastDoc: QueryDocumentSnapshot<DocumentData> | undefined = undefined;

            do {
                const response = await getAllUsers(lastDoc, 1000);
                allUsersToExport = allUsersToExport.concat(response.users);
                lastDoc = response.lastVisible as QueryDocumentSnapshot<DocumentData> | undefined;
            } while (lastDoc);

            const airdropData = allUsersToExport
                .filter(user => 
                    user.walletAddress && 
                    isValidSolanaAddress(user.walletAddress) &&
                    user.status === 'active'
                )
                .map(user => {
                    return {
                        balance: user.balance,
                        walletAddress: user.walletAddress
                    };
                });
            
            if (airdropData.length === 0) {
                 toast({ variant: 'destructive', title: 'No Eligible Users', description: 'No active users with a valid wallet were found.' });
                 setIsExportingAirdrop(false);
                 return;
            }
            
            const CHUNK_SIZE = 60;
            for (let i = 0; i < airdropData.length; i += CHUNK_SIZE) {
                const chunk = airdropData.slice(i, i + CHUNK_SIZE);
                let csv = Papa.unparse(chunk);
                const pageTotal = chunk.reduce((sum, user) => sum + user.balance, 0);

                // Append total in a new line
                csv += `\n\nTotal Points for this page: ${pageTotal}`;

                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `airdrop_export_${Math.floor(i / CHUNK_SIZE) + 1}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            toast({ title: 'Export Complete!', description: `${airdropData.length} eligible users have been exported in chunks of ${CHUNK_SIZE}.` });

        } catch (error) {
            console.error("Failed to export airdrop data:", error);
            toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not export airdrop data.' });
        } finally {
            setIsExportingAirdrop(false);
        }
    };
    
    const handleExportAllUsers = async () => {
        setIsExporting(true);
        toast({ title: 'Exporting All Users...', description: 'Fetching all user data. This may take a moment.' });
        try {
            let allUsersToExport: UserData[] = [];
            let lastDoc: QueryDocumentSnapshot<DocumentData> | undefined = undefined;
            
            // Loop through all pages of users
            do {
                const response = await getAllUsers(lastDoc, 1000); // Fetch in large chunks for export
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

    const handleUnbanAll = async () => {
        setIsUnbanning(true);
        try {
            const unbannedCount = await unbanAllUsers();
            toast({ title: 'Success', description: `${unbannedCount} users have been unbanned.` });
            await fetchInitialData(); // Refresh data
        } catch (error) {
             console.error("Failed to unban all users:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not unban all users.' });
        } finally {
            setIsUnbanning(false);
        }
    }
    
    const handleToggleAirdrop = async () => {
        setIsTogglingAirdrop(true);
        const newState = !isAirdropEnded; // The state we want to move to

        try {
            const result = await toggleAirdrop({ ended: newState });
            if (result.success) {
                toast({ title: `Airdrop ${newState ? 'Ended' : 'Started'}`, description: `All reward-earning activities have been ${newState ? 'stopped' : 'enabled'}.` });
                setIsAirdropEnded(newState);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not toggle the airdrop status.' });
            }
        } catch (error) {
            console.error("Failed to toggle airdrop:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
        } finally {
            setIsTogglingAirdrop(false);
        }
    };

    const handleToggleAllocationCheck = async () => {
        setIsTogglingAllocationCheck(true);
        const newState = !isAllocationCheckEnabled;
    
        try {
            const result = await toggleAllocationCheck({ enabled: newState });
            if (result.success) {
                toast({ title: `Allocation Check ${newState ? 'Enabled' : 'Disabled'}`, description: `Users can ${newState ? 'now' : 'no longer'} check their airdrop allocation.` });
                setIsAllocationCheckEnabled(newState);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not toggle the allocation check status.' });
            }
        } catch (error) {
            console.error("Failed to toggle allocation check:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
        } finally {
            setIsTogglingAllocationCheck(false);
        }
    };
    
    const handleApplyMassBonus = async () => {
        setIsApplyingMassBonus(true);
        try {
            const count = await grantMassBonusToAllUsers();
            toast({ title: 'Bonus Awarded', description: `${count} users have received 40,000 Points.` });
            fetchInitialData(); // Refresh user list
        } catch (error) {
            console.error("Failed to grant mass bonus:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not grant the mass bonus.' });
        } finally {
            setIsApplyingMassBonus(false);
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
                    <CardContent>
                       <form onSubmit={handleCodeSubmit} className="space-y-4">
                           <p className="text-sm text-muted-foreground text-center px-2">
                              This is the central hub for managing the Exnus Points application. From here, you can oversee user activity, manage the airdrop, create new social engagement tasks, and ensure the overall health of the ecosystem.
                           </p>
                          <Input 
                               type="password"
                               placeholder="Enter access code"
                               value={accessCode}
                               onChange={(e) => setAccessCode(e.target.value)}
                           />
                          <Button type="submit" className="w-full">
                              Submit
                          </Button>
                       </form>
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
                <LoadingDots />
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
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Social Task Management</CardTitle>
                        <div className="flex gap-2">
                           <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" disabled={socialTasks.length === 0 || isDeletingAllTasks}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete All Tasks?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete all social tasks. This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteAllTasks} className={cn(buttonVariants({variant: 'destructive'}))}>
                                            {isDeletingAllTasks ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete All'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <AddTaskDialog onTaskAdded={fetchInitialData} />
                        </div>
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

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>System Statistics</CardTitle>
                        <CardDescription>An overview of key application metrics.</CardDescription>
                    </CardHeader>
                     <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                        <Card className="bg-primary/5 col-span-1 md:col-span-2 lg:col-span-3">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Points (Active)</CardTitle>
                                <Star className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                    <div className="text-2xl font-bold text-gold">{totalPoints.toLocaleString()}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-destructive/10 border-destructive/20 col-span-1 md:col-span-2 lg:col-span-3">
                            <CardHeader>
                                <CardTitle>System Controls</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col sm:flex-row gap-4 items-center flex-wrap">
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant={isAirdropEnded ? 'default' : 'destructive'} disabled={isTogglingAirdrop}>
                                                {isTogglingAirdrop ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (isAirdropEnded ? <PlayCircle className="mr-2 h-4 w-4"/> : <PowerOff className="mr-2 h-4 w-4"/>)}
                                                {isAirdropEnded ? 'Start Rewards' : 'End Rewards'}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will {isAirdropEnded ? 're-enable' : 'permanently stop'} all reward-earning activities for all users (daily mining, referrals, tasks, etc.).
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleToggleAirdrop} className={cn(buttonVariants({variant: isAirdropEnded ? 'default' : 'destructive'}))}>
                                                    Confirm
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <p className="text-sm text-muted-foreground">
                                        {isAirdropEnded ? "Reward earning is currently disabled." : "Reward earning is currently active."}
                                    </p>
                                    <Separator orientation="vertical" className="h-10 hidden sm:block bg-border" />
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant={isAllocationCheckEnabled ? 'destructive' : 'default'} disabled={isTogglingAllocationCheck}>
                                                {isTogglingAllocationCheck ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (isAllocationCheckEnabled ? <PowerOff className="mr-2 h-4 w-4"/> : <PlayCircle className="mr-2 h-4 w-4"/>)}
                                                {isAllocationCheckEnabled ? 'Disable Allocation Check' : 'Enable Allocation Check'}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will {isAllocationCheckEnabled ? 'disable' : 'enable'} the allocation check feature for all users.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleToggleAllocationCheck} className={cn(buttonVariants({variant: isAllocationCheckEnabled ? 'destructive' : 'default'}))}>
                                                    Confirm
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <p className="text-sm text-muted-foreground">
                                        {isAllocationCheckEnabled ? "Allocation check is enabled." : "Allocation check is disabled."}
                                    </p>
                                    <Separator orientation="vertical" className="h-10 hidden sm:block bg-border" />
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" disabled={isApplyingMassBonus}>
                                                {isApplyingMassBonus ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Gift className="mr-2 h-4 w-4" />}
                                                Award Bonus to All Users
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will grant 40,000 Points to ALL users in the system who have not received this bonus before. This is a one-time, irreversible action.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleApplyMassBonus} className={cn(buttonVariants({variant: 'destructive'}))}>
                                                    Confirm & Award
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                     <p className="text-sm text-muted-foreground">
                                        One-time bonus for all users.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Airdrop Management</CardTitle>
                            <EditAirdropDialog currentTotal={airdropTotal} onAirdropUpdated={setAirdropTotal} />
                        </div>
                        <CardDescription>
                            Configure the total airdrop pool for participants.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Airdrop Pool</p>
                                <p className="font-bold text-2xl text-gold">{airdropTotal.toLocaleString()} EXN</p>
                            </div>
                            <Gift className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            This is the total amount of EXN that will be proportionally distributed among all eligible participants at the time of the airdrop, based on their Points balance.
                        </p>
                    </CardContent>
                </Card>
            </div>


            <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                    {searchTerm.trim() 
                        ? `Displaying ${usersToDisplay.length} search results.` 
                        : `Search, manage, and export user data. The airdrop export includes all active users with a valid wallet. Displaying ${allUsers.length} of ${totalUserCount} users.`}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 py-4 flex-wrap">
                    <div className="relative flex-grow min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by ID, Wallet, Username..."
                            className="pl-9 w-full"
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                         {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button disabled={isUnbanning} variant="destructive" className="flex-shrink-0">
                                    {isUnbanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                                    Unban All Users
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will unban ALL users. This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleUnbanAll} className={cn(buttonVariants({variant: 'destructive'}))}>Confirm</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button onClick={handleExportAirdrop} disabled={isExportingAirdrop} variant="outline" className="flex-shrink-0">
                            {isExportingAirdrop ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Export Airdrop
                        </Button>
                         <Button onClick={handleExportAllUsers} disabled={isExporting} variant="outline" className="flex-shrink-0">
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Export All Users
                        </Button>
                    </div>
                </div>
                <Tabs defaultValue="tg-active" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                        <TabsTrigger value="tg-active">Telegram - Active ({activeTelegramCount})</TabsTrigger>
                        <TabsTrigger value="tg-banned">Telegram - Banned ({bannedTelegramUsers.length})</TabsTrigger>
                        <TabsTrigger value="browser-active">Browser - Active ({activeBrowserCount})</TabsTrigger>
                        <TabsTrigger value="browser-banned">Browser - Banned ({bannedBrowserUsers.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="tg-active" className="mt-4">
                        <UserTable
                            users={activeTelegramUsers}
                            onUpdateStatus={handleUpdateStatus}
                            onDeleteUser={handleDeleteUser}
                            onCopy={handleCopy}
                            onBalanceUpdated={handleBalanceUpdated}
                            onWalletUpdated={handleWalletUpdated}
                            onForceBoost={handleForceBoost}
                        />
                    </TabsContent>
                    <TabsContent value="tg-banned" className="mt-4">
                        <UserTable
                            users={bannedTelegramUsers}
                            onUpdateStatus={handleUpdateStatus}
                            onDeleteUser={handleDeleteUser}
                            onCopy={handleCopy}
                            onBalanceUpdated={handleBalanceUpdated}
                            onWalletUpdated={handleWalletUpdated}
                            onForceBoost={handleForceBoost}
                        />
                    </TabsContent>
                    <TabsContent value="browser-active" className="mt-4">
                        <UserTable
                            users={activeBrowserUsers}
                            onUpdateStatus={handleUpdateStatus}
                            onDeleteUser={handleDeleteUser}
                            onCopy={handleCopy}
                            onBalanceUpdated={handleBalanceUpdated}
                            onWalletUpdated={handleWalletUpdated}
                            onForceBoost={handleForceBoost}
                        />
                    </TabsContent>
                     <TabsContent value="browser-banned" className="mt-4">
                        <UserTable
                            users={bannedBrowserUsers}
                            onUpdateStatus={handleUpdateStatus}
                            onDeleteUser={handleDeleteUser}
                            onCopy={handleCopy}
                            onBalanceUpdated={handleBalanceUpdated}
                            onWalletUpdated={handleWalletUpdated}
                            onForceBoost={handleForceBoost}
                        />
                    </TabsContent>
                </Tabs>
                {lastVisible && allUsers.length < totalUserCount && !searchTerm.trim() && (
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
