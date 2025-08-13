/**
 * Test script for password functionality
 * Run with: node test-password-functions.js
 */

const bcrypt = require("bcrypt");

// Test password generation and verification
const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

const hashPassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

async function testPasswordFunctions() {
    console.log("🔐 Testing Password Functions\n");
    
    // Test 1: Generate random passwords
    console.log("1. Generating random passwords:");
    for (let i = 0; i < 5; i++) {
        const password = generateRandomPassword();
        console.log(`   ${i + 1}. ${password} (length: ${password.length})`);
    }
    
    // Test 2: Hash and verify password
    console.log("\n2. Testing password hashing and verification:");
    const testPassword = generateRandomPassword();
    console.log(`   Original password: ${testPassword}`);
    
    const hashedPassword = await hashPassword(testPassword);
    console.log(`   Hashed password: ${hashedPassword}`);
    
    const isValid = await verifyPassword(testPassword, hashedPassword);
    console.log(`   Verification (correct): ${isValid}`);
    
    const isInvalid = await verifyPassword("wrongpassword", hashedPassword);
    console.log(`   Verification (wrong): ${isInvalid}`);
    
    // Test 3: Multiple hashes of same password are different
    console.log("\n3. Testing hash uniqueness:");
    const password = "testpass";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    console.log(`   Same password, different hashes: ${hash1 !== hash2}`);
    console.log(`   Both verify correctly: ${await verifyPassword(password, hash1) && await verifyPassword(password, hash2)}`);
    
    console.log("\n✅ All tests completed!");
}

testPasswordFunctions().catch(console.error);
