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
// The bots will be initialized when needed using the secret tokens
let parentBot = null;
let studentBot = null;

const initializeParentBot = () => {
    if (!parentBot && process.env.TELEGRAM_PARENT_BOT_TOKEN) {
        parentBot = new TelegramBot(process.env.TELEGRAM_PARENT_BOT_TOKEN, { polling: false });
    }
    return parentBot;
};

const initializeStudentBot = () => {
    if (!studentBot && process.env.TELEGRAM_STUDENT_BOT_TOKEN) {
        studentBot = new TelegramBot(process.env.TELEGRAM_STUDENT_BOT_TOKEN, { polling: false });
    }
    return studentBot;
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

// --- Helper functions for Khmer formatting ---
const formatTimeInKhmer = (date) => {
    const khmerNumbers = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    const khmerMonths = [
        'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
        'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
    ];
    
    const convertToKhmerNumber = (num) => {
        return num.toString().split('').map(digit => khmerNumbers[parseInt(digit)]).join('');
    };
    
    const day = convertToKhmerNumber(date.getDate());
    const month = khmerMonths[date.getMonth()];
    const year = convertToKhmerNumber(date.getFullYear());
    const hours = convertToKhmerNumber(date.getHours().toString().padStart(2, '0'));
    const minutes = convertToKhmerNumber(date.getMinutes().toString().padStart(2, '0'));
    
    return `ម៉ោង${hours}:${minutes} ថ្ងៃទី${day} ខែ${month} ឆ្នាំ${year}`;
};

const formatClassInKhmer = (classLevel) => {
    if (!classLevel) return 'មិនបានកំណត់';
    
    // Extract class number from various formats like "Grade 7", "Class 7", "7", etc.
    const classMatch = classLevel.toString().match(/\d+/);
    if (classMatch) {
        const khmerNumbers = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
        const convertToKhmerNumber = (num) => {
            return num.toString().split('').map(digit => khmerNumbers[parseInt(digit)]).join('');
        };
        return `ថ្នាក់ទី${convertToKhmerNumber(classMatch[0])}`;
    }
    
    return classLevel; // Return as-is if no number found
};

const calculateAttendanceStatus = (attendanceTime, classStartTime) => {
    if (!classStartTime) return null;
    
    const khmerNumbers = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    const convertToKhmerNumber = (num) => {
        return num.toString().split('').map(digit => khmerNumbers[parseInt(digit)]).join('');
    };
    
    // Parse class start time (assuming format like "07:30" or "7:30")
    const startTimeParts = classStartTime.split(':');
    if (startTimeParts.length !== 2) return null;
    
    const startHour = parseInt(startTimeParts[0]);
    const startMinute = parseInt(startTimeParts[1]);
    
    // Create start time date object
    const startTimeDate = new Date(attendanceTime);
    startTimeDate.setHours(startHour, startMinute, 0, 0);
    
    // Calculate difference in minutes
    const diffMs = attendanceTime.getTime() - startTimeDate.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    
    const formatStartTime = `${convertToKhmerNumber(startHour.toString().padStart(2, '0'))}:${convertToKhmerNumber(startMinute.toString().padStart(2, '0'))}`;
    
    if (diffMinutes < 0) {
        // Early arrival
        const earlyMinutes = Math.abs(diffMinutes);
        return {
            startTime: formatStartTime,
            status: `មកមុនម៉ោង ${convertToKhmerNumber(earlyMinutes.toString())} នាទី`,
            statusIcon: '🟢'
        };
    } else if (diffMinutes <= 15) {
        // On time (within 15 minutes)
        return {
            startTime: formatStartTime,
            status: 'មកត្រឹមម៉ោង',
            statusIcon: '✅'
        };
    } else {
        // Late arrival
        return {
            startTime: formatStartTime,
            status: `យឺតម៉ោង ${convertToKhmerNumber(diffMinutes.toString())} នាទី`,
            statusIcon: '🟡'
        };
    }
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

// --- Helper functions for payment status ---

/**
 * Calculate dynamic payment status based on lastPaymentMonth and current date
 * @param lastPaymentMonth - The last payment month in format "YYYY-MM" or null/undefined
 * @param currentDate - Optional current date (defaults to new Date())
 * @returns PaymentStatusResult with status and reason
 */
const calculatePaymentStatus = (lastPaymentMonth, currentDate = new Date()) => {
    // If no payment record exists
    if (!lastPaymentMonth) {
        return {
            status: 'no-record',
            reason: 'No payment record found'
        };
    }

    // Get current year-month in format "YYYY-MM"
    const currentYearMonth = currentDate.toISOString().slice(0, 7);
    
    // Parse the last payment month
    const lastPaymentYearMonth = lastPaymentMonth.slice(0, 7);
    
    // If payment is from a previous month
    if (lastPaymentYearMonth < currentYearMonth) {
        return {
            status: 'unpaid',
            reason: 'Payment is from a previous month'
        };
    }
    
    // If payment is from the current month
    if (lastPaymentYearMonth === currentYearMonth) {
        // Check if we're in the last 3 days of the month
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const currentDay = currentDate.getDate();
        const daysUntilEndOfMonth = lastDayOfMonth - currentDay;
        
        if (daysUntilEndOfMonth <= 2) { // Last 3 days (0, 1, 2 days remaining)
            return {
                status: 'unpaid',
                reason: 'Payment required for next month (last 3 days of current month)'
            };
        }
        
        return {
            status: 'paid',
            reason: 'Payment is current for this month'
        };
    }
    
    // If payment is from a future month (shouldn't happen in normal cases)
    return {
        status: 'paid',
        reason: 'Payment is from a future month'
    };
};

/**
 * Simple version that returns only the status (for backward compatibility)
 * @param lastPaymentMonth - The last payment month in format "YYYY-MM" or null/undefined
 * @param currentDate - Optional current date (defaults to new Date())
 * @returns PaymentStatus
 */
const getPaymentStatus = (lastPaymentMonth, currentDate = new Date()) => {
    return calculatePaymentStatus(lastPaymentMonth, currentDate).status;
};

/**
 * Get user-friendly payment status display text in Khmer
 * @param status - The payment status
 * @returns Display text for the status in Khmer
 */
const getPaymentStatusDisplayText = (status) => {
    switch (status) {
        case 'paid':
            return 'បានបង់រួច';
        case 'unpaid':
            return 'មិនទាន់បានបង់';
        case 'no-record':
            return 'គ្មានកំណត់ត្រា';
        default:
            return 'មិនស្គាល់';
    }
};

/**
 * Format payment month in Khmer
 * @param paymentMonth - Payment month in format "YYYY-MM"
 * @returns Formatted month in Khmer
 */
const formatPaymentMonthInKhmer = (paymentMonth) => {
    if (!paymentMonth) return 'មិនបានកំណត់';
    
    const khmerNumbers = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    const khmerMonths = [
        'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
        'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
    ];
    
    const convertToKhmerNumber = (num) => {
        return num.toString().split('').map(digit => khmerNumbers[parseInt(digit)]).join('');
    };
    
    const [year, month] = paymentMonth.split('-');
    const khmerYear = convertToKhmerNumber(year);
    const khmerMonth = khmerMonths[parseInt(month) - 1] || month;
    
    return `ខែ${khmerMonth} ឆ្នាំ${khmerYear}`;
};

/**
 * Get pricing information for a student class
 * @param studentClass - The student's class name (e.g., "Class 11E")
 * @returns Price information or null if not found
 */
const getClassPricing = async (studentClass) => {
    try {
        // First, query the classes collection to find the class and get its type
        const classQuery = await db.collection('classes')
            .where('name', '==', studentClass)
            .limit(1)
            .get();
        
        if (classQuery.empty) {
            console.log(`No class found with name: ${studentClass}`);
            return null;
        }
        
        const classData = classQuery.docs[0].data();
        const classType = classData.type;
        
        if (!classType) {
            console.log(`No type found for class: ${studentClass}`);
            return null;
        }
        
        console.log(`Found class type: ${classType} for class: ${studentClass}`);
        
        // Query the classTypes collection to get the price
        const classTypeDoc = await db.collection('classTypes').doc(classType).get();
        
        if (!classTypeDoc.exists) {
            console.log(`No classType found with ID: ${classType}`);
            return null;
        }
        
        const classTypeData = classTypeDoc.data();
        const price = classTypeData.price;
        
        console.log(`Found price: ${price} for classType: ${classType}`);
        
        return {
            classType: classType,
            price: price
        };
        
    } catch (error) {
        console.error('Error getting class pricing:', error);
        return null;
    }
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
    const botUsername = 'rodwell_portal_password_bot'; // Student portal bot username
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
    secrets: ["TELEGRAM_STUDENT_BOT_TOKEN"]
}, async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const bot = initializeStudentBot();
    if (!bot) {
        console.error("Student bot not initialized - missing token");
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

        // Handle non-text messages (photos, stickers, etc.)
        if (!text || typeof text !== 'string') {
            console.log(`Non-text message received from chatId ${chatId}, ignoring`);
            return res.status(200).send('OK');
        }

        if (text.startsWith('/start')) {
            // Handle /start command with optional token parameter
            const parts = text.split(' ');
            if (parts.length > 1) {
                // /start TOKEN - student registration from QR code
                const token = parts.slice(1).join(' ').trim();
                await handleStartWithToken(bot, chatId, userId, token);
                return res.status(200).send('OK');
            } else {
                // Regular /start command - student registration flow
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
 * [Callable Function]
 * Set up Telegram webhook for the parent bot
 */
exports.setupTelegramWebhook = onCall({
    region: "asia-southeast1",
    secrets: ["TELEGRAM_STUDENT_BOT_TOKEN"]
}, async (request) => {
    try {
        const bot = initializeStudentBot();
        if (!bot) {
            throw new HttpsError('Student bot not initialized');
        }

        // Get the webhook URL for your Firebase function
        const webhookUrl = `https://asia-southeast1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/telegramWebhook`;
        
        // Set the webhook
        const response = await bot.setWebHook(webhookUrl);
        
        console.log('Webhook setup result:', response);
        
        // Get webhook info to verify
        const webhookInfo = await bot.getWebHookInfo();
        
        return {
            success: true,
            webhookUrl: webhookUrl,
            webhookInfo: webhookInfo
        };
        
    } catch (error) {
        console.error('Error setting up webhook:', error);
        throw new HttpsError('internal', `Failed to setup webhook: ${error.message}`);
    }
});

/**
 * [Callable Function]
 * Test Telegram bot connection and send a test message
 */
exports.testTelegramBot = onCall({
    region: "asia-southeast1",
    secrets: ["TELEGRAM_STUDENT_BOT_TOKEN"]
}, async (request) => {
    try {
        const { chatId } = request.data;
        
        if (!chatId) {
            throw new HttpsError('invalid-argument', 'Chat ID is required');
        }
        
        const bot = initializeStudentBot();
        if (!bot) {
            throw new HttpsError('internal', 'Student bot not initialized');
        }

        // Send a test message
        await bot.sendMessage(chatId, '🤖 Test message from Parent Notification Bot!\n\nBot is working correctly! ✅');
        
        return { success: true, message: 'Test message sent successfully' };
        
    } catch (error) {
        console.error('Error testing bot:', error);
        throw new HttpsError('internal', `Bot test failed: ${error.message}`);
    }
});

/**
 * [HTTP Function]
 * Webhook handler for Parent Telegram bot
 * Handles parent registration and notification commands
 */
exports.parentBotWebhook = onRequest({
    region: "asia-southeast1",
    secrets: ["TELEGRAM_PARENT_BOT_TOKEN"]
}, async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const bot = initializeParentBot();
    if (!bot) {
        console.error("Parent bot not initialized - missing token");
        return res.status(500).send('Bot configuration error');
    }

    try {
        const { message, callback_query } = req.body;
        
        // Handle callback queries (inline button presses) for exam selection
        if (callback_query) {
            await handleParentCallbackQuery(bot, callback_query);
            return res.status(200).send('OK');
        }
        
        if (!message) {
            return res.status(200).send('OK');
        }

        const chatId = message.chat.id;
        const text = message.text;
        const userId = message.from.id;

        console.log(`Parent bot received message from chatId ${chatId}: ${text}`);

        // Handle non-text messages
        if (!text || typeof text !== 'string') {
            console.log(`Non-text message received from parent bot chatId ${chatId}, ignoring`);
            return res.status(200).send('OK');
        }

        if (text.startsWith('/start')) {
            // Handle /start command with optional token parameter
            const parts = text.split(' ');
            if (parts.length > 1) {
                // /start TOKEN - could be parent registration or deep link
                const token = parts.slice(1).join(' ').trim();
                if (token.startsWith('parent_')) {
                    await handleParentStartCommand(bot, chatId, userId, token);
                    return res.status(200).send('OK');
                } else if (token === 'check_mock_exam_result') {
                    await handleMockExamResultDeepLink(bot, chatId, userId, token);
                    return res.status(200).send('OK');
                }
            }
            
            // Regular /start command - check if this is a parent trying to register
            const parentQuery = await db.collection('parentNotifications')
                .where('telegramUserId', '==', userId.toString())
                .where('isActive', '==', true)
                .get();
            
            if (!parentQuery.empty) {
                // User is already registered as a parent
                const parentRegistrations = parentQuery.docs.map(doc => doc.data());
                const studentNamesList = parentRegistrations.map(p => {
                    // Use Khmer name if available, otherwise use English name
                    const displayName = p.studentKhmerName || p.studentName;
                    return `• ${displayName}`;
                }).join('\n');
                
                await bot.sendMessage(chatId, 
                    `👋 សួស្តីបង! បងបានចុះឈ្មោះទទួលការជូនដំណឹងរួចរាល់ហើយសម្រាប់៖\n\n` +
                    `👤 **សិស្ស:**\n${studentNamesList}\n\n` +
                    `📚 **សេវាកម្មដែលមាន:**\n` +
                    `• ការជូនដំណឹងវត្តមាន\n` +
                    `• ការជូនដំណឹងពេលសិស្សសុំច្បាប់\n` +
                    `• ពិនិត្យស្ថានភាពបង់ថ្លៃសិក្សា\n` +
                    `• មើលលទ្ធផលប្រលង\n\n` +
                    `ប្រសិនបើបងត្រូវការចុះឈ្មោះសម្រាប់សិស្សបន្ថែម សូមស្នើសុំតំណចុះឈ្មោះថ្មីពីសាលា។\n\n` +
                    `🤖 នេះគ្រាន់តែជា Bot ធម្មតា។ ប្រសិនបើត្រូវការជំនួយផ្ទាល់ខ្លួន សូមទាក់ទង \\@RodwellLC076`,
                    { parse_mode: 'Markdown' }
                );
                return res.status(200).send('OK');
            }
            
            // Not registered yet - send welcome message
            await bot.sendMessage(chatId, 
                `👋 សួស្តីបង! ចូលមកកាន់ប្រព័ន្ធជូនដំណឹងវត្តមានសាលា Rodwell។\n\n` +
                `🔍 បងមិនទាន់បានចុះឈ្មោះទទួលការជូនដំណឹងអំពីកូនរបស់បងនៅឡើយទេ។\n\n` +
                `ដើម្បីចុះឈ្មោះទទួលការជូនដំណឹងអំពីវត្តមាន និងការស្នើសុំការអនុញ្ញាតរបស់កូន៖\n` +
                `1. ទាក់ទងសាលារបស់កូនរបស់បង\n` +
                `2. ស្នើសុំតំណចុះឈ្មោះសម្រាប់ម្តាយឪពុក\n` +
                `3. ចុចតំណដើម្បីចុះឈ្មោះ\n\n` +
                `📚 បន្ទាប់ពីចុះឈ្មោះ បងនឹងទទួលបានការជូនដំណឹងនៅពេល៖\n` +
                `• កូនរបស់បងមកដល់សាលា\n` +
                `• កូនរបស់បងស្នើសុំការអនុញ្ញាតចាកចេញមុន\n` +
                `• ការស្នើសុំអនុញ្ញាតត្រូវបានយល់ព្រម ឬបដិសេធ\n` +
                `• ពិនិត្យស្ថានភាពបង់ថ្លៃសិក្សារបស់កូន\n` +
                `• មើលលទ្ធផលប្រលងរបស់កូន\n\n` +
                `🤖 នេះគ្រាន់តែជា Bot ធម្មតា។ ប្រសិនបើត្រូវការជំនួយផ្ទាល់ខ្លួន សូមទាក់ទង \\@RodwellLC076`,
                { parse_mode: 'Markdown' }
            );
        } else if (text === '/parent' || text === '/parentinfo') {
            await handleParentInfoCommand(bot, chatId, userId);
        } else if (text === '/check_mock_exam_result') {
            await handleMockExamResultDeepLink(bot, chatId, userId, 'check_mock_exam_result');
        } else if (text === '/payment') {
            await handlePaymentStatusCommand(bot, chatId, userId);
        } else if (text === '/help') {
            await bot.sendMessage(chatId, 
                `📖 *ជំនួយប្រព័ន្ធជូនដំណឹងវត្តមាន*\n\n` +
                `🔸 */start* - ចាប់ផ្តើម ឬពិនិត្យស្ថានភាពចុះឈ្មោះ\n` +
                `🔸 */parent* - មើលពត៌មានការចុះឈ្មោះរបស់បង\n` +
                `🔸 */payment* - ពិនិត្យស្ថានភាពបង់ថ្លៃសិក្សារបស់កូន\n` +
                `🔸 */check\_mock\_exam\_result* - មើលលទ្ធផលប្រលងរបស់កូន\n` +
                `🔸 */help* - បង្ហាញមេនុយជំនួយនេះ\n\n` +
                `💡 ប្រសិនបើបងមានបញ្ហា សូមទាក់ទងអ្នកគ្រប់គ្រងសាលា។`,
                { parse_mode: 'Markdown' }
            );
        } else {
            // Send helpful message for unrecognized commands
            await bot.sendMessage(chatId, 
                `ខ្ញុំមិនយល់ពាក្យបញ្ជានេះទេ។ សូមវាយ /help ដើម្បីមើលពាក្យបញ្ជាដែលអាចប្រើបាន។`
            );
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Error processing parent webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});

/**
 * [Callable Function]
 * Set up Telegram webhook for the parent bot
 */
exports.setupParentBotWebhook = onCall({
    region: "asia-southeast1",
    secrets: ["TELEGRAM_PARENT_BOT_TOKEN"]
}, async (request) => {
    try {
        const bot = initializeParentBot();
        if (!bot) {
            throw new HttpsError('internal', 'Parent bot not initialized');
        }

        // Get the webhook URL for the parent bot
        const webhookUrl = `https://asia-southeast1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/parentBotWebhook`;
        
        // Set the webhook
        const response = await bot.setWebHook(webhookUrl);
        
        console.log('Parent bot webhook setup result:', response);
        
        // Get webhook info to verify
        const webhookInfo = await bot.getWebHookInfo();
        
        return {
            success: true,
            webhookUrl: webhookUrl,
            webhookInfo: webhookInfo
        };
        
    } catch (error) {
        console.error('Error setting up parent webhook:', error);
        throw new HttpsError('internal', `Failed to setup parent webhook: ${error.message}`);
    }
});

/**
 * Handle /parent or /parentinfo command - show parent registration status
 */
const handleParentInfoCommand = async (bot, chatId, userId) => {
    try {
        // Check if this user is registered as a parent
        const parentQuery = await db.collection('parentNotifications')
            .where('telegramUserId', '==', userId.toString())
            .where('isActive', '==', true)
            .get();
        
        if (parentQuery.empty) {
            await bot.sendMessage(chatId, 
                `👋 Hello!\n\n` +
                `🔍 You are not currently registered to receive parent notifications.\n\n` +
                `To register for notifications about your child's attendance and permissions:\n` +
                `1. Contact your child's school\n` +
                `2. Ask for a parent registration link\n` +
                `3. Click the link to register\n\n` +
                `📚 This bot sends notifications when:\n` +
                `• Your child arrives at school\n` +
                `• Your child requests permission to leave early\n` +
                `• Permission requests are approved or denied`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
        
        // User is registered as a parent - show their registrations
        const parentRegistrations = parentQuery.docs.map(doc => {
            const data = doc.data();
            return `👤 **${data.studentKhmerName || data.studentName}**\n` +
                   `   🏫 ថ្នាក់: ${formatClassInKhmer(data.studentClass)}\n` +
                   `   ⏰ វេន: ${data.studentShift || 'មិនបានបញ្ជាក់'}\n` +
                   `   📅 ចុះឈ្មោះ: ${data.registeredAt.toDate().toLocaleDateString()}`;
        });
        
        const message = `👋 ស្ថានភាពជូនដំណឹងម្តាយឪពុក\n\n` +
                       `✅ បងបានចុះឈ្មោះទទួលការជូនដំណឹងសម្រាប់៖\n\n` +
                       `${parentRegistrations.join('\n\n')}\n\n` +
                       `📱 **បងនឹងទទួលបានការជូនដំណឹងនៅពេល៖**\n` +
                       `• កូនរបស់បងមកដល់សាលា\n` +
                       `• កូនរបស់បងស្នើសុំការអនុញ្ញាតចាកចេញមុន\n` +
                       `• ការស្នើសុំអនុញ្ញាតត្រូវបានយល់ព្រម ឬបដិសេធ\n\n` +
                       `ត្រូវការចុះឈ្មោះសម្រាប់សិស្សបន្ថែមទៀត? ទាក់ទងសាលាសម្រាប់តំណចុះឈ្មោះថ្មី។`;
        
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Error in handleParentInfoCommand:', error);
        await bot.sendMessage(chatId, "❌ An error occurred while checking your parent registration status.");
    }
};

/**
 * Handle /payment command - show payment status for all registered children
 */
const handlePaymentStatusCommand = async (bot, chatId, userId) => {
    try {
        // Check if this user is registered as a parent
        const parentQuery = await db.collection('parentNotifications')
            .where('telegramUserId', '==', userId.toString())
            .where('isActive', '==', true)
            .get();
        
        if (parentQuery.empty) {
            await bot.sendMessage(chatId, 
                `🔍 បងមិនទាន់បានចុះឈ្មោះទទួលការជូនដំណឹងអំពីកូនរបស់បងនៅឡើយទេ។\n\n` +
                `ដើម្បីពិនិត្យស្ថានភាពបង់ថ្លៃសិក្សា សូមចុះឈ្មោះជាមុនសិន។\n\n` +
                `វាយ /start ដើម្បីចាប់ផ្តើម។`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
        
        let paymentInfo = `💰 **ស្ថានភាពបង់ថ្លៃសិក្សា**\n\n`;
        
        for (const doc of parentQuery.docs) {
            const parentData = doc.data();
            const studentId = parentData.studentId;
            const studentName = parentData.studentKhmerName || parentData.studentName;
            const studentClass = parentData.studentClass;
            
            try {
                // Query for the latest transaction record for this student
                console.log(`Querying transactions for studentId: ${studentId}`);
                const paymentQuery = await db.collection('transactions')
                    .where('studentId', '==', studentId)
                    .orderBy('date', 'desc')
                    .limit(1)
                    .get();
                
                console.log(`Payment query result for ${studentId}: ${paymentQuery.empty ? 'EMPTY' : 'FOUND ' + paymentQuery.docs.length + ' records'}`);
                
                let paymentStatus, paymentResult, lastPaymentMonth = null, latestPaymentData = null;
                
                if (!paymentQuery.empty) {
                    latestPaymentData = paymentQuery.docs[0].data();
                    console.log(`Latest payment data for ${studentId}:`, latestPaymentData);
                    
                    // Handle paymentMonth format (e.g., "August 2025")
                    if (latestPaymentData.paymentMonth) {
                        // Convert "August 2025" to "2025-08" format
                        const monthNames = {
                            'January': '01', 'February': '02', 'March': '03', 'April': '04',
                            'May': '05', 'June': '06', 'July': '07', 'August': '08',
                            'September': '09', 'October': '10', 'November': '11', 'December': '12'
                        };
                        
                        const parts = latestPaymentData.paymentMonth.split(' ');
                        if (parts.length === 2) {
                            const monthName = parts[0];
                            const year = parts[1];
                            const monthNumber = monthNames[monthName];
                            if (monthNumber) {
                                lastPaymentMonth = `${year}-${monthNumber}`;
                                console.log(`Converted paymentMonth "${latestPaymentData.paymentMonth}" to "${lastPaymentMonth}"`);
                            }
                        }
                    }
                }
                
                // Calculate payment status using our logic
                paymentResult = calculatePaymentStatus(lastPaymentMonth);
                paymentStatus = paymentResult.status;
                
                // Format payment status with appropriate emoji
                let statusEmoji = '';
                let statusText = getPaymentStatusDisplayText(paymentStatus);
                
                switch (paymentStatus) {
                    case 'paid':
                        statusEmoji = '✅';
                        break;
                    case 'unpaid':
                        statusEmoji = '❌';
                        break;
                    case 'no-record':
                        statusEmoji = '⚠️';
                        break;
                    default:
                        statusEmoji = '❓';
                }
                
                // Get pricing information for unpaid/no-record statuses
                let pricingInfo = null;
                if (paymentStatus === 'unpaid' || paymentStatus === 'no-record') {
                    pricingInfo = await getClassPricing(studentClass);
                    console.log(`Pricing info for ${studentName}:`, pricingInfo);
                }
                
                paymentInfo += `👤 **${studentName}**\n`;
                paymentInfo += `🏫 ${formatClassInKhmer(studentClass)}\n`;
                
                // Show status with amount for paid status
                if (paymentStatus === 'paid' && latestPaymentData && latestPaymentData.amount) {
                    const formattedAmount = new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                    }).format(latestPaymentData.amount);
                    paymentInfo += `${statusEmoji} **ស្ថានភាព:** ${statusText} (${formattedAmount})\n`;
                } else {
                    paymentInfo += `${statusEmoji} **ស្ថានភាព:** ${statusText}\n`;
                    
                    // Show required payment amount for unpaid/no-record statuses
                    if ((paymentStatus === 'unpaid' || paymentStatus === 'no-record') && pricingInfo && pricingInfo.price) {
                        const formattedPrice = new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                        }).format(pricingInfo.price);
                        paymentInfo += `💵 **ចំនួនទឹកប្រាក់ត្រូវបង់:** ${formattedPrice}\n`;
                    }
                }
                
                if (lastPaymentMonth) {
                    paymentInfo += `📅 **ការបង់ចុងក្រោយ:** ${formatPaymentMonthInKhmer(lastPaymentMonth)}\n`;
                } else {
                    paymentInfo += `📅 **ការបង់ចុងក្រោយ:** មិនមានកំណត់ត្រា\n`;
                }
                
                // Add explanation based on status
                if (paymentStatus === 'unpaid' && lastPaymentMonth) {
                    paymentInfo += `💡 **ចំណាំ:** ការបង់ថ្លៃមិនទាន់បានដោះស្រាយ`;
                    if (pricingInfo && pricingInfo.price) {
                        const formattedPrice = new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                        }).format(pricingInfo.price);
                        paymentInfo += ` - សូមបង់ ${formattedPrice}`;
                    }
                    paymentInfo += `\n`;
                } else if (paymentStatus === 'unpaid' && !lastPaymentMonth) {
                    paymentInfo += `💡 **ចំណាំ:** ការបង់ថ្លៃមិនទាន់បានដោះស្រាយ`;
                    if (pricingInfo && pricingInfo.price) {
                        const formattedPrice = new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                        }).format(pricingInfo.price);
                        paymentInfo += ` - សូមបង់ ${formattedPrice}`;
                    }
                    paymentInfo += `\n`;
                } else if (paymentStatus === 'no-record') {
                    paymentInfo += `💡 **ចំណាំ:** មិនមានកំណត់ត្រាការបង់ថ្លៃ`;
                    if (pricingInfo && pricingInfo.price) {
                        const formattedPrice = new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                        }).format(pricingInfo.price);
                        paymentInfo += ` - សូមបង់ ${formattedPrice}`;
                    }
                    paymentInfo += `\n`;
                } else if (paymentStatus === 'paid') {
                    paymentInfo += `💡 **ចំណាំ:** ការបង់ថ្លៃគ្រប់គ្រាន់សម្រាប់ខែនេះ\n`;
                }
                
                paymentInfo += `\n`;
                
            } catch (paymentError) {
                console.error(`Error fetching payment for student ${studentId}:`, paymentError);
                paymentInfo += `👤 **${studentName}**\n`;
                paymentInfo += `🏫 ${formatClassInKhmer(studentClass)}\n`;
                paymentInfo += `❓ **ស្ថានភាព:** មិនអាចពិនិត្យបាន\n`;
                paymentInfo += `💡 **ចំណាំ:** បញ្ហាក្នុងការទាញយកទិន្នន័យ\n\n`;
            }
        }
        
        await bot.sendMessage(chatId, paymentInfo, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Error in handlePaymentStatusCommand:', error);
        await bot.sendMessage(chatId, "❌ មានកំហុសក្នុងការពិនិត្យស្ថានភាពបង់ថ្លៃសិក្សា។ សូមព្យាយាមម្តងទៀតក្រោយមួយរំពេច។");
    }
};

/**
 * Handle /start command for parent registration
 */
const handleParentStartCommand = async (bot, chatId, userId, token) => {
    try {
        logger.info(`Parent registration attempt with token: ${token} for chatId: ${chatId}`);
        
        // Extract student ID from token
        const decodedToken = Buffer.from(token.replace('parent_', ''), 'base64').toString();
        const studentId = decodedToken.split('_')[1];
        
        if (!studentId) {
            await bot.sendMessage(chatId, "❌ ថូខនិងចុះឈ្មោះមិនត្រឹមត្រូវ។ សូមស្នើសុំតំណថ្មីពីសាលារបស់កូនរបស់បង។");
            return;
        }

        // Get student information
        const studentDoc = await db.collection('students').doc(studentId).get();
        if (!studentDoc.exists) {
            await bot.sendMessage(chatId, "❌ រកមិនឃើញសិស្ស។ សូមទាក់ទងសាលាសម្រាប់ជំនួយ។");
            return;
        }

        const student = studentDoc.data();
        
        // Store parent-student relationship
        const parentData = {
            chatId: chatId.toString(),
            telegramUserId: userId.toString(),
            studentId: studentId,
            studentName: student.fullName || 'Unknown Student',
            studentKhmerName: student.khmerName || student.fullNameKhmer || student.nameKhmer || null, // Try different possible field names
            studentClass: student.class || '',
            studentShift: student.shift || '',
            classStartTime: student.startTime || null, // Add class start time from student data
            registeredAt: admin.firestore.Timestamp.now(),
            isActive: true
        };

        await db.collection('parentNotifications').doc(`${studentId}_${chatId}`).set(parentData);
        
        // Send welcome message
        const welcomeMessage = `🎉 សូមស្វាគមន៍! បងបានចុះឈ្មោះដោយជោគជ័យដើម្បីទទួលបានការជូនដំណឹងសម្រាប់៖

👤 **សិស្ស:** ${student.fullName}
🏫 **ថ្នាក់:** ${student.class || 'មិនបានបញ្ជាក់'}
⏰ **វេន:** ${student.shift || 'មិនបានបញ្ជាក់'}

បងនឹងទទួលបានការជូនដំណឹងនៅពេល៖
✅ កូនរបស់បងមកដល់សាលា
📝 កូនរបស់បងស្នើសុំការអនុញ្ញាតចាកចេញមុន
🚪 ការស្នើសុំអនុញ្ញាតរបស់កូនរបស់បងត្រូវបានយល់ព្រម/បដិសេធ

វាយ /help ដើម្បីមើលពាក្យបញ្ជាដែលអាចប្រើបាន។`;

        await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
        
        logger.info(`Parent successfully registered for student ${studentId}`);
        
    } catch (error) {
        logger.error('Error in parent registration:', error);
        await bot.sendMessage(chatId, "❌ ការចុះឈ្មោះបានបរាជ័យ។ សូមព្យាយាមម្តងទៀត ឬទាក់ទងការគាំទ្រ​សាលា។");
    }
};

/**
 * Handle mock exam result deep link
 */
const handleMockExamResultDeepLink = async (bot, chatId, userId, deepLinkParam) => {
    try {
        logger.info(`Mock exam deep link accessed: ${deepLinkParam} by user ${userId} in chat ${chatId}`);
        
        // Check if this user is registered as a parent
        const parentQuery = await db.collection('parentNotifications')
            .where('telegramUserId', '==', userId.toString())
            .where('isActive', '==', true)
            .get();
        
        if (parentQuery.empty) {
            await bot.sendMessage(chatId, 
                `❌ សូមទោស!\n\n` +
                `បងមិនទាន់បានចុះឈ្មោះជាម្តាយឪពុកនៅឡើយទេ។ សូមចុះឈ្មោះជាមុនសិនដើម្បីមើលលទ្ធផលប្រលងរបស់កូន។\n\n` +
                `ទាក់ទងសាលាសម្រាប់ការចុះឈ្មោះ។`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // Get all students this parent is registered for
        const parentRegistrations = parentQuery.docs.map(doc => doc.data());
        const studentIds = parentRegistrations.map(p => p.studentId);
        
        // Query examControls collection for ready exams
        const examQuery = await db.collection('examControls')
            .where('isReadyForStudent', '==', true)
            .get();

        if (examQuery.empty) {
            await bot.sendMessage(chatId, 
                `📚 **លទ្ធផលប្រលង**\n\n` +
                `🔍 ប្រលងណាមួយមិនទាន់មានលទ្ធផលនៅឡើយទេ...\n\n` +
                `សូមរង់ចាំការជូនដំណឹងពីសាលានៅពេលលទ្ធផលត្រៀមរួចរាល់។`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // Create inline keyboard with available exams
        const examButtons = [];
        examQuery.docs.forEach(doc => {
            const examData = doc.data();
            const examNameKhmer = examData.nameKhmer || examData.name || 'ប្រលងមិនដឹងឈ្មោះ';
            examButtons.push([{
                text: examNameKhmer,
                callback_data: `exam_result_${doc.id}`
            }]);
        });

        const options = {
            reply_markup: {
                inline_keyboard: examButtons
            }
        };

        await bot.sendMessage(chatId, 
            `📚 **លទ្ធផលប្រលងដែលមាន**\n\n` +
            `សូមជ្រើសរើសប្រលងដែលបងចង់មើលលទ្ធផល៖`,
            options
        );

    } catch (error) {
        logger.error('Error in handleMockExamResultDeepLink:', error);
        await bot.sendMessage(chatId, "❌ មានបញ្ហាក្នុងការទាញយកលទ្ធផលប្រលង។ សូមព្យាយាមម្តងទៀត។");
    }
};

/**
 * Handle callback queries for parent bot (exam selection)
 */
const handleParentCallbackQuery = async (bot, callbackQuery) => {
    try {
        const chatId = callbackQuery.message.chat.id;
        const userId = callbackQuery.from.id;
        const data = callbackQuery.data;
        const messageId = callbackQuery.message.message_id;

        console.log(`Parent callback query from chatId ${chatId}: ${data}`);

        // Answer the callback query to remove loading state
        await bot.answerCallbackQuery(callbackQuery.id);

        if (data.startsWith('exam_result_')) {
            await handleExamResultSelection(bot, chatId, userId, messageId, data);
        }

    } catch (error) {
        console.error('Error handling parent callback query:', error);
        await bot.answerCallbackQuery(callbackQuery.id, { 
            text: "❌ មានបញ្ហាក្នុងការដំណើរការ។ សូមព្យាយាមម្តងទៀត។", 
            show_alert: true 
        });
    }
};

/**
 * Handle exam result selection
 */
const handleExamResultSelection = async (bot, chatId, userId, messageId, callbackData) => {
    try {
        // Extract exam ID from callback data
        const examId = callbackData.replace('exam_result_', '');
        
        // Get exam details
        const examDoc = await db.collection('examControls').doc(examId).get();
        
        if (!examDoc.exists) {
            await bot.editMessageText(
                `❌ **បញ្ហា**\n\nរកមិនឃើញប្រលងនេះ។ សូមព្យាយាមម្តងទៀត។`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown'
                }
            );
            return;
        }

        const examData = examDoc.data();
        const examNameKhmer = examData.nameKhmer || examData.name || 'ប្រលងមិនដឹងឈ្មោះ';

        // For now, return dummy text as requested
        await bot.editMessageText(
            `📊 **លទ្ធផលប្រលង: ${examNameKhmer}**\n\n` +
            `🎯 នេះគឺជាទិន្នន័យសាកល្បង (Dummy Data)\n\n` +
            `📈 **ព័ត៌មានលទ្ធផល:**\n` +
            `• ពិន្ទុសរុប: ៨៥/១០០\n` +
            `• ចំណាត់ថ្នាក់: A\n` +
            `• ចំណាត់ថ្នាក់ក្នុងថ្នាក់: ៣/៤០\n` +
            `• មតិយោបល់: សម្តែងបានល្អ\n\n` +
            `📝 *ទិន្នន័យពិតប្រាកដនឹងត្រូវបានបន្ថែមនៅពេលក្រោយ*`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
            }
        );

        logger.info(`Exam result ${examId} accessed by parent ${userId} for exam: ${examNameKhmer}`);

    } catch (error) {
        logger.error('Error handling exam result selection:', error);
        await bot.editMessageText(
            `❌ **មានបញ្ហា**\n\nមិនអាចទាញយកលទ្ធផលប្រលងបានទេ។ សូមព្យាយាមម្តងទៀត។`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
            }
        );
    }
};

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
                // Update user state for password setup (direct to password input)
                await db.collection("telegramUserStates").doc(chatId.toString()).set({
                    userId: userId,
                    chatId: chatId,
                    state: "waiting_custom_password_initial",
                    studentId: existingUser.docs[0].id,
                    timestamp: FieldValue.serverTimestamp()
                });

                await bot.sendMessage(chatId, 
                    `✅ Account found!\n\n` +
                    `👋 Welcome back ${studentData.fullName || 'Student'}!\n\n` +
                    `🔐 **Complete Your Setup: Set Your Password**\n\n` +
                    `Please enter your new password. It must meet these requirements:\n` +
                    `• At least 8 characters long\n` +
                    `• Contains uppercase letters (A-Z)\n` +
                    `• Contains lowercase letters (a-z)\n\n` +
                    `Type your password in the next message. You'll get an option to delete the password message after processing for security.\n\n` +
                    `📱 You'll use your phone (${studentData.phone}) and password to login at:\n` +
                    `🌐 **portal.rodwell.center/login\n\n` +
                    `Type /cancel to cancel this operation.`
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

        if (data === "delete_password_message") {
            await handleDeletePasswordMessage(bot, chatId, messageId);
        } else if (data.startsWith("delete_password_message_")) {
            // Extract the password message ID from the callback data
            const passwordMessageId = data.split("delete_password_message_")[1];
            await handleDeletePasswordMessage(bot, chatId, parseInt(passwordMessageId));
        } else if (data === "change_custom_password") {
            await handleChangeCustomPassword(bot, chatId, userId, messageId);
        } else if (data === "cancel_password_change") {
            await handleCancelPasswordChange(bot, chatId, messageId);
        } else if (data === "manual_token_entry") {
            await handleManualTokenEntry(bot, chatId, userId, messageId);
        } else if (data === "scan_qr_again") {
            await handleScanQRAgain(bot, chatId, userId, messageId);
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
        } else if (state.state === "waiting_manual_token") {
            await handleManualTokenInput(bot, chatId, userId, text.trim(), messageId);
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
            'Type your password in the next message. You\'ll get an option to delete the password message after processing for security.\n\n' +
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
 * Handle manual token entry button
 */
const handleManualTokenEntry = async (bot, chatId, userId, messageId) => {
    try {
        // Update user state for manual token input
        await db.collection("telegramUserStates").doc(chatId.toString()).set({
            userId: userId,
            chatId: chatId,
            state: "waiting_manual_token",
            messageIdToEdit: messageId,
            timestamp: FieldValue.serverTimestamp()
        });

        await bot.editMessageText(
            `✏️ **Manual Token Entry**\n\n` +
            `Please type your 16-character registration token.\n\n` +
            `**Format:** XXXXXXXXXXXXXXXX\n` +
            `**Example:** N2LAAV2BU2YTWNXQ\n\n` +
            `The token should be exactly 16 characters long and contain only uppercase letters and numbers.\n\n` +
            `Type /cancel to cancel this operation.`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
            }
        );

    } catch (error) {
        console.error('Error setting up manual token entry:', error);
        await bot.editMessageText("❌ Failed to set up manual entry. Please try again.", {
            chat_id: chatId,
            message_id: messageId
        });
    }
};

/**
 * Handle scan QR again button
 */
const handleScanQRAgain = async (bot, chatId, userId, messageId) => {
    try {
        // Reset user state to waiting for token
        await db.collection("telegramUserStates").doc(chatId.toString()).set({
            userId: userId,
            chatId: chatId,
            state: "waiting_token",
            timestamp: FieldValue.serverTimestamp()
        });

        await bot.editMessageText(
            `🔄 **Scan QR Code Again**\n\n` +
            `Please:\n` +
            `1. Get a new receipt with QR code from your teacher\n` +
            `2. Scan the QR code with your phone camera\n` +
            `3. Send the token here\n\n` +
            `**Or type your token directly if you have it.**\n\n` +
            `Type /cancel to cancel registration.`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
            }
        );

    } catch (error) {
        console.error('Error setting up QR scan again:', error);
        await bot.editMessageText("❌ Failed to reset. Please try /start again.", {
            chat_id: chatId,
            message_id: messageId
        });
    }
};

/**
 * Handle manual token input from user
 */
const handleManualTokenInput = async (bot, chatId, userId, token, messageId) => {
    try {
        // Delete the message containing the token immediately for security
        try {
            await bot.deleteMessage(chatId, messageId);
        } catch (deleteError) {
            console.warn('Could not delete token message:', deleteError.message);
        }

        // Validate token format
        const cleanToken = token.trim().toUpperCase();
        
        if (!cleanToken || cleanToken.length !== 16) {
            await bot.sendMessage(chatId, 
                `❌ **Invalid token format.**\n\n` +
                `The token must be exactly 16 characters long.\n\n` +
                `**Your token:** "${token}" (${token.length} characters)\n\n` +
                `Please try again with the correct format, or type /cancel to cancel.`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // Validate token contains only allowed characters
        const allowedChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
        if (!allowedChars.test(cleanToken)) {
            await bot.sendMessage(chatId, 
                `❌ **Invalid token characters.**\n\n` +
                `The token can only contain uppercase letters and numbers.\n\n` +
                `**Allowed:** A-Z (except I, O) and 2-9\n` +
                `**Your token:** "${cleanToken}"\n\n` +
                `Please check and try again, or type /cancel to cancel.`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // Get the original message ID to edit
        const stateDoc = await db.collection("telegramUserStates").doc(chatId.toString()).get();
        const originalMessageId = stateDoc.exists ? stateDoc.data().messageIdToEdit : null;

        // Send processing message
        const processingMsg = await bot.sendMessage(chatId, 
            `🔍 **Processing Token...**\n\n` +
            `Token: \`${cleanToken}\`\n\n` +
            `Please wait while we verify your token.`,
            { parse_mode: 'Markdown' }
        );

        // Process the token (reuse existing logic)
        await handleTokenInput(bot, chatId, userId, cleanToken);

        // Clean up the processing message
        try {
            await bot.deleteMessage(chatId, processingMsg.message_id);
        } catch (deleteError) {
            console.warn('Could not delete processing message:', deleteError.message);
        }

        // If we have the original message ID, try to clean it up too
        if (originalMessageId) {
            try {
                await bot.editMessageText(
                    `✅ **Token Processed**\n\n` +
                    `Your token has been submitted for processing.`,
                    {
                        chat_id: chatId,
                        message_id: originalMessageId,
                        parse_mode: 'Markdown'
                    }
                );
            } catch (editError) {
                console.warn('Could not edit original message:', editError.message);
            }
        }

    } catch (error) {
        console.error('Error handling manual token input:', error);
        await bot.sendMessage(chatId, "❌ Failed to process token. Please try again or use /start to restart.");
    }
};

/**
 * Handle custom password input during initial registration
npm */
const handleCustomPasswordInputInitial = async (bot, chatId, userId, password, messageId) => {
    try {
        console.log(`handleCustomPasswordInputInitial called for chatId ${chatId}`);
        
        // Validate password strength first
        const validation = validatePasswordStrength(password);
        
        if (!validation.valid) {
            // Delete the password message for security if validation fails
            try {
                await bot.deleteMessage(chatId, messageId);
            } catch (deleteError) {
                console.warn('Could not delete password message:', deleteError.message);
            }
            
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

        // Validate required fields (studentId is required, originalMessageId is optional for direct input)
        if (!studentId) {
            console.error(`Missing required state field for chatId ${chatId}: studentId=${studentId}`);
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

        // Send success message with option to delete the password message
        const successMessage = 
            `✅ **Custom Password Set Successfully!**\n\n` +
            `🔐 Your password has been securely saved.\n\n` +
            `📱 **Login Information:**\n` +
            `• Website: **portal.rodwell.center/login\n` +
            `• Phone: Use your registered phone number\n` +
            `• Password: Use your custom password\n\n` +
            `� Use /changepassword anytime to change your password.`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "�️ Delete Password Message", callback_data: `delete_password_message_${messageId}` }
                    ]
                ]
            }
        };

        if (originalMessageId) {
            // Edit the original message if we have the ID
            await bot.editMessageText(successMessage, {
                chat_id: chatId,
                message_id: originalMessageId,
                parse_mode: 'Markdown',
                reply_markup: options.reply_markup
            });
        } else {
            // Send a new message if we don't have the original message ID
            await bot.sendMessage(chatId, successMessage, { 
                parse_mode: 'Markdown',
                reply_markup: options.reply_markup
            });
        }

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
        // Validate password strength first
        const validation = validatePasswordStrength(password);
        
        if (!validation.valid) {
            // Delete the password message for security if validation fails
            try {
                await bot.deleteMessage(chatId, messageId);
            } catch (deleteError) {
                console.warn('Could not delete password message:', deleteError.message);
            }
            
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

        // Send success message with option to delete the password message
        const successMessage = 
            `✅ **Password Changed Successfully!**\n\n` +
            `🔐 Your new custom password has been securely saved.\n\n` +
            `📱 **Login Information:**\n` +
            `• Website: **portal.rodwell.center/login\n` +
            `• Phone: Use your registered phone number\n` +
            `• Password: Use your new custom password\n\n` +
            `� Use /changepassword anytime to change your password.`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "🗑️ Delete Password Message", callback_data: `delete_password_message_${messageId}` }
                    ]
                ]
            }
        };

        // Edit the original message to confirm success
        await bot.editMessageText(successMessage, {
            chat_id: chatId,
            message_id: originalMessageId,
            parse_mode: 'Markdown',
            reply_markup: options.reply_markup
        });

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
            const options = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✏️ Type Token Manually", callback_data: "manual_token_entry" }
                        ],
                        [
                            { text: "🔄 Scan QR Again", callback_data: "scan_qr_again" }
                        ]
                    ]
                }
            };

            await bot.sendMessage(chatId, 
                `❌ Invalid token.\n\n` +
                `This token was not found in our system.\n\n` +
                `**What would you like to do?**\n\n` +
                `✏️ **Type Token Manually** - Enter your 16-character token\n` +
                `🔄 **Scan QR Again** - Get a new QR code from teacher\n\n` +
                `**Or simply send your token directly:**`,
                options
            );
            return;
        }

        const tempTokenData = tempTokenDoc.data();
        
        // Check if token has expired
        if (new Date() > tempTokenData.expiresAt.toDate()) {
            // Clean up expired token
            await tempTokenDoc.ref.delete();
            await bot.sendMessage(chatId, 
                `❌ Token expired.\n\n` +
                `This token has passed its expiration date.\n\n` +
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

        // Update user state for direct password setup (no buttons)
        await db.collection("telegramUserStates").doc(chatId.toString()).set({
            userId: userId,
            chatId: chatId,
            state: "waiting_custom_password_initial",
            studentId: tempTokenData.studentId,
            timestamp: FieldValue.serverTimestamp()
        });

        await bot.sendMessage(chatId, 
            `👋 Welcome ${studentData.fullName || 'Student'}!\n\n` +
            `🔐 **Complete Your Setup: Set Your Password**\n\n` +
            `Please enter your new password. It must meet these requirements:\n` +
            `• At least 8 characters long\n` +
            `• Contains uppercase letters (A-Z)\n` +
            `• Contains lowercase letters (a-z)\n\n` +
            `Type your password in the next message. You'll get an option to delete the password message after processing for security.\n\n` +
            `📱 You'll use your phone (${studentData.phone}) and password to login at:\n` +
            `🌐 **portal.rodwell.center/login\n\n` +
            `Type /cancel to cancel this operation.`
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

        // Update user state for direct password setup (no buttons)
        await db.collection("telegramUserStates").doc(chatId.toString()).set({
            userId: userId,
            chatId: chatId,
            state: "waiting_custom_password_initial",
            studentId: studentDoc.id,
            timestamp: FieldValue.serverTimestamp()
        });

        await bot.sendMessage(chatId, 
            `✅ Registration successful!\n\n` +
            `👋 Welcome ${studentData.fullName || username}!\n\n` +
            `🔐 **Complete Your Setup: Set Your Password**\n\n` +
            `Please enter your new password. It must meet these requirements:\n` +
            `• At least 8 characters long\n` +
            `• Contains uppercase letters (A-Z)\n` +
            `• Contains lowercase letters (a-z)\n\n` +
            `Type your password in the next message. You'll get an option to delete the password message after processing for security.\n\n` +
            `📱 You'll use your phone (${studentData.phone}) and password to login at:\n` +
            `🌐 **portal.rodwell.center/login\n\n` +
            `Type /cancel to cancel this operation.`
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
            `🌐 **portal.rodwell.center/login\n\n` +
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
                
                // Perform data migration for manual attendance records (first-time authUid creation)
                try {
                    const migrationResult = await migrateManualAttendanceRecords(studentData.fullName, authUid);
                    console.log(`Migration result for student ${studentDoc.id} (phone auth):`, migrationResult);
                } catch (migrationError) {
                    console.error(`Migration failed for student ${studentDoc.id} (phone auth):`, migrationError);
                    // Migration failure shouldn't prevent authentication
                }
                
                // Fix all attendance records for this student by adding authUid
                try {
                    const fixResult = await fixAttendanceRecordsForStudent(studentDoc.id, authUid);
                    console.log(`Attendance fix result for student ${studentDoc.id} (phone auth):`, fixResult);
                } catch (fixError) {
                    console.error(`Attendance fix failed for student ${studentDoc.id} (phone auth):`, fixError);
                    // Fix failure shouldn't prevent authentication
                }
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
                    
                    // Perform data migration for manual attendance records (existing user found)
                    try {
                        const migrationResult = await migrateManualAttendanceRecords(studentData.fullName, authUid);
                        console.log(`Migration result for student ${studentDoc.id} (phone auth - existing user):`, migrationResult);
                    } catch (migrationError) {
                        console.error(`Migration failed for student ${studentDoc.id} (phone auth - existing user):`, migrationError);
                        // Migration failure shouldn't prevent authentication
                    }
                    
                    // Fix all attendance records for this student by adding authUid
                    try {
                        const fixResult = await fixAttendanceRecordsForStudent(studentDoc.id, authUid);
                        console.log(`Attendance fix result for student ${studentDoc.id} (phone auth - existing user):`, fixResult);
                    } catch (fixError) {
                        console.error(`Attendance fix failed for student ${studentDoc.id} (phone auth - existing user):`, fixError);
                        // Fix failure shouldn't prevent authentication
                    }
                } catch (findError) {
                    console.error("Error finding existing Firebase Auth user:", findError);
                    throw new HttpsError("internal", "Authentication service error. Please try again.");
                }
            }
        } else {
            // Update last login time
            await studentDoc.ref.update({ lastLoginAt: FieldValue.serverTimestamp() });
            
            // Fix all attendance records for this student by adding authUid (for existing users)
            try {
                const fixResult = await fixAttendanceRecordsForStudent(studentDoc.id, authUid);
                console.log(`Attendance fix result for student ${studentDoc.id} (phone auth - existing login):`, fixResult);
            } catch (fixError) {
                console.error(`Attendance fix failed for student ${studentDoc.id} (phone auth - existing login):`, fixError);
                // Fix failure shouldn't prevent authentication
            }
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
                
                // Perform data migration for manual attendance records (first-time authUid creation)
                try {
                    const migrationResult = await migrateManualAttendanceRecords(studentData.fullName, authUid);
                    console.log(`Migration result for student ${studentDoc.id} (username auth):`, migrationResult);
                } catch (migrationError) {
                    console.error(`Migration failed for student ${studentDoc.id} (username auth):`, migrationError);
                    // Migration failure shouldn't prevent authentication
                }
                
                // Fix all attendance records for this student by adding authUid
                try {
                    const fixResult = await fixAttendanceRecordsForStudent(studentDoc.id, authUid);
                    console.log(`Attendance fix result for student ${studentDoc.id} (username auth):`, fixResult);
                } catch (fixError) {
                    console.error(`Attendance fix failed for student ${studentDoc.id} (username auth):`, fixError);
                    // Fix failure shouldn't prevent authentication
                }
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
                    
                    // Perform data migration for manual attendance records (existing user found)
                    try {
                        const migrationResult = await migrateManualAttendanceRecords(studentData.fullName, authUid);
                        console.log(`Migration result for student ${studentDoc.id} (existing user):`, migrationResult);
                    } catch (migrationError) {
                        console.error(`Migration failed for student ${studentDoc.id} (existing user):`, migrationError);
                        // Migration failure shouldn't prevent authentication
                    }
                    
                    // Fix all attendance records for this student by adding authUid
                    try {
                        const fixResult = await fixAttendanceRecordsForStudent(studentDoc.id, authUid);
                        console.log(`Attendance fix result for student ${studentDoc.id} (username auth - existing user):`, fixResult);
                    } catch (fixError) {
                        console.error(`Attendance fix failed for student ${studentDoc.id} (username auth - existing user):`, fixError);
                        // Fix failure shouldn't prevent authentication
                    }
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
            
            // Fix all attendance records for this student by adding authUid (for existing users)
            try {
                const fixResult = await fixAttendanceRecordsForStudent(studentDoc.id, authUid);
                console.log(`Attendance fix result for student ${studentDoc.id} (username auth - existing login):`, fixResult);
            } catch (fixError) {
                console.error(`Attendance fix failed for student ${studentDoc.id} (username auth - existing login):`, fixError);
                // Fix failure shouldn't prevent authentication
            }
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

/**
 * [Callable Function] 
 * Manually trigger migration of attendance records for a specific student
 * This is an admin-only function for testing or handling edge cases
 */
exports.manuallyMigrateAttendanceRecords = onCall({
    region: "asia-southeast1",
    cors: true
}, async (request) => {
    // Check admin authentication
    if (!request.auth || !request.auth.token.isAdmin) {
        throw new HttpsError("unauthenticated", "Admin authentication is required.");
    }
    
    const { studentId, studentName } = request.data;
    
    if (!studentId && !studentName) {
        throw new HttpsError("invalid-argument", "Either studentId or studentName is required.");
    }
    
    try {
        let studentData;
        let studentDocId;
        
        if (studentId) {
            // Find student by ID
            const studentDoc = await db.collection("students").doc(studentId).get();
            if (!studentDoc.exists) {
                throw new HttpsError("not-found", `Student with ID ${studentId} not found.`);
            }
            studentData = studentDoc.data();
            studentDocId = studentDoc.id;
        } else {
            // Find student by name
            const studentQuery = await db.collection("students")
                .where("fullName", "==", studentName)
                .limit(1)
                .get();
            
            if (studentQuery.empty) {
                throw new HttpsError("not-found", `Student with name ${studentName} not found.`);
            }
            
            const studentDoc = studentQuery.docs[0];
            studentData = studentDoc.data();
            studentDocId = studentDoc.id;
        }
        
        if (!studentData.authUid) {
            throw new HttpsError("failed-precondition", `Student ${studentData.fullName} does not have an authUid. They need to sign up first.`);
        }
        
        // Perform migration
        const migrationResult = await migrateManualAttendanceRecords(studentData.fullName, studentData.authUid);
        
        return {
            success: true,
            studentId: studentDocId,
            studentName: studentData.fullName,
            authUid: studentData.authUid,
            migrationResult: migrationResult
        };
        
    } catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }
        console.error("Error in manual migration:", error);
        throw new HttpsError("internal", `Migration failed: ${error.message}`);
    }
});

/**
 * [Callable Function] 
 * Check migration status for manual attendance records
 * This helps admins see what records need migration and what has been migrated
 */
exports.checkAttendanceMigrationStatus = onCall({
    region: "asia-southeast1",
    cors: true
}, async (request) => {
    // Check admin authentication
    if (!request.auth || !request.auth.token.isAdmin) {
        throw new HttpsError("unauthenticated", "Admin authentication is required.");
    }
    
    const { studentName } = request.data;
    
    try {
        let results = {};
        
        if (studentName) {
            // Check for specific student
            const manualRecords = await db.collection("attendance")
                .where("authUid", "==", "manual-entry")
                .where("studentName", "==", studentName)
                .get();
            
            const migratedRecords = await db.collection("attendance")
                .where("studentName", "==", studentName)
                .where("migratedBy", "==", "automatic-migration")
                .get();
            
            results[studentName] = {
                manualRecordsCount: manualRecords.size,
                migratedRecordsCount: migratedRecords.size,
                manualRecords: manualRecords.docs.map(doc => ({
                    id: doc.id,
                    date: doc.data().date,
                    status: doc.data().status,
                    class: doc.data().class
                })),
                migratedRecords: migratedRecords.docs.map(doc => ({
                    id: doc.id,
                    date: doc.data().date,
                    status: doc.data().status,
                    migratedAt: doc.data().migratedAt,
                    originalAuthUid: doc.data().originalAuthUid
                }))
            };
        } else {
            // Get all manual entry records grouped by student name
            const allManualRecords = await db.collection("attendance")
                .where("authUid", "==", "manual-entry")
                .get();
            
            const studentStats = {};
            
            allManualRecords.docs.forEach(doc => {
                const data = doc.data();
                const name = data.studentName;
                
                if (!studentStats[name]) {
                    studentStats[name] = {
                        manualRecordsCount: 0,
                        dates: []
                    };
                }
                
                studentStats[name].manualRecordsCount++;
                studentStats[name].dates.push({
                    date: data.date,
                    status: data.status,
                    class: data.class
                });
            });
            
            results = {
                totalManualRecords: allManualRecords.size,
                studentsWithManualRecords: Object.keys(studentStats).length,
                studentBreakdown: studentStats
            };
        }
        
        return {
            success: true,
            results: results,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error("Error checking migration status:", error);
        throw new HttpsError("internal", `Failed to check migration status: ${error.message}`);
    }
});

/**
 * Migrates manual attendance records from "manual-entry" authUid to the student's actual authUid
 * This function is called when a student successfully links their account for the first time
 * @param {string} studentName - The full name of the student to search for
 * @param {string} newAuthUid - The new authUid to update the records with
 * @returns {Object} Migration results with counts of updated records
 */
async function migrateManualAttendanceRecords(studentName, newAuthUid) {
    try {
        console.log(`Starting migration for student: ${studentName} with new authUid: ${newAuthUid}`);
        
        // Query for attendance records with manual-entry authUid and matching student name
        const manualAttendanceQuery = await db.collection("attendance")
            .where("authUid", "==", "manual-entry")
            .where("studentName", "==", studentName)
            .get();
        
        if (manualAttendanceQuery.empty) {
            console.log(`No manual attendance records found for student: ${studentName}`);
            return { 
                success: true, 
                recordsFound: 0, 
                recordsUpdated: 0,
                message: "No manual attendance records found to migrate"
            };
        }
        
        console.log(`Found ${manualAttendanceQuery.docs.length} manual attendance records for ${studentName}`);
        
        // Use batch writes for better performance and atomicity
        const batch = db.batch();
        let updateCount = 0;
        
        manualAttendanceQuery.docs.forEach((doc) => {
            const attendanceData = doc.data();
            console.log(`Migrating attendance record from ${attendanceData.date} for ${studentName}`);
            
            // Update the authUid and add migration metadata
            batch.update(doc.ref, {
                authUid: newAuthUid,
                migratedAt: FieldValue.serverTimestamp(),
                originalAuthUid: "manual-entry",
                migratedBy: "automatic-migration"
            });
            
            updateCount++;
        });
        
        // Commit the batch update
        await batch.commit();
        
        console.log(`Successfully migrated ${updateCount} attendance records for ${studentName}`);
        
        return {
            success: true,
            recordsFound: manualAttendanceQuery.docs.length,
            recordsUpdated: updateCount,
            message: `Successfully migrated ${updateCount} manual attendance records`
        };
        
    } catch (error) {
        console.error(`Error during attendance migration for ${studentName}:`, error);
        throw new Error(`Migration failed: ${error.message}`);
    }
}

/**
 * Fix attendance records by adding authUid based on studentId
 * This function is called when a student logs in to ensure all their attendance records have the correct authUid
 * @param {string} studentId - The Firestore document ID of the student
 * @param {string} authUid - The authentication UID to add to the records
 * @returns {Object} Migration results with counts of updated records
 */
async function fixAttendanceRecordsForStudent(studentId, authUid) {
    try {
        console.log(`Starting attendance fix for studentId: ${studentId} with authUid: ${authUid}`);
        
        // Query for attendance records with this studentId that don't have authUid or have empty authUid
        const attendanceQuery = await db.collection("attendance")
            .where("studentId", "==", studentId)
            .get();
        
        if (attendanceQuery.empty) {
            console.log(`No attendance records found for studentId: ${studentId}`);
            return { 
                success: true, 
                recordsFound: 0, 
                recordsUpdated: 0,
                message: "No attendance records found for this student"
            };
        }
        
        // Filter records that need authUid added
        const recordsNeedingFix = attendanceQuery.docs.filter(doc => {
            const data = doc.data();
            return !data.authUid || data.authUid === "" || data.authUid === null || data.authUid === "manual-entry";
        });
        
        if (recordsNeedingFix.length === 0) {
            console.log(`All ${attendanceQuery.docs.length} attendance records already have authUid for studentId: ${studentId}`);
            return { 
                success: true, 
                recordsFound: attendanceQuery.docs.length, 
                recordsUpdated: 0,
                message: "All attendance records already have authUid"
            };
        }
        
        console.log(`Found ${recordsNeedingFix.length} attendance records needing authUid fix for studentId: ${studentId}`);
        
        // Use batch writes for better performance and atomicity
        const batch = db.batch();
        let updateCount = 0;
        
        recordsNeedingFix.forEach((doc) => {
            const attendanceData = doc.data();
            
            console.log(`Fixing attendance record from ${attendanceData.date} (Method: ${attendanceData.method || 'unknown'}, Status: ${attendanceData.status})`);
            
            // Update the authUid and add fix metadata
            batch.update(doc.ref, {
                authUid: authUid,
                fixedAt: FieldValue.serverTimestamp(),
                originalAuthUid: attendanceData.authUid || null
            });
            
            updateCount++;
        });
        
        // Commit the batch update
        await batch.commit();
        
        console.log(`Successfully fixed ${updateCount} attendance records for studentId: ${studentId}`);
        
        return {
            success: true,
            recordsFound: attendanceQuery.docs.length,
            recordsUpdated: updateCount,
            message: `Successfully fixed ${updateCount} attendance records`
        };
        
    } catch (error) {
        console.error(`Error during attendance fix for studentId ${studentId}:`, error);
        throw new Error(`Attendance fix failed: ${error.message}`);
    }
}

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
    
    // Perform data migration for manual attendance records
    try {
        const migrationResult = await migrateManualAttendanceRecords(studentData.fullName, uid);
        console.log(`Migration result for student ${studentDoc.id}:`, migrationResult);
    } catch (migrationError) {
        console.error(`Migration failed for student ${studentDoc.id}:`, migrationError);
        // Migration failure shouldn't prevent account linking
    }
    
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

/**
 * [Callable Function]
 * Send Telegram notification to parent when student attendance is marked
 */
exports.notifyParentAttendance = onCall({
    region: "asia-southeast1",
    secrets: ["TELEGRAM_PARENT_BOT_TOKEN"]
}, async (request) => {
    try {
        logger.info('📱 notifyParentAttendance called with data:', request.data);
        const { studentId, studentName, timestamp, method = 'face-scan' } = request.data;
        
        if (!studentId || !studentName) {
            logger.error('Missing required fields:', { studentId, studentName });
            throw new HttpsError('invalid-argument', 'Student ID and name are required');
        }

        // Get parent notification settings for this student
        const parentQuery = await db.collection('parentNotifications')
            .where('studentId', '==', studentId)
            .where('isActive', '==', true)
            .get();

        if (parentQuery.empty) {
            logger.info(`No active parent notifications found for student ${studentId}`);
            return { success: true, notificationsSent: 0 };
        }

        // Initialize Telegram parent bot
        const bot = initializeParentBot();
        if (!bot) {
            logger.error('Parent bot not initialized - missing TELEGRAM_PARENT_BOT_TOKEN');
            throw new HttpsError('internal', 'Parent bot configuration error');
        }

        let notificationsSent = 0;
        const attendanceDate = timestamp ? new Date(timestamp) : new Date();
        // Adjust for Cambodia timezone
        const cambodiaTime = new Date(attendanceDate.getTime() + (7 * 60 * 60 * 1000));
        const attendanceTime = formatTimeInKhmer(cambodiaTime);

        for (const doc of parentQuery.docs) {
            const parentData = doc.data();
            const chatId = parentData.chatId;

            try {
                // Use Khmer name if available, otherwise use regular name
                const khmerName = parentData.studentKhmerName || studentName;
                const formattedClass = formatClassInKhmer(parentData.studentClass);
                
                // Calculate attendance status if start time is available
                const attendanceStatus = parentData.classStartTime ? 
                    calculateAttendanceStatus(cambodiaTime, parentData.classStartTime) : null;
                
                let message = `🎒 **ការជូនដំណឹងវត្តមាន**

👤 **សិស្ស:** ${khmerName}
🏫 **ថ្នាក់:** ${formattedClass}
⏰ **ពេលវេលា:** ${attendanceTime}`;
                
                // Add class start time and status if available
                if (attendanceStatus) {
                    message += `
� **ម៉ោងចាប់ផ្តើម:** ${attendanceStatus.startTime}
${attendanceStatus.statusIcon} **ស្ថានភាព:** ${attendanceStatus.status}`;
                }
                
                message += `

✅ កូនរបស់បងបានមកដល់សាលាដោយសុវត្ថិភាព!`;

                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                notificationsSent++;
                
                logger.info(`Attendance notification sent to parent chat ${chatId} for student ${studentId}`);
                
            } catch (error) {
                logger.error(`Failed to send attendance notification to chat ${chatId}:`, error);
                
                // If it's a blocked bot error, deactivate notifications for this parent
                if (error.response && error.response.body && 
                    (error.response.body.error_code === 403 || error.response.body.description?.includes('blocked'))) {
                    await doc.ref.update({ isActive: false, deactivatedAt: admin.firestore.Timestamp.now() });
                    logger.info(`Deactivated notifications for blocked chat ${chatId}`);
                }
            }
        }

        return { success: true, notificationsSent };
        
    } catch (error) {
        logger.error('Error in notifyParentAttendance:', error);
        throw new HttpsError('internal', 'Failed to send parent notification');
    }
});

/**
 * [Callable Function]
 * Send Telegram notification to parent when student requests permission
 */
exports.notifyParentPermissionRequest = onCall({
    region: "asia-southeast1",
    secrets: ["TELEGRAM_PARENT_BOT_TOKEN"]
}, async (request) => {
    try {
        const { 
            studentId, 
            studentName, 
            permissionType = 'leave early', 
            reason, 
            requestTime,
            status = 'pending'
        } = request.data;
        
        if (!studentId || !studentName) {
            throw new HttpsError('invalid-argument', 'Student ID and name are required');
        }

        // Get parent notification settings for this student
        const parentQuery = await db.collection('parentNotifications')
            .where('studentId', '==', studentId)
            .where('isActive', '==', true)
            .get();

        if (parentQuery.empty) {
            logger.info(`No active parent notifications found for student ${studentId}`);
            return { success: true, notificationsSent: 0 };
        }

        // Initialize Telegram parent bot
        const bot = initializeParentBot();
        if (!bot) {
            logger.error('Parent bot not initialized - missing TELEGRAM_PARENT_BOT_TOKEN');
            throw new HttpsError('internal', 'Parent bot configuration error');
        }

        let notificationsSent = 0;
        const requestDate = requestTime ? new Date(requestTime) : new Date();
        // Adjust for Cambodia timezone
        const cambodiaTime = new Date(requestDate.getTime() + (7 * 60 * 60 * 1000));
        const formattedTime = formatTimeInKhmer(cambodiaTime);

        for (const doc of parentQuery.docs) {
            const parentData = doc.data();
            const chatId = parentData.chatId;

            try {
                let icon = '';
                let statusText = '';
                
                switch (status.toLowerCase()) {
                    case 'approved':
                        icon = '✅';
                        statusText = 'បានយល់ព្រម';
                        break;
                    case 'denied':
                        icon = '❌';
                        statusText = 'បានបដិសេធ';
                        break;
                    default:
                        icon = '📝';
                        statusText = 'រង់ចាំការយល់ព្រម';
                }

                // Use Khmer name if available, otherwise use regular name
                const khmerName = parentData.studentKhmerName || studentName;
                const formattedClass = formatClassInKhmer(parentData.studentClass);

                const message = `${icon} **ការស្នើសុំអនុញ្ញាត ${statusText}**

👤 **សិស្ស:** ${khmerName}
🏫 **ថ្នាក់:** ${formattedClass}
📋 **ប្រភេទ:** ${permissionType}
⏰ **ពេលវេលាស្នើសុំ:** ${formattedTime}
${reason ? `📝 **ហេតុផល:** ${reason}` : ''}`;

                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                notificationsSent++;
                
                logger.info(`Permission notification sent to parent chat ${chatId} for student ${studentId}`);
                
            } catch (error) {
                logger.error(`Failed to send permission notification to chat ${chatId}:`, error);
                
                // If it's a blocked bot error, deactivate notifications for this parent
                if (error.response && error.response.body && 
                    (error.response.body.error_code === 403 || error.response.body.description?.includes('blocked'))) {
                    await doc.ref.update({ isActive: false, deactivatedAt: admin.firestore.Timestamp.now() });
                    logger.info(`Deactivated notifications for blocked chat ${chatId}`);
                }
            }
        }

        return { success: true, notificationsSent };
        
    } catch (error) {
        logger.error('Error in notifyParentPermissionRequest:', error);
        throw new HttpsError('internal', 'Failed to send parent permission notification');
    }
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
    
    // Fix all attendance records for this student by adding authUid
    try {
        const fixResult = await fixAttendanceRecordsForStudent(studentDoc.id, uid);
        console.log(`Attendance fix result for student ${studentDoc.id} (link by phone):`, fixResult);
    } catch (fixError) {
        console.error(`Attendance fix failed for student ${studentDoc.id} (link by phone):`, fixError);
        // Fix failure shouldn't prevent linking
    }
    
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

// =============================================================================
// AUTOMATED BACKUP SYSTEM
// =============================================================================

/**
 * Scheduled Firestore Backup Function
 * Runs automatically at midnight daily to backup the entire database
 * Stores backups in Google Cloud Storage for reliability and accessibility
 */
exports.scheduledBackup = onSchedule({
    schedule: "0 0 * * *", // Daily at midnight
    timeZone: "UTC", // You can change this to your timezone
    region: "us-central1", // Change to your preferred region
    memory: "1GiB",
    timeoutSeconds: 540, // 9 minutes timeout
}, async (event) => {
    const startTime = Date.now();
    
    try {
        logger.info("Starting scheduled Firestore backup...");
        
        // Generate backup ID with timestamp
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupId = `backup-${timestamp}`;
        
        // Get all collections in the database
        const collections = await db.listCollections();
        const collectionNames = collections.map(collection => collection.id);
        
        logger.info(`Found ${collectionNames.length} collections: ${collectionNames.join(', ')}`);
        
        // Initialize backup manifest
        const manifest = {
            backupId,
            timestamp: now.toISOString(),
            projectId: process.env.GCLOUD_PROJECT,
            totalCollections: collectionNames.length,
            totalDocuments: 0,
            totalSize: 0,
            collections: [],
            compressed: false,
            version: "2.0.0",
            backupType: "scheduled_cloud_function"
        };
        
        const storage = getStorage();
        const bucket = storage.bucket();
        
        // Backup each collection
        for (const collectionName of collectionNames) {
            try {
                logger.info(`Backing up collection: ${collectionName}`);
                
                const collectionRef = db.collection(collectionName);
                const snapshot = await collectionRef.get();
                
                if (snapshot.empty) {
                    logger.info(`Collection ${collectionName} is empty, skipping...`);
                    continue;
                }
                
                // Process documents in the collection
                const documents = [];
                let documentCount = 0;
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const processedData = processFirestoreData(data);
                    documents.push({
                        id: doc.id,
                        data: processedData
                    });
                    documentCount++;
                });
                
                // Convert to JSON and calculate size
                const collectionData = JSON.stringify(documents, null, 2);
                const dataSize = Buffer.byteLength(collectionData, 'utf8');
                
                // Upload to Cloud Storage
                const fileName = `firestore-backups/${backupId}/${collectionName}.json`;
                const file = bucket.file(fileName);
                
                await file.save(collectionData, {
                    metadata: {
                        contentType: 'application/json',
                        metadata: {
                            backupId,
                            collection: collectionName,
                            documentCount: documentCount.toString(),
                            timestamp: now.toISOString()
                        }
                    }
                });
                
                // Update manifest
                manifest.collections.push({
                    collection: collectionName,
                    documentCount,
                    filePath: fileName,
                    size: dataSize
                });
                
                manifest.totalDocuments += documentCount;
                manifest.totalSize += dataSize;
                
                logger.info(`Collection ${collectionName} backed up: ${documentCount} documents, ${(dataSize / 1024).toFixed(2)} KB`);
                
            } catch (collectionError) {
                logger.error(`Error backing up collection ${collectionName}:`, collectionError);
                // Continue with other collections even if one fails
            }
        }
        
        // Save manifest file
        const manifestData = JSON.stringify(manifest, null, 2);
        const manifestFile = bucket.file(`firestore-backups/${backupId}/backup-manifest.json`);
        
        await manifestFile.save(manifestData, {
            metadata: {
                contentType: 'application/json',
                metadata: {
                    backupId,
                    totalCollections: manifest.totalCollections.toString(),
                    totalDocuments: manifest.totalDocuments.toString(),
                    timestamp: now.toISOString()
                }
            }
        });
        
        // Store backup record in Firestore for tracking
        await db.collection('backupHistory').doc(backupId).set({
            backupId,
            timestamp: FieldValue.serverTimestamp(),
            status: 'completed',
            totalCollections: manifest.totalCollections,
            totalDocuments: manifest.totalDocuments,
            totalSize: manifest.totalSize,
            duration: Date.now() - startTime,
            storagePath: `firestore-backups/${backupId}/`,
            backupType: 'scheduled_cloud_function',
            manifest
        });
        
        const duration = (Date.now() - startTime) / 1000;
        logger.info(`Backup completed successfully in ${duration.toFixed(2)} seconds`);
        logger.info(`Backup ID: ${backupId}`);
        logger.info(`Total Collections: ${manifest.totalCollections}`);
        logger.info(`Total Documents: ${manifest.totalDocuments}`);
        logger.info(`Total Size: ${(manifest.totalSize / 1024 / 1024).toFixed(2)} MB`);
        
        // Clean up old backups (keep last 30 days)
        await cleanupOldBackups(bucket);
        
        return { success: true, backupId, manifest };
        
    } catch (error) {
        logger.error("Backup failed:", error);
        
        // Store failed backup record
        const failedBackupId = `failed-backup-${Date.now()}`;
        await db.collection('backupHistory').doc(failedBackupId).set({
            backupId: failedBackupId,
            timestamp: FieldValue.serverTimestamp(),
            status: 'failed',
            error: error.message,
            duration: Date.now() - startTime,
            backupType: 'scheduled_cloud_function'
        });
        
        throw error;
    }
});

/**
 * Manual Backup Function - can be triggered via HTTP request
 */
exports.manualBackup = onCall({
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 540,
}, async (request) => {
    // Verify the user has admin permissions
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
    }
    
    try {
        // Check if user is admin by checking authorizedUsers collection
        if (!request.auth.token.email) {
            throw new HttpsError('permission-denied', 'Email required for admin verification');
        }
        
        const authorizedUserDoc = await db.collection('authorizedUsers').doc(request.auth.token.email).get();
        if (!authorizedUserDoc.exists) {
            throw new HttpsError('permission-denied', 'Admin access required');
        }
        
        logger.info(`Manual backup triggered by admin: ${request.auth.token.email}`);
        
        // Use the same backup logic as scheduled backup
        const backupResult = await exports.scheduledBackup.run({});
        
        return backupResult;
        
    } catch (error) {
        logger.error("Manual backup failed:", error);
        throw new HttpsError('internal', `Backup failed: ${error.message}`);
    }
});

/**
 * Process Firestore data to handle special types
 */
function processFirestoreData(data) {
    if (data === null || data === undefined) {
        return data;
    }
    
    if (data instanceof admin.firestore.Timestamp) {
        return {
            _type: 'timestamp',
            _value: data.toDate().toISOString()
        };
    }
    
    if (data instanceof admin.firestore.DocumentReference) {
        return {
            _type: 'reference',
            _value: data.path
        };
    }
    
    if (Array.isArray(data)) {
        return data.map(item => processFirestoreData(item));
    }
    
    if (typeof data === 'object') {
        const processed = {};
        for (const [key, value] of Object.entries(data)) {
            processed[key] = processFirestoreData(value);
        }
        return processed;
    }
    
    return data;
}

/**
 * Clean up old backups to save storage space
 */
async function cleanupOldBackups(bucket) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days
        
        const [files] = await bucket.getFiles({
            prefix: 'firestore-backups/',
            delimiter: '/'
        });
        
        // Group files by backup folder
        const backupFolders = new Set();
        files.forEach(file => {
            const pathParts = file.name.split('/');
            if (pathParts.length >= 3) {
                backupFolders.add(pathParts[1]); // backup-YYYY-MM-DDTHH-MM-SS format
            }
        });
        
        // Parse dates and find old backups
        const oldBackups = [];
        backupFolders.forEach(backupFolder => {
            try {
                // Extract date from backup folder name: backup-2024-01-15T10-30-00
                const dateStr = backupFolder.replace('backup-', '').replace(/-/g, ':');
                const backupDate = new Date(dateStr.replace(/:/g, '-').slice(0, 10) + 'T' + dateStr.slice(11) + ':00.000Z');
                
                if (backupDate < cutoffDate) {
                    oldBackups.push(backupFolder);
                }
            } catch (e) {
                logger.warn(`Could not parse backup date from folder: ${backupFolder}`);
            }
        });
        
        // Delete old backup folders
        for (const oldBackup of oldBackups) {
            try {
                await bucket.deleteFiles({
                    prefix: `firestore-backups/${oldBackup}/`
                });
                logger.info(`Deleted old backup: ${oldBackup}`);
            } catch (error) {
                logger.warn(`Could not delete old backup ${oldBackup}:`, error);
            }
        }
        
        if (oldBackups.length > 0) {
            logger.info(`Cleanup completed: removed ${oldBackups.length} old backups`);
        }
        
    } catch (error) {
        logger.warn("Error during backup cleanup:", error);
        // Don't throw - cleanup failure shouldn't fail the backup
    }
}

/**
 * [Firestore-triggered Function]
 * Automatically notify parents when a permission request is created
 */
exports.notifyParentOnPermissionRequest = onDocumentCreated({
    region: "asia-southeast1",
    document: "permissions/{permissionId}",
    secrets: ["TELEGRAM_PARENT_BOT_TOKEN"]
}, async (event) => {
    try {
        const permissionData = event.data.data();
        logger.info('Permission request created, notifying parents:', permissionData);

        // Extract the relevant data
        const {
            studentId,
            studentName,
            reason,
            details,
            permissionStartDate,
            permissionEndDate,
            duration,
            requestedAt
        } = permissionData;

        if (!studentId || !studentName) {
            logger.error('Missing required fields in permission request');
            return;
        }

        // Get parent notification settings for this student
        const parentQuery = await db.collection('parentNotifications')
            .where('studentId', '==', studentId)
            .where('isActive', '==', true)
            .get();

        if (parentQuery.empty) {
            logger.info(`No active parent notifications found for student ${studentId}`);
            return;
        }

        // Initialize Telegram parent bot
        const bot = initializeParentBot();
        if (!bot) {
            logger.error('Parent bot not initialized - missing TELEGRAM_PARENT_BOT_TOKEN');
            return;
        }

        let notificationsSent = 0;
        const requestDate = requestedAt ? requestedAt.toDate() : new Date();
        // Adjust for Cambodia timezone
        const cambodiaTime = new Date(requestDate.getTime() + (7 * 60 * 60 * 1000));
        const formattedTime = formatTimeInKhmer(cambodiaTime);

        for (const doc of parentQuery.docs) {
            const parentData = doc.data();
            const chatId = parentData.chatId;

            try {
                // Use Khmer name if available, otherwise use regular name
                const khmerName = parentData.studentKhmerName || studentName;
                const formattedClass = formatClassInKhmer(parentData.studentClass);

                const message = `📝 **ការស្នើសុំច្បាប់ឈប់សម្រាក**

👤 **សិស្ស:** ${khmerName}
🏫 **ថ្នាក់:** ${formattedClass}
   **  ថ្ងៃចាប់ផ្តើម:** ${permissionStartDate}
   **  ថ្ងៃបញ្ចប់:** ${permissionEndDate}
⏳ **រយៈពេល:** ${duration} ថ្ងៃ
⏰ **ពេលវេលាស្នើសុំ:** ${formattedTime}
📋 **ហេតុផល:** ${reason}
📝 **លម្អិត:** ${details}`;

                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                notificationsSent++;
                
                logger.info(`Permission request notification sent to parent chat ${chatId} for student ${studentId}`);
                
            } catch (error) {
                logger.error(`Failed to send permission notification to chat ${chatId}:`, error);
                
                // If it's a blocked bot error, deactivate notifications for this parent
                if (error.response && error.response.body && 
                    (error.response.body.error_code === 403 || error.response.body.description?.includes('blocked'))) {
                    await doc.ref.update({ isActive: false, deactivatedAt: admin.firestore.Timestamp.now() });
                    logger.info(`Deactivated notifications for blocked chat ${chatId}`);
                }
            }
        }

        logger.info(`Permission request notifications sent: ${notificationsSent}`);
        
    } catch (error) {
        logger.error('Error in notifyParentOnPermissionRequest:', error);
    }
});

/**
 * [Firestore-triggered Function]
 * Automatically notify parents when a leave early request is created
 */
exports.notifyParentOnLeaveEarlyRequest = onDocumentCreated({
    region: "asia-southeast1",
    document: "leaveEarlyRequests/{requestId}",
    secrets: ["TELEGRAM_PARENT_BOT_TOKEN"]
}, async (event) => {
    try {
        const requestData = event.data.data();
        logger.info('Leave early request created, notifying parents:', requestData);

        // Extract the relevant data
        const {
            authUid,
            studentId,
            studentName,
            class: studentClass,
            date,
            leaveTime,
            reason,
            shift,
            requestedAt
        } = requestData;

        if (!studentId || !studentName) {
            logger.error('Missing required fields in leave early request');
            return;
        }

        // Get parent notification settings for this student
        const parentQuery = await db.collection('parentNotifications')
            .where('studentId', '==', studentId)
            .where('isActive', '==', true)
            .get();

        if (parentQuery.empty) {
            logger.info(`No active parent notifications found for student ${studentId}`);
            return;
        }

        // Initialize Telegram parent bot
        const bot = initializeParentBot();
        if (!bot) {
            logger.error('Parent bot not initialized - missing TELEGRAM_PARENT_BOT_TOKEN');
            return;
        }

        let notificationsSent = 0;
        const requestDate = requestedAt ? requestedAt.toDate() : new Date();
        // Adjust for Cambodia timezone
        const cambodiaTime = new Date(requestDate.getTime() + (7 * 60 * 60 * 1000));
        const formattedTime = formatTimeInKhmer(cambodiaTime);

        for (const doc of parentQuery.docs) {
            const parentData = doc.data();
            const chatId = parentData.chatId;

            try {
                // Use Khmer name if available, otherwise use regular name
                const khmerName = parentData.studentKhmerName || studentName;
                const formattedClass = formatClassInKhmer(parentData.studentClass || studentClass);

                const message = `**ការស្នើសុំចេញមុនម៉ោង**

👤 **សិស្ស:** ${khmerName}
🏫 **ថ្នាក់:** ${formattedClass}
⏰ **ម៉ោងស្នើសុំចេញ:** ${leaveTime}
⏰ **ពេលវេលាស្នើសុំ:** ${formattedTime}
📝 **ហេតុផល:** ${reason}`;

                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                notificationsSent++;
                
                logger.info(`Leave early request notification sent to parent chat ${chatId} for student ${studentId}`);
                
            } catch (error) {
                logger.error(`Failed to send leave early notification to chat ${chatId}:`, error);
                
                // If it's a blocked bot error, deactivate notifications for this parent
                if (error.response && error.response.body && 
                    (error.response.body.error_code === 403 || error.response.body.description?.includes('blocked'))) {
                    await doc.ref.update({ isActive: false, deactivatedAt: admin.firestore.Timestamp.now() });
                    logger.info(`Deactivated notifications for blocked chat ${chatId}`);
                }
            }
        }

        logger.info(`Leave early request notifications sent: ${notificationsSent}`);
        
    } catch (error) {
        logger.error('Error in notifyParentOnLeaveEarlyRequest:', error);
    }
});