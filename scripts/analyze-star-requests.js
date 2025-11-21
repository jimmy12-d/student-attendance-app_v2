/**
 * Script to perform detailed analysis of the starRequests collection
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = require(path.join(__dirname, '../firestore-upload/serviceAccountKey.json'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rodwell-attendance'
    });
    console.log('✅ Firebase Admin initialized with service account');
  } catch (error) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rodwell-attendance'
    });
    console.log('✅ Firebase Admin initialized with default credentials');
  }
}

const db = admin.firestore();

async function analyzeStarRequests() {
  try {
    console.log('\n📊 DETAILED STAR REQUESTS COLLECTION ANALYSIS\n');
    console.log('='.repeat(60));

    const starRequestsRef = db.collection('starRequests');
    const snapshot = await starRequestsRef.get();

    if (snapshot.empty) {
      console.log('📭 No documents found in starRequests collection');
      return;
    }

    const totalDocuments = snapshot.size;
    console.log(`\n📈 Total Documents: ${totalDocuments}\n`);

    // Initialize statistics
    const stats = {
      totalRequests: totalDocuments,
      statusBreakdown: {},
      rewardBreakdown: {},
      classBreakdown: {},
      shiftBreakdown: {},
      studentCountByClass: {},
      uniqueStudents: new Set(),
      uniqueRewards: new Set(),
      totalStarsAwarded: 0,
      dateRange: {
        earliest: null,
        latest: null
      },
      processingTime: []
    };

    // Collect all data
    snapshot.forEach((doc) => {
      const data = doc.data();

      // Status breakdown
      const status = data.status || 'unknown';
      stats.statusBreakdown[status] = (stats.statusBreakdown[status] || 0) + 1;

      // Reward breakdown
      const rewardName = data.starRewardName || 'unknown';
      stats.rewardBreakdown[rewardName] = (stats.rewardBreakdown[rewardName] || 0) + 1;
      stats.uniqueRewards.add(rewardName);

      // Class breakdown
      const studentClass = data.studentClass || 'unknown';
      stats.classBreakdown[studentClass] = (stats.classBreakdown[studentClass] || 0) + 1;

      // Shift breakdown
      const shift = data.studentShift || 'unknown';
      stats.shiftBreakdown[shift] = (stats.shiftBreakdown[shift] || 0) + 1;

      // Track unique students
      stats.uniqueStudents.add(data.studentId);
      stats.studentCountByClass[studentClass] = (stats.studentCountByClass[studentClass] || 0) + 1;

      // Stars awarded
      stats.totalStarsAwarded += data.starRewardAmount || 0;

      // Date range
      if (data.requestedAt) {
        const timestamp = data.requestedAt._seconds * 1000;
        if (!stats.dateRange.earliest || timestamp < stats.dateRange.earliest) {
          stats.dateRange.earliest = timestamp;
        }
        if (!stats.dateRange.latest || timestamp > stats.dateRange.latest) {
          stats.dateRange.latest = timestamp;
        }
      }

      // Processing time (in seconds)
      if (data.requestedAt && data.processedAt) {
        const processingSeconds = data.processedAt._seconds - data.requestedAt._seconds;
        stats.processingTime.push(processingSeconds);
      }
    });

    // Display Status Breakdown
    console.log('\n🎯 STATUS BREAKDOWN:');
    console.log('-'.repeat(60));
    Object.entries(stats.statusBreakdown).forEach(([status, count]) => {
      const percentage = ((count / totalDocuments) * 100).toFixed(1);
      const bar = '█'.repeat(Math.ceil(count / 10)) + '░'.repeat(Math.max(0, 10 - Math.ceil(count / 10)));
      console.log(`  ${status.padEnd(15)} ${bar} ${count.toString().padStart(4)} (${percentage}%)`);
    });

    // Display Reward Breakdown
    console.log('\n🎁 REWARD BREAKDOWN:');
    console.log('-'.repeat(60));
    const sortedRewards = Object.entries(stats.rewardBreakdown)
      .sort((a, b) => b[1] - a[1]);
    sortedRewards.forEach(([reward, count]) => {
      const percentage = ((count / totalDocuments) * 100).toFixed(1);
      const bar = '█'.repeat(Math.ceil(count / 10)) + '░'.repeat(Math.max(0, 10 - Math.ceil(count / 10)));
      console.log(`  ${reward.substring(0, 25).padEnd(25)} ${bar} ${count.toString().padStart(4)} (${percentage}%)`);
    });

    // Display Shift Breakdown
    console.log('\n⏰ SHIFT BREAKDOWN:');
    console.log('-'.repeat(60));
    Object.entries(stats.shiftBreakdown)
      .sort((a, b) => b[1] - a[1])
      .forEach(([shift, count]) => {
        const percentage = ((count / totalDocuments) * 100).toFixed(1);
        console.log(`  ${shift.padEnd(15)} ${count.toString().padStart(4)} (${percentage}%)`);
      });

    // Display Top Classes
    console.log('\n📚 TOP 15 CLASSES WITH MOST REQUESTS:');
    console.log('-'.repeat(60));
    const sortedClasses = Object.entries(stats.classBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    sortedClasses.forEach(([className, count], index) => {
      const percentage = ((count / totalDocuments) * 100).toFixed(1);
      console.log(`  ${String(index + 1).padStart(2)}. ${className.padEnd(20)} ${count.toString().padStart(4)} (${percentage}%)`);
    });

    // Display unique counts
    console.log('\n👥 UNIQUE PARTICIPANTS:');
    console.log('-'.repeat(60));
    console.log(`  Unique Students: ${stats.uniqueStudents.size}`);
    console.log(`  Unique Rewards: ${stats.uniqueRewards.size}`);
    console.log(`  Average Requests per Student: ${(totalDocuments / stats.uniqueStudents.size).toFixed(2)}`);

    // Display stars statistics
    console.log('\n⭐ STARS STATISTICS:');
    console.log('-'.repeat(60));
    console.log(`  Total Stars Awarded: ${stats.totalStarsAwarded}`);
    console.log(`  Average Stars per Request: ${(stats.totalStarsAwarded / totalDocuments).toFixed(2)}`);

    // Display date range
    console.log('\n📅 DATE RANGE:');
    console.log('-'.repeat(60));
    if (stats.dateRange.earliest && stats.dateRange.latest) {
      const earliestDate = new Date(stats.dateRange.earliest).toLocaleString();
      const latestDate = new Date(stats.dateRange.latest).toLocaleString();
      console.log(`  Earliest Request: ${earliestDate}`);
      console.log(`  Latest Request: ${latestDate}`);

      const daysDiff = Math.floor((stats.dateRange.latest - stats.dateRange.earliest) / (1000 * 60 * 60 * 24));
      console.log(`  Time Span: ${daysDiff} days`);
    }

    // Display processing time statistics
    if (stats.processingTime.length > 0) {
      console.log('\n⏱️  PROCESSING TIME STATISTICS:');
      console.log('-'.repeat(60));
      stats.processingTime.sort((a, b) => a - b);
      const avgTime = stats.processingTime.reduce((a, b) => a + b, 0) / stats.processingTime.length;
      const minTime = stats.processingTime[0];
      const maxTime = stats.processingTime[stats.processingTime.length - 1];
      const medianTime = stats.processingTime[Math.floor(stats.processingTime.length / 2)];

      console.log(`  Average Processing Time: ${avgTime.toFixed(0)} seconds (${(avgTime / 60).toFixed(2)} minutes)`);
      console.log(`  Median Processing Time: ${medianTime} seconds (${(medianTime / 60).toFixed(2)} minutes)`);
      console.log(`  Min Processing Time: ${minTime} seconds`);
      console.log(`  Max Processing Time: ${maxTime} seconds`);
    }

    // Display students with most requests
    console.log('\n🏆 TOP 10 STUDENTS WITH MOST REQUESTS:');
    console.log('-'.repeat(60));
    const studentRequests = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      const studentId = data.studentId;
      const studentName = data.studentName;
      if (!studentRequests[studentId]) {
        studentRequests[studentId] = {
          name: studentName,
          count: 0,
          stars: 0,
          class: data.studentClass
        };
      }
      studentRequests[studentId].count++;
      studentRequests[studentId].stars += data.starRewardAmount || 0;
    });

    const topStudents = Object.values(studentRequests)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    topStudents.forEach((student, index) => {
      console.log(`  ${String(index + 1).padStart(2)}. ${student.name.substring(0, 25).padEnd(25)} ${student.count.toString().padStart(3)} requests, ${student.stars.toString().padStart(3)} ⭐ (${student.class})`);
    });

    // Display rejected requests (if any)
    if (stats.statusBreakdown['rejected'] && stats.statusBreakdown['rejected'] > 0) {
      console.log('\n❌ REJECTED REQUESTS:');
      console.log('-'.repeat(60));
      const rejectedDocs = snapshot.docs.filter(doc => doc.data().status === 'rejected');
      rejectedDocs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`  ${index + 1}. ${data.studentName} - ${data.starRewardName} (${data.studentClass})`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Analysis completed successfully!\n');

  } catch (error) {
    console.error('❌ Error analyzing starRequests collection:', error.message);
  }
}

async function main() {
  try {
    await analyzeStarRequests();
  } catch (error) {
    console.error('\n💥 Analysis failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().then(() => process.exit(0));
}
