const { Bot, session } = require("grammy");
const {
  conversations,
  createConversation,
} = require("@grammyjs/conversations");
const TG_BOT_API_KEY = process.env.TG_BOT_API_KEY;
const akave = require('../services/akave'); // Import the S3 service
const schedule = require('node-schedule');
const Notification = require('../models/notification');
const User = require('../models/user');
const HealthData = require('../models/healthData');
const bot = new Bot(TG_BOT_API_KEY);

// Registration cache
const registrationCache = new Map();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

// Store last check-in times
const lastCheckIns = new Map();

// Store active reminder jobs with user IDs
const activeReminders = new Map();

// Remove frequency constants since we're only using daily
const DAILY_SCHEDULE = '* * * * *'; // every minute for testing
// const DAILY_SCHEDULE = '0 10 * * *'; // 10am daily for production

// Add mini app URL as a constant at the top
const MINI_APP_URL = "https://asterisk-health-profile-miniapp.onrender.com";

// Initialize minimal session
bot.use(session({ initial: () => ({}) }));
bot.use(conversations());

// Helper function to check user registration with caching
async function checkUserRegistration(userId) {
  // return true;
  const now = Date.now();
  
  // Check cache first
  if (registrationCache.has(userId)) {
    const cached = registrationCache.get(userId);
    if (now < cached.expiresAt) {
      return cached.isRegistered;
    }
    // Cache expired, remove it
    registrationCache.delete(userId);
  }

  try {
    // Check user in DB not akave
    const isRegistered = await User.findOne({ telegram_id: userId });
    // Cache the result
    registrationCache.set(userId, {
      isRegistered,
      expiresAt: now + CACHE_TTL
    });
    return isRegistered;
  } catch (error) {
    console.error('Failed to check registration:', error);
    return false;
  }
}

// Helper to invalidate cache (use when user registers)
function invalidateRegistrationCache(userId) {
  registrationCache.delete(userId);
}

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of registrationCache.entries()) {
    if (now >= data.expiresAt) {
      registrationCache.delete(userId);
    }
  }
}, CACHE_TTL);

// Add points to user
async function addPoints(userId, points) {
  await User.addPoints(userId, points);
}

// Check in user
async function checkIn(userId) {
  await User.checkIn(userId);
}

// Modify addCancelButton function to add both Start Over and Cancel buttons
const addCancelButton = (keyboard) => {
  if (!keyboard.reply_markup) {
    keyboard.reply_markup = { inline_keyboard: [] }
  }
  // Add two rows - one for Start Over, one for Cancel
  keyboard.reply_markup.inline_keyboard.push(
    [{ text: "⟲ Start Over", callback_data: "start_over" }],
    [{ text: "❌ Cancel", callback_data: "cancel" }]
  )
  return keyboard
}

// Schedule a single notification
async function scheduleNotification(userId) {
  try {
    // First check if user has notifications enabled
    let notification = await Notification.findOne({ 
      user_id: userId
    });

    // If no notification record or notifications are disabled, skip scheduling
    if (!notification?.is_active) {
      console.log(`Notifications disabled for user ${userId}`);
      return false;
    }

    // If user already has a scheduled notification, skip
    if (activeReminders.has(userId)) {
      console.log(`User ${userId} already has an active notification`);
      return true;
    }

    // Create notification record if doesn't exist
    if (!notification?.is_active) {
      notification = new Notification({
        user_id: userId,
        scheduled_time: DAILY_SCHEDULE,
        is_active: true
      });
      await notification.save();
      console.log(`Created new notification record for user ${userId}`);
    }

    // Schedule the job
    const job = schedule.scheduleJob(notification.scheduled_time, async () => {
      try {
        console.log(`Running notification for user ${userId}`);
        
        await bot.api.sendMessage(userId, 
          "👋 Hi! Don't forget to check in today to earn your point! " +
          "Your voice matters in shaping women's healthcare. Type /checkin to start."
        );
        
        // Update last sent time
        notification.last_sent = new Date();
        await notification.save();
        
        console.log(`Successfully sent reminder to user ${userId}`);
      } catch (error) {
        console.error(`Error in notification job for user ${userId}:`, error);
      }
    });

    if (job) {
      activeReminders.set(userId, job);
      console.log(`Scheduled notification for user ${userId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Failed to schedule notification for user ${userId}:`, error);
    return false;
  }
}

// Initialize all notifications
async function initializeNotifications() {
  try {
    // Get only active notifications
    const notifications = await Notification.find({ is_active: true });
    console.log(`Found ${notifications.length} active notifications`);
    
    // Schedule each notification
    let scheduled = 0;
    for (const notification of notifications) {
      if (await scheduleNotification(notification.user_id)) {
        scheduled++;
      }
    }
    
    console.log(`Successfully scheduled ${scheduled}/${notifications.length} notifications`);
  } catch (error) {
    console.error('Failed to initialize notifications:', error);
  }
}

// Daily check-in conversation
async function dailyCheckIn(conversation, ctx) {
  try {
    // Check registration first
    const isRegistered = await checkUserRegistration(ctx.from.id);
    if (!isRegistered) {
      await ctx.reply(
        "Looks like you haven't registered yet! Please open the mini app first to complete registration.",
        {
          reply_markup: {
            inline_keyboard: [[
              { text: "Open Mini App", web_app: { url: "https://your-domain.com/miniapp/" } }
            ]]
          }
        }
      );
      return;
    }

    // Check if user has already checked in today
    // const lastCheckIn = await User.findOne({ telegram_id: ctx.from.id }).select('last_checkin');
    // if (lastCheckIn?.last_checkin.toDateString() === new Date().toDateString()) {
    //   await ctx.reply("You've already checked in today! Come back tomorrow to check in again.");
    //   return;
    // }

    let showAppButton = false;

    // Start check-in loop
    while (true) {
      // Mood options with emojis and cancel button
      const moodOptions = {
        "great ☀️": "great",
        "good 🌤️": "good",
        "fair ⛅️": "fair",
        "poor 🌦️": "poor",
        "terrible ⛈️": "terrible"
      };

      // Format mood options in rows
      const moodRows = Object.entries(moodOptions).map(([text, data]) => ([
        { text, callback_data: data }
      ]));

      await ctx.reply(
        `Hey there, how are you today?`,
        addCancelButton({
          reply_markup: {
            inline_keyboard: moodRows
          }
        })
      );

      const moodResponse = await conversation.waitFor("callback_query");
      if (moodResponse.callbackQuery.data === "start_over") {
        await ctx.reply("Let's start over!");
        continue;
      }
      if (moodResponse.callbackQuery.data === "cancel") {
        await ctx.reply("Check-in cancelled. Come back when you're ready!");
        return; // Exit the conversation
      }
      const mood = moodResponse.callbackQuery.data;
      
      // Personalized response based on mood
      const moodResponses = {
        great: "I'm glad you're doing well!",
        good: "Nice to hear you're feeling good.",
        fair: "A fair day is okay.",
        poor: "I'm sorry you're feeling poorly.",
        terrible: "Terrible days are terrible. I'm really sorry you're having a hard time."
      };

      await ctx.reply(
        `${moodResponses[mood]} What about your health feels ${mood} today?`
      );

      await conversation.waitFor(":text");

      // Stress options in rows
      await ctx.reply(
        "Thank you for sharing that. How much stress do you think you're carrying today?",
        addCancelButton({
          reply_markup: {
            inline_keyboard: [
              [{ text: "a lot 🏋️‍♀️", callback_data: "high_stress" }],
              [{ text: "some, but I'm coping 💪", callback_data: "medium_stress" }],
              [{ text: "today is easy breazy 🪶", callback_data: "low_stress" }]
            ]
          }
        })
      );

      const stressResponse = await conversation.waitFor("callback_query");
      if (stressResponse.callbackQuery.data === "start_over") {
        await ctx.reply("Let's start over!");
        continue;
      }
      if (stressResponse.callbackQuery.data === "cancel") {
        await ctx.reply("Check-in cancelled. Come back when you're ready!");
        return;
      }
      const stress = stressResponse.callbackQuery.data;

      // Follow-up stress questions based on response
      const stressFollowUps = {
        high_stress: "Can you tell me more about what is creating stress today?",
        medium_stress: "I'm proud of you for feeling on top of things. What is generating the stress you're noticing?",
        low_stress: "Glad to hear things are chill! Is there anything you'd like to add?"
      };

      await ctx.reply(
        stressFollowUps[stress]
      );
      
      const stressDetails = await conversation.waitFor(":text");
      const stressDetailsText = stressDetails.message.text;

      // Doctor visit options in rows
      await ctx.reply(
        "Thank you so much for explaining that to me. Did you see a doctor today?",
        addCancelButton({
          reply_markup: {
            inline_keyboard: [
              [{ text: "yes 🩺", callback_data: "yes" }],
              [{ text: "no 🪴", callback_data: "no" }]
            ]
          }
        })
      );

      const doctorResponse = await conversation.waitFor("callback_query");
      if (doctorResponse.callbackQuery.data === "start_over") {
        await ctx.reply("Let's start over!");
        continue;
      }
      const doctorVisit = doctorResponse.callbackQuery.data;

      if (doctorVisit === "yes") {
        await ctx.reply(
          "Do you need to update your conditions or medications?",
          addCancelButton({
            reply_markup: {
              inline_keyboard: [
                [{ text: "Yes", callback_data: "yes" }],
                [{ text: "No", callback_data: "no" }]
              ]
            }
          })
        );

        const updateResponse = await conversation.waitFor("callback_query");
        if (updateResponse.callbackQuery.data === "start_over") {
          await ctx.reply("Let's start over!");
          continue;
        }
        if (updateResponse.callbackQuery.data === "yes") {
          showAppButton = true;
          await ctx.reply("Okay — we'll finish your check-in and then I'll take you to your profile to update that.");
        }
      }

      // If we reach here, conversation completed successfully
      break;
    }

    // Add points to user
    await addPoints(ctx.from.id, 1);
    await checkIn(ctx.from.id);

    // Final messages after successful completion
    await updateLastCheckIn(ctx.from.id);
    const job = await scheduleNotification(ctx.from.id);
    
    if (!job) {
      console.error('Failed to schedule reminder for user:', ctx.from.id);
    } else {
      console.log('Successfully scheduled reminder for user:', ctx.from.id);
    }

    await ctx.reply(
      "Awesome. Thank you again for sharing your experience with us. You've earned a point! " +
      "We believe that women should be able to vote on the future of their healthcare. " +
      "Every day you share your experiences, you'll receive a point. Those points will convert to your vote on the future direction of Asterisk in the form of tokens. " +
      "So try to check in every day!"
    );

    if (showAppButton) {
      await ctx.reply(
        "That's it! We're all done. You can edit these options in your profile at any time. " +
        "Just type /menu for my options. I'll send you a notification tomorrow to remind you to check in. Can't wait!" + 
        "Don't forget to update your profile in the mini app to keep your health data up to date."
      ,{
        reply_markup: {
          inline_keyboard: [[
            { text: "Open Mini App", web_app: { url: MINI_APP_URL } }
          ]]
        }
      }); 
    } else {
      await ctx.reply(
        "That's it! We're all done. You can edit these options in your profile at any time. " +
        "Just type /menu for my options. I'll send you a notification tomorrow to remind you to check in. Can't wait!"
      ); 
    }

  } catch (error) {
    console.error('Check-in conversation error:', error);
    await ctx.reply(
      "I'm sorry, something went wrong. Please try the check-in again by typing /checkin"
    );
  }
}

// Register the conversation
bot.use(createConversation(dailyCheckIn));

// Command to start daily check-in
bot.command("checkin", async (ctx) => {
  await ctx.conversation.enter("dailyCheckIn");
});

// generate menu
bot.command("menu", async (ctx) => {
  const isRegistered = await checkUserRegistration(ctx.from.id);
  
  if (isRegistered) {
    await ctx.reply("Hello! I'm the Asterisk bot. Here are my options:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Check In", callback_data: "checkin" }],
          [{ text: "Open Mini App", web_app: { url: MINI_APP_URL } }]
        ]
      }
    });
  } else {
    await ctx.reply(
      "Welcome to Asterisk! To get started, please register in our mini app:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Register Now", web_app: { url: MINI_APP_URL } }]
        ]
      }
    });
  }
});

// Handle checkin button click
bot.callbackQuery("checkin", async (ctx) => {
  const isRegistered = await checkUserRegistration(ctx.from.id);
  
  if (!isRegistered) {
    await ctx.reply(
      "You'll need to register first before checking in. Please register in our mini app:",
      {
        reply_markup: {
          inline_keyboard: [[
            { text: "Register Now", web_app: { url: MINI_APP_URL } }
          ]]
        }
      }
    );
    return;
  }
  
  await ctx.conversation.enter("dailyCheckIn");
});

// Add to registration or first interaction to start scheduling reminders
bot.command("start", async (ctx) => {
  await scheduleNotification(ctx.from.id);
  await ctx.reply("Welcome to Asterisk! To get started, please register in our mini app:", {
    reply_markup: {
      inline_keyboard: [[
        { text: "Register Now", web_app: { url: MINI_APP_URL } }
      ]]
    }
  });
});

// Add reminder scheduling to web app open handler
// bot.on("web_app_data", async (ctx) => {
//   await scheduleNotification(ctx.from.id);
//   // ... rest of web app handler code
// });

// Modified debug command
bot.command("debug", async (ctx) => {
  const userId = ctx.from.id;
  const notifications = await Notification.find({ 
    user_id: userId,
    is_active: true
  });
  
  const activeJobs = notifications
    .map(n => n._id.toString())
    .filter(id => activeReminders.has(id));
  
  await ctx.reply(
    `Debug Info:\n` +
    `Active notifications: ${notifications.length}\n` +
    `Running jobs: ${activeJobs.length}\n` +
    `Notification details:\n` +
    notifications.map(n => 
      `- ID: ${n._id}\n  Schedule: ${n.scheduled_time}\n  Last sent: ${n.last_sent || 'never'}`
    ).join('\n')
  );
});

// Update last check-in time when user completes check-in
async function updateLastCheckIn(userId) {
  lastCheckIns.set(userId, new Date());
}

// Simplify notification command
bot.command("notifications", async (ctx) => {
  const notification = await Notification.findOne({ 
    user_id: ctx.from.id,
    is_active: true 
  });

  const isEnabled = !!notification?.is_active;
  
  await ctx.reply(
    "Notification Settings\n\n" +
    `Status: ${isEnabled ? '🔔 Enabled' : '🔕 Disabled'}\n\n` +
    "Choose an option:",
    {
      reply_markup: {
        inline_keyboard: [
          [{ 
            text: isEnabled ? "🔕 Turn Off" : "🔔 Turn On", 
            callback_data: isEnabled ? "notif_off" : "notif_on" 
          }]
        ]
      }
    }
  );
});

// Simplify notification handler
bot.callbackQuery(/^notif_/, async (ctx) => {
  const turnOn = ctx.callbackQuery.data === "notif_on";
  
  try {
    let notification = await Notification.findOne({ 
      user_id: ctx.from.id
    });

    // Create new notification if turning on and doesn't exist
    if (turnOn && !notification) {
      notification = new Notification({
        user_id: ctx.from.id,
        scheduled_time: DAILY_SCHEDULE
      });
    }

    if (notification) {
      // Cancel existing reminder if any
      if (activeReminders.has(ctx.from.id)) {
        const existingJob = activeReminders.get(ctx.from.id);
        existingJob.cancel();
        activeReminders.delete(ctx.from.id);
      }

      notification.is_active = turnOn;
      await notification.save();

      // Schedule new reminder if turning on
      if (turnOn) {
        await scheduleNotification(ctx.from.id);
      }
    }

    await ctx.reply(
      `Notifications ${turnOn ? 'enabled' : 'disabled'} successfully! ` +
      (turnOn ? "You'll receive daily check-in reminders at 10am." : "")
    );
  } catch (error) {
    console.error('Failed to update notification settings:', error);
    await ctx.reply('Sorry, failed to update notification settings. Please try again.');
  }
});

// Add command to open mini app
bot.command("app", async (ctx) => {
  await ctx.reply(
    "Open Asterisk mini app to manage your profile and health data:",
    {
      reply_markup: {
        inline_keyboard: [[
          { text: "Open Mini App", web_app: { url: MINI_APP_URL } }
        ]]
      }
    }
  );
});

bot.command("delete-account", async (ctx) => {
  const isRegistered = await checkUserRegistration(ctx.from.id);
  if (!isRegistered) {
    await ctx.reply("You haven't registered yet. Please register in our mini app to delete your account.");
    return;
  }

  await ctx.conversation.enter("deleteAccount");
});

// Delete account conversation
async function deleteAccount(conversation, ctx) {

  // grab user hash from db
  const user = await User.findOne({ telegram_id: ctx.from.id });
  const userHash = user.user_hash;

  await ctx.reply("Are you sure you want to delete your account? This action cannot be undone.",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Confirm", callback_data: "confirm" }],
          [{ text: "Cancel", callback_data: "cancel" }]
        ]
      }
    });
  const confirmResponse = await conversation.waitFor("callback_query");
  if (confirmResponse.callbackQuery.data === "confirm") {
    await User.deleteOne({ telegram_id: ctx.from.id });
    await Notification.deleteOne({ user_id: ctx.from.id });
    await HealthData.deleteOne({ user_hash: userHash });
    await ctx.reply("Your account has been deleted.");
  } else {
    await ctx.reply("Account deletion cancelled.");
  }
}

bot.use(createConversation(deleteAccount));
// Update setupBotCommands function
async function setupBotCommands() {
  try {
    await bot.api.setMyCommands([
      { command: "checkin", description: "Start your daily check-in" },
      { command: "app", description: "Open Asterisk mini app" },
      { command: "notifications", description: "Manage notification settings" },
      { command: "menu", description: "Show all available options" },
      { command: "delete-account", description: "Delete your account" },
      // { command: "debug", description: "Show debug information" }
    ]);
    console.log('Bot commands menu updated successfully');
  } catch (error) {
    console.error('Failed to set bot commands:', error);
  }
}

// Modify bot startup to handle command setup failure
bot.start();
setupBotCommands().catch(error => {
  console.error('Critical error in bot command setup:', error);
  // Bot can still function without commands menu
});
initializeNotifications();

// Export for use in other files if needed
module.exports = {
  bot,
  checkUserRegistration,
  invalidateRegistrationCache
};

