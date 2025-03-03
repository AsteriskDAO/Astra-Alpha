const { Bot, session } = require("grammy");
const {
  conversations,
  createConversation,
} = require("@grammyjs/conversations");
const TG_BOT_API_KEY = process.env.TG_BOT_API_KEY;
const akave = require('../services/akave'); // Import the S3 service

const bot = new Bot(TG_BOT_API_KEY);

// Registration cache
const registrationCache = new Map();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

// Initialize minimal session
bot.use(session({ initial: () => ({}) }));
bot.use(conversations());

// Helper function to check user registration with caching
async function checkUserRegistration(userId) {
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
    const isRegistered = await akave.checkUserExists(userId);
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

// Daily check-in conversation
async function dailyCheckIn(conversation, ctx) {
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

  // Mood options with emojis
  const moodOptions = {
    "great ☀️": "great",
    "good 🌤️": "good",
    "fair ⛅️": "fair",
    "poor 🌦️": "poor",
    "terrible ⛈️": "terrible"
  };

  // Friendly greeting
  await ctx.reply(
    `Hey there, how are you today?`,
    {
      reply_markup: {
        inline_keyboard: [
          Object.keys(moodOptions).map(mood => ({ text: mood, callback_data: moodOptions[mood] }))
        ]
      }
    }
  );

  const moodResponse = await conversation.waitFor("callback_query");
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

  // Wait for any message type
  await conversation.waitFor(":text");

  // Doctor visit question
  await ctx.reply(
    "Thank you so much for sharing. Did you see a doctor today?",
    {
      reply_markup: {
        inline_keyboard: [[
          { text: "yes 🩺", callback_data: "yes" },
          { text: "no 🪴", callback_data: "no" }
        ]]
      }
    }
  );

  const doctorResponse = await conversation.waitFor("callback_query");
  const doctorVisit = doctorResponse.callbackQuery.data;

  if (doctorVisit === "yes") {
    await ctx.reply(
      "Do you need to update your conditions or medications?",
      {
        reply_markup: {
          inline_keyboard: [[
            { text: "Yes", callback_data: "yes" },
            { text: "No", callback_data: "no" }
          ]]
        }
      }
    );

    const updateResponse = await conversation.waitFor("callback_query");
    if (updateResponse.callbackQuery.data === "yes") {
      await ctx.reply("Okay — we'll finish your check-in and then I'll take you to your profile to update that.");
    }
  }

  await ctx.reply(
    "Awesome. Thank you again for sharing your experience with us. You've earned a point! " +
    "We believe that women should be able to vote on the future of their healthcare. " +
    "Every day you share your experiences, you'll receive a point. Those points will convert to your vote on the future direction of Asterisk in the form of tokens. " +
    "So try to check in every day!"
  );

  await ctx.reply(
    "By the way, clinicians are always looking for women to participate in studies and focus groups. " +
    "We're on a mission to help them find more diverse sets of women to work with. " +
    "You'll also earn more points (tokens) by participating. Would you like to be invited if the opportunity arises?",
    {
      reply_markup: {
        inline_keyboard: [[
          { text: "yes 🤓", callback_data: "yes" },
          { text: "no thanks 🧐", callback_data: "no" }
        ]]
      }
    }
  );

  await conversation.waitFor("callback_query");

  await ctx.reply(
    "That's it! We're all done. You can edit these options in your profile at any time. " +
    "Just type /menu for my options. I'll send you a notification tomorrow to remind you to check in. Can't wait!"
  );
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
          [{ text: "Open Mini App", web_app: { url: "https://your-domain.com/miniapp/" } }]
        ]
      }
    });
  } else {
    await ctx.reply(
      "Welcome to Asterisk! To get started, please register in our mini app:", {
      reply_markup: {
        inline_keyboard: [
          [{ 
            text: "Register Now", 
            web_app: { url: "https://your-domain.com/miniapp/" }
          }]
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
            { text: "Register Now", web_app: { url: "https://your-domain.com/miniapp/" } }
          ]]
        }
      }
    );
    return;
  }
  
  await ctx.conversation.enter("dailyCheckIn");
});

// Start the bot
bot.start();

// Export for use in other files if needed
module.exports = {
  bot,
  checkUserRegistration,
  invalidateRegistrationCache
};

