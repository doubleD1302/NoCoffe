import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/no-coffee';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB!');
    
    const admin = mongoose.connection.db.admin();
    const dbsList = await admin.listDatabases();
    console.log('All databases in MongoDB:');
    
    for (const dbInfo of dbsList.databases) {
      if (dbInfo.name.startsWith('no-coffee')) {
        const db = mongoose.connection.useDb(dbInfo.name);
        // List collections
        const collections = await db.db.listCollections().toArray();
        console.log(`\nDatabase: ${dbInfo.name}`);
        for (const col of collections) {
          const count = await db.db.collection(col.name).countDocuments();
          console.log(`  Collection: ${col.name} -> Count: ${count}`);
          if (col.name === 'menuitems') {
            const sample = await db.db.collection(col.name).findOne();
            console.log('  Sample MenuItem:', sample);
          }
        }
      }
    }

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}

run();
