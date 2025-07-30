/**
 * This file should be created inside the 'functions' directory after
 * running 'firebase init functions'.
 * This code is for a backend Cloud Function and is separate from the Next.js app.
 */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

// Initialize the Firebase Admin SDK to access Firestore.
admin.initializeApp();
const db = admin.firestore();

// Get the Telegram Bot Token from the environment configuration.
// This is set using the command: firebase functions:config:set telegram.bot_token="..."
const botToken = functions.config().telegram.bot_token;

/**
 * A scheduled Cloud Function that runs every 60 minutes.
 * It counts the total number of users in the Firestore database and
 * updates the Telegram bot's description with that count.
 */
export const updateUserCountOnBotProfile = functions.pubsub
  .schedule("every 60 minutes")
  .onRun(async (context) => {
    console.log("Running scheduled function to update bot user count.");

    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN is not set in environment variables. Run 'firebase functions:config:set telegram.bot_token=...'");
      return null;
    }

    try {
      // 1. Get the total number of users from Firestore's metadata.
      // This is much more efficient than fetching all documents.
      const usersCollection = db.collection("users");
      const snapshot = await usersCollection.count().get();
      const userCount = snapshot.data().count;

      console.log(`Found ${userCount} total users.`);

      // 2. Format the description string. You can customize this message.
      const description = `${userCount.toLocaleString()} users are forging Aether! Join them now. 🚀`;

      // 3. Call the Telegram Bot API's 'setMyDescription' method.
      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setMyDescription`;
      
      const response = await fetch(telegramApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description: description }),
      });

      const result = await response.json() as { ok: boolean, description?: string };

      if (result.ok) {
        console.log("Successfully updated bot description:", description);
      } else {
        console.error("Failed to update bot description:", result.description);
      }

    } catch (error) {
      console.error("An error occurred while executing the function:", error);
    }

    // Return null to indicate successful execution.
    return null;
  });
