const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const {onRequest} = require("firebase-functions/v2/https");
const {onObjectFinalized} = require("firebase-functions/v2/storage");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const {setGlobalOptions} = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const cors = require("cors")({ origin: true });
const vision = require("@google-cloud/vision");
const cosineSimilarity = require("cosine-similarity");
const axios = require("axios");
const bcrypt = require("bcrypt");
const TelegramBot = require("node-telegram-bot-api");

// --- START: Configuration for Telegram Gateway ---
const TELEGRAM_GATEWAY_API_URL = "https://gatewayapi.telegram.org";
// --- END: Configuration for Telegram Gateway ---

// --- START: Telegram Bot Configuration ---
// The bot will be initialized when needed using the secret token
let telegramBot = null;
const initializeTelegramBot = () => {
    if (!telegramBot && process.env.TELEGRAM_BOT_TOKEN) {
        telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    }
    return telegramBot;
};
// --- END: Telegram Bot Configuration ---


// Initialize the Firebase Admin SDK
admin.initializeApp();
const db = getFirestore();
// Vision client is no longer needed for enrollment embeddings
// const visionClient = new vision.ImageAnnotatorClient();

// --- NEW: Define the URL for your Python face recognition service ---
// This should be an authenticated endpoint in a real-world scenario.
const FACE_RECOGNITION_SERVICE_URL = "https://face-recognition-service-us-central1-50079853705.us-central1.run.app/generate-embedding";

// --- The embedding logic is now handled by the Python service ---
// function createNormalizedEmbedding(face) { ... } // This function is no longer needed.

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
let studentEmbeddingsCache = {
    data: [], // Will store { studentId, studentData, storedEmbeddings }
    timestamp: 0,
};

// --- Helper function for phone number normalization ---
const normalizePhone = (phoneNumber) => {
    if (!phoneNumber) return "";
    if (phoneNumber.startsWith('+855')) {
        return '0' + phoneNumber.substring(4);
    }
    if (phoneNumber.length >= 8 && phoneNumber.length <= 9 && !phoneNumber.startsWith('0')) {
        return '0' + phoneNumber;
    }
    return phoneNumber;
};

// --- Helper functions for password management ---

const validatePasswordStrength = (password) => {
    if (password.length < 8) {
        return { valid: false, message: "Password must be at least 8 characters long." };
    }
    
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    
    if (!hasUppercase) {
        return { valid: false, message: "Password must contain at least one uppercase letter." };
    }
    if (!hasLowercase) {
        return { valid: false, message: "Password must contain at least one lowercase letter." };
    }
    return { valid: true, message: "Password is strong." };
};

// --- Helper functions for QR code registration ---
const generateOneTimeToken = () => {
    // Generate a secure 16-character token
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let token = '';
    for (let i = 0; i < 16; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
};

// Helper function to store temporary token for registration
const storeTempRegistrationToken = async (studentId, token) => {
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
    await db.collection('tempRegistrationTokens').doc(token).set({
        studentId: studentId,
        token: token,
        createdAt: new Date(),
        expiresAt: expiresAt
    });
    return expiresAt;
};

const generateQRCodeURL = (token) => {
    // Use a QR code generator service or create a URL that contains the token
    const botUsername = 'rodwell_portal_password_bot'; // Your actual bot username
    const message = encodeURIComponent(token);
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://t.me/${botUsername}?start=${token}`;
};

const hashPassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

/**
 * [HTTP Function]
 * Webhook handler for Telegram bot
 * Handles student authentication via username/password system
 */
exports.telegramWebhook = onRequest({
    region: "asia-southeast1",
    secrets: ["TELEGRAM_BOT_TOKEN"]
}, async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const bot = initializeTelegramBot();
    if (!bot) {
        console.error("Telegram bot not initialized - missing token");
        return res.status(500).send('Bot configuration error');
    }

    try {
        const { message, callback_query } = req.body;
        
        // Handle callback queries (inline button presses)
        if (callback_query) {
            await handleCallbackQuery(bot, callback_query);
            return res.status(200).send('OK');
        }
        
        if (!message) {
            return res.status(200).send('OK');
        }

        const chatId = message.chat.id;
        const text = message.text;
        const userId = message.from.id;

        console.log(`Received message from chatId ${chatId}: ${text}`);

        if (text.startsWith('/start')) {
            // Handle /start command with optional token parameter
            const parts = text.split(' ');
            if (parts.length > 1) {
                // /start TOKEN - from QR code
                const token = parts.slice(1).join(' ').trim();
                await handleStartWithToken(bot, chatId, userId, token);
            } else {
                // Regular /start command
                await handleStartCommand(bot, chatId, userId);
            }
        } else if (text === '/changepassword') {
            await handleChangePasswordCommand(bot, chatId, userId);
        } else if (text === '/setpassword') {
            await handleSetCustomPasswordCommand(bot, chatId, userId);
        } else {
            // Check if user is in registration or password change flow
            await handleTextMessage(bot, chatId, userId, text, message.message_id);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});

/**
 * Handle /start command
 */
const handleStartCommand = async (bot, chatId, userId) => {
    try {
        // Check if user is already registered
        const existingUser = await db.collection("students")
            .where("chatId", "==", chatId.toString())
            .limit(1)
            .get();

        if (!existingUser.empty) {
            const studentData = existingUser.docs[0].data();
            const hasPassword = !!studentData.passwordHash;
            console.log(`User ${chatId} tried to register but is already registered - from handleStartCommand. Has password: ${hasPassword}`);
            
            if (!hasPassword) {
                console.log(`User ${chatId} is registered but has no password - allowing setup`);
                // User is registered but doesn't have a password set yet
                // Update user state for password setup
                await db.collection("telegramUserStates").doc(chatId.toString()).set({
                    userId: userId,
                    chatId: chatId,
                    state: "password_setup_menu",
                    studentId: existingUser.docs[0].id,
                    timestamp: FieldValue.serverTimestamp()
                });

                const options = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "✏️ Set Custom Password", callback_data: "custom_password" }
                            ]
                        ]
                    }
                };

                await bot.sendMessage(chatId, 
                    `✅ Account found!\n\n` +
                    `👋 Welcome back ${studentData.fullName || 'Student'}!\n\n` +
                    `🔐 **Complete Your Setup: Set Your Password**\n\n` +
                    `Set your own custom password for the Student Portal:\n\n` +
                    `📱 You'll use your phone (${studentData.phone}) and password to login at:\n` +
                    `🌐 **portal.rodwell.center/login**`,
                    options
                );
                return;
            }
            
            await bot.sendMessage(chatId, "✅ Your account is already registered. Use /changepassword to update your password.");
            return;
        }

        await bot.sendMessage(chatId, 
            "Welcome to the Student Portal! 🎓\n\n" +
            "🔒 **Secure Registration Process**\n\n" +
            "To register securely, please:\n" +
            "1. Get your personal QR code from your teacher\n" +
            "2. Scan the QR code to get your registration token\n" +
            "3. Send the token here to complete registration\n\n" +
            "🔑 **Or if you have a token, send it now:**"
        );

        // Store user state for registration flow
        await db.collection("telegramUserStates").doc(chatId.toString()).set({
            userId: userId,
            chatId: chatId,
            state: "waiting_token",
            timestamp: FieldValue.serverTimestamp()
        });

    } catch (error) {
        console.error('Error handling start command:', error);
        await bot.sendMessage(chatId, "❌ An error occurred. Please try again later.");
    }
};

/**
 * Handle /start command with token parameter (from QR code)
 */
const handleStartWithToken = async (bot, chatId, userId, token) => {
    try {
        // Check if user is already registered
        const existingUser = await db.collection("students")
            .where("chatId", "==", chatId.toString())
            .limit(1)
            .get();

        if (!existingUser.empty) {
            console.log(`User ${chatId} tried to register with token but is already registered - from handleStartWithToken`);
            await bot.sendMessage(chatId, "✅ Your account is already registered. Use /changepassword to update your password.");
            return;
        }

        await bot.sendMessage(chatId, 
            "Welcome to the Student Portal! 🎓\n\n" +
            "🔍 **Processing your registration token...**"
        );

        // Directly process the token from QR code
        await handleTokenInput(bot, chatId, userId, token);

    } catch (error) {
        console.error('Error handling start with token:', error);
        await bot.sendMessage(chatId, "❌ An error occurred. Please try again later.");
    }
};

/**
 * Handle /changepassword command (generates random password)
 */
const handleChangePasswordCommand = async (bot, chatId, userId) => {
    try {
        // Check if user is registered
        const userDoc = await db.collection("students")
            .where("chatId", "==", chatId.toString())
            .limit(1)
            .get();

        if (userDoc.empty) {
            await bot.sendMessage(chatId, "❌ You need to register first. Use /start to begin registration.");
            return;
        }

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✏️ Create Custom Password", callback_data: "change_custom_password" }
                    ],
                    [
                        { text: "❌ Cancel", callback_data: "cancel_password_change" }
                    ]
                ]
            }
        };

        await bot.sendMessage(chatId, 
            "🔐 **Password Change Options**\n\n" +
            "Set your own custom password:\n\n" +
            "✏️ **Create Custom Password** - Set your own custom password\n\n" +
            "What would you like to do?",
            options
        );

        // Store user state for password change flow
        await db.collection("telegramUserStates").doc(chatId.toString()).set({
            userId: userId,
            chatId: chatId,
            state: "password_change_menu_buttons",
            timestamp: FieldValue.serverTimestamp()
        });

    } catch (error) {
        console.error('Error handling change password command:', error);
        await bot.sendMessage(chatId, "❌ Failed to change password. Please try again later.");
    }
};

/**
 * Handle /setpassword command (custom password input)
 */
const handleSetCustomPasswordCommand = async (bot, chatId, userId) => {
    try {
        // Check if user is registered
        const userDoc = await db.collection("students")
            .where("chatId", "==", chatId.toString())
            .limit(1)
            .get();

        if (userDoc.empty) {
            await bot.sendMessage(chatId, "❌ You need to register first. Use /start to begin registration.");
            return;
        }

        await bot.sendMessage(chatId, "� Set Custom Password\n\n" +
            "Please enter your new password. It must meet these requirements:\n" +
            "• At least 8 characters long\n" +
            "• Contains uppercase letters (A-Z)\n" +
            "• Contains lowercase letters (a-z)\n" +
            "Type `/cancel` to cancel this operation.");

        // Store user state for custom password input
        await db.collection("telegramUserStates").doc(chatId.toString()).set({
            userId: userId,
            chatId: chatId,
            state: "waiting_custom_password",
            timestamp: FieldValue.serverTimestamp()
        });

    } catch (error) {
        console.error('Error handling set custom password command:', error);
        await bot.sendMessage(chatId, "❌ Failed to set custom password. Please try again later.");
    }
};

/**
 * Handle callback queries from inline keyboards
 */
const handleCallbackQuery = async (bot, callbackQuery) => {
    try {
        const chatId = callbackQuery.message.chat.id;
        const userId = callbackQuery.from.id;
        const data = callbackQuery.data;
        const messageId = callbackQuery.message.message_id;

        console.log(`Callback query from chatId ${chatId}: ${data}`);

        // Answer the callback query to remove loading state
        await bot.answerCallbackQuery(callbackQuery.id);

        if (data === "custom_password") {
            await handleRequestCustomPassword(bot, chatId, userId, messageId);
        } else if (data === "delete_password_message") {
            await handleDeletePasswordMessage(bot, chatId, messageId);
        } else if (data === "change_custom_password") {
            await handleChangeCustomPassword(bot, chatId, userId, messageId);
        } else if (data === "cancel_password_change") {
            await handleCancelPasswordChange(bot, chatId, messageId);
        }

    } catch (error) {
        console.error('Error handling callback query:', error);
        await bot.answerCallbackQuery(callbackQuery.id, { 
            text: "❌ An error occurred. Please try again.", 
            show_alert: true 
        });
    }
};

/**
 * Handle delete password message button
 */
const handleDeletePasswordMessage = async (bot, chatId, messageId) => {
    try {
        await bot.deleteMessage(chatId, messageId);
        console.log(`Deleted password message ${messageId} in chat ${chatId}`);
    } catch (error) {
        console.error('Error deleting password message:', error);
        // If deletion fails, try to edit the message to remove sensitive content
        try {
            await bot.editMessageText(
                `🗑️ **Message Deleted**\n\n` +
                `This message contained sensitive information and has been cleared.\n\n` +
                `🔄 Use /changepassword if you need to change your password again.`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown'
                }
            );
        } catch (editError) {
            console.error('Could not edit message either:', editError);
        }
    }
};

/**
 * Handle custom password button
 */
const handleRequestCustomPassword = async (bot, chatId, userId, messageId) => {
    try {
        console.log(`handleRequestCustomPassword called for chatId ${chatId}`);
        
        // Get user state (using same validation pattern as handleGeneratePassword)
        const stateDoc = await db.collection("telegramUserStates").doc(chatId.toString()).get();
        
        if (!stateDoc.exists || stateDoc.data().state !== "password_setup_menu") {
            console.error(`User state validation failed for chatId ${chatId}. Exists: ${stateDoc.exists}, State: ${stateDoc.exists ? stateDoc.data().state : 'N/A'}`);
            await bot.editMessageText("❌ Session expired. Please start registration again with /start.", {
                chat_id: chatId,
                message_id: messageId
            });
            return;
        }

        const currentState = stateDoc.data();
        const studentId = currentState.studentId;
        
        console.log(`Valid state found for chatId ${chatId}, studentId: ${studentId}`);
        
        // Update user state for custom password input (using simpler approach)
        await db.collection("telegramUserStates").doc(chatId.toString()).update({
            state: "waiting_custom_password_initial",
            messageIdToEdit: messageId,
            timestamp: FieldValue.serverTimestamp()
        });

        console.log(`State updated for chatId ${chatId} to waiting_custom_password_initial`);

        await bot.editMessageText(
            'Create Your Custom Password\n\n' +
            'Please enter your new password. It must meet these requirements:\n' +
            '• At least 8 characters long\n' +
            '• Contains uppercase letters (A-Z)\n' +
            '• Contains lowercase letters (a-z)\n\n' +
            'Type your password in the next message. The message will be automatically deleted after processing for security.\n\n' +
            'Type /cancel to cancel this operation.',
            {
                chat_id: chatId,
                message_id: messageId
            }
        );

        console.log(`Message edited successfully for chatId ${chatId}`);

    } catch (error) {
        console.error(`Error requesting custom password for chatId ${chatId}:`, error);
        try {
            await bot.editMessageText("❌ An error occurred. Please try /start to begin registration again.", {
                chat_id: chatId,
                message_id: messageId
            });
        } catch (editError) {
            console.error('Error editing message after custom password error:', editError);
            // If we can't edit the message, send a new one
            try {
                await bot.sendMessage(chatId, "❌ An error occurred. Please try /start to begin registration again.");
            } catch (sendError) {
                console.error('Error sending fallback message:', sendError);
            }
        }
        
        // Clean up any existing state on error
        try {
            await db.collection("telegramUserStates").doc(chatId.toString()).delete();
        } catch (cleanupError) {
            console.error('Error cleaning up state on error:', cleanupError);
        }
    }
};

/**
 * Handle text message during registration or password change flow
 */
const handleTextMessage = async (bot, chatId, userId, text, messageId) => {
    try {
        console.log(`handleTextMessage called for chatId ${chatId} with text: "${text}" (length: ${text.length})`);
        
        // Handle cancel command
        if (text.toLowerCase() === '/cancel') {
            await db.collection("telegramUserStates").doc(chatId.toString()).delete();
            await bot.sendMessage(chatId, "❌ Operation cancelled. Use /start to register or /changepassword to change password.");
            return;
        }

        // Get user state
        const stateDoc = await db.collection("telegramUserStates").doc(chatId.toString()).get();

        if (!stateDoc.exists) {
            console.log(`No user state found for chatId ${chatId}`);
            await bot.sendMessage(chatId, "Please use /start to begin registration or /changepassword to change your password.");
            return;
        }

        const state = stateDoc.data();
        console.log(`User state for chatId ${chatId}: ${state.state}`);

        if (state.state === "waiting_token") {
            await handleTokenInput(bot, chatId, userId, text.trim());
        } else if (state.state === "password_change_menu") {
            await handlePasswordChangeMenuChoice(bot, chatId, userId, text.trim());
        } else if (state.state === "waiting_custom_password") {
            await handleCustomPasswordInput(bot, chatId, userId, text);
        } else if (state.state === "waiting_custom_password_initial") {
            await handleCustomPasswordInputInitial(bot, chatId, userId, text, messageId);
        } else if (state.state === "waiting_custom_password_change") {
            await handleCustomPasswordInputChange(bot, chatId, userId, text, messageId);
        } else {
            console.log(`Unhandled state for chatId ${chatId}: ${state.state}`);
            await bot.sendMessage(chatId, "Please use /start to begin registration or /changepassword to update your password.");
        }

    } catch (error) {
        console.error(`Error handling text message for chatId ${chatId}:`, error);
        await bot.sendMessage(chatId, "❌ An error occurred. Please try /start to begin registration again.");
    }
};

/**
 * Handle custom password for password change
 */
const handleChangeCustomPassword = async (bot, chatId, userId, messageId) => {
    try {
        // Update user state for custom password input
        await db.collection("telegramUserStates").doc(chatId.toString()).set({
            userId: userId,
            chatId: chatId,
            state: "waiting_custom_password_change",
            messageIdToEdit: messageId,
            timestamp: FieldValue.serverTimestamp()
        });

        await bot.editMessageText(
            'Change to Custom Password\n\n' +
            'Please enter your new password. It must meet these requirements:\n' +
            '• At least 8 characters long\n' +
            '• Contains uppercase letters (A-Z)\n' +
            '• Contains lowercase letters (a-z)\n\n' +
            'Type your password in the next message. The message will be automatically deleted after processing for security.\n\n' +
            'Type /cancel to cancel this operation.',
            {
                chat_id: chatId,
                message_id: messageId
            }
        );

    } catch (error) {
        console.error('Error requesting custom password change:', error);
        await bot.editMessageText("❌ Failed to set up custom password. Please try again later.", {
            chat_id: chatId,
            message_id: messageId
        });
    }
};

/**
 * Handle cancel password change
 */
const handleCancelPasswordChange = async (bot, chatId, messageId) => {
    try {
        await db.collection("telegramUserStates").doc(chatId.toString()).delete();
        
        await bot.editMessageText(
            `❌ **Password Change Cancelled**\n\n` +
            `Your password remains unchanged.\n\n` +
            `Use /changepassword anytime to change your password.`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
            }
        );

    } catch (error) {
        console.error('Error cancelling password change:', error);
        await bot.editMessageText("❌ Error cancelling operation.", {
            chat_id: chatId,
            message_id: messageId
        });
    }
};

/**
 * Handle custom password input during initial registration
 */
const handleCustomPasswordInputInitial = async (bot, chatId, userId, password, messageId) => {
    try {
        console.log(`handleCustomPasswordInputInitial called for chatId ${chatId}`);
        
        // Delete the message containing the password immediately for security
        try {
            await bot.deleteMessage(chatId, messageId);
        } catch (deleteError) {
            console.warn('Could not delete password message:', deleteError.message);
        }

        // Validate password strength
        const validation = validatePasswordStrength(password);
        
        if (!validation.valid) {
            await bot.sendMessage(chatId, 
                `❌ ${validation.message}\n\nPlease enter a stronger password, or type /cancel to cancel:`
            );
            return;
        }

        // Get user state
        const stateDoc = await db.collection("telegramUserStates").doc(chatId.toString()).get();
        
        if (!stateDoc.exists) {
            console.error(`User state not found for chatId ${chatId} in handleCustomPasswordInputInitial`);
            await bot.sendMessage(chatId, "❌ Session expired. Please start registration again with /start.");
            return;
        }

        const state = stateDoc.data();
        
        // Validate that we're in the correct state
        if (state.state !== "waiting_custom_password_initial") {
            console.error(`Invalid state for custom password input: ${state.state} for chatId ${chatId}`);
            await bot.sendMessage(chatId, "❌ Invalid session state. Please start registration again with /start.");
            return;
        }

        const studentId = state.studentId;
        const originalMessageId = state.messageIdToEdit;

        // Validate required fields
        if (!studentId || !originalMessageId) {
            console.error(`Missing required state fields for chatId ${chatId}: studentId=${studentId}, originalMessageId=${originalMessageId}`);
            await bot.sendMessage(chatId, "❌ Session data corrupted. Please start registration again with /start.");
            return;
        }

        const hashedPassword = await hashPassword(password);

        // Update student with password
        await db.collection("students").doc(studentId).update({
            passwordHash: hashedPassword,
            passwordUpdatedAt: FieldValue.serverTimestamp()
        });

        // Clean up state
        await db.collection("telegramUserStates").doc(chatId.toString()).delete();

        // Edit the original message to confirm success
        await bot.editMessageText(
            `✅ **Custom Password Set Successfully!**\n\n` +
            `🔐 Your password has been securely saved.\n\n` +
            `📱 **Login Information:**\n` +
            `• Website: **portal.rodwell.center/login**\n` +
            `• Phone: Use your registered phone number\n` +
            `• Password: Use your custom password\n\n` +
            `🔒 For security, your password message was automatically deleted.\n\n` +
            `🔄 Use /changepassword anytime to change your password.`,
            {
                chat_id: chatId,
                message_id: originalMessageId,
                parse_mode: 'Markdown'
            }
        );

        console.log(`Custom password set for student ${studentId} via Telegram`);

    } catch (error) {
        console.error('Error handling custom password input:', error);
        
        // Try to get the original message ID for better error handling
        try {
            const stateDoc = await db.collection("telegramUserStates").doc(chatId.toString()).get();
            if (stateDoc.exists && stateDoc.data().messageIdToEdit) {
                await bot.editMessageText(
                    "❌ Failed to set password. Please try /start to begin registration again.",
                    {
                        chat_id: chatId,
                        message_id: stateDoc.data().messageIdToEdit
                    }
                );
            } else {
                await bot.sendMessage(chatId, "❌ Failed to set password. Please try /start to begin registration again.");
            }
        } catch (editError) {
            console.error('Error sending error message:', editError);
            await bot.sendMessage(chatId, "❌ Failed to set password. Please try /start to begin registration again.");
        }
    }
};

/**
 * Handle custom password input during password change
 */
const handleCustomPasswordInputChange = async (bot, chatId, userId, password, messageId) => {
    try {
        // Delete the message containing the password immediately for security
        try {
            await bot.deleteMessage(chatId, messageId);
        } catch (deleteError) {
            console.warn('Could not delete password message:', deleteError.message);
        }

        // Validate password strength
        const validation = validatePasswordStrength(password);
        
        if (!validation.valid) {
            await bot.sendMessage(chatId, 
                `❌ ${validation.message}\n\nPlease enter a stronger password, or type /cancel to cancel:`
            );
            return;
        }

        // Get user state
        const stateDoc = await db.collection("telegramUserStates").doc(chatId.toString()).get();
        
        if (!stateDoc.exists) {
            await bot.sendMessage(chatId, "❌ Session expired. Please try /changepassword again.");
            return;
        }

        const state = stateDoc.data();
        const originalMessageId = state.messageIdToEdit;

        // Find the user's document
        const userDoc = await db.collection("students")
            .where("chatId", "==", chatId.toString())
            .limit(1)
            .get();

        if (userDoc.empty) {
            await bot.sendMessage(chatId, "❌ Account not found. Please register first with /start.");
            return;
        }

        const studentDoc = userDoc.docs[0];
        const hashedPassword = await hashPassword(password);

        // Update password in database
        await studentDoc.ref.update({
            passwordHash: hashedPassword,
            passwordUpdatedAt: FieldValue.serverTimestamp()
        });

        // Clean up state
        await db.collection("telegramUserStates").doc(chatId.toString()).delete();

        // Edit the original message to confirm success
        await bot.editMessageText(
            `✅ **Password Changed Successfully!**\n\n` +
            `🔐 Your new custom password has been securely saved.\n\n` +
            `📱 **Login Information:**\n` +
            `• Website: **portal.rodwell.center/login**\n` +
            `• Phone: Use your registered phone number\n` +
            `• Password: Use your new custom password\n\n` +
            `🔒 For security, your password message was automatically deleted.`,
            {
                chat_id: chatId,
                message_id: originalMessageId,
                parse_mode: 'Markdown'
            }
        );

        console.log(`Custom password changed for student ${studentDoc.id} via Telegram`);

    } catch (error) {
        console.error('Error handling custom password change:', error);
        await bot.sendMessage(chatId, "❌ Failed to change password. Please try again.");
    }
};

/**
 * Handle token input during registration
 */
const handleTokenInput = async (bot, chatId, userId, token) => {
    try {
        if (!token || token.length < 10) {
            await bot.sendMessage(chatId, "❌ Invalid token format. Please scan the QR code again and send the complete token:");
            return;
        }

        // Find token in temporary tokens collection
        const tempTokenDoc = await db.collection("tempRegistrationTokens")
            .doc(token.toUpperCase())
            .get();

        if (!tempTokenDoc.exists) {
            await bot.sendMessage(chatId, 
                `❌ Invalid or expired token.\n\n` +
                `Please:\n` +
                `• Check that you scanned the correct QR code\n` +
                `• Make sure the token hasn't been used already\n` +
                `• Get a new receipt with QR code if needed\n\n` +
                `Try sending the token again:`
            );
            return;
        }

        const tempTokenData = tempTokenDoc.data();
        
        // Check if token has expired
        if (new Date() > tempTokenData.expiresAt.toDate()) {
            // Clean up expired token
            await tempTokenDoc.ref.delete();
            await bot.sendMessage(chatId, 
                `❌ This token has expired.\n\n` +
                `Please get a new receipt with QR code from your teacher.`
            );
            return;
        }

        // Get the student document
        const studentDoc = await db.collection("students").doc(tempTokenData.studentId).get();
        
        if (!studentDoc.exists) {
            await bot.sendMessage(chatId, 
                `❌ Student account not found. Please contact your teacher.`
            );
            return;
        }

        const studentData = studentDoc.data();

        // Check if this student is already registered with a different chat
        if (studentData.chatId && studentData.chatId !== chatId.toString()) {
            await bot.sendMessage(chatId, 
                `❌ This account is already registered to another Telegram account.\n\n` +
                `If this is your account, please contact your teacher for assistance.`
            );
            return;
        }

        // Link the student account without password (password will be set in next step)
        await studentDoc.ref.update({
            chatId: chatId.toString(),
            userId: userId,
            registeredAt: FieldValue.serverTimestamp(),
        });

        // Clean up the temporary token
        await tempTokenDoc.ref.delete();

        // Update user state for password setup
        await db.collection("telegramUserStates").doc(chatId.toString()).set({
            userId: userId,
            chatId: chatId,
            state: "password_setup_menu",
            studentId: tempTokenData.studentId,
            timestamp: FieldValue.serverTimestamp()
        });

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✏️ Set Custom Password", callback_data: "custom_password" }
                    ]
                ]
            }
        };

        await bot.sendMessage(chatId, 
            `👋 Welcome ${studentData.fullName || 'Student'}!\n\n` +
            `Set your own custom password for the Student Portal:\n\n` +
            `✏️ **Create Custom Password** - Set your own password\n\n` +
            `📱 You'll use your phone (${studentData.phone}) and password to login at:\n` +
            `🌐 **portal.rodwell.center/login**`,
            options
        );

        console.log(`Successfully registered student ${studentDoc.id} with temp token ${token}`);

    } catch (error) {
        console.error('Error handling token input:', error);
        await bot.sendMessage(chatId, "❌ Registration failed. Please try again.");
    }
};

/**
 * Handle username input during registration (legacy - kept for backward compatibility)
 */
const handleUsernameInput = async (bot, chatId, userId, username) => {
    try {
        if (!username || username.length < 2) {
            await bot.sendMessage(chatId, "Please enter a valid username (at least 2 characters):");
            return;
        }

        // Find student by username (assuming username is stored in a field like 'username' or 'studentId')
        const studentQuery = await db.collection("students")
            .where("username", "==", username)
            .limit(1)
            .get();

        if (studentQuery.empty) {
            await bot.sendMessage(chatId, `❌ Username "${username}" not found in our records. Please check your username and try again:`);
            return;
        }

        const studentDoc = studentQuery.docs[0];
        const studentData = studentDoc.data();

        // Check if this student is already linked to another chat
        if (studentData.chatId && studentData.chatId !== chatId.toString()) {
            await bot.sendMessage(chatId, "❌ This student account is already registered with another user.");
            await db.collection("telegramUserStates").doc(chatId.toString()).delete();
            return;
        }

        // Link the student account without password (user must set custom password)
        await studentDoc.ref.update({
            chatId: chatId.toString(),
            userId: userId,
            registeredAt: FieldValue.serverTimestamp()
        });

        // Update user state for password setup
        await db.collection("telegramUserStates").doc(chatId.toString()).set({
            userId: userId,
            chatId: chatId,
            state: "password_setup_menu",
            studentId: studentDoc.id,
            timestamp: FieldValue.serverTimestamp()
        });

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✏️ Set Custom Password", callback_data: "custom_password" }
                    ]
                ]
            }
        };

        await bot.sendMessage(chatId, 
            `✅ Registration successful!\n\n` +
            `👋 Welcome ${studentData.fullName || username}!\n\n` +
            `🔐 **Complete Your Setup: Set Your Password**\n\n` +
            `Set your own custom password for the Student Portal:\n\n` +
            `📱 You'll use your phone (${studentData.phone}) and password to login at:\n` +
            `🌐 **portal.rodwell.center/login**`,
            options
        );

        console.log(`Successfully registered student ${studentDoc.id} with chatId ${chatId}`);

    } catch (error) {
        console.error('Error handling username input:', error);
        await bot.sendMessage(chatId, "❌ Registration failed. Please try again.");
    }
};

/**
 * Handle password change menu choice
 */
const handlePasswordChangeMenuChoice = async (bot, chatId, userId, text) => {
    try {
        const choice = text.toLowerCase();
        
        if (choice === '/setpassword') {
            // Switch to custom password input
            await handleSetCustomPasswordCommand(bot, chatId, userId);
        } else if (choice === '/cancel') {
            await db.collection("telegramUserStates").doc(chatId.toString()).delete();
            await bot.sendMessage(chatId, "❌ Password change cancelled.");
        } else {
            await bot.sendMessage(chatId, "Please choose an option:\n• `/setpassword` - Set custom password\n• `/cancel` - Cancel");
        }

    } catch (error) {
        console.error('Error handling password change menu:', error);
        await bot.sendMessage(chatId, "❌ Failed to process choice. Please try again.");
    }
};

/**
 * Handle custom password input
 */
const handleCustomPasswordInput = async (bot, chatId, userId, password) => {
    try {
        // Validate password strength
        const validation = validatePasswordStrength(password);
        
        if (!validation.valid) {
            await bot.sendMessage(chatId, `❌ ${validation.message}\n\nPlease enter a stronger password, or type /cancel to cancel:`);
            return;
        }

        // Find the user's document
        const userDoc = await db.collection("students")
            .where("chatId", "==", chatId.toString())
            .limit(1)
            .get();

        if (userDoc.empty) {
            await bot.sendMessage(chatId, "❌ Account not found. Please register first with /start.");
            return;
        }

        await bot.sendMessage(chatId, "🔐 Setting your custom password...");

        const studentDoc = userDoc.docs[0];
        const hashedPassword = await hashPassword(password);

        // Update password in database
        await studentDoc.ref.update({
            passwordHash: hashedPassword,
            passwordUpdatedAt: FieldValue.serverTimestamp()
        });

        // Clean up state
        await db.collection("telegramUserStates").doc(chatId.toString()).delete();

        await bot.sendMessage(chatId, 
            `✅ Your custom password has been set successfully!\n\n` +
            `You can now use your phone and this password to log into the Student Portal at:\n` +
            `🌐 **portal.rodwell.center/login**\n\n` +
            `🔒 For security, your password has been encrypted and stored safely.`
        );

        console.log(`Custom password set for student ${studentDoc.id} via Telegram`);

    } catch (error) {
        console.error('Error handling custom password input:', error);
        await bot.sendMessage(chatId, "❌ Failed to set password. Please try again.");
    }
};

/**
 * [Callable Function] 
 * DEPRECATED: Generate registration QR codes for students (Admin/Teacher only)
 * NOTE: Now using on-demand tokens at payment time instead of persistent tokens
 */
exports.generateStudentQRCodes = onCall({
    region: "asia-southeast1"
}, async (request) => {
    const { studentIds, adminUid } = request.data;

    if (!adminUid) {
        throw new HttpsError("unauthenticated", "Admin authentication required.");
    }

    // Verify admin permissions (you might want to add admin role checking here)
    try {
        const adminUser = await admin.auth().getUser(adminUid);
        if (!adminUser) {
            throw new HttpsError("permission-denied", "Invalid admin credentials.");
        }
    } catch (error) {
        throw new HttpsError("permission-denied", "Admin verification failed.");
    }

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        throw new HttpsError("invalid-argument", "Student IDs array is required.");
    }

    try {
        const qrCodes = [];
        const batch = db.batch();

        for (const studentId of studentIds) {
            // Get student document
            const studentRef = db.collection("students").doc(studentId);
            const studentDoc = await studentRef.get();

            if (!studentDoc.exists) {
                console.warn(`Student ${studentId} not found, skipping...`);
                continue;
            }

            const studentData = studentDoc.data();

            // Generate one-time registration token
            const token = generateOneTimeToken();
            
            // Update student with registration token
            batch.update(studentRef, {
                registrationToken: token,
                tokenGeneratedAt: FieldValue.serverTimestamp(),
                tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            });

            // Generate QR code URL
            const qrCodeURL = generateQRCodeURL(token);

            qrCodes.push({
                studentId: studentId,
                studentName: studentData.fullName || 'Unknown',
                username: studentData.username || 'N/A',
                class: studentData.class || 'N/A',
                token: token,
                qrCodeURL: qrCodeURL,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            });
        }

        // Commit all token updates
        await batch.commit();

        return {
            success: true,
            qrCodes: qrCodes,
            totalGenerated: qrCodes.length
        };

    } catch (error) {
        console.error("Error generating QR codes:", error);
        throw new HttpsError("internal", "Failed to generate QR codes.");
    }
});

/**
 * [Callable Function] 
 * Authenticates a student using phone and password
 * Returns a custom token for Firebase Auth sign-in
 */
exports.authenticateStudentWithPhone = onCall({
    region: "asia-southeast1"
}, async (request) => {
    const { phone, password } = request.data;

    if (!phone || !password) {
        throw new HttpsError("invalid-argument", "Phone and password are required.");
    }

    try {
        // Normalize phone number
        const normalizedPhone = normalizePhone(phone);
        
        // Find student by phone
        const studentQuery = await db.collection("students")
            .where("phone", "==", normalizedPhone)
            .limit(1)
            .get();

        console.log(`Login attempt for phone: ${normalizedPhone} (original: ${phone})`);

        if (studentQuery.empty) {
            console.log(`No student found for phone: ${normalizedPhone}`);
            throw new HttpsError("not-found", "Invalid phone or password.");
        }

        const studentDoc = studentQuery.docs[0];
        const studentData = studentDoc.data();

        console.log(`Student found: ${studentData.fullName} (${studentDoc.id}), has passwordHash: ${!!studentData.passwordHash}`);

        // Check if student has a password hash (i.e., has registered via Telegram)
        if (!studentData.passwordHash) {
            console.log(`Student ${studentDoc.id} has no passwordHash`);
            throw new HttpsError("failed-precondition", "Account not activated. Please register via Telegram bot first.");
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, studentData.passwordHash);
        console.log(`Password verification result: ${isPasswordValid}`);
        
        if (!isPasswordValid) {
            console.log(`Password verification failed for student ${studentDoc.id}`);
            throw new HttpsError("unauthenticated", "Invalid phone or password.");
        }

        // Create or get Firebase Auth user
        let authUid = studentData.authUid;
        
        if (!authUid) {
            try {
                // Create new Firebase Auth user with valid email format using phone
                const email = `${normalizedPhone}@rodwell.student.local`;
                const authUser = await admin.auth().createUser({
                    displayName: studentData.fullName || normalizedPhone,
                    email: email,
                    emailVerified: false, // This is a placeholder email
                });
                authUid = authUser.uid;

                // Update student record with auth UID
                await studentDoc.ref.update({ 
                    authUid: authUid,
                    lastLoginAt: FieldValue.serverTimestamp()
                });
            } catch (authError) {
                console.error("Error creating Firebase Auth user:", authError);
                // If user already exists with this email, try to find them
                try {
                    const existingUser = await admin.auth().getUserByEmail(`${normalizedPhone}@rodwell.student.local`);
                    authUid = existingUser.uid;
                    
                    // Update student record with found auth UID
                    await studentDoc.ref.update({ 
                        authUid: authUid,
                        lastLoginAt: FieldValue.serverTimestamp()
                    });
                } catch (findError) {
                    console.error("Error finding existing Firebase Auth user:", findError);
                    throw new HttpsError("internal", "Authentication service error. Please try again.");
                }
            }
        } else {
            // Update last login time
            await studentDoc.ref.update({ lastLoginAt: FieldValue.serverTimestamp() });
        }

        // Generate custom token for Firebase Auth
        const customToken = await admin.auth().createCustomToken(authUid, {
            studentId: studentDoc.id,
            phone: normalizedPhone,
            fullName: studentData.fullName,
            class: studentData.class,
        });

        return {
            customToken: customToken,
            student: {
                id: studentDoc.id,
                fullName: studentData.fullName,
                phone: normalizedPhone,
                class: studentData.class,
            }
        };

    } catch (error) {
        if (error instanceof HttpsError) {
            throw error; // Re-throw HttpsError as-is
        }
        console.error("Error in authenticateStudentWithPhone:", error);
        throw new HttpsError("internal", "Authentication failed. Please try again.");
    }
});

/**
 * [Callable Function] 
 * Authenticates a student using username and password (LEGACY - for backward compatibility)
 * Returns a custom token for Firebase Auth sign-in
 */
exports.authenticateStudentWithUsername = onCall({
    region: "asia-southeast1"
}, async (request) => {
    const { username, password } = request.data;

    if (!username || !password) {
        throw new HttpsError("invalid-argument", "Username and password are required.");
    }

    try {
        // Find student by username
        const studentQuery = await db.collection("students")
            .where("username", "==", username)
            .limit(1)
            .get();

        if (studentQuery.empty) {
            throw new HttpsError("not-found", "Invalid username or password.");
        }

        const studentDoc = studentQuery.docs[0];
        const studentData = studentDoc.data();

        // Check if student has a password hash (i.e., has registered via Telegram)
        if (!studentData.passwordHash) {
            throw new HttpsError("failed-precondition", "Account not activated. Please register via Telegram bot first.");
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, studentData.passwordHash);
        if (!isPasswordValid) {
            throw new HttpsError("unauthenticated", "Invalid username or password.");
        }

        // Create or get Firebase Auth user
        let authUid = studentData.authUid;
        
        if (!authUid) {
            try {
                // Create new Firebase Auth user with valid email format
                const email = `${username}@rodwell.student.local`;
                const authUser = await admin.auth().createUser({
                    displayName: studentData.fullName || username,
                    email: email,
                    emailVerified: false, // This is a placeholder email
                });
                authUid = authUser.uid;

                // Update student record with auth UID
                await studentDoc.ref.update({ 
                    authUid: authUid,
                    lastLoginAt: FieldValue.serverTimestamp()
                });
            } catch (authError) {
                console.error("Error creating Firebase Auth user:", authError);
                // If user already exists with this email, try to find them
                try {
                    const existingUser = await admin.auth().getUserByEmail(`${username}@rodwell.student.local`);
                    authUid = existingUser.uid;
                    
                    // Update student record with existing auth UID
                    await studentDoc.ref.update({ 
                        authUid: authUid,
                        lastLoginAt: FieldValue.serverTimestamp()
                    });
                } catch (findError) {
                    console.error("Error finding existing user:", findError);
                    throw new HttpsError("internal", "Failed to create or find user account.");
                }
            }
        } else {
            // Update last login time
            await studentDoc.ref.update({ 
                lastLoginAt: FieldValue.serverTimestamp()
            });
        }

        // Generate custom token for client-side sign-in
        const customToken = await admin.auth().createCustomToken(authUid);

        return {
            success: true,
            token: customToken,
            studentData: {
                id: studentDoc.id,
                fullName: studentData.fullName,
                username: studentData.username,
                class: studentData.class,
                shift: studentData.shift,
                authUid: authUid
            }
        };

    } catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }
        console.error("Error in authenticateStudentWithUsername:", error);
        throw new HttpsError("internal", "Authentication failed due to internal error.");
    }
});

/**
 * [Callable Function] 
 * Authenticates a teacher using phone and password
 * Returns a custom token for Firebase Auth sign-in
 */
exports.authenticateTeacherWithPhone = onCall({
    region: "asia-southeast1"
}, async (request) => {
    const { phone, password } = request.data;

    if (!phone || !password) {
        throw new HttpsError("invalid-argument", "Phone and password are required.");
    }

    try {
        // Find teacher by phone
        const teacherQuery = await db.collection("teachers")
            .where("phone", "==", phone)
            .limit(1)
            .get();

        console.log(`Teacher login attempt for phone: ${phone}`);

        if (teacherQuery.empty) {
            console.log(`No teacher found for phone: ${phone}`);
            throw new HttpsError("not-found", "Invalid phone or password.");
        }

        const teacherDoc = teacherQuery.docs[0];
        const teacherData = teacherDoc.data();

        console.log(`Teacher found: ${teacherData.fullName} (${teacherDoc.id})`);

        // Check password (for teachers, we're using plain text "RodwellTeacher")
        if (teacherData.hashPw !== password) {
            console.log(`Password verification failed for teacher ${teacherDoc.id}`);
            throw new HttpsError("unauthenticated", "Invalid phone or password.");
        }

        // Get Firebase Auth UID (should already exist from our setup script)
        let authUid = teacherData.authUid;
        
        if (!authUid) {
            // Fallback: create Firebase Auth user if doesn't exist
            try {
                const email = `${phone}@teacher.local`;
                const authUser = await admin.auth().createUser({
                    displayName: teacherData.fullName,
                    email: email,
                    emailVerified: false,
                });
                authUid = authUser.uid;

                // Update teacher record with auth UID
                await teacherDoc.ref.update({ 
                    authUid: authUid,
                    lastLoginAt: FieldValue.serverTimestamp()
                });
            } catch (authError) {
                console.error("Error creating Firebase Auth user for teacher:", authError);
                // If user already exists, try to find them
                try {
                    const existingUser = await admin.auth().getUserByEmail(`${phone}@teacher.local`);
                    authUid = existingUser.uid;
                    
                    // Update teacher record with found auth UID
                    await teacherDoc.ref.update({ 
                        authUid: authUid,
                        lastLoginAt: FieldValue.serverTimestamp()
                    });
                } catch (findError) {
                    console.error("Error finding existing Firebase Auth user for teacher:", findError);
                    throw new HttpsError("internal", "Authentication service error. Please try again.");
                }
            }
        } else {
            // Update last login time
            await teacherDoc.ref.update({ lastLoginAt: FieldValue.serverTimestamp() });
        }

        // Generate custom token for Firebase Auth
        const customToken = await admin.auth().createCustomToken(authUid, {
            teacherId: teacherDoc.id,
            phone: phone,
            fullName: teacherData.fullName,
            subject: teacherData.subject,
            role: 'teacher'
        });

        return {
            customToken: customToken,
            teacher: {
                id: teacherDoc.id,
                fullName: teacherData.fullName,
                phone: phone,
                subject: teacherData.subject,
                role: 'teacher'
            }
        };

    } catch (error) {
        if (error instanceof HttpsError) {
            throw error; // Re-throw HttpsError as-is
        }
        console.error("Error in authenticateTeacherWithPhone:", error);
        throw new HttpsError("internal", "Authentication failed. Please try again.");
    }
});

/**
 * [Scheduled Function]
 * Cleanup old Telegram user states (runs daily)
 * Removes registration states older than 24 hours
 */
exports.cleanupTelegramStates = onSchedule({
    schedule: "0 2 * * *", // Run daily at 2 AM
    region: "asia-southeast1"
}, async (context) => {
    try {
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);

        const statesRef = db.collection("telegramUserStates");
        const oldStatesQuery = await statesRef
            .where("timestamp", "<", oneDayAgo)
            .get();

        if (oldStatesQuery.empty) {
            console.log("No old Telegram states to clean up");
            return;
        }

        const batch = db.batch();
        let deleteCount = 0;

        oldStatesQuery.docs.forEach(doc => {
            batch.delete(doc.ref);
            deleteCount++;
        });

        await batch.commit();
        console.log(`Cleaned up ${deleteCount} old Telegram user states`);

    } catch (error) {
        console.error("Error cleaning up Telegram states:", error);
    }
});

exports.processFaceEnrollmentImages = onCall({
    region: "us-central1"
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to enroll.");
    }
    if (!request.data.images || !Array.isArray(request.data.images) || request.data.images.length !== 4) {
        throw new HttpsError("invalid-argument", "Exactly 4 Base64 encoded images must be provided.");
    }

    const studentAuthUid = request.auth.uid;
    const { images } = request.data;
    console.log(`Queueing face enrollment task for student UID: ${studentAuthUid}`);

    try {
        await db.collection("faceEnrollmentQueue").add({
            studentAuthUid: studentAuthUid,
            images: images,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "pending",
        });

        console.log(`Task for ${studentAuthUid} successfully queued.`);
        return { success: true, message: "Your enrollment has been submitted and will be processed in the background." };

    } catch (error) {
        console.error(`Failed to queue face enrollment task for UID ${studentAuthUid}.`, error);
        throw new HttpsError("internal", "An unexpected error occurred while queueing your request.");
    }
});


/**
 * [Firestore-triggered Function]
 * Listens for new documents in the `faceEnrollmentQueue` collection.
 * Handles the slow process of generating embeddings and saving them to the student profile.
 */
exports.handleEnrollmentQueue = onDocumentCreated({
    document: "faceEnrollmentQueue/{docId}",
    region: "us-central1",
    timeoutSeconds: 540,
    memory: "512MiB"
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log("No data associated with the event");
        return;
    }
    const data = snapshot.data();
    const { studentAuthUid, images } = data;
    const docId = event.params.docId;

    try {
        await db.collection("faceEnrollmentQueue").doc(docId).update({ status: "processing" });

        console.log(`Processing task ${docId} for student UID: ${studentAuthUid}`);
        
        const embeddingPromises = images.map(async (imageBase64) => {
            const response = await axios.post(FACE_RECOGNITION_SERVICE_URL, { image: imageBase64 }, {
                headers: { 'Content-Type': 'application/json' }
            });
            const { embedding } = response.data;
            if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
                throw new Error("The face recognition service returned an invalid embedding.");
            }
            return embedding; // Return the raw embedding array
        });

        const allEmbeddings = await Promise.all(embeddingPromises);
        
        if (allEmbeddings.length === 0) {
            throw new Error("No embeddings were generated from the provided images.");
        }

        // --- Average the 4 embeddings to create a single master embedding ---
        const embeddingLength = allEmbeddings[0].length;
        const masterEmbedding = new Array(embeddingLength).fill(0);

        for (const embedding of allEmbeddings) {
            for (let i = 0; i < embeddingLength; i++) {
                masterEmbedding[i] += embedding[i];
            }
        }

        for (let i = 0; i < embeddingLength; i++) {
            masterEmbedding[i] /= allEmbeddings.length;
        }
        // --- End of Averaging Logic ---

        const studentQuery = db.collection("students").where("authUid", "==", studentAuthUid).limit(1);
        const studentSnapshot = await studentQuery.get();

        if (studentSnapshot.empty) {
            throw new Error(`No student found with authUid: ${studentAuthUid}`);
        }

        const studentDocRef = studentSnapshot.docs[0].ref;

        // Store the single, averaged embedding (wrapped in an object for consistency)
        await studentDocRef.update({ 
            facialEmbeddings: [{ embedding: masterEmbedding }] 
        });

        console.log(`Successfully processed task ${docId} and stored a single averaged embedding from ${allEmbeddings.length} photos for student ${studentAuthUid}.`);
        await db.collection("faceEnrollmentQueue").doc(docId).update({ status: "success" });

    } catch (error) {
        console.error(`Error processing task ${docId} for UID ${studentAuthUid}:`, error);
        await db.collection("faceEnrollmentQueue").doc(docId).update({ status: "error", errorMessage: error.message });
    }
});

// This function is now the single point of truth for linking a profile.
// It assumes the user has ALREADY verified they own the phone number on the client-side.
exports.linkStudentProfileWithVerifiedNumber = onCall({
  region: "asia-southeast1"
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Please sign in first.");
    }
    
    const { phoneNumber } = request.data;
    const { uid, token } = request.auth;

    if (!phoneNumber) {
      throw new HttpsError("invalid-argument", "Phone number is required.");
    }

    const normalizedPhone = normalizePhone(phoneNumber);
    
    // Find the student with the matching phone number
    const studentsRef = admin.firestore().collection("students");
    const studentQuery = await studentsRef.where("phone", "==", normalizedPhone).limit(1).get();

    if (studentQuery.empty) {
        throw new HttpsError("not-found", "This phone number is not registered with any student. Please contact a Rodwell administrator for assistance.");
    }

    const studentDoc = studentQuery.docs[0];
    const studentData = studentDoc.data();
    
    if (studentData.authUid) {
      throw new HttpsError("already-exists", "This student profile is already linked to a different login account.");
    }
    
    // Link the account
    await studentDoc.ref.update({ 
      authUid: uid,
      email: token.email || null 
    }); 

    console.log(`Successfully linked authUid ${uid} to student ${studentDoc.id}`);
    
    // Return the full student data object on success
    return { 
      success: true,
      studentData: {
        ...studentData, // original data
        id: studentDoc.id, // add document ID
        authUid: uid, // add the new authUid
        email: token.email || null // add the email
      }
    };
  });

// The 'recognizeAndMarkAttendance' function is now obsolete. Its logic has been
// moved to the dedicated Python Cloud Run service for better performance and scalability.
// We are removing it to avoid conflicts and outdated code.
/*
exports.recognizeAndMarkAttendance = functions
  .region('asia-southeast1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

      // 1. Verify admin credentials and input data
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Authentication required.' });
      }
      const idToken = req.headers.authorization.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({ error: 'Invalid authentication token.' });
      }
      
      const adminEmail = decodedToken.email;

      if (!req.body.image) {
          return res.status(400).json({ error: 'An \'image\' (base64 encoded) must be provided.' });
      }
      const imageBuffer = Buffer.from(req.body.image, 'base64');

      console.log(`Request from admin: ${adminEmail}`);

      try {
          // 2. Use Vision AI to detect faces in the provided image
          const [result] = await visionClient.faceDetection({ image: { content: imageBuffer } });
          const faces = result.faceAnnotations;

          if (!faces || faces.length === 0) {
              return res.status(200).json({ status: 'no_face_detected', message: "No face was detected in the image." });
          }
          if (faces.length > 1) {
              console.log(`Multiple faces (${faces.length}) detected, using the most prominent one.`);
          }

          // --- FIX: Use the new standardized embedding function for the live face ---
          const liveEmbedding = createNormalizedEmbedding(faces[0]);
          
          if (!liveEmbedding) {
              return res.status(200).json({ status: 'no_face_data', message: "Detected a face, but could not extract its geometric features for comparison." });
          }

          // --- OPTIMIZATION: Use a 5-minute in-memory cache for student embeddings ---
          let allStudentsWithEmbeddings = [];
          const now = Date.now();

          if (now - studentEmbeddingsCache.timestamp < CACHE_DURATION_MS && studentEmbeddingsCache.data.length > 0) {
              console.log(`Using cached student embeddings. Cache size: ${studentEmbeddingsCache.data.length}`);
              allStudentsWithEmbeddings = studentEmbeddingsCache.data;
          } else {
              console.log("Cache is stale or empty. Fetching fresh student embeddings from Firestore.");
              // --- FIX: The query was incorrect, it should be '!=' not '==' ---
              const studentsSnapshot = await db.collection("students").where("facialEmbeddings", "!=", []).get();

              if (studentsSnapshot.empty) {
                  return res.status(404).json({ error: 'No students have enrolled for facial recognition.' });
              }
              
              const freshEmbeddings = [];
              for (const doc of studentsSnapshot.docs) {
                  freshEmbeddings.push({
                      studentId: doc.id,
                      studentData: doc.data(),
                      storedEmbeddings: doc.data().facialEmbeddings || [],
                  });
              }
              
              studentEmbeddingsCache = { data: freshEmbeddings, timestamp: now };
              allStudentsWithEmbeddings = freshEmbeddings;
              console.log(`Successfully fetched and cached embeddings for ${allStudentsWithEmbeddings.length} students.`);
          }
          
          // 4. Find the best match by comparing the live face with the cached embeddings
          let bestMatch = { studentId: null, studentData: null, similarity: 0 };
          for (const student of allStudentsWithEmbeddings) {
              const { studentId, studentData, storedEmbeddings } = student;
              
              for (const storedEmbedding of storedEmbeddings) {
                  if (!storedEmbedding) continue;

                  const similarity = cosineSimilarity(liveEmbedding, storedEmbedding);
                  if (similarity > bestMatch.similarity) {
                      bestMatch = { studentId, studentData, similarity };
                  }
              }
          }
          
          // 5. If match is weak, return "unknown"
          // --- FIX: Increased threshold for more accurate, normalized matching ---
          const SIMILARITY_THRESHOLD = 0.92; // Stricter confidence threshold
          if (bestMatch.similarity < SIMILARITY_THRESHOLD) {
              return res.status(200).json({ 
                  status: 'unknown_student', 
                  message: `No confident match found. Best similarity: ${(bestMatch.similarity * 100).toFixed(2)}%`,
                  similarity: bestMatch.similarity 
              });
          }

          const studentData = bestMatch.studentData;
          const studentUid = studentData.authUid;

          // --- FIX: Get classId by transforming the 'class' field (e.g., "Class 12C" -> "12C") ---
          if (!studentData.class) {
              console.error(`Student ${studentData.fullName} (${bestMatch.studentId}) is missing a class assignment.`);
              return res.status(400).json({
                  status: 'error_missing_class',
                  studentName: studentData.fullName,
                  message: `Recognized ${studentData.fullName}, but they are not assigned to a class.`,
              });
          }
          const classId = studentData.class.replace(/^Class\s+/, ''); // "Class 12C" -> "12C"

          // 6. Check if student has already been marked for attendance today
          const today = new Date().toISOString().split('T')[0];
          const attendanceQuery = await db.collection("attendance")
              .where("authUid", "==", studentUid)
              .where("date", "==", today)
              .get();

          if (!attendanceQuery.empty) {
              const docData = attendanceQuery.docs[0].data();
              return res.status(200).json({ 
                  status: 'already_marked',
                  studentName: studentData.fullName,
                  checkInTime: docData.checkInTime,
                  attendanceStatus: docData.status,
                  message: `${studentData.fullName} has already been marked ${docData.status}.`
              });
          }
          
          // 7. Mark Attendance (Logic aligned with verifyFaceForAttendance)
          const classesSnap = await db.collection("classes").doc(classId).get();
          if (!classesSnap.exists) {
              return res.status(404).json({ error: `Class configuration for '${classId}' not found.` });
          }
          const classConfig = classesSnap.data();
          
          let attendanceStatus = "present"; // Default status, aligned with other functions
          
          const shiftConfig = (studentData.shift && classConfig.shifts) ? classConfig.shifts[studentData.shift] : null;

          if (shiftConfig && shiftConfig.startTime) {
              const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
              
              const now = new Date();
              // Use timezone-aware date for accurate 'late' calculation (UTC+7 for Phnom Penh)
              const phnomPenhTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
              const shiftStartTimeDate = new Date(phnomPenhTime.getFullYear(), phnomPenhTime.getMonth(), phnomPenhTime.getDate(), startHour, startMinute, 0, 0);

              // Use student-specific grace period, with fallback to typo and then default.
              let graceMinutes = 15;
              const studentGracePeriod = studentData.gracePeriodMinutes ?? studentData.gradePeriodMinutes;
              
              if (typeof studentGracePeriod === 'number' && !isNaN(studentGracePeriod)) {
                  graceMinutes = studentGracePeriod;
              } else if (typeof studentGracePeriod === 'string' && studentGracePeriod.trim() !== '' && !isNaN(Number(studentGracePeriod))) {
                  graceMinutes = Number(studentGracePeriod);
              }

              const onTimeDeadline = new Date(shiftStartTimeDate);
              onTimeDeadline.setMinutes(shiftStartTimeDate.getMinutes() + graceMinutes);

              if (phnomPenhTime > onTimeDeadline) {
                  attendanceStatus = "late";
              }
          } else {
              console.warn(`Could not determine late status for ${studentData.fullName}. No valid shift config found for shift: '${studentData.shift}'`);
          }
          
          const attendanceRecord = {
              studentId: bestMatch.studentId,
              authUid: studentUid,
              studentName: studentData.fullName,
              class: studentData.class || null,
              shift: studentData.shift || null,
              status: attendanceStatus,
              date: today,
              timestamp: FieldValue.serverTimestamp(),
              scannedBy: `Face Recognition via ${adminEmail}`,
          };

          await db.collection("attendance").add(attendanceRecord);
          
          console.log(`Successfully marked attendance for ${studentData.fullName} with status: ${attendanceStatus}`);

          // 8. Return success response
          return res.status(200).json({ 
              status: 'success', 
              studentName: studentData.fullName,
              similarity: bestMatch.similarity,
              attendanceStatus: attendanceStatus,
              message: `Successfully marked ${studentData.fullName} as ${attendanceStatus}.`
          });

      } catch (error) {
          console.error("Error in recognizeAndMarkAttendance:", error);
          if (error instanceof functions.https.HttpsError) {
              throw error;
          }
          return res.status(500).json({ error: "An unexpected error occurred during face recognition." });
      }
    });
  });
*/

exports.verifyFaceForAttendance = onCall({
  region: "asia-southeast1"
}, async (request) => {
    // 1. Verify admin and data
    if (!request.auth || !request.auth.token.isAdmin) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }
    if (!request.data.image) {
        throw new HttpsError("invalid-argument", "An 'image' (base64) must be provided.");
    }
    const adminEmail = request.auth.token.email;
    
    try {
        // 2. Detect face in the provided image
        const imageBuffer = Buffer.from(request.data.image, 'base64');
        const [result] = await visionClient.faceDetection({ image: { content: imageBuffer } });
        const faces = result.faceAnnotations;

        if (!faces || faces.length === 0) {
            throw new HttpsError("not-found", "No face detected in the image.");
        }
        if (faces.length > 1) {
           console.log(`Multiple faces (${faces.length}) detected in verification photo. Using the most prominent one.`);
        }

        // --- FIX: Use the new standardized embedding function ---
        const liveEmbedding = createNormalizedEmbedding(faces[0]);
        if (!liveEmbedding) {
            throw new HttpsError("internal", "Could not extract geometric features from the detected face.");
        }
        
        // 3. Find the best match from stored student embeddings
        const studentsSnapshot = await db.collection("students").where("facialEmbeddings", "!=", []).get();

        if (studentsSnapshot.empty) {
            throw new HttpsError("not-found", "No students have enrolled for facial recognition.");
        }
        
        let bestMatch = { studentId: null, studentData: null, similarity: 0 };

        studentsSnapshot.forEach(doc => {
            const studentData = doc.data();
            const storedEmbeddings = studentData.facialEmbeddings;

            if (storedEmbeddings && storedEmbeddings.length > 0) {
                // Calculate similarity against each stored embedding
                for (const storedEmbedding of storedEmbeddings) {
                    // --- FIX: The embedding is now stored directly, not in an object ---
                    if (!storedEmbedding) continue;

                    const similarity = cosineSimilarity(liveEmbedding, storedEmbedding);
                    console.log(`Comparing with student ${studentData.fullName}, similarity: ${similarity}`);
                    
                    if (similarity > bestMatch.similarity) {
                        bestMatch = { studentId: doc.id, studentData, similarity };
                    }
                }
            }
        });
        
        // 4. Determine if the match is good enough
        // --- FIX: Use the same strict threshold as the other function ---
        const SIMILARITY_THRESHOLD = 0.95; 
        
        console.log(`Best match: ${bestMatch.studentData?.fullName} with similarity ${bestMatch.similarity}`);

        if (bestMatch.similarity < SIMILARITY_THRESHOLD) {
            throw new HttpsError("not-found", "Could not recognize the student. Please try again or use another method.");
        }

        // 5. Matched: Proceed to mark attendance (logic aligned with redeemAttendancePasscode)
        const studentData = bestMatch.studentData;
        const studentUid = studentData.authUid;
        const dateStr = new Date().toISOString().split('T')[0];

        const attendanceQuery = await db.collection("attendance")
            .where("authUid", "==", studentUid)
            .where("date", "==", dateStr)
            .get();

        if (!attendanceQuery.empty) {
            const existingStatus = attendanceQuery.docs[0].data().status;
            throw new HttpsError("already-exists", `${studentData.fullName} was already marked '${existingStatus}' today.`);
        }
        
        // --- The rest is attendance logic copied and adapted from redeemAttendancePasscode ---
        const classesSnap = await db.collection("classes").get();
        const classConfigs = classesSnap.docs.reduce((acc, doc) => ({ ...acc, [doc.id]: doc.data() }), {});
        let attendanceStatus = "present";
        
        // Handle class name mismatch: student.class = "Class 12B" but doc ID = "12B"
        const studentClassKey = studentData.class ? studentData.class.replace(/^Class\s+/, '') : null;
        const classConfig = studentClassKey ? classConfigs[studentClassKey] : null;
        const shiftConfig = (studentData.shift && classConfig?.shifts) ? classConfig.shifts[studentData.shift] : null;

        if (shiftConfig && shiftConfig.startTime) {
            const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
            const now = new Date();
            const phnomPenhTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
            const shiftStartTimeDate = new Date(phnomPenhTime.getFullYear(), phnomPenhTime.getMonth(), phnomPenhTime.getDate(), startHour, startMinute, 0, 0);

            let graceMinutes = 15;
            const studentGracePeriod = studentData.gracePeriodMinutes ?? studentData.gradePeriodMinutes;
            if (typeof studentGracePeriod === 'number' && !isNaN(studentGracePeriod)) {
                graceMinutes = studentGracePeriod;
            } else if (typeof studentGracePeriod === 'string' && studentGracePeriod.trim() !== '' && !isNaN(Number(studentGracePeriod))) {
                graceMinutes = Number(studentGracePeriod);
            }
            const onTimeDeadline = new Date(shiftStartTimeDate);
            onTimeDeadline.setMinutes(shiftStartTimeDate.getMinutes() + graceMinutes);

            if (phnomPenhTime > onTimeDeadline) {
                attendanceStatus = "late";
            }
        }
        
        await db.collection("attendance").add({
            studentId: bestMatch.studentId,
            authUid: studentUid,
            studentName: studentData.fullName,
            class: studentData.class || null,
            shift: studentData.shift || null,
            status: attendanceStatus,
            date: dateStr,
            timestamp: FieldValue.serverTimestamp(),
            scannedBy: `facial_recognition_by_${adminEmail}`,
        });

        const message = `${studentData.fullName} marked ${attendanceStatus} by face scan!`;
        return { success: true, message: message };

    } catch (error) {
        console.error("Error verifying face for attendance:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "An unexpected error occurred during facial recognition.");
    }
  });

exports.generateAttendancePasscode = onCall({
  region: "asia-southeast1"
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const uid = request.auth.uid;
  const db = admin.firestore();
  const passcode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expires = admin.firestore.Timestamp.fromMillis(Date.now() + 60000); // Valid for 60 seconds

  const passcodeRef = db.collection("attendancePasscodes").doc(passcode);
  await passcodeRef.set({
    studentAuthUid: uid,
    expires: expires,
    used: false,
  });

  functions.logger.log(`Generated passcode ${passcode} for UID: ${uid}`);
  return { passcode: passcode };
});

exports.redeemAttendancePasscode = onCall({
  region: "asia-southeast1"
}, async (request) => {
  const logger = functions.logger;
  const db = admin.firestore();

  // 1. Verify admin is making the call
  if (!request.auth || !request.auth.token.email) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }
  const adminEmail = request.auth.token.email;
  const passcode = request.data.passcode;
  if (!passcode) {
    throw new HttpsError("invalid-argument", "A 'passcode' must be provided.");
  }

  const passcodeRef = db.collection("attendancePasscodes").doc(passcode);
  const passcodeDoc = await passcodeRef.get();

  // 2. Validate the passcode
  if (!passcodeDoc.exists) {
    throw new HttpsError("not-found", "Invalid QR Payment.");
  }
  const passcodeData = passcodeDoc.data();
  if (passcodeData.used) {
    throw new HttpsError("already-exists", "This QR Payment has already been used.");
  }
  if (new Date() > passcodeData.expires.toDate()) {
    throw new HttpsError("deadline-exceeded", "This QR Payment has expired.");
  }

  // 3. Mark passcode as used immediately to prevent race conditions
  await passcodeRef.update({ used: true });

  // 4. Run database lookups for student and existing attendance
  const studentUid = passcodeData.studentAuthUid;
  const dateStr = new Date().toISOString().split('T')[0];
  
  const [studentQuery, attendanceQuery] = await Promise.all([
    db.collection("students").where("authUid", "==", studentUid).limit(1).get(),
    db.collection("attendance").where("authUid", "==", studentUid).where("date", "==", dateStr).get()
  ]);

  // 5. Validate lookups
  if (studentQuery.empty) {
    throw new HttpsError("not-found", "No student record is associated with this QR Payment.");
  }
  const studentDoc = studentQuery.docs[0];
  const studentData = studentDoc.data();
  if (!attendanceQuery.empty) {
    const existingStatus = attendanceQuery.docs[0].data().status;
    throw new HttpsError("already-exists", `${studentData.fullName} was already marked '${existingStatus}' today.`);
  }

  // 6. Calculate late status
  const classesSnap = await db.collection("classes").get();
  const classConfigs = classesSnap.docs.reduce((acc, doc) => ({ ...acc, [doc.id]: doc.data() }), {});
  let attendanceStatus = "present";
  
  // Handle class name mismatch: student.class = "Class 12B" but doc ID = "12B"
  const studentClassKey = studentData.class ? studentData.class.replace(/^Class\s+/, '') : null;
  const classConfig = studentClassKey ? classConfigs[studentClassKey] : null;
  const shiftConfig = (studentData.shift && classConfig?.shifts) ? classConfig.shifts[studentData.shift] : null;
  
  // Debug log for class lookup
  logger.log({
    originalClass: studentData.class,
    mappedClassKey: studentClassKey,
    foundClassConfig: !!classConfig,
    foundShiftConfig: !!shiftConfig,
    studentName: studentData.fullName
  });

  if (shiftConfig && shiftConfig.startTime) {
    const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
    
    // Use a timezone-aware date for accurate 'late' calculation
    const now = new Date();
    
    // Convert to Phnom Penh timezone (UTC+7) by adding 7 hours to UTC time
    // This is more reliable than string parsing methods
    const phnomPenhTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    
    // Create the shift start time for today in Phnom Penh timezone  
    const shiftStartTimeDate = new Date(phnomPenhTime.getFullYear(), phnomPenhTime.getMonth(), phnomPenhTime.getDate(), startHour, startMinute, 0, 0);

    // Use gracePeriodMinutes from studentData if set, else default to 15
    let graceMinutes = 15;
    // Check for both 'gracePeriodMinutes' and a potential typo 'gradePeriodMinutes'.
    const studentGracePeriod = studentData.gracePeriodMinutes ?? studentData.gradePeriodMinutes;

    if (
      typeof studentGracePeriod === 'number' && !isNaN(studentGracePeriod)
    ) {
      graceMinutes = studentGracePeriod;
    } else if (
      typeof studentGracePeriod === 'string' && studentGracePeriod.trim() !== '' && !isNaN(Number(studentGracePeriod))
    ) {
      graceMinutes = Number(studentGracePeriod);
    }
    const onTimeDeadline = new Date(shiftStartTimeDate);
    onTimeDeadline.setMinutes(shiftStartTimeDate.getMinutes() + graceMinutes);

    // Log the times for debugging
    logger.log({
        currentTimeUTC: now.toISOString(),
        currentTimePhnomPenh: phnomPenhTime.toISOString(),
        shiftStartTimePhnomPenh: shiftStartTimeDate.toISOString(),
        onTimeDeadlinePhnomPenh: onTimeDeadline.toISOString(),
        graceMinutes: graceMinutes,
        studentName: studentData.fullName
    });

    if (phnomPenhTime > onTimeDeadline) {
      attendanceStatus = "late";
    }
    
    // Log the attendance decision with timing details
    functions.logger.log(`Attendance recorded for ${studentData.fullName} (${attendanceStatus}) by ${adminEmail} Scan Time: ${phnomPenhTime} Deadline: ${onTimeDeadline}`);
  }

  // 7. Create the attendance record
  await db.collection("attendance").add({
    studentId: studentDoc.id,
    authUid: studentUid,
    studentName: studentData.fullName,
    class: studentData.class || null,
    shift: studentData.shift || null,
    status: attendanceStatus,
    date: dateStr,
    timestamp: FieldValue.serverTimestamp(),
    scannedBy: adminEmail,
  });

  //functions.logger.log(`Attendance recorded for ${studentData.fullName} (${attendanceStatus}) by ${adminEmail}`);
  const message = `${studentData.fullName} marked ${attendanceStatus}!`;
  return { success: true, message: message };
});

/**
 * Links a student profile to the authenticated user's UID based on phone number.
 * This is a simplified version that does not require OTP verification.
 */
exports.linkStudentByPhone = onCall({
  region: "asia-southeast1"
}, async (request) => {
  // Force redeploy 1
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to perform this action.");
  }

  const { phoneNumber } = request.data;
  if (!phoneNumber) {
    throw new HttpsError("invalid-argument", "The function must be called with a 'phoneNumber' argument.");
  }
  
  const uid = request.auth.uid;

  try {

    // Find the student document by the provided phone number.
    // The field name must match Firestore exactly, which is "phone" (lowercase).
    const studentQuery = db.collection("students").where("phone", "==", phoneNumber).limit(1);
    const studentSnapshot = await studentQuery.get();

    if (studentSnapshot.empty) {
      throw new HttpsError("not-found", `We couldn't find a student record associated with this phone number. Contact a Rodwell administrator for assistance.`);
    }

    const studentDoc = studentSnapshot.docs[0];
    
    // Check if the student profile is already linked to a different auth account.
    if (studentDoc.data().authUid) {
      // Security: It's better not to reveal if the account is linked to someone else or not.
      // A generic message is safer, but for internal use, a specific one might be okay.
      throw new HttpsError("already-exists", "This student profile is already linked to an account.");
    }
    // Force redeploy 2
    
    // If we're here, the student exists and is not linked. Let's link them.
    // We will also add the user's email to the student document for reference.
    const userEmail = request.auth.token.email;
    await studentDoc.ref.update({ authUid: uid, email: userEmail });
    
    return { success: true, message: "Your account has been successfully linked!" };

  } catch (error) {
    console.error("Error linking student by phone:", error);
    // Re-throw HttpsError instances directly.
    if (error instanceof HttpsError) {
        throw error;
    }
    // Log other errors and throw a generic internal error to the client.
    throw new HttpsError("internal", "An unexpected error occurred while linking your account.");
  }
});

// Note: The 'linkStudentProfileWithVerifiedNumber' function that previously existed
// has been removed and replaced by the two functions above.

/**
 * [Scheduled Function]
 * Automatically deletes documents and their associated files that are older than 30 days.
 * Runs daily at midnight UTC.
 */
exports.cleanupOldDocuments = onSchedule('0 0 * * *', async (event) => {
  console.log('Starting cleanup of old documents...');
    
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Query documents older than 30 days
    const oldDocumentsQuery = await db.collection('documents')
      .where('uploadedAt', '<=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .get();
    
    if (oldDocumentsQuery.empty) {
      console.log('No old documents found to delete.');
      return null;
    }
    
    const storage = getStorage();
    const bucket = storage.bucket();
    let deletedCount = 0;
    let errorCount = 0;
    
    // Process each old document
    for (const docSnapshot of oldDocumentsQuery.docs) {
      const docData = docSnapshot.data();
      const docId = docSnapshot.id;
      
      try {
        // Delete the file from Firebase Storage
        if (docData.pdfUrl) {
          // Extract file path from URL
          const urlParts = docData.pdfUrl.split('/');
          const filePathEncoded = urlParts[urlParts.length - 1].split('?')[0];
          const filePath = decodeURIComponent(filePathEncoded);
          
          try {
            await bucket.file(filePath).delete();
            console.log(`Deleted file: ${filePath}`);
          } catch (storageError) {
            console.warn(`Failed to delete file ${filePath}:`, storageError.message);
            // Continue with document deletion even if file deletion fails
          }
        }
        
        // Check for related print requests and delete them too
        const relatedPrintRequests = await db.collection('printRequests')
          .where('documentId', '==', docId)
          .get();
        
        for (const printRequestDoc of relatedPrintRequests.docs) {
          await printRequestDoc.ref.delete();
          console.log(`Deleted related print request: ${printRequestDoc.id}`);
        }
        
        // Delete the document from Firestore
        await docSnapshot.ref.delete();
        console.log(`Deleted document: ${docId} (${docData.fileName})`);
        deletedCount++;
        
      } catch (error) {
        console.error(`Error deleting document ${docId}:`, error);
        errorCount++;
      }
    }
    
    console.log(`Cleanup completed. Deleted: ${deletedCount} documents, Errors: ${errorCount}`);
    
    // Log summary to a cleanup log collection for admin monitoring
    await db.collection('cleanupLogs').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      deletedDocuments: deletedCount,
      errors: errorCount,
      cutoffDate: admin.firestore.Timestamp.fromDate(thirtyDaysAgo)
    });
    
    return null;
    
  } catch (error) {
    console.error('Error during cleanup process:', error);
    
    // Log error for admin monitoring
    await db.collection('cleanupLogs').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      error: error.message,
      success: false
    });
    
    throw new Error('Cleanup process failed');
  }
});


/**
 * [Callable Function]
 * Gets the next available receipt number.
 * This function uses a Firestore transaction to ensure that each number is unique.
 */
exports.getNextReceiptNumber = onCall({
  region: "asia-southeast1" // Explicitly setting the region
}, async (request) => {
    // This function must be called while authenticated.
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication is required.");
    }

    const counterRef = db.collection("counters").doc("receiptNumber");

    try {
        const nextNumber = await db.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);

            // If the counter doesn't exist, initialize it at 100.
            if (!counterDoc.exists) {
                transaction.set(counterRef, { currentNumber: 100 });
                return 100;
            }

            // Otherwise, increment the current number.
            const newNumber = counterDoc.data().currentNumber + 1;
            transaction.update(counterRef, { currentNumber: newNumber });
            return newNumber;
        });

        return { receiptNumber: nextNumber.toString() };

    } catch (error) {
        console.error("Error getting next receipt number:", error);
        throw new HttpsError("internal", "Could not generate a receipt number.");
    }
});

/**
 * [Firestore Trigger]
 * DEPRECATED: Auto-generate QR code when a new student is created (now using on-demand tokens)
 */
// exports.autoGenerateQROnStudentCreate = onDocumentCreated({
//     document: "students/{studentId}",
//     region: "asia-southeast1"
// }, async (event) => {
//     const studentData = event.data?.data();
//     const studentId = event.params?.studentId;
// 
//     if (!studentData || !studentId) {
//         console.log("No student data or ID provided");
//         return;
//     }
// 
//     try {
//         console.log(`Auto-generating QR code for new student: ${studentData.fullName} (${studentId})`);
//         
//         // Generate one-time registration token
//         const token = generateOneTimeToken();
//         const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
//         
//         // Update the student document with registration token
//         await db.collection("students").doc(studentId).update({
//             registrationToken: token,
//             tokenGeneratedAt: FieldValue.serverTimestamp(),
//             tokenExpiresAt: expiresAt,
//             telegramAuthEnabled: true
//         });
// 
//         console.log(`QR code auto-generated for student ${studentId} with token: ${token}`);
//         
//     } catch (error) {
//         console.error(`Error auto-generating QR code for student ${studentId}:`, error);
//     }
// });

// NEW: Callable function to store temporary registration token (used by PrintNode API)
exports.storeTempRegistrationToken = onCall({
    region: 'us-central1'
}, async (request) => {
    try {
        const { studentId, token } = request.data;
        
        if (!studentId || !token) {
            throw new HttpsError('invalid-argument', 'Student ID and token are required.');
        }

        const expiresAt = await storeTempRegistrationToken(studentId, token);
        
        return {
            success: true,
            token: token,
            studentId: studentId,
            expiresAt: expiresAt.toISOString()
        };
        
    } catch (error) {
        console.error('Error storing temp registration token:', error);
        throw new HttpsError('internal', 'Failed to store temporary registration token.');
    }
});

// NEW: Scheduled function to cleanup expired temporary tokens
exports.cleanupExpiredTempTokens = onSchedule('0 0 * * *', async (event) => {
    console.log('🧹 Starting cleanup of expired temporary registration tokens...');
    
    try {
        const now = new Date();
        const expiredTokens = await db.collection('tempRegistrationTokens')
            .where('expiresAt', '<', now)
            .get();
        
        if (expiredTokens.empty) {
            console.log('✅ No expired temporary tokens to clean up');
            return;
        }
        
        const batch = db.batch();
        let deleteCount = 0;
        
        expiredTokens.forEach((doc) => {
            batch.delete(doc.ref);
            deleteCount++;
        });
        
        await batch.commit();
        console.log(`✅ Cleaned up ${deleteCount} expired temporary registration tokens`);
        
    } catch (error) {
        console.error('❌ Error cleaning up expired temporary tokens:', error);
    }
});

/**
 * [Firestore-triggered Function]
 * Sends FCM push notifications when a new notification is created
 */
exports.sendNotificationToStudents = onDocumentCreated({
    document: "notifications/{docId}",
    region: "asia-southeast1"
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log("No data associated with the notification event");
        return;
    }

    const notificationData = snapshot.data();
    const { title, body, link, targetType, targetValue } = notificationData;

    console.log(`Processing notification: ${title} (${targetType})`);

    try {
        // Get all FCM tokens for targeted students
        let targetStudentUids = [];

        if (targetType === 'all') {
            // Get all students with authUid
            const allStudentsSnapshot = await db.collection('students')
                .where('authUid', '!=', null)
                .get();
            targetStudentUids = allStudentsSnapshot.docs
                .map(doc => doc.data().authUid)
                .filter(uid => uid);

        } else if (targetType === 'class') {
            // Get students from specific classes
            const classArray = Array.isArray(targetValue) ? targetValue : [targetValue];
            const classStudentsSnapshot = await db.collection('students')
                .where('authUid', '!=', null)
                .get();
            
            targetStudentUids = classStudentsSnapshot.docs
                .filter(doc => {
                    const studentClass = doc.data().class;
                    return studentClass && classArray.includes(studentClass);
                })
                .map(doc => doc.data().authUid)
                .filter(uid => uid);

        } else if (targetType === 'user') {
            // Direct student UIDs
            targetStudentUids = Array.isArray(targetValue) ? targetValue : [targetValue];
        }

        if (targetStudentUids.length === 0) {
            console.log("No target students found for notification");
            return;
        }

        console.log(`Found ${targetStudentUids.length} target students`);

        // Get FCM tokens for target students
        const tokensSnapshot = await db.collection('fcmTokens')
            .where('userId', 'in', targetStudentUids.slice(0, 10)) // Firestore 'in' limit is 10
            .get();

        let fcmTokens = [];
        
        // Handle more than 10 students by batching
        if (targetStudentUids.length > 10) {
            const batches = [];
            for (let i = 0; i < targetStudentUids.length; i += 10) {
                const batch = targetStudentUids.slice(i, i + 10);
                batches.push(batch);
            }

            const allTokenQueries = batches.map(batch => 
                db.collection('fcmTokens').where('userId', 'in', batch).get()
            );

            const allTokenSnapshots = await Promise.all(allTokenQueries);
            
            allTokenSnapshots.forEach(snapshot => {
                snapshot.docs.forEach(doc => {
                    const tokenData = doc.data();
                    if (tokenData.token) {
                        fcmTokens.push(tokenData.token);
                    }
                });
            });
        } else {
            tokensSnapshot.docs.forEach(doc => {
                const tokenData = doc.data();
                if (tokenData.token) {
                    fcmTokens.push(tokenData.token);
                }
            });
        }

        if (fcmTokens.length === 0) {
            console.log("No FCM tokens found for target students");
            return;
        }

        console.log(`Sending notification to ${fcmTokens.length} devices`);

        // Prepare FCM message
        const message = {
            notification: {
                title: title,
                body: body,
                icon: '/favicon.png',
            },
            data: {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                url: link || '/student/notifications',
                notificationId: event.params.docId
            },
            tokens: fcmTokens
        };

        // Send multicast notification
        const response = await admin.messaging().sendMulticast(message);

        console.log(`Notification sent successfully: ${response.successCount} succeeded, ${response.failureCount} failed`);

        // Handle failed tokens (cleanup invalid tokens)
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.log(`Failed to send to token ${idx}: ${resp.error?.message}`);
                    // Mark token for cleanup if it's invalid
                    if (resp.error?.code === 'messaging/invalid-registration-token' ||
                        resp.error?.code === 'messaging/registration-token-not-registered') {
                        failedTokens.push(fcmTokens[idx]);
                    }
                }
            });

            // Clean up invalid tokens
            if (failedTokens.length > 0) {
                console.log(`Cleaning up ${failedTokens.length} invalid tokens`);
                const cleanupPromises = failedTokens.map(token =>
                    db.collection('fcmTokens').where('token', '==', token).get()
                    .then(snapshot => {
                        const batch = db.batch();
                        snapshot.docs.forEach(doc => batch.delete(doc.ref));
                        return batch.commit();
                    })
                );
                await Promise.all(cleanupPromises);
            }
        }

        // Update notification with send statistics
        await db.collection('notifications').doc(event.params.docId).update({
            sentAt: FieldValue.serverTimestamp(),
            targetDevices: fcmTokens.length,
            successCount: response.successCount,
            failureCount: response.failureCount
        });

    } catch (error) {
        console.error("Error sending notification:", error);
        
        // Update notification with error status
        await db.collection('notifications').doc(event.params.docId).update({
            sendError: error.message,
            sentAt: FieldValue.serverTimestamp()
        });
    }
});