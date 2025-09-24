
'use server';
/**
 * @fileOverview A flow to check for and award achievement bonuses.
 *
 * - awardAchievements - Checks for unlocked achievements and awards points.
 * - AwardAchievementsInput - Input for the flow.
 * - AwardAchievementsOutput - Output for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, runTransaction, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserData, AchievementKey } from '@/lib/database';

const AwardAchievementsInputSchema = z.object({
  userId: z.string().describe('The unique identifier for the user (e.g., user_12345 or browser_xyz).'),
});
export type AwardAchievementsInput = z.infer<typeof AwardAchievementsInputSchema>;

const AwardAchievementsOutputSchema = z.object({
  success: z.boolean().describe('Whether the operation was successful.'),
  awardedPoints: z.number().describe('Total EXN awarded in this run.'),
  awardedAchievements: z.array(z.string()).describe('A list of achievements that were newly awarded.'),
});
export type AwardAchievementsOutput = z.infer<typeof AwardAchievementsOutputSchema>;

const ACHIEVEMENT_REWARD = 100;

export async function awardAchievements(input: AwardAchievementsInput): Promise<AwardAchievementsOutput> {
    return awardAchievementsFlow(input);
}

const awardAchievementsFlow = ai.defineFlow(
  {
    name: 'awardAchievementsFlow',
    inputSchema: AwardAchievementsInputSchema,
    outputSchema: AwardAchievementsOutputSchema,
  },
  async ({ userId }) => {
    if (!userId) {
        return { success: false, awardedPoints: 0, awardedAchievements: [] };
    }

    const userRef = doc(db, 'users', userId);
    let totalPointsAwarded = 0;
    let newAchievements: AchievementKey[] = [];

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error(`User ${userId} not found`);
            }

            const userData = userDoc.data() as UserData;
            const claimed = userData.claimedAchievements || [];
            
            const achievements: Record<AchievementKey, boolean> = {
                verified: userData.verificationStatus === 'verified',
                firstMining: (userData.miningActivationCount || 0) > 0,
                referredFriend: userData.referrals > 0,
                welcomeTasks: Object.values(userData.welcomeTasks || {}).every(Boolean),
                socialTasks: (userData.completedSocialTasks?.length || 0) >= 5,
            };

            let pointsToAdd = 0;

            for (const key in achievements) {
                const achievementKey = key as AchievementKey;
                if (achievements[achievementKey] && !claimed.includes(achievementKey)) {
                    pointsToAdd += ACHIEVEMENT_REWARD;
                    newAchievements.push(achievementKey);
                }
            }

            if (pointsToAdd > 0) {
                const newBalance = userData.balance + pointsToAdd;
                transaction.update(userRef, {
                    balance: newBalance,
                    claimedAchievements: arrayUnion(...newAchievements)
                });
                totalPointsAwarded = pointsToAdd;
            }
        });

        return { 
            success: true, 
            awardedPoints: totalPointsAwarded,
            awardedAchievements: newAchievements,
        };

    } catch (error: any) {
        console.error("Transaction failed for awardAchievements:", error);
        return { success: false, awardedPoints: 0, awardedAchievements: [] };
    }
  }
);
