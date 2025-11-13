// Mongo -> Supabase migration for Users and Communities
const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
const pLimit = require('p-limit');

require('dotenv').config();

async function main() {
	console.log('🚀 Migrating Users and Communities from Mongo to Supabase...');

	const mongoUri = process.env.MONGODB_URL || 'mongodb://localhost:27017/temple_steward';
	await mongoose.connect(mongoUri);
	const db = mongoose.connection;

	const supabaseUrl = process.env.SUPABASE_URL;
	const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
	if (!supabaseUrl || !supabaseKey) {
		throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
	}
	const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

	const limit = pLimit(10);
	const toTextId = (id) => (id ? String(id) : null);

	// Users
	console.log('📦 Migrating users...');
	const userDocs = await db.collection('users').find({}).toArray();
	await Promise.all(userDocs.map((doc) => limit(async () => {
		const row = {
			id: toTextId(doc._id),
			email: doc.email,
			full_name: doc.full_name || null,
			phone: doc.phone || null,
			avatar_url: doc.avatar_url || null,
			status: doc.status || 'active',
			metadata: doc.address || {},
			preferences: doc.preferences || {},
			created_at: doc.created_at || new Date(),
			updated_at: doc.updated_at || new Date(),
			last_login_at: doc.last_login || null
		};
		const { error } = await supabase.from('users').upsert(row, { onConflict: 'id' });
		if (error) throw error;
	})));

	// Communities
	console.log('📦 Migrating communities...');
	const communityDocs = await db.collection('communities').find({}).toArray();
	await Promise.all(communityDocs.map((doc) => limit(async () => {
		const row = {
			id: toTextId(doc._id),
			name: doc.name,
			slug: doc.slug,
			description: doc.description || null,
			owner_id: toTextId(doc.owner_id),
			logo_url: doc.logo_url || null,
			cover_image_url: doc.cover_image_url || null,
			status: doc.status || 'active',
			settings: doc.settings || {},
			metadata: doc.metadata || {},
			created_at: doc.created_at || new Date(),
			updated_at: doc.updated_at || new Date()
		};
		const { error } = await supabase.from('communities').upsert(row, { onConflict: 'id' });
		if (error) throw error;
	})));

	await mongoose.connection.close();
	console.log('✅ Migration complete.');
}

main().catch((err) => {
	console.error('❌ Migration failed:', err);
	process.exit(1);
});
