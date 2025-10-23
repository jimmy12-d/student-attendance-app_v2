const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

if (!admin.apps.length) {
  try {
    const serviceAccount = require(path.join(__dirname, 'firestore-upload/serviceAccountKey.json'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rodwell-attendance'
    });
  } catch (error) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rodwell-attendance'
    });
  }
}

const db = admin.firestore();

async function verifyMockExamSetup() {
  console.log('🔍 Verifying Mock Exam Setup for Progress Bar...\n');
  
  const mockIds = ['mock1', 'mock2', 'mock3', 'mock4'];
  const issues = [];
  const warnings = [];
  
  for (const mockId of mockIds) {
    console.log(`\n📋 Checking ${mockId}...`);
    
    try {
      // Step 1: Check examControls
      const examControlDoc = await db.collection('examControls').doc(mockId).get();
      
      if (!examControlDoc.exists) {
        issues.push(`❌ ${mockId}: examControls document not found`);
        continue;
      }
      
      const examControlData = examControlDoc.data();
      console.log(`  ✅ examControls/${mockId} exists`);
      console.log(`     - Name: ${examControlData.nameEnglish}`);
      console.log(`     - Date: ${examControlData.date}`);
      console.log(`     - Ready for Students: ${examControlData.isReadyForStudent}`);
      
      // Step 2: Check eventId
      if (!examControlData.eventId) {
        issues.push(`❌ ${mockId}: eventId is missing in examControls`);
        console.log(`  ❌ eventId is missing!`);
        continue;
      }
      
      console.log(`  ✅ eventId: ${examControlData.eventId}`);
      
      // Step 3: Check event document
      const eventDoc = await db.collection('events').doc(examControlData.eventId).get();
      
      if (!eventDoc.exists) {
        issues.push(`❌ ${mockId}: Event document not found (${examControlData.eventId})`);
        console.log(`  ❌ Event document not found!`);
        continue;
      }
      
      const eventData = eventDoc.data();
      console.log(`  ✅ events/${examControlData.eventId} exists`);
      console.log(`     - Event Name: ${eventData.name}`);
      
      // Step 4: Check formId
      if (!eventData.formId) {
        issues.push(`❌ ${mockId}: formId is missing in event document`);
        console.log(`  ❌ formId is missing!`);
        continue;
      }
      
      console.log(`  ✅ formId: ${eventData.formId}`);
      
      // Step 5: Check if any registrations exist
      const formResponsesQuery = await db.collection('form_responses')
        .where('formId', '==', eventData.formId)
        .limit(5)
        .get();
      
      if (formResponsesQuery.empty) {
        warnings.push(`⚠️  ${mockId}: No student registrations found yet`);
        console.log(`  ⚠️  No student registrations found (this is OK if registration hasn't started)`);
      } else {
        console.log(`  ✅ Found ${formResponsesQuery.size} student registration(s)`);
        
        // Show sample registration
        const sampleDoc = formResponsesQuery.docs[0];
        const sampleData = sampleDoc.data();
        console.log(`     Sample registration:`);
        console.log(`     - Student: ${sampleData.studentName || sampleData.studentId}`);
        console.log(`     - Registration Status: ${sampleData.registrationStatus || 'N/A'}`);
        console.log(`     - Payment Status: ${sampleData.paymentStatus || 'N/A'}`);
      }
      
      console.log(`  ✅ ${mockId} setup is complete!`);
      
    } catch (error) {
      issues.push(`❌ ${mockId}: Error checking setup - ${error.message}`);
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  if (issues.length === 0) {
    console.log('✅ All mock exams are properly configured!');
  } else {
    console.log(`\n❌ Found ${issues.length} issue(s):\n`);
    issues.forEach(issue => console.log(issue));
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} warning(s):\n`);
    warnings.forEach(warning => console.log(warning));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('💡 WHAT THIS MEANS:');
  console.log('='.repeat(60));
  console.log(`
For the new ProgressBar to work correctly:
1. Each mock exam needs an examControls document with eventId
2. The eventId must point to a valid event in the events collection
3. The event must have a formId
4. Student registrations should be in form_responses collection

If any of these are missing, students will see "No Registered" status.
  `);
}

// Test a specific student's registration status
async function testStudentStatus(studentId, mockId = 'mock1') {
  console.log('\n' + '='.repeat(60));
  console.log(`🧪 Testing Student Status: ${studentId} for ${mockId}`);
  console.log('='.repeat(60));
  
  try {
    // Get eventId
    const examControlDoc = await db.collection('examControls').doc(mockId).get();
    if (!examControlDoc.exists || !examControlDoc.data().eventId) {
      console.log('❌ Cannot test: examControls or eventId missing');
      return;
    }
    
    const eventId = examControlDoc.data().eventId;
    
    // Get formId
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists || !eventDoc.data().formId) {
      console.log('❌ Cannot test: event or formId missing');
      return;
    }
    
    const formId = eventDoc.data().formId;
    
    // Query student registration
    const registrationQuery = await db.collection('form_responses')
      .where('formId', '==', formId)
      .where('studentId', '==', studentId)
      .limit(1)
      .get();
    
    if (registrationQuery.empty) {
      console.log('📊 Status: No Registered (0%)');
      console.log('   Reason: No registration found for this student');
      return;
    }
    
    const registrationData = registrationQuery.docs[0].data();
    const regStatus = registrationData.registrationStatus || 'pending';
    const payStatus = registrationData.paymentStatus;
    
    console.log(`\n📋 Registration found:`);
    console.log(`   Registration Status: ${regStatus}`);
    console.log(`   Payment Status: ${payStatus || 'N/A'}`);
    
    // Determine display status (matches ProgressBar logic)
    let displayStatus = '';
    let progress = 0;
    
    if (regStatus === 'rejected') {
      displayStatus = 'No Registered';
      progress = 0;
    } else if (regStatus === 'pending') {
      displayStatus = 'Registered';
      progress = 33;
    } else if (regStatus === 'approved') {
      if (payStatus === 'paid') {
        displayStatus = 'Paid Star';
        progress = 100;
      } else if (payStatus === 'borrowed') {
        displayStatus = 'Borrow';
        progress = 66;
      } else {
        displayStatus = 'Registered';
        progress = 33;
      }
    } else {
      displayStatus = 'Registered';
      progress = 33;
    }
    
    console.log(`\n📊 Progress Bar will show:`);
    console.log(`   Status: ${displayStatus}`);
    console.log(`   Progress: ${progress}%`);
    
  } catch (error) {
    console.error('❌ Error testing student status:', error);
  }
}

// Run verification
verifyMockExamSetup()
  .then(() => {
    // Optionally test a specific student
    // Uncomment and add a real studentId to test:
    // return testStudentStatus('YOUR_STUDENT_ID_HERE', 'mock1');
  })
  .then(() => {
    console.log('\n✅ Verification complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
