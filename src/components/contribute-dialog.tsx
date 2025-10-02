
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Sparkles } from 'lucide-react';
import { UserData, getUserId, TelegramUser, getUserData } from '@/lib/database';
import { processContribution } from '@/ai/flows/process-contribution-flow';

interface ContributeDialogProps {
    user: TelegramUser;
    userData: UserData | null;
    onContribution: (newBalance: number, newContributionTotal: number) => void;
    children: React.ReactNode;
}

const PRESET_AMOUNTS = [100, 500, 1000, 2500];
const MAX_CONTRIBUTION = 10000;

export function ContributeDialog({ user, userData, onContribution, children }: ContributeDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [amount, setAmount] = useState<number | string>('');
    const [isContributing, setIsContributing] = useState(false);
    
    const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
    const [feedbackDialogContent, setFeedbackDialogContent] = useState({ title: '', description: '' });
    
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const showFeedbackDialog = (title: string, description: string) => {
        setFeedbackDialogContent({ title, description });
        setFeedbackDialogOpen(true);
    };

    const currentContribution = userData?.totalContributedStars || 0;
    const remainingContribution = MAX_CONTRIBUTION - currentContribution;

    const stopPolling = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    }, []);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, [stopPolling]);


    const handleAmountChange = (value: string) => {
        const numericValue = parseInt(value, 10);
        if (value === '') {
            setAmount('');
        } else if (!isNaN(numericValue) && numericValue > 0) {
            setAmount(Math.min(numericValue, remainingContribution));
        }
    };
    
    const selectPreset = (preset: number) => {
        setAmount(Math.min(preset, remainingContribution));
    }

    const handleContribute = async () => {
        if (!user || isContributing || !amount || Number(amount) <= 0) {
            return;
        }

        const contributionAmount = Number(amount);
        
        if (contributionAmount > remainingContribution) {
            showFeedbackDialog("Limit Exceeded", `You can only contribute up to ${remainingContribution} more Stars.`);
            return;
        }

        setIsContributing(true);
        try {
            const userId = getUserId(user);
            const response = await fetch('/api/create-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: 'Ecosystem Contribution',
                    description: `Contribute ${contributionAmount} Stars to the Exnus ecosystem and receive ${contributionAmount} EXN.`,
                    payload: `contribution_${userId}_${contributionAmount}`,
                    currency: 'XTR',
                    amount: contributionAmount,
                }),
            });

            const { invoiceUrl, error } = await response.json();

            if (error) { throw new Error(error); }
            if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.openInvoice(invoiceUrl, (status) => {
                    // This callback is more reliable for knowing when the invoice window is closed.
                    if (status === 'paid') {
                        // Start polling immediately
                        startPollingForConfirmation(contributionAmount);
                    } else {
                        // If status is cancelled, failed, or pending, we can give instant feedback.
                        showFeedbackDialog('Payment Not Completed', `The payment was ${status}. Please try again.`);
                        setIsContributing(false);
                        setIsOpen(false);
                    }
                });
            } else {
                throw new Error('Telegram WebApp context not found.');
            }

        } catch (e: any) {
            console.error("Error creating contribution invoice:", e);
            showFeedbackDialog("Error", `Could not initiate payment: ${e.message}`);
            setIsContributing(false);
        }
    };
    
    const startPollingForConfirmation = (paidAmount: number) => {
        // Close the main dialog and keep the button disabled
        setIsOpen(false); 
        
        // Let the user know we're confirming
        showFeedbackDialog("Processing...", "Confirming your contribution. This may take a moment.");

        const initialContribution = userData?.totalContributedStars || 0;
        let attempts = 0;
        const maxAttempts = 20; // Poll for 60 seconds (20 * 3s)

        pollIntervalRef.current = setInterval(async () => {
            attempts++;
            if (attempts > maxAttempts) {
                stopPolling();
                showFeedbackDialog("Confirmation Delayed", "We are still confirming your payment. Your balance will be updated shortly if successful.");
                setIsContributing(false);
                return;
            }

            try {
                const { userData: freshUserData } = await getUserData(user);
                const newContribution = freshUserData.totalContributedStars || 0;

                if (newContribution > initialContribution) {
                    stopPolling();
                    onContribution(freshUserData.balance, newContribution);
                    showFeedbackDialog('Contribution Successful!', `Your balance has been updated with ${paidAmount} EXN. Thank you!`);
                    setIsContributing(false);
                }
            } catch (error) {
                console.error("Polling error:", error);
                // Continue polling, maybe a temp network issue
            }
        }, 3000); // Check every 3 seconds
    };
    
    const exnReward = Number(amount) > 0 ? Number(amount) : 0;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => {
                if(isContributing) return; // Don't allow closing while payment is in progress
                setIsOpen(open);
            }}>
                <DialogTrigger asChild>{children}</DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <Sparkles className="w-16 h-16 text-primary" />
                        </div>
                        <DialogTitle className="text-2xl">Build With Us</DialogTitle>
                        <DialogDescription className="px-4">
                            Your contribution fuels our ecosystem, helping us secure top-tier exchange listings and drive innovation. Together, we build the future.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-4 space-y-4">
                        <div className="text-center p-4 bg-primary/10 rounded-lg">
                            <p className="text-sm text-muted-foreground">Your EXN Reward</p>
                            <p className="text-4xl font-bold text-gold">{exnReward.toLocaleString()} EXN</p>
                            <p className="text-xs text-muted-foreground mt-1">1 Star = 1 EXN</p>
                        </div>

                        <div className="flex flex-col space-y-2">
                            <Input
                                id="custom-amount"
                                type="number"
                                placeholder="Enter custom Star amount"
                                value={amount}
                                onChange={(e) => handleAmountChange(e.target.value)}
                                className="text-center h-12 text-lg"
                                disabled={isContributing || remainingContribution <= 0}
                            />
                            <div className="grid grid-cols-4 gap-2">
                                {PRESET_AMOUNTS.map((preset) => (
                                    <Button
                                        key={preset}
                                        variant="outline"
                                        onClick={() => selectPreset(preset)}
                                        disabled={isContributing || remainingContribution < preset}
                                    >
                                        {preset}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="text-center text-xs text-muted-foreground">
                            Your contribution limit: {currentContribution.toLocaleString()} / {MAX_CONTRIBUTION.toLocaleString()} Stars
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            className="w-full h-12 text-lg"
                            onClick={handleContribute}
                            disabled={isContributing || !amount || Number(amount) <= 0 || remainingContribution <= 0}
                        >
                            {isContributing ? `Processing...` : `Contribute ${Number(amount) > 0 ? Number(amount).toLocaleString() : ''} Stars`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{feedbackDialogContent.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {feedbackDialogContent.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setFeedbackDialogOpen(false)}>OK</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
