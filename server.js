import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/no-coffee';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(__dirname));
app.use('/src', express.static(path.join(__dirname, 'src')));

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('🍃 MongoDB connected successfully!'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ==========================================================================
// Mongoose Schemas & Models
// ==========================================================================

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true }, // 'dev-admin' | 'manager' | 'employee'
  managerId: { type: String, default: null }, // null cho manager, manager's id cho employee
  hourlyWage: { type: Number, default: 20000 },
  salaryCycle: { type: String, default: 'weekly' }, // 'weekly' | 'monthly'
  salaryStartDate: { type: String, default: '2026-06-01' },
  qrCode: { type: String, default: '' }
});

const IngredientSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  unit: { type: String, required: true },
  stock: { type: Number, required: true, default: 0 },
  cost: { type: Number, required: true, default: 0 },
  minStock: { type: Number, required: true, default: 0 },
  ownerId: { type: String, required: true }
});

const MenuItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true }, // 'Coffee' | 'MilkTea' | 'Tea' | 'Topping' | etc.
  emoji: { type: String, default: '☕' },
  recipe: { type: mongoose.Schema.Types.Mixed, default: {} }, // ingId -> qty
  image: { type: String, default: '' }, // base64 string
  ownerId: { type: String, required: true }
});

const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  timestamp: { type: String, required: true },
  items: { type: Array, default: [] },
  totalPrice: { type: Number, required: true },
  cogs: { type: Number, required: true },
  paymentMethod: { type: String, required: true }, // 'Tiền mặt' | 'Chuyển khoản'
  status: { type: String, required: true, default: 'completed' },
  cashReceived: { type: Number, required: true },
  cashChange: { type: Number, required: true },
  ownerId: { type: String, required: true }
});

const WasteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  timestamp: { type: String, required: true },
  ingredientId: { type: String, required: true },
  ingredientName: { type: String, required: true },
  qty: { type: Number, required: true },
  unit: { type: String, required: true },
  cost: { type: Number, required: true },
  reason: { type: String, required: true },
  reportedBy: { type: String, required: true },
  ownerId: { type: String, required: true }
});

const ShiftSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  dayOfWeek: { type: Number, required: true }, // Number (0-6)
  shiftName: { type: String, required: true }, // 'Ca sáng' | 'Ca chiều'
  timeRange: { type: String, required: true }, // '06:30 - 12:30', etc.
  employeeId: { type: String, default: '' },
  employeeName: { type: String, default: '' },
  ownerId: { type: String, required: true }
});

const ShiftRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  dayOfWeek: { type: Number, required: true },
  requestType: { type: String, required: true }, // 'change' | 'off'
  requestedShiftName: { type: String, default: '' },
  requestedTimeRange: { type: String, default: '' },
  reason: { type: String, default: '' },
  status: { type: String, required: true, default: 'pending' }, // 'pending' | 'approved' | 'rejected'
  timestamp: { type: String, required: true },
  ownerId: { type: String, required: true }
});

const AttendanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD'
  checkInTime: { type: String, required: true },
  checkOutTime: { type: String, default: '' },
  durationHours: { type: Number, default: 0 },
  checkInPhoto: { type: String, default: '' },
  checkOutPhoto: { type: String, default: '' },
  paidStatus: { type: String, default: 'unpaid' }, // 'unpaid' | 'paid'
  ownerId: { type: String, required: true }
});

const MenuCategorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  ownerId: { type: String, required: true }
});

const ConfigSchema = new mongoose.Schema({
  bypassLogin: { type: Boolean, default: true },
  activeUser: { type: mongoose.Schema.Types.Mixed, default: null }
});

const User = mongoose.model('User', UserSchema);
const Ingredient = mongoose.model('Ingredient', IngredientSchema);
const MenuItem = mongoose.model('MenuItem', MenuItemSchema);
const Order = mongoose.model('Order', OrderSchema);
const Waste = mongoose.model('Waste', WasteSchema);
const Shift = mongoose.model('Shift', ShiftSchema);
const ShiftRequest = mongoose.model('ShiftRequest', ShiftRequestSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);
const MenuCategory = mongoose.model('MenuCategory', MenuCategorySchema);
const Config = mongoose.model('Config', ConfigSchema);

// ==========================================================================
// Default Setup Data (Initial Seeds)
// ==========================================================================

const DEFAULT_USERS = [
  { id: 'usr-admin', username: 'admin', password: '123', name: 'Admin đẹp trai', role: 'dev-admin', hourlyWage: 30000, salaryCycle: 'weekly', salaryStartDate: '2026-06-01' },
  { id: 'usr-manager', username: 'manager', password: '123', name: 'Anh Quản Lý', role: 'manager', hourlyWage: 25000, salaryCycle: 'weekly', salaryStartDate: '2026-06-01' },
  { id: 'usr-staff', username: 'staff', password: '123', name: 'Bé Nhân Viên', role: 'employee', hourlyWage: 20000, salaryCycle: 'weekly', salaryStartDate: '2026-06-01' }
];

const DEFAULT_INGREDIENTS = [
  { id: 'cf', name: 'Cà phê hạt', unit: 'g', stock: 5000, cost: 150, minStock: 2000 },
  { id: 'sua', name: 'Sữa đặc', unit: 'g', stock: 3000, cost: 60, minStock: 1000 },
  { id: 'suatuoi', name: 'Sữa tươi', unit: 'ml', stock: 6000, cost: 40, minStock: 2000 },
  { id: 'duong', name: 'Nước đường', unit: 'ml', stock: 3000, cost: 10, minStock: 1000 },
  { id: 'ly', name: 'Ly nhựa', unit: 'cái', stock: 500, cost: 500, minStock: 100 },
  { id: 'da', name: 'Đá viên', unit: 'g', stock: 20000, cost: 5, minStock: 5000 }
];

const DEFAULT_MENU = [
  { id: 'cf-den', name: 'Cà phê đen đá', price: 20000, category: 'cf', emoji: '☕', recipe: { cf: 20, duong: 15, ly: 1, da: 150 } },
  { id: 'cf-sua', name: 'Cà phê sữa đá', price: 25000, category: 'cf', emoji: '🧋', recipe: { cf: 20, sua: 30, ly: 1, da: 150 } },
  { id: 'bac-xiu', name: 'Bạc xỉu', price: 29000, category: 'cf', emoji: '🥛', recipe: { cf: 15, sua: 40, suatuoi: 60, ly: 1, da: 150 } },
  { id: 'sua-tuoi-tc', name: 'Sữa tươi trân châu đường đen', price: 35000, category: 'milktea', emoji: '🥤', recipe: { suatuoi: 150, duong: 30, ly: 1, da: 150 } }
];

const DEFAULT_SHIFTS = [
  { id: 'sh-1', dayOfWeek: 1, shiftName: 'Ca sáng', timeRange: '06:30 - 12:30', employeeId: 'usr-staff', employeeName: 'Bé Nhân Viên' },
  { id: 'sh-2', dayOfWeek: 1, shiftName: 'Ca chiều', timeRange: '12:30 - 18:30', employeeId: '', employeeName: '' },
  { id: 'sh-3', dayOfWeek: 2, shiftName: 'Ca sáng', timeRange: '06:30 - 12:30', employeeId: 'usr-staff', employeeName: 'Bé Nhân Viên' },
  { id: 'sh-4', dayOfWeek: 2, shiftName: 'Ca chiều', timeRange: '12:30 - 18:30', employeeId: '', employeeName: '' },
  { id: 'sh-5', dayOfWeek: 3, shiftName: 'Ca sáng', timeRange: '06:30 - 12:30', employeeId: '', employeeName: '' },
  { id: 'sh-6', dayOfWeek: 3, shiftName: 'Ca chiều', timeRange: '12:30 - 18:30', employeeId: 'usr-staff', employeeName: 'Bé Nhân Viên' },
  { id: 'sh-7', dayOfWeek: 4, shiftName: 'Ca sáng', timeRange: '06:30 - 12:30', employeeId: 'usr-staff', employeeName: 'Bé Nhân Viên' },
  { id: 'sh-8', dayOfWeek: 4, shiftName: 'Ca chiều', timeRange: '12:30 - 18:30', employeeId: '', employeeName: '' },
  { id: 'sh-9', dayOfWeek: 5, shiftName: 'Ca sáng', timeRange: '06:30 - 12:30', employeeId: 'usr-staff', employeeName: 'Bé Nhân Viên' },
  { id: 'sh-10', dayOfWeek: 5, shiftName: 'Ca chiều', timeRange: '12:30 - 18:30', employeeId: 'usr-staff', employeeName: 'Bé Nhân Viên' },
  { id: 'sh-11', dayOfWeek: 6, shiftName: 'Ca sáng', timeRange: '06:30 - 12:30', employeeId: '', employeeName: '' },
  { id: 'sh-12', dayOfWeek: 6, shiftName: 'Ca chiều', timeRange: '12:30 - 18:30', employeeId: 'usr-manager', employeeName: 'Anh Quản Lý' },
  { id: 'sh-13', dayOfWeek: 0, shiftName: 'Ca sáng', timeRange: '06:30 - 12:30', employeeId: '', employeeName: '' },
  { id: 'sh-14', dayOfWeek: 0, shiftName: 'Ca chiều', timeRange: '12:30 - 18:30', employeeId: 'usr-manager', employeeName: 'Anh Quản Lý' }
];

const DEFAULT_CATEGORIES = [
  { id: 'cf', name: 'Cà phê' },
  { id: 'tra', name: 'Trà' },
  { id: 'milktea', name: 'Trà sữa' }
];

const ADMIN_USER = {
  id: 'usr-admin',
  username: '13022005uit',
  password: '13022005',
  name: 'Admin',
  role: 'dev-admin',
  hourlyWage: 30000,
  salaryCycle: 'weekly',
  salaryStartDate: '2026-06-01'
};

async function initializeDatabase() {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await User.create(ADMIN_USER);
    await Config.create({ bypassLogin: false, activeUser: null });
    console.log('🌱 Admin user seeded successfully!');
  }
}

// Ensure database has default data
initializeDatabase();

// ==========================================================================
// API Routing
// ==========================================================================

// GET database state - hỗ trợ lọc theo userId để tách biệt dữ liệu hoàn toàn
app.get('/api/db', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.json({
                users: [],
                ingredients: [],
                menu: [],
                orders: [],
                waste: [],
                shifts: [],
                shiftRequests: [],
                attendance: [],
                categories: [],
                config: { bypassLogin: false, activeUser: null }
            });
        }

        const user = await User.findOne({ id: userId });
        if (!user) {
            return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
        }

        // 30 days attendance cleanup
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        const cutoffStr = `${cutoffDate.getFullYear()}-${(cutoffDate.getMonth() + 1).toString().padStart(2, '0')}-${cutoffDate.getDate().toString().padStart(2, '0')}`;
        await Attendance.deleteMany({ date: { $lt: cutoffStr } });

        let usersQuery = { id: userId };
        let shiftsQuery = { ownerId: userId };
        let shiftRequestsQuery = { ownerId: userId };
        let attendanceQuery = { ownerId: userId };

        if (user.role === 'manager') {
            // Manager xem được thông tin của mình + tất cả nhân viên do mình quản lý
            const employees = await User.find({ managerId: userId });
            const employeeIds = employees.map(emp => emp.id);
            const allIds = [userId, ...employeeIds];

            usersQuery = { $or: [{ id: userId }, { managerId: userId }] };
            // Manager xem/quản lý ca trực, đổi lịch và chấm công của nhân viên
            shiftsQuery = { ownerId: { $in: allIds } };
            shiftRequestsQuery = { ownerId: { $in: allIds } };
            attendanceQuery = { ownerId: { $in: allIds } };
        } else if (user.role === 'dev-admin') {
            // Dev Admin quản trị cao nhất, xem toàn bộ dữ liệu của hệ thống
            usersQuery = {};
            shiftsQuery = {};
            shiftRequestsQuery = {};
            attendanceQuery = {};
        }

        // Dữ liệu kho nguyên liệu, thực đơn, phân nhóm, đơn hàng, hao hụt hoàn toàn tách biệt
        // (Dev admin xem hết, manager/employee chỉ xem của riêng họ)
        let dataFilter = { ownerId: userId };
        if (user.role === 'dev-admin') {
            dataFilter = {};
        }

        const users = await User.find(usersQuery);
        const ingredients = await Ingredient.find(dataFilter);
        const menu = await MenuItem.find(dataFilter);
        const orders = await Order.find(dataFilter);
        const waste = await Waste.find(dataFilter);
        const categories = await MenuCategory.find(dataFilter);

        const shifts = await Shift.find(shiftsQuery);
        const shiftRequests = await ShiftRequest.find(shiftRequestsQuery);
        const attendance = await Attendance.find(attendanceQuery);

        res.json({
            users,
            ingredients,
            menu,
            orders,
            waste,
            shifts,
            shiftRequests,
            attendance,
            categories,
            config: {
                bypassLogin: false,
                activeUser: user
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi tải Database từ server', details: err.message });
    }
});

// POST reset database
app.post('/api/db/reset', async (req, res) => {
  try {
    await User.deleteMany();
    await Ingredient.deleteMany();
    await MenuItem.deleteMany();
    await Order.deleteMany();
    await Waste.deleteMany();
    await Shift.deleteMany();
    await ShiftRequest.deleteMany();
    await Attendance.deleteMany();
    await MenuCategory.deleteMany();
    await Config.deleteMany();

    await User.create(ADMIN_USER);
    await Config.create({ bypassLogin: false, activeUser: null });

    res.json({ success: true, message: 'Reset cơ sở dữ liệu thành công! Chỉ giữ lại tài khoản Admin.' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi reset database', details: err.message });
  }
});

// POST seed 30 days
app.post('/api/db/seed', async (req, res) => {
  try {
    // Clear dynamic logs
    await Order.deleteMany();
    await Waste.deleteMany();
    await Attendance.deleteMany();

    // Reset stock to default high to allow deductions in logs
    await Ingredient.deleteMany();
    const seedIngredients = DEFAULT_INGREDIENTS.map(ing => ({
      ...ing,
      stock: ing.stock * 5 // 5x stock to avoid negative numbers
    }));
    await Ingredient.insertMany(seedIngredients);

    const now = new Date();
    const ordersToInsert = [];
    const wasteToInsert = [];
    const attendanceToInsert = [];

    const menuItems = await MenuItem.find();
    const ingredients = await Ingredient.find();

    const getIngredient = (id) => ingredients.find(ing => ing.id === id);

    // Generate 30 days of data
    for (let day = 29; day >= 0; day--) {
      const currentDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
      const todayStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;

      // 1. Attendance for this day (except weekend maybe)
      const dayOfWeek = currentDate.getDay(); // 0 is CN, 1 is T2, etc.

      const dayShifts = DEFAULT_SHIFTS.filter(s => s.dayOfWeek === dayOfWeek);
      for (const shift of dayShifts) {
        // Generate attendance log
        const checkInHour = shift.shiftName === 'Ca sáng' ? 6 : 12;
        const checkOutHour = checkInHour + 6;
        
        attendanceToInsert.push({
          id: `att-${shift.employeeId}-${todayStr}`,
          employeeId: shift.employeeId,
          employeeName: shift.employeeName,
          date: todayStr,
          checkInTime: `${checkInHour.toString().padStart(2, '0')}:00`,
          checkOutTime: `${checkOutHour.toString().padStart(2, '0')}:00`,
          durationHours: 5
        });
      }

      // 2. Sales Orders (between 10 and 25 per day)
      const orderCount = Math.floor(Math.random() * 16) + 10;
      for (let orderIndex = 0; orderIndex < orderCount; orderIndex++) {
        // Random hour between 7:00 and 19:00
        const randHour = Math.floor(Math.random() * 13) + 7;
        const randMinute = Math.floor(Math.random() * 60);
        const orderTime = new Date(currentDate);
        orderTime.setHours(randHour, randMinute, 0, 0);

        // Random items (1 to 3 drinks)
        const cartItemsCount = Math.floor(Math.random() * 3) + 1;
        const items = [];
        let totalPrice = 0;
        let cogs = 0;

        for (let i = 0; i < cartItemsCount; i++) {
          const drink = menuItems[Math.floor(Math.random() * menuItems.length)];
          const size = Math.random() > 0.35 ? 'S' : 'L';
          const qty = Math.floor(Math.random() * 2) + 1; // 1 or 2
          const sugar = ['30%', '50%', '70%', '100%'][Math.floor(Math.random() * 4)];
          const ice = ['50%', '100%'][Math.floor(Math.random() * 2)];

          const sizePriceOffset = size === 'L' ? 5000 : 0;
          const unitPrice = drink.price + sizePriceOffset;

          // Calculate COGS
          let itemCogs = 0;
          if (drink.recipe) {
            Object.keys(drink.recipe).forEach(ingId => {
              let qtyNeeded = drink.recipe[ingId];
              if (size === 'L' && ['cf', 'sua', 'suatuoi', 'duong'].includes(ingId)) {
                qtyNeeded = Math.ceil(qtyNeeded * 1.3);
              }
              const ing = getIngredient(ingId);
              if (ing) {
                itemCogs += qtyNeeded * ing.cost;
                // Deduct stock representing history consumption
                ing.stock = Math.max(0, ing.stock - (qtyNeeded * qty));
              }
            });
          }

          items.push({
            id: drink.id,
            name: drink.name,
            emoji: drink.emoji,
            price: unitPrice,
            qty: qty,
            size: size,
            sugar: sugar,
            ice: ice,
            notes: '',
            recipe: drink.recipe
          });

          totalPrice += unitPrice * qty;
          cogs += itemCogs * qty;
        }

        const paymentMethod = Math.random() > 0.4 ? 'Tiền mặt' : 'Chuyển khoản';
        const cashReceived = paymentMethod === 'Tiền mặt' ? Math.ceil(totalPrice / 10000) * 10000 : totalPrice;

        ordersToInsert.push({
          id: 'DH-' + Math.floor(100000 + Math.random() * 900000).toString(),
          timestamp: orderTime.toISOString(),
          items: items,
          totalPrice: totalPrice,
          cogs: cogs,
          paymentMethod: paymentMethod,
          status: 'completed',
          cashReceived: cashReceived,
          cashChange: cashReceived - totalPrice
        });
      }

      // 3. Waste logs (roughly 1 event every 4 days)
      if (Math.random() > 0.75) {
        const ing = ingredients[Math.floor(Math.random() * ingredients.length)];
        const qty = Math.floor(Math.random() * 5) + 1; // 1 to 5 units
        const cost = qty * ing.cost;
        const reason = ['Làm hỏng', 'Hết hạn sử dụng', 'Rơi vỡ', 'Kiến bám'][Math.floor(Math.random() * 4)];
        const reportedBy = ['Anh Quản Lý', 'Bé Nhân Viên'][Math.floor(Math.random() * 2)];
        
        wasteToInsert.push({
          id: 'HH-' + Math.floor(100000 + Math.random() * 900000).toString(),
          timestamp: currentDate.toISOString(),
          ingredientId: ing.id,
          ingredientName: ing.name,
          qty: qty,
          unit: ing.unit,
          cost: cost,
          reason: reason,
          reportedBy: reportedBy
        });

        // Deduct from stock
        ing.stock = Math.max(0, ing.stock - qty);
      }
    }

    // Save modified stocks
    for (const ing of ingredients) {
      await ing.save();
    }

    // Bulk insert dynamic logs
    await Order.insertMany(ordersToInsert);
    await Waste.insertMany(wasteToInsert);
    await Attendance.insertMany(attendanceToInsert);

    res.json({ success: true, message: 'Đã sinh dữ liệu lịch sử thành công!' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi sinh dữ liệu mẫu 30 ngày', details: err.message });
  }
});

// POST checkout order (with dynamic stock subtraction)
app.post('/api/orders/checkout', async (req, res) => {
  try {
    const { order } = req.body;
    if (!order) return res.status(400).json({ error: 'Thông tin đơn hàng bị thiếu' });

    // Deduct stock for each cart item
    for (const item of order.items) {
      if (item.recipe) {
        for (const ingId of Object.keys(item.recipe)) {
          let qtyNeeded = item.recipe[ingId];
          // Size L offset multiplier (x1.3)
          if (item.size === 'L' && ['cf', 'sua', 'suatuoi', 'duong'].includes(ingId)) {
            qtyNeeded = Math.ceil(qtyNeeded * 1.3);
          }
          const totalDeduction = qtyNeeded * item.qty;

          // Find ingredient and subtract stock (scoped to the order's ownerId)
          await Ingredient.findOneAndUpdate(
            { id: ingId, ownerId: order.ownerId },
            { $inc: { stock: -totalDeduction } }
          );
        }
      }
    }

    // Save order record
    const newOrder = new Order({
      ...order,
      ownerId: order.ownerId
    });
    await newOrder.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi thanh toán đơn hàng', details: err.message });
  }
});

// POST restock ingredient
app.post('/api/inventory/restock', async (req, res) => {
  try {
    const { id, qty, customCostPerUnit, ownerId } = req.body;
    const updateObj = { $inc: { stock: qty } };
    if (customCostPerUnit !== undefined && customCostPerUnit !== null) {
      updateObj.$set = { cost: customCostPerUnit };
    }

    const updated = await Ingredient.findOneAndUpdate({ id, ownerId }, updateObj, { new: true });
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy nguyên liệu' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi nhập kho nguyên liệu', details: err.message });
  }
});

// POST log waste
app.post('/api/waste', async (req, res) => {
  try {
    const { wasteRecord } = req.body;
    if (!wasteRecord) return res.status(400).json({ error: 'Thiếu log hao hụt' });

    // Save waste record
    const newWaste = new Waste({
      ...wasteRecord,
      ownerId: wasteRecord.ownerId
    });
    await newWaste.save();

    // Deduct stock (scoped to the waste record's ownerId)
    await Ingredient.findOneAndUpdate(
      { id: wasteRecord.ingredientId, ownerId: wasteRecord.ownerId },
      { $inc: { stock: -wasteRecord.qty } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi ghi nhận hao hụt', details: err.message });
  }
});

// POST menu update (price, recipe, base64 image)
app.post('/api/menu/update', async (req, res) => {
  try {
    const { id, price, recipe, image } = req.body;

    const updateObj = {};
    if (price !== undefined) updateObj.price = price;
    if (recipe !== undefined) updateObj.recipe = recipe;
    if (image !== undefined) updateObj.image = image;

    const updated = await MenuItem.findOneAndUpdate({ id }, { $set: updateObj }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy món trong thực đơn' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật món thực đơn', details: err.message });
  }
});

// POST add menu item
app.post('/api/menu/add', async (req, res) => {
  try {
    const { name, price, category, emoji, ownerId } = req.body;
    const id = 'item-' + Date.now().toString().slice(-6);

    const newMenuItem = new MenuItem({
      id,
      name,
      price,
      category,
      emoji,
      recipe: {}, // start empty
      image: '',
      ownerId
    });

    await newMenuItem.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi thêm món mới', details: err.message });
  }
});

// POST delete menu item
app.post('/api/menu/delete', async (req, res) => {
  try {
    const { id } = req.body;
    const deleted = await MenuItem.findOneAndDelete({ id });
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy món thực đơn để xoá' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xoá món', details: err.message });
  }
});

// POST attendance Check-in / Check-out
app.post('/api/attendance', async (req, res) => {
  try {
    const { attendanceRecord } = req.body;
    if (!attendanceRecord) return res.status(400).json({ error: 'Thiếu thông tin điểm danh' });

    // Look for existing attendance check-in by id
    const existing = await Attendance.findOne({ id: attendanceRecord.id });
    if (existing) {
      // It's a check-out update
      if (attendanceRecord.checkOutTime) existing.checkOutTime = attendanceRecord.checkOutTime;
      if (attendanceRecord.durationHours !== undefined) existing.durationHours = attendanceRecord.durationHours;
      await existing.save();
    } else {
      // It's a new check-in
      const newAttendance = new Attendance({
        ...attendanceRecord,
        ownerId: attendanceRecord.employeeId
      });
      await newAttendance.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi ghi nhận ca trực', details: err.message });
  }
});

// POST Shift assignment updates
app.post('/api/shifts/update', async (req, res) => {
  try {
    const { id, employeeId, shiftName, timeRange, managerId } = req.body;
    
    let employeeName = '';
    if (employeeId) {
      const user = await User.findOne({ id: employeeId });
      employeeName = user ? user.name : 'Unknown';
    }

    // Nếu có nhân viên thì gán ownerId là nhân viên đó để họ xem được trong DB của họ.
    // Nếu trống ca thì chuyển ownerId về managerId.
    const ownerId = employeeId ? employeeId : managerId;

    await Shift.findOneAndUpdate(
      { id },
      { $set: { employeeId, employeeName, shiftName, timeRange, ownerId } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xếp ca làm việc', details: err.message });
  }
});

// POST Config
app.post('/api/config', async (req, res) => {
  try {
    const { bypassLogin, activeUser } = req.body;
    const updateObj = {};
    if (bypassLogin !== undefined) updateObj.bypassLogin = bypassLogin;
    if (activeUser !== undefined) updateObj.activeUser = activeUser;

    await Config.findOneAndUpdate({}, { $set: updateObj }, { upsert: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật cấu hình hệ thống', details: err.message });
  }
});

// POST create shift request
app.post('/api/shift-requests/create', async (req, res) => {
  try {
    const { employeeId, dayOfWeek, requestType, requestedShiftName, requestedTimeRange, reason } = req.body;
    
    // Find employee name
    const user = await User.findOne({ id: employeeId });
    const employeeName = user ? user.name : 'Nhân Viên';

    const id = 'req-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100).toString();
    const newRequest = new ShiftRequest({
      id,
      employeeId,
      employeeName,
      dayOfWeek,
      requestType,
      requestedShiftName,
      requestedTimeRange,
      reason,
      status: 'pending',
      timestamp: new Date().toISOString(),
      ownerId: employeeId
    });

    await newRequest.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi gửi yêu cầu đổi lịch', details: err.message });
  }
});

// POST approve shift request
app.post('/api/shift-requests/approve', async (req, res) => {
  try {
    const { id } = req.body;
    const request = await ShiftRequest.findOne({ id });
    if (!request) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });

    request.status = 'approved';
    await request.save();

    // Process actual shift update
    if (request.requestType === 'off') {
      // Set the shift on that day to unassigned instead of deleting it
      await Shift.findOneAndUpdate(
        { employeeId: request.employeeId, dayOfWeek: request.dayOfWeek },
        { $set: { employeeId: '', employeeName: '' } }
      );
    } else if (request.requestType === 'change') {
      // Update shift details for the employee's shift on that day
      await Shift.findOneAndUpdate(
        { employeeId: request.employeeId, dayOfWeek: request.dayOfWeek },
        { 
          $set: { 
            shiftName: request.requestedShiftName, 
            timeRange: request.requestedTimeRange 
          } 
        }
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi phê duyệt yêu cầu', details: err.message });
  }
});

// POST reject shift request
app.post('/api/shift-requests/reject', async (req, res) => {
  try {
    const { id } = req.body;
    const request = await ShiftRequest.findOneAndUpdate({ id }, { $set: { status: 'rejected' } });
    if (!request) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi từ chối yêu cầu', details: err.message });
  }
});

// POST add user (manager registers new employee for their store)
app.post('/api/users/add', async (req, res) => {
  try {
    const { username, password, name, managerId } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin nhân viên' });
    }
    if (!managerId) {
      return res.status(400).json({ error: 'Thiếu thông tin quản lý' });
    }

    // Check duplicate
    const existing = await User.findOne({ username: username.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Tài khoản này đã tồn tại trong hệ thống' });
    }

    const id = 'usr-' + Date.now().toString().slice(-8);
    const newUser = new User({
      id,
      username: username.trim().toLowerCase(),
      password,
      name,
      role: 'employee',
      managerId: managerId, // Thuộc về manager này
      hourlyWage: 20000,
      salaryCycle: 'weekly',
      salaryStartDate: new Date().toISOString().split('T')[0]
    });

    await newUser.save();
    res.json({ success: true, id, username: username.trim().toLowerCase(), name, role: 'employee', managerId });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tạo nhân sự mới', details: err.message });
  }
});

// POST delete user (manager removes employee)
app.post('/api/users/delete', async (req, res) => {
  try {
    const { id } = req.body;
    const deleted = await User.findOneAndDelete({ id });
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy nhân sự' });

    // Set employeeId/employeeName to empty for all their assigned shifts
    await Shift.updateMany(
      { employeeId: id },
      { $set: { employeeId: '', employeeName: '' } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xóa nhân sự', details: err.message });
  }
});

// POST update wage config
app.post('/api/users/update-wage-config', async (req, res) => {
  try {
    const { id, hourlyWage, salaryCycle, salaryStartDate } = req.body;
    const updated = await User.findOneAndUpdate(
      { id },
      { $set: { hourlyWage, salaryCycle, salaryStartDate } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật cấu hình lương', details: err.message });
  }
});

// POST update QR code
app.post('/api/users/update-qr', async (req, res) => {
  try {
    const { id, qrCode } = req.body;
    const updated = await User.findOneAndUpdate(
      { id },
      { $set: { qrCode } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải lên mã QR', details: err.message });
  }
});

// POST pay salary (completes payment for attendance logs)
app.post('/api/users/pay-salary', async (req, res) => {
  try {
    const { employeeId, beforeDate } = req.body;
    // Mark all unpaid attendance logs for this employee as paid
    const query = { employeeId, paidStatus: 'unpaid' };
    if (beforeDate) {
      query.date = { $lte: beforeDate };
    }
    await Attendance.updateMany(query, { $set: { paidStatus: 'paid' } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hoàn tất thanh toán lương', details: err.message });
  }
});

// POST add category
app.post('/api/categories/add', async (req, res) => {
  try {
    const { name, ownerId } = req.body;
    if (!name || !ownerId) return res.status(400).json({ error: 'Tên phân nhóm không được để trống hoặc thiếu ownerId' });

    const id = 'cat-' + Date.now().toString().slice(-6);
    const newCat = new MenuCategory({ id, name, ownerId });
    await newCat.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi thêm phân nhóm mới', details: err.message });
  }
});

// POST update category
app.post('/api/categories/update', async (req, res) => {
  try {
    const { id, name } = req.body;
    const updated = await MenuCategory.findOneAndUpdate({ id }, { $set: { name } }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy phân nhóm' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi chỉnh sửa phân nhóm', details: err.message });
  }
});

// POST delete category
app.post('/api/categories/delete', async (req, res) => {
  try {
    const { id } = req.body;
    const deleted = await MenuCategory.findOneAndDelete({ id });
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy phân nhóm' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xóa phân nhóm', details: err.message });
  }
});

// POST add ingredient
app.post('/api/inventory/add', async (req, res) => {
  try {
    const { name, unit, minStock, initialStock, unitCost, ownerId } = req.body;
    if (!name || !unit || !ownerId) {
      return res.status(400).json({ error: 'Thiếu thông tin nguyên liệu' });
    }
    const id = 'ing-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100).toString();
    const newIng = new Ingredient({
      id,
      name,
      unit,
      stock: Number(initialStock) || 0,
      cost: Number(unitCost) || 0,
      minStock: Number(minStock) || 0,
      ownerId
    });
    await newIng.save();
    res.json({ success: true, ingredient: newIng });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi thêm nguyên liệu mới', details: err.message });
  }
});

// POST update ingredient
app.post('/api/inventory/update', async (req, res) => {
  try {
    const { id, name, unit, minStock, cost } = req.body;
    const updateObj = {};
    if (name !== undefined) updateObj.name = name;
    if (unit !== undefined) updateObj.unit = unit;
    if (minStock !== undefined) updateObj.minStock = Number(minStock);
    if (cost !== undefined) updateObj.cost = Number(cost);

    const updated = await Ingredient.findOneAndUpdate({ id }, { $set: updateObj }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy nguyên liệu' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi chỉnh sửa nguyên liệu', details: err.message });
  }
});

// POST delete ingredient
app.post('/api/inventory/delete', async (req, res) => {
  try {
    const { id } = req.body;
    const deleted = await Ingredient.findOneAndDelete({ id });
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy nguyên liệu để xoá' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xoá nguyên liệu', details: err.message });
  }
});

// POST create custom shift slot
app.post('/api/shifts/create', async (req, res) => {
  try {
    const { dayOfWeek, shiftName, timeRange, ownerId } = req.body;
    const id = 'sh-' + Date.now().toString().slice(-6);
    const newShift = new Shift({
      id,
      dayOfWeek,
      shiftName,
      timeRange,
      employeeId: '',
      employeeName: '',
      ownerId
    });
    await newShift.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tạo ca làm mới', details: err.message });
  }
});

// POST delete custom shift slot
app.post('/api/shifts/delete', async (req, res) => {
  try {
    const { id } = req.body;
    const deleted = await Shift.findOneAndDelete({ id });
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy ca làm để xoá' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xoá ca làm', details: err.message });
  }
});

// POST auth/login - Đăng nhập tài khoản
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ tên đăng nhập và mật khẩu' });
    }
    const user = await User.findOne({
      username: username.trim().toLowerCase(),
      password: password.trim()
    });
    if (!user) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống khi đăng nhập', details: err.message });
  }
});

// POST auth/register - Đăng ký tài khoản Quản lý mới
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, name } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
    }

    // Đăng ký bên ngoài luôn tạo role manager, managerId = null
    const userRole = 'manager';

    // Kiểm tra trùng tên đăng nhập
    const existing = await User.findOne({ username: username.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại! Vui lòng chọn tên khác.' });
    }

    const id = 'usr-' + Date.now().toString().slice(-8);
    const newUser = new User({
      id,
      username: username.trim().toLowerCase(),
      password,
      name: name.trim(),
      role: userRole,
      managerId: null, // Manager không thuộc về ai
      hourlyWage: 25000,
      salaryCycle: 'weekly',
      salaryStartDate: new Date().toISOString().split('T')[0]
    });

    await newUser.save();
    res.json({ success: true, id, username: username.trim().toLowerCase(), name: name.trim(), role: userRole });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tạo tài khoản', details: err.message });
  }
});

// Fallback index.html serve
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`☕ Nơ Coffee server running on http://localhost:${PORT}`);
});
