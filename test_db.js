import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/no-coffee';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB!');
    
    // Check menu items in no-coffee-usr-65166121
    const testDb = mongoose.connection.useDb('no-coffee-usr-65166121');
    const MenuItemSchema = new mongoose.Schema({ id: String, name: String });
    const MenuItem = testDb.model('MenuItem', MenuItemSchema);
    const menuItems = await MenuItem.find({});
    console.log('test_manager_xyz3 (usr-65166121) menu items count:', menuItems.length);

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}

run();
