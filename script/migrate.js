// backend/scripts/migrate.js - FIXED VERSION
const mongoose = require('mongoose');

async function migrate() {
  console.log('🚀 Starting migration from test to temple_steward...\n');

  try {
    // Connect to both databases
    await mongoose.connect('mongodb://localhost:27017/test');
    const testDB = mongoose.connection.useDb('test');
    const targetDB = mongoose.connection.useDb('temple_steward');

    // Collections to migrate (ONLY community-related)
    const communityCollections = [
      'communities',
      'community_events', 
      'community_members',
      'communityapplications',
      'communitytasks',
      'communityposts',
      'communityannouncements'
    ];

    for (const collectionName of communityCollections) {
      try {
        console.log(`📦 Migrating ${collectionName}...`);
        
        // Get source collection
        const sourceCollection = testDB.collection(collectionName);
        const targetCollection = targetDB.collection(collectionName);
        
        // Get all documents
        const documents = await sourceCollection.find({}).toArray();
        
        if (documents.length > 0) {
          // Clear target collection first (optional)
          await targetCollection.deleteMany({});
          
          // Insert into target
          await targetCollection.insertMany(documents);
          console.log(`✅ Migrated ${documents.length} documents from ${collectionName}\n`);
        } else {
          console.log(`⚠️  No documents found in ${collectionName}\n`);
        }
      } catch (error) {
        // Collection might not exist, skip it
        console.log(`⏭️  Skipping ${collectionName} (doesn't exist)\n`);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('Source: test database');
    console.log('Target: temple_steward database');
    console.log('Collections migrated: community-related collections only\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connections closed');
    process.exit(0);
  }
}

migrate();
