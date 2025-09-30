#!/usr/bin/env node

/**
 * Telegram Bot Setup Script
 * Run this script to set up your Telegram bot webhook and test the connection
 */

const https = require('https');

// Configuration - Update these values
const BOT_TOKEN = '8313514919:AAH7omazQJDQVNAXqmHJtYKXZ4tMHsJHVUI'; // Replace with your actual bot token
const PROJECT_ID = 'rodwell-attendance'; // Replace with your Firebase project ID
const WEBHOOK_URL = `https://asia-southeast1-${PROJECT_ID}.cloudfunctions.net/telegramWebhook`;

console.log('🤖 Telegram Bot Setup Tool\n');

async function makeRequest(url, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            method: data ? 'POST' : 'GET',
            headers: data ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(data))
            } : {}
        };

        const req = https.request(url, options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve(parsed);
                } catch (e) {
                    resolve(responseData);
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function testBot() {
    console.log('1️⃣ Testing bot token...');
    
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/getMe`;
        const response = await makeRequest(url);
        
        if (response.ok) {
            console.log('✅ Bot token is valid');
            console.log(`   Bot name: ${response.result.first_name}`);
            console.log(`   Bot username: @${response.result.username}`);
            return response.result.username;
        } else {
            console.log('❌ Bot token is invalid');
            console.log(`   Error: ${response.description}`);
            return null;
        }
    } catch (error) {
        console.log('❌ Failed to test bot token');
        console.log(`   Error: ${error.message}`);
        return null;
    }
}

async function setupWebhook() {
    console.log('\\n2️⃣ Setting up webhook...');
    
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;
        const data = { url: WEBHOOK_URL };
        const response = await makeRequest(url, data);
        
        if (response.ok) {
            console.log('✅ Webhook set up successfully');
            console.log(`   Webhook URL: ${WEBHOOK_URL}`);
        } else {
            console.log('❌ Failed to set up webhook');
            console.log(`   Error: ${response.description}`);
        }
        
        return response.ok;
    } catch (error) {
        console.log('❌ Failed to set up webhook');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

async function getWebhookInfo() {
    console.log('\\n3️⃣ Checking webhook status...');
    
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`;
        const response = await makeRequest(url);
        
        if (response.ok) {
            const info = response.result;
            console.log('📊 Webhook information:');
            console.log(`   URL: ${info.url || 'Not set'}`);
            console.log(`   Has custom certificate: ${info.has_custom_certificate}`);
            console.log(`   Pending updates: ${info.pending_update_count}`);
            console.log(`   Max connections: ${info.max_connections || 'Default'}`);
            
            if (info.last_error_date) {
                console.log(`   ⚠️  Last error: ${info.last_error_message}`);
                console.log(`   Error date: ${new Date(info.last_error_date * 1000)}`);
            } else {
                console.log('   ✅ No recent errors');
            }
            
            return info;
        } else {
            console.log('❌ Failed to get webhook info');
            console.log(`   Error: ${response.description}`);
        }
    } catch (error) {
        console.log('❌ Failed to get webhook info');
        console.log(`   Error: ${error.message}`);
    }
}

async function generateTestLink(botUsername) {
    console.log('\\n4️⃣ Generating test parent registration link...');
    
    const studentId = 'test_student_123';
    const token = Buffer.from(`parent_${studentId}_${Date.now()}`).toString('base64');
    const telegramUrl = `https://t.me/${botUsername}?start=parent_${token}`;
    
    console.log('🔗 Test registration link generated:');
    console.log(`   ${telegramUrl}`);
    console.log('\\n📋 To test:');
    console.log('   1. Copy the link above');
    console.log('   2. Paste it in your browser or send to yourself on Telegram');
    console.log('   3. Click the link to open your bot');
    console.log('   4. The bot should respond with a welcome message');
}

async function main() {
    // Validate configuration
    if (BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
        console.log('❌ Please update BOT_TOKEN in this script with your actual bot token');
        process.exit(1);
    }
    
    if (PROJECT_ID === 'your-project-id') {
        console.log('❌ Please update PROJECT_ID in this script with your Firebase project ID');
        process.exit(1);
    }
    
    console.log(`🔧 Configuration:`);
    console.log(`   Project ID: ${PROJECT_ID}`);
    console.log(`   Webhook URL: ${WEBHOOK_URL}`);
    console.log(`   Bot Token: ${BOT_TOKEN.substring(0, 10)}...\\n`);
    
    // Run setup steps
    const botUsername = await testBot();
    if (!botUsername) {
        console.log('\\n❌ Cannot proceed without a valid bot token');
        process.exit(1);
    }
    
    const webhookSuccess = await setupWebhook();
    await getWebhookInfo();
    
    if (webhookSuccess) {
        await generateTestLink(botUsername);
        console.log('\\n🎉 Setup complete! Your bot should now respond to messages.');
    } else {
        console.log('\\n❌ Webhook setup failed. Check the errors above.');
    }
    
    console.log('\\n💡 Troubleshooting tips:');
    console.log('   - Make sure you have deployed your Firebase Functions');
    console.log('   - Check that TELEGRAM_PARENT_BOT_TOKEN secret is set in Firebase');
    console.log('   - Verify your Firebase project ID is correct');
    console.log('   - Check Firebase Functions logs for errors');
}

// Run the script
main().catch(console.error);