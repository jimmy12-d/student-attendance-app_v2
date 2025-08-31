/**
 * Migration script to update all manual attendance records for students who have authUid
 * This script finds all students with authUid and migrates their manual attendance records
 * from "manual-entry" to their actual authUid
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, 'firestore-upload', 'serviceAccountKey.json');
  
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Initialized with service account credentials');
  } catch (error) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log('✅ Initialized with default credentials');
  }
}

const db = admin.firestore();

/**
 * Migrate manual attendance records for a specific student
 */
async function migrateStudentAttendance(studentName, authUid, studentId) {
    try {
        console.log(`\n📝 Processing: ${studentName} (ID: ${studentId})`);
        console.log(`   AuthUid: ${authUid}`);
        
        // Query for attendance records with manual-entry authUid and matching student name
        const manualAttendanceQuery = await db.collection("attendance")
            .where("authUid", "==", "manual-entry")
            .where("studentName", "==", studentName)
            .get();
        
        if (manualAttendanceQuery.empty) {
            console.log(`   ⚪ No manual attendance records found`);
            return { 
                success: true, 
                recordsFound: 0, 
                recordsUpdated: 0,
                message: "No manual attendance records found to migrate"
            };
        }
        
        console.log(`   📊 Found ${manualAttendanceQuery.docs.length} manual attendance records`);
        
        // Use batch writes for better performance and atomicity
        const batch = db.batch();
        let updateCount = 0;
        
        manualAttendanceQuery.docs.forEach((doc) => {
            const attendanceData = doc.data();
            
            console.log(`   📅 Migrating record from ${attendanceData.date} (Status: ${attendanceData.status})`);
            
            // Update the authUid and add migration metadata
            batch.update(doc.ref, {
                authUid: authUid,
                migratedAt: admin.firestore.FieldValue.serverTimestamp(),
                studentId: studentId // Add student ID for reference
            });
            
            updateCount++;
        });
        
        // Commit the batch update
        await batch.commit();
        
        console.log(`   ✅ Successfully migrated ${updateCount} records for ${studentName}`);
        
        return {
            success: true,
            recordsFound: manualAttendanceQuery.docs.length,
            recordsUpdated: updateCount,
            message: `Successfully migrated ${updateCount} manual attendance records`
        };
        
    } catch (error) {
        console.error(`   ❌ Error migrating attendance for ${studentName}:`, error);
        return {
            success: false,
            error: error.message,
            recordsFound: 0,
            recordsUpdated: 0
        };
    }
}

/**
 * Main migration function
 */
async function migrateAllStudentsAttendance() {
    console.log('🚀 Starting bulk attendance migration for all students with authUid...\n');
    
    try {
        // Get all students who have an authUid
        const studentsQuery = await db.collection("students")
            .get();
        
        if (studentsQuery.empty) {
            console.log('❌ No students found');
            return;
        }
        
        // Filter students who have non-empty authUid
        const studentsWithAuthUid = studentsQuery.docs.filter(doc => {
            const authUid = doc.data().authUid;
            return authUid && authUid !== "" && authUid !== null;
        });
        
        if (studentsWithAuthUid.length === 0) {
            console.log('❌ No students found with valid authUid');
            return;
        }
        
        console.log(`📋 Found ${studentsWithAuthUid.length} students with valid authUid`);
        console.log('=' .repeat(60));
        
        let totalProcessed = 0;
        let totalRecordsFound = 0;
        let totalRecordsMigrated = 0;
        let successfulMigrations = 0;
        let failedMigrations = 0;
        
        // Process each student
        for (const studentDoc of studentsWithAuthUid) {
            const studentData = studentDoc.data();
            const studentId = studentDoc.id;
            const studentName = studentData.fullName;
            const authUid = studentData.authUid;
            
            if (!studentName) {
                console.log(`⚠️  Skipping student ${studentId} - no fullName field`);
                continue;
            }
            
            const result = await migrateStudentAttendance(studentName, authUid, studentId);
            
            totalProcessed++;
            totalRecordsFound += result.recordsFound;
            totalRecordsMigrated += result.recordsUpdated;
            
            if (result.success) {
                successfulMigrations++;
            } else {
                failedMigrations++;
            }
            
            // Add a small delay to avoid overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Print summary
        console.log('\n' + '=' .repeat(60));
        console.log('📊 MIGRATION SUMMARY');
        console.log('=' .repeat(60));
        console.log(`👥 Students processed: ${totalProcessed}`);
        console.log(`✅ Successful migrations: ${successfulMigrations}`);
        console.log(`❌ Failed migrations: ${failedMigrations}`);
        console.log(`📄 Total manual records found: ${totalRecordsFound}`);
        console.log(`🔄 Total records migrated: ${totalRecordsMigrated}`);
        console.log('=' .repeat(60));
        
        if (failedMigrations > 0) {
            console.log(`⚠️  ${failedMigrations} migrations failed. Check the logs above for details.`);
        }
        
        if (totalRecordsMigrated > 0) {
            console.log('🎉 Migration completed successfully!');
        } else {
            console.log('ℹ️  No records needed migration.');
        }
        
    } catch (error) {
        console.error('❌ Error during bulk migration:', error);
    }
}

/**
 * Check what would be migrated without actually doing it
 */
async function checkMigrationStatus() {
    console.log('🔍 Checking migration status for all students...\n');
    
    try {
        // Get all students who have an authUid
        const studentsQuery = await db.collection("students")
            .get();
        
        if (studentsQuery.empty) {
            console.log('❌ No students found');
            return;
        }
        
        // Filter students who have non-empty authUid
        const studentsWithAuthUid = studentsQuery.docs.filter(doc => {
            const authUid = doc.data().authUid;
            return authUid && authUid !== "" && authUid !== null;
        });
        
        if (studentsWithAuthUid.length === 0) {
            console.log('❌ No students found with valid authUid');
            return;
        }
        
        console.log(`📋 Found ${studentsWithAuthUid.length} students with valid authUid`);
        console.log('=' .repeat(80));
        
        let totalManualRecords = 0;
        let studentsWithManualRecords = 0;
        
        for (const studentDoc of studentsWithAuthUid) {
            const studentData = studentDoc.data();
            const studentName = studentData.fullName;
            
            if (!studentName) continue;
            
            // Check for manual records
            const manualRecords = await db.collection("attendance")
                .where("authUid", "==", "manual-entry")
                .where("studentName", "==", studentName)
                .get();
            
            // Check for already migrated records
            const migratedRecords = await db.collection("attendance")
                .where("studentName", "==", studentName)
                .where("migratedAt", "!=", null)
                .get();
            
            if (!manualRecords.empty || !migratedRecords.empty) {
                console.log(`📝 ${studentName}:`);
                console.log(`   📄 Manual records: ${manualRecords.size}`);
                console.log(`   🔄 Already migrated: ${migratedRecords.size}`);
                console.log(`   🆔 Student ID: ${studentDoc.id}`);
                console.log(`   🔑 AuthUid: ${studentData.authUid}`);
                
                if (!manualRecords.empty) {
                    studentsWithManualRecords++;
                    totalManualRecords += manualRecords.size;
                }
            }
        }
        
        console.log('\n' + '=' .repeat(80));
        console.log('📊 MIGRATION STATUS SUMMARY');
        console.log('=' .repeat(80));
        console.log(`👥 Students with valid authUid: ${studentsWithAuthUid.length}`);
        console.log(`📄 Students with manual records: ${studentsWithManualRecords}`);
        console.log(`🔄 Total manual records to migrate: ${totalManualRecords}`);
        console.log('=' .repeat(80));
        
    } catch (error) {
        console.error('❌ Error checking migration status:', error);
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'check' || command === 'status') {
    checkMigrationStatus();
} else if (command === 'migrate' || command === 'run') {
    migrateAllStudentsAttendance();
} else {
    console.log('📚 Attendance Migration Script');
    console.log('=' .repeat(40));
    console.log('Usage:');
    console.log('  node migrate-all-students-attendance.js check    - Check what would be migrated');
    console.log('  node migrate-all-students-attendance.js migrate  - Run the actual migration');
    console.log('');
    console.log('Examples:');
    console.log('  node migrate-all-students-attendance.js check');
    console.log('  node migrate-all-students-attendance.js migrate');
}
