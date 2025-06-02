let { bot, session, initBot } = require('../services/telegram')
const { addToQueue, QUEUE_TYPES } = require('../services/queue')
const {
  conversations,
  createConversation,
} = require("@grammyjs/conversations");
// const TG_BOT_API_KEY = process.env.TG_BOT_API_KEY;
// const akave = require('../services/akave'); // Import the S3 service
const schedule = require('node-schedule');
const Notification = require('../models/notification');
const User = require('../models/user');
const HealthData = require('../models/healthData');
// const { sendTelegramMessage } = require('../services/telegram');
// const { Bot } = require('grammy')
const leader = require('../services/leader')
const logger = require('../utils/logger')

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

// Use a single cron job instead of per-user jobs
const NOTIFICATION_TIME = '0 10 * * *'; // 10am daily
const BATCH_SIZE = 100; // Process users in batches

async function setupBot() {
  try {
    // Initialize bot instance
    bot = await initBot()
    
    // Only set up commands if we're the leader
    if (await leader.isCurrentLeader()) {
      logger.info('Setting up bot commands as leader')
      
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

      // Schedule notification job
      async function scheduleNotification(userId) {
        // create a notification in the db
        if (await Notification.findOne({ user_id: userId })) {
          return;
        }

        const notification = new Notification({
          user_id: userId,
          is_active: true,
          last_sent: null
        });
        await notification.save();
      }

      // Single notification job that handles all users
      const notificationJob = schedule.scheduleJob(NOTIFICATION_TIME, async () => {
          try {
              console.log('Starting daily notification batch job');
              let processed = 0;
              let lastId = null;

              // Process users in batches to avoid memory issues
              while (true) {
                  // Get batch of active notifications
                  const notifications = await Notification.find({
                      is_active: true,
                      ...(lastId && { _id: { $gt: lastId } })
                  })
                  .limit(BATCH_SIZE)
                  .sort('_id');

                  if (notifications.length === 0) break;

                  // Process notifications in parallel with rate limiting
                  await Promise.all(notifications.map(async (notification) => {
                      try {
                          const user = await User.findOne({ telegram_id: notification.user_id });
                          
                          // Skip if user already checked in today
                          if (user?.last_checkin) {
                              const lastCheckIn = new Date(user.last_checkin);
                              if (lastCheckIn.toDateString() === new Date().toDateString()) {
                                  console.log(`User ${notification.user_id} already checked in today`);
                                  return;
                              }
                          }

                          // Send notification with exponential backoff retry
                          await retryWithBackoff(async () => {
                              await bot.api.sendMessage(
                                  notification.user_id,
                                  "👋 Time for your daily check-in! Share how you're feeling today and earn points. Type /checkin to start."
                              );
                          });

                          // Update last sent time
                          notification.last_sent = new Date();
                          await notification.save();
                          processed++;

                      } catch (error) {
                          console.error(`Error processing notification for user ${notification.user_id}:`, error);
                      }
                  }));

                  lastId = notifications[notifications.length - 1]._id;
              }

              console.log(`Completed daily notifications. Processed ${processed} users`);
          } catch (error) {
              console.error('Error in notification batch job:', error);
          }
      });

      // Retry helper with exponential backoff
      async function retryWithBackoff(fn, maxRetries = 3) {
          for (let i = 0; i < maxRetries; i++) {
              try {
                  await fn();
                  return;
              } catch (error) {
                  if (i === maxRetries - 1) throw error;
                  await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
              }
          }
      }

      // Daily check-in conversation
      async function dailyCheckIn(conversation, ctx) {
        try {
          // Check registration first
          const isRegistered = await checkUserRegistration(ctx.from.id);
          if (!isRegistered) {
            await ctx.reply(
              "Looks like you haven't registered yet! Please open the Health Profile app first to complete registration.",
              {
                reply_markup: {
                  inline_keyboard: [[
                    { text: "Set Up Profile", web_app: { url: MINI_APP_URL } }
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
          let healthProfileUpdate = false;
          let mood = '';
          let doctorVisit = false;
          let healthComment = '';
          let painLevel = 0;
          let painDetailsText = '';
          let fatigueLevel = 0;
          let fatigueDetailsText = '';
          let anxietyLevel = 0;
          let anxietyDetailsText = '';

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
              `Hey there, ${ctx.from.first_name} how are you feeling health-wise in general, today?`,
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
            mood = moodResponse.callbackQuery.data;
            
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

            const healthCommentResponse = await conversation.waitFor(":text");
            healthComment = healthCommentResponse.message.text;

            // Pain options in rows
            await ctx.reply(
              "Good to know. Are you experiencing any pain today?",
              addCancelButton({
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "none at all 😀", callback_data: "1" }],
                    [{ text: "a bit, but it’s easily forgotten 🥲", callback_data: "2" }],
                    [{ text: "the pain is always there and but I’m getting by 😓", callback_data: "3" }],
                    [{ text: "the pain makes it hard to concentrate 😩", callback_data: "4" }],
                    [{ text: "I can’t function the pain is so bad 😖", callback_data: "5" }]
                  ]
                }
              })
            );

            const painOptions = {
              1: "That’s wonderful. Anything you’d like to add?",
              2: "Noted. Is the pain from an existing condition or something new?",
              3: "I understand. What makes today’s pain different?",
              4: "I’m really sorry to hear that. Can you tell me more about what’s happening?",
              5: "That’s awful. If you can, please describe a little of what’s going on, just so I have some insight for you over time. Then take care of yourself."
            };

            const painResponse = await conversation.waitFor("callback_query");
            if (painResponse.callbackQuery.data === "start_over") {
              await ctx.reply("Let's start over!");
              continue;
            }
            if (painResponse.callbackQuery.data === "cancel") {
              await ctx.reply("Check-in cancelled. Come back when you're ready!");
              return;
            }
            painLevel = parseInt(painResponse.callbackQuery.data);

            await ctx.reply(
              painOptions[painLevel]
            );

            const painDetails = await conversation.waitFor(":text");
            painDetailsText = painDetails.message.text;

            // Stress options in rows
            await ctx.reply(
              "Thank you for sharing that. How much stress or anxiety do you think you’re carrying today?",
              addCancelButton({
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "today is easy breezy 🪶", callback_data: "1" }],
                    [{ text: "I barely notice it�", callback_data: "2" }],
                    [{ text: "some, but I’m coping 💪", callback_data: "3" }],
                    [{ text: "it sucks but I can carry it if I’m careful 🏋️‍♀️", callback_data: "4" }],
                    [{ text: "I’m overwhelmed 😭", callback_data: "5" }]
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
            anxietyLevel = parseInt(stressResponse.callbackQuery.data);

            // Follow-up stress questions based on response
            // 
            const stressFollowUps = {
              1: "Glad to hear things are chill! Is there anything you’d like to share?",
              2: "Sounds like you’re feeling zen enough to let the stress flow by. Would you care to elaborate what those stressors are?",
              3: "I’m proud of you for feeling on top of things. What is generating the stress you’re noticing?",
              4: "Take a moment to breathe. If you can, would you mind sharing the source of stress/anxiety?",
              5: "That’s a lot to carry. I’m here to help you through it. What’s been going on?"
            };

            await ctx.reply(
              stressFollowUps[anxietyLevel]
            );
            
            const stressDetails = await conversation.waitFor(":text");
            anxietyDetailsText = stressDetails.message.text;

          //   - Got it. Thanks. Finally, how fatigued are you today? [I’m full of energy 💃] [feeling fairly spry 💅] [could be better but I’m moving🚶‍♀️‍➡️] [I’m having to push myself 🧎‍♀️] [I feel like I’m carrying the world 🌍 ]
          // - Oh great — I want to join the party. Since I can’t, can you tell me what makes today’s energy great?
          // - Sounds good. What’s notable about your energy level today?
          // - Got it. What about this feeling is different than other days?
          // - Okay. What makes today hard?
          // - That sounds like an awful lot. Why does it feel that way?

            await ctx.reply(
              "Got it. Thanks. Finally, how fatigued are you today?",
              addCancelButton({
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "I’m full of energy 💃", callback_data: "1" }],  
                    [{ text: "feeling fairly spry 💅", callback_data: "2" }],
                    [{ text: "could be better but I’m moving🚶‍♀️‍➡️", callback_data: "3" }],
                    [{ text: "I’m having to push myself 🧎‍♀️", callback_data: "4" }],
                    [{ text: "I feel like I’m carrying the world 🌍 ", callback_data: "5" }]
                  ]
                }
              })  
            );

            const fatigueResponse = await conversation.waitFor("callback_query");
            if (fatigueResponse.callbackQuery.data === "start_over") {
              await ctx.reply("Let's start over!");
              continue;
            } 
            if (fatigueResponse.callbackQuery.data === "cancel") {
              await ctx.reply("Check-in cancelled. Come back when you're ready!");
              return;
            }
            fatigueLevel = parseInt(fatigueResponse.callbackQuery.data);

            const fatigueOptions = {
              1: "Oh great — I want to join the party. Since I can’t, can you tell me what makes today’s energy great?",
              2: "Sounds good. What’s notable about your energy level today?",
              3: "Got it. What about this feeling is different than other days?",
              4: "Okay. What makes today hard?",
              5: "That sounds like an awful lot. Why does it feel that way?"
            };
            
            await ctx.reply(
              fatigueOptions[fatigueLevel]
            );

            const fatigueDetails = await conversation.waitFor(":text");
            fatigueDetailsText = fatigueDetails.message.text;

            // Doctor visit options in rows
            await ctx.reply(
              "Thank you so much for sharing your experience with me. Did you see a doctor today?",
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
            const doctorVisitCallback = doctorResponse.callbackQuery.data;
            
            if (doctorVisitCallback === "yes") {
              doctorVisit = true;
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
              if (updateResponse.callbackQuery.data === "cancel") {
                await ctx.reply("Check-in cancelled. Come back when you're ready!");
                return;
              }
              if (updateResponse.callbackQuery.data === "yes") {
                showAppButton = true;
                await ctx.reply("Okay — we'll finish your check-in and then I'll take you to your profile to update that.");
                healthProfileUpdate = true;
              }

              // Final check to allow them to restart or cancel
              await ctx.reply(
                "Are you satisfied with your check-in? You can always restart or cancel if needed.",
                addCancelButton({
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "Complete Check-In", callback_data: "complete" }],
                    ]
                  }
                })
              );

              const completeResponse = await conversation.waitFor("callback_query");
              if (completeResponse.callbackQuery.data === "start_over") {
                await ctx.reply("Let's start over!");
                continue;
              }
              if (completeResponse.callbackQuery.data === "cancel") {
                await ctx.reply("Check-in cancelled. Come back when you're ready!");
                return;
              }
              if (completeResponse.callbackQuery.data === "complete") {
                break;
              }
            }

            // If we reach here, conversation completed successfully
            break;
          }

          const user = await User.findOne({ telegram_id: ctx.from.id });
          const userHash = user.user_hash;
          // upload to akave

          console.log("userHash", userHash);

          await addToQueue(
            QUEUE_TYPES.CHECKIN,
            {
              user_hash: userHash.user_hash,
              timestamp: new Date(),
              mood: mood,
              health_comment: healthComment,
              doctor_visit: doctorVisit,  
              health_profile_update: healthProfileUpdate,
              anxiety_level: anxietyLevel,
              anxiety_details: anxietyDetailsText,
              pain_level: painLevel,
              pain_details: painDetailsText,
              fatigue_level: fatigueLevel,
              fatigue_details: fatigueDetailsText
            },
            ctx.from.id,
            userHash.user_hash
          )

          // // Add points to user
          // await addPoints(ctx.from.id, 1);
          await user.recordCheckIn();

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
                  { text: "Open Profile", web_app: { url: MINI_APP_URL } }
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
                [{ text: "Edit Profile", web_app: { url: MINI_APP_URL } }]
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

      // Simplified notification toggle handler
      bot.callbackQuery(/^notif_/, async (ctx) => {
          const turnOn = ctx.callbackQuery.data === "notif_on";
          const userId = ctx.from.id;
          
          try {
              let notification = await Notification.findOne({ user_id: userId });

              if (turnOn) {
                  if (!notification) {
                      notification = new Notification({
                          user_id: userId,
                          is_active: true
                      });
                  } else {
                      notification.is_active = true;
                  }
                  await notification.save();
              } else if (notification) {
                  notification.is_active = false;
                  await notification.save();
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
                { text: "Edit Profile", web_app: { url: MINI_APP_URL } }
              ]]
            }
          }
        );
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

      bot.command("delete", async (ctx) => {
        const user = await User.findOne({ telegram_id: ctx.from.id });
        if (!user) {
          await ctx.reply("You haven't registered yet. Please register in our mini app to delete your account.");
          return;
        }

        await ctx.conversation.enter("deleteAccount");
      });

      // Update setupBotCommands function
      async function setupBotCommands() {
        try {
          await bot.api.setMyCommands([
            { command: "checkin", description: "Start your daily check-in" },
            { command: "app", description: "Open Asterisk mini app" },
            { command: "notifications", description: "Manage notification settings" },
            { command: "menu", description: "Show all available options" },
            { command: "delete", description: "Delete your account" },
            // { command: "debug", description: "Show debug information" }
          ]);
          console.log('Bot commands menu updated successfully');
        } catch (error) {
          console.error('Failed to set bot commands:', error);
        }
      }

      notificationJob;

      bot.start();
      setupBotCommands().catch(error => 
        logger.error('Failed to set bot commands:', error)
      );
      


      logger.info('Bot commands and handlers set up successfully')
    } else {
      logger.info('Not leader, skipping bot command setup')
    }
  } catch (error) {
    logger.error('Failed to setup bot:', error)
    throw error
  }
}

// Export for use in other files
module.exports = {
  setupBot,
  getBot: () => bot
}

