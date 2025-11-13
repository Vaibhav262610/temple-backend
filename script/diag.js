// backend/scripts/diagnostic.js - Complete System Check
const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function runDiagnostics() {
  console.log('🔍 Running Temple Steward Diagnostics...\n');

  try {
    // 1. Check MongoDB Connection
    const MONGODB_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017/temple_steward';
    console.log(`📊 Connecting to: ${MONGODB_URI}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    // 2. Check Database Name
    const dbName = mongoose.connection.name;
    console.log(`📂 Current Database: ${dbName}`);
    if (dbName !== 'temple_steward') {
      console.log('⚠️  WARNING: Not using temple_steward database!\n');
    } else {
      console.log('✅ Using correct database\n');
    }

    // 3. List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Collections in database:');
    collections.forEach(col => console.log(`   - ${col.name}`));
    console.log('');

    // 4. Check community members
    const CommunityMember = mongoose.connection.collection('communitymembers');
    const memberCount = await CommunityMember.countDocuments();
    console.log(`👥 Community Members: ${memberCount}`);
    
    if (memberCount > 0) {
      const sampleMember = await CommunityMember.findOne();
      console.log('   Sample member structure:', {
        community_id: sampleMember.community_id,
        user_id: sampleMember.user_id,
        role: sampleMember.role,
        status: sampleMember.status
      });
    }
    console.log('');

    // 5. Check community tasks
    const CommunityTask = mongoose.connection.collection('communitytasks');
    const taskCount = await CommunityTask.countDocuments();
    console.log(`📋 Community Tasks: ${taskCount}`);
    
    if (taskCount > 0) {
      const sampleTask = await CommunityTask.findOne();
      console.log('   Sample task structure:', {
        community_id: sampleTask.community_id,
        title: sampleTask.title,
        status: sampleTask.status,
        priority: sampleTask.priority
      });
    }
    console.log('');

    // 6. Check communities
    const Community = mongoose.connection.collection('communities');
    const communityCount = await Community.countDocuments();
    console.log(`🏛️  Communities: ${communityCount}`);
    
    if (communityCount > 0) {
      const communities = await Community.find({}).toArray();
      communities.forEach(c => {
        console.log(`   - ${c.name} (ID: ${c._id})`);
      });
    }
    console.log('');

    // 7. Test insert task
    console.log('🧪 Testing task creation...');
    if (communityCount > 0) {
      const testCommunity = await Community.findOne();
      const testTask = {
        community_id: testCommunity._id,
        title: 'Test Task from Diagnostic',
        description: 'This is a test task',
        status: 'todo',
        priority: 'medium',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const result = await CommunityTask.insertOne(testTask);
      console.log('✅ Test task created successfully!');
      console.log(`   Task ID: ${result.insertedId}`);
      
      // Clean up test task
      await CommunityTask.deleteOne({ _id: result.insertedId });
      console.log('✅ Test task cleaned up\n');
    }

    console.log('✅ All diagnostics passed!\n');
    console.log('📝 Summary:');
    console.log(`   - Database: ${dbName}`);
    console.log(`   - Collections: ${collections.length}`);
    console.log(`   - Communities: ${communityCount}`);
    console.log(`   - Members: ${memberCount}`);
    console.log(`   - Tasks: ${taskCount}`);
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
    process.exit(0);
  }
}

runDiagnostics();
