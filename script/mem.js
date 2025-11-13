// backend/scripts/seed-test-data.js - Create Test Data
const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function seedTestData() {
  try {
    console.log('🌱 Seeding test data for temple_steward...\n');

    const MONGODB_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017/temple_steward';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get collections
    const db = mongoose.connection.db;
    const CommunitiesCollection = db.collection('communities');
    const CommunityMembersCollection = db.collection('communitymembers');
    const UsersCollection = db.collection('users');

    // 1. Create test users
    console.log('👤 Creating test users...');
    const testUsers = [
      {
        full_name: 'Admin User',
        email: 'admin@temple.org',
        phone: '+91 98765 43210',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        full_name: 'John Doe',
        email: 'john@temple.org',
        phone: '+91 98765 43211',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        full_name: 'Jane Smith',
        email: 'jane@temple.org',
        phone: '+91 98765 43212',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    const userResult = await UsersCollection.insertMany(testUsers);
    const userIds = Object.values(userResult.insertedIds);
    console.log(`✅ Created ${userIds.length} test users\n`);

    // 2. Get existing communities
    const communities = await CommunitiesCollection.find({}).toArray();
    console.log(`📊 Found ${communities.length} communities\n`);

    if (communities.length === 0) {
      console.log('⚠️  No communities found. Please create a community first!');
      process.exit(0);
    }

    // 3. Add members to each community
    for (const community of communities) {
      console.log(`👥 Adding members to: ${community.name}`);
      
      const members = userIds.map((userId, index) => ({
        community_id: community._id,
        user_id: userId,
        role: index === 0 ? 'admin' : 'member',
        status: 'active',
        is_lead: index === 0,
        lead_position: index === 0 ? 'coordinator' : '',
        joined_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }));

      await CommunityMembersCollection.insertMany(members);
      console.log(`   ✅ Added ${members.length} members to ${community.name}`);
    }

    console.log('\n✅ Test data seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Users: ${userIds.length}`);
    console.log(`   - Communities: ${communities.length}`);
    console.log(`   - Members per community: ${userIds.length}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
    process.exit(0);
  }
}

seedTestData();
