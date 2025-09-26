
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Star, Gift, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserData, getUserId, TelegramUser } from '@/lib/database';
import { processContribution } from '@/ai/flows/process-contribution-flow';
import LoadingDots from './loading-dots';

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
    const { toast } = useToast();

    const currentContribution = userData?.totalContributedStars || 0;
    const remainingContribution = MAX_CONTRIBUTION - currentContribution;
    
    const handleSuccessfulContribution = useCallback(async (payload: string) => {
        const [, userId, amountStr] = payload.split('_');
        const contributionAmount = parseInt(amountStr, 10);
        
        if (userId && !isNaN(contributionAmount)) {
          const result = await processContribution({ userId, amount: contributionAmount });
          if(result.success && result.newBalance !== undefined && result.newTotalContributed !== undefined){
              onContribution(result.newBalance, result.newTotalContributed);
              toast({
                title: 'Contribution Successful!',
                description: `Your balance has been updated with ${contributionAmount} EXN. Thank you!`,
              });
          } else {
             toast({
                variant: 'destructive',
                title: 'Processing Error',
                description: result.reason || "There was an issue crediting your contribution.",
             });
          }
        }
    }, [onContribution, toast]);
    
    useEffect(() => {
        const handleInvoiceClosed = (event: {slug: string; status: 'paid' | 'cancelled' | 'failed' | 'pending'}) => {
            if(event.slug.startsWith('contribution_')) {
                if (event.status === 'paid') {
                    handleSuccessfulContribution(event.slug);
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Payment Not Completed',
                        description: `The payment was ${event.status}. Please try again.`,
                    });
                }
            }
             // Always close dialog and re-enable button
            setIsOpen(false);
            setIsContributing(false);
        }
    
        if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.onEvent('invoiceClosed', handleInvoiceClosed);
            return () => {
                 window.Telegram.WebApp.offEvent('invoiceClosed', handleInvoiceClosed);
            }
        }
    }, [handleSuccessfulContribution, toast]);


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
            toast({ variant: 'destructive', title: "Limit Exceeded", description: `You can only contribute up to ${remainingContribution} more Stars.` });
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
                window.Telegram.WebApp.openInvoice(invoiceUrl);
            } else {
                throw new Error('Telegram WebApp context not found.');
            }

        } catch (e: any) {
            console.error("Error creating contribution invoice:", e);
            toast({ variant: 'destructive', title: "Error", description: `Could not initiate payment: ${e.message}` });
            setIsContributing(false);
        }
    };
    
    const exnReward = Number(amount) > 0 ? Number(amount) : 0;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                        {isContributing ? <LoadingDots /> : `Contribute ${Number(amount) > 0 ? Number(amount).toLocaleString() : ''} Stars`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
