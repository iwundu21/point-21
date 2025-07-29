
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Shield, Loader2, Trash2, UserX, UserCheck, Lock, CameraOff, Copy, Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, PlusCircle, MessageCircle, ThumbsUp, Repeat, Coins } from 'lucide-react';
import { getAllUsers, updateUserStatus, deleteUser, UserData, addSocialTask, getSocialTasks, deleteSocialTask, SocialTask } from '@/lib/database';
import { Skeleton } from '@/components/ui/skeleton';
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
import { renderIcon } from '@/app/tasks/page';


// NOTE: Add your Telegram user ID here for admin access
const ADMIN_IDS = [123, 12345, 6954452147]; 
const ADMIN_ACCESS_CODE = '202020';
const USERS_PER_PAGE = 50;
const TOTAL_AIRDROP = 100_000_000;


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


export default function AdminPage() {
    const [allUsers, setAllUsers] = useState<UserData[]>([]);
    const [currentUser, setCurrentUser] = useState<TelegramUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [codeAuthenticated, setCodeAuthenticated] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [socialTasks, setSocialTasks] = useState<SocialTask[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);

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
    
    const fetchAdminData = async () => {
        if (!isAdmin && !codeAuthenticated) return;
        setIsLoading(true);
        setIsLoadingTasks(true);
        try {
            const { users: newUsers } = await getAllUsers();
            setAllUsers(newUsers);
            const tasks = await getSocialTasks();
            setSocialTasks(tasks);
        } catch (error) {
            console.error("Failed to fetch admin data:", error);
        } finally {
            setIsLoading(false);
            setIsLoadingTasks(false);
        }
    };
    
    useEffect(() => {
      if(isAdmin || codeAuthenticated) {
        fetchAdminData();
      } else {
        setIsLoading(false);
      }
    }, [isAdmin, codeAuthenticated]);

    const handleUpdateStatus = async (userId: string, status: 'active' | 'banned') => {
        await updateUserStatus(userId, status);
        setAllUsers(currentUsers =>
            currentUsers.map(user =>
                user.id === userId ? { ...user, status: status } : user
            )
        );
        toast({ title: `User ${status === 'active' ? 'unbanned' : 'banned'}.`});
    }

    const handleDeleteUser = async (userId: string) => {
        await deleteUser(userId);
        setAllUsers(allUsers.filter(u => u.id !== userId));
        toast({ variant: 'destructive', title: 'User Deleted', description: 'The user has been permanently removed.'});
    }

    const handleDeleteTask = async (taskId: string) => {
        await deleteSocialTask(taskId);
        setSocialTasks(socialTasks.filter(t => t.id !== taskId));
        toast({ variant: 'destructive', title: 'Task Deleted'});
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
    
    const handleCopy = (textToCopy: string) => {
        navigator.clipboard.writeText(textToCopy);
        toast({
          title: 'Copied to Clipboard!',
        });
      };

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return allUsers;
        return allUsers.filter(user => {
            const term = searchTerm.toLowerCase();
            const telegramId = user.telegramUser?.id.toString() || '';
            const walletAddress = user.walletAddress?.toLowerCase() || '';
            return telegramId.includes(term) || walletAddress.includes(term);
        });
    }, [allUsers, searchTerm]);
    
    const totalPoints = useMemo(() => {
        return allUsers.reduce((acc, user) => acc + user.balance, 0);
    }, [allUsers]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * USERS_PER_PAGE,
        currentPage * USERS_PER_PAGE
    );

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
                    <div className="flex justify-between items-center">
                        <CardTitle>Social Task Management</CardTitle>
                        <AddTaskDialog onTaskAdded={fetchAdminData} />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoadingTasks ? (
                        renderAdminSkeleton()
                    ) : (
                        <div className="overflow-x-auto">
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>Icon</TableHead>
                                       <TableHead>Title</TableHead>
                                       <TableHead>Points</TableHead>
                                       <TableHead>Link</TableHead>
                                       <TableHead className="text-right">Actions</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {socialTasks.map((task) => (
                                       <TableRow key={task.id}>
                                           <TableCell>{renderIcon(task.icon, "w-6 h-6")}</TableCell>
                                           <TableCell className="font-medium">{task.title}</TableCell>
                                           <TableCell>{task.points}</TableCell>
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
                      <div className="relative pt-2">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                         <Input 
                            placeholder="Search by Telegram ID or Wallet Address..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                         />
                      </div>
                  </CardHeader>
                  <CardContent>
                      {isLoading && allUsers.length === 0 ? (
                          renderAdminSkeleton()
                      ) : (
                        <>
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
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {paginatedUsers.map((user) => {
                                const userAirdrop = totalPoints > 0 ? (user.balance / totalPoints) * TOTAL_AIRDROP : 0;
                                return (
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
                                      <TableCell>
                                          {user.walletAddress ? (
                                              <div className="flex items-center gap-2 font-mono text-xs">
                                                  <span className="truncate max-w-[120px]">{user.walletAddress}</span>
                                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(user.walletAddress as string)}>
                                                      <Copy className="h-3 w-3" />
                                                  </Button>
                                              </div>
                                          ) : (
                                              <span className="text-xs text-muted-foreground">N/A</span>
                                          )}
                                      </TableCell>
                                      <TableCell>{user.balance.toLocaleString()}</TableCell>
                                      <TableCell>{user.referrals}</TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Coins className="w-4 h-4 text-yellow-500" />
                                            {userAirdrop.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </div>
                                      </TableCell>
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
                                )
                              })}
                          </TableBody>
                         </Table>
                        </div>
                        <div className="flex items-center justify-between pt-4">
                            <div className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages} ({filteredUsers.length} users)
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        </>
                      )}
                  </CardContent>
              </Card>
          </div>
      </main>
    </div>
  );
}
