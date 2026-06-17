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
  qrCode: { type: String, default: '' },
  avatar: { type: String, default: '' }
});

const IngredientSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  unit: { type: String, required: true },
  stock: { type: Number, required: true, default: 0 },
  cost: { type: Number, required: true, default: 0 },
  minStock: { type: Number, required: true, default: 0 }
});

const MenuItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true }, // 'Coffee' | 'MilkTea' | 'Tea' | 'Topping' | etc.
  emoji: { type: String, default: '☕' },
  recipe: { type: mongoose.Schema.Types.Mixed, default: {} }, // ingId -> qty
  image: { type: String, default: '' } // base64 string
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
  cashChange: { type: Number, required: true }
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
  reportedBy: { type: String, required: true }
});

const ShiftSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  dayOfWeek: { type: Number, required: true }, // Number (0-6)
  shiftName: { type: String, required: true }, // 'Ca sáng' | 'Ca chiều'
  timeRange: { type: String, required: true }, // '06:30 - 12:30', etc.
  employeeId: { type: String, default: '' },
  employeeName: { type: String, default: '' }
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
  timestamp: { type: String, required: true }
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
  paidStatus: { type: String, default: 'unpaid' } // 'unpaid' | 'paid'
});

const MenuCategorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true }
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
  { id: 'usr-admin', username: '13022005uit', password: '13022005', name: 'Admin', role: 'dev-admin', hourlyWage: 30000, salaryCycle: 'weekly', salaryStartDate: '2026-06-01' }
];

const DEFAULT_INGREDIENTS = [
  { id: 'sua', name: 'Sữa đặc', unit: 'g', stock: 10000, cost: 60, minStock: 2000 },
  { id: 'suatuoi', name: 'Sữa tươi', unit: 'ml', stock: 10000, cost: 40, minStock: 2000 },
  { id: 'kem_man', name: 'Kem mặn', unit: 'ml', stock: 5000, cost: 50, minStock: 1000 },
  { id: 'matcha', name: 'Bột Matcha', unit: 'g', stock: 2000, cost: 120, minStock: 500 },
  { id: 'rich', name: 'Sữa béo Rich', unit: 'ml', stock: 5000, cost: 50, minStock: 1000 },
  { id: 'chunky_dau', name: 'Chunky dâu', unit: 'g', stock: 3000, cost: 100, minStock: 500 },
  { id: 'oreo', name: 'Bánh Oreo', unit: 'g', stock: 2000, cost: 30, minStock: 500 },
  { id: 'kem_cheese', name: 'Kem cheese', unit: 'ml', stock: 5000, cost: 60, minStock: 1000 },
  { id: 'cf', name: 'Cà phê hạt', unit: 'g', stock: 10000, cost: 150, minStock: 2000 },
  { id: 'duong', name: 'Nước đường', unit: 'ml', stock: 10000, cost: 10, minStock: 2000 },
  { id: 'kem_choco', name: 'Kem choco', unit: 'ml', stock: 5000, cost: 50, minStock: 1000 },
  { id: 'oatside', name: 'Sữa Oatside', unit: 'ml', stock: 10000, cost: 80, minStock: 2000 },
  { id: 'sua_gau', name: 'Sữa gấu', unit: 'lon', stock: 100, cost: 15000, minStock: 20 },
  { id: 'suong_sao', name: 'Thạch sương sáo', unit: 'g', stock: 5000, cost: 20, minStock: 1000 },
  { id: 'caramel_muoi', name: 'Caramel muối', unit: 'ml', stock: 3000, cost: 80, minStock: 500 },
  { id: 'tra_trai_cay', name: 'Cốt Trà trái cây', unit: 'ml', stock: 20000, cost: 15, minStock: 5000 },
  { id: 'cot_tac', name: 'Nước cốt tắc', unit: 'ml', stock: 2000, cost: 20, minStock: 500 },
  { id: 'syrup_chanh', name: 'Syrup chanh', unit: 'ml', stock: 2000, cost: 30, minStock: 500 },
  { id: 'tran_chau_trang', name: 'Trân châu trắng', unit: 'g', stock: 5000, cost: 25, minStock: 1000 },
  { id: 'sot_xoai', name: 'Sốt xoài', unit: 'g', stock: 3000, cost: 50, minStock: 500 },
  { id: 'syrup_xoai', name: 'Syrup xoài', unit: 'ml', stock: 2000, cost: 40, minStock: 500 },
  { id: 'xoai_ngam', name: 'Xoài ngâm', unit: 'g', stock: 3000, cost: 60, minStock: 500 },
  { id: 'thach_dua', name: 'Thạch dừa', unit: 'g', stock: 5000, cost: 30, minStock: 1000 },
  { id: 'syrup_dau', name: 'Syrup dâu', unit: 'ml', stock: 2000, cost: 40, minStock: 500 },
  { id: 'hat_no_cu_nang', name: 'Hạt nổ củ năng', unit: 'g', stock: 5000, cost: 40, minStock: 1000 },
  { id: 'syrup_luu', name: 'Syrup lựu', unit: 'ml', stock: 2000, cost: 40, minStock: 500 },
  { id: 'syrup_dao', name: 'Syrup đào', unit: 'ml', stock: 2000, cost: 40, minStock: 500 },
  { id: 'sot_dao', name: 'Sốt đào', unit: 'g', stock: 3000, cost: 50, minStock: 500 },
  { id: 'topping_dao', name: 'Đào miếng (Topping)', unit: 'lát', stock: 200, cost: 1000, minStock: 50 },
  { id: 'syrup_thom', name: 'Syrup thơm', unit: 'ml', stock: 2000, cost: 40, minStock: 500 },
  { id: 'sot_thom', name: 'Sốt thơm', unit: 'g', stock: 3000, cost: 50, minStock: 500 },
  { id: 'topping_thom', name: 'Đác thơm (Topping)', unit: 'hạt', stock: 1000, cost: 500, minStock: 200 },
  { id: 'chunky_nho', name: 'Chunky nho', unit: 'g', stock: 3000, cost: 80, minStock: 500 },
  { id: 'syrup_chanh_day', name: 'Syrup chanh dây', unit: 'ml', stock: 2000, cost: 40, minStock: 500 },
  { id: 'chanh_day', name: 'Chanh dây tươi', unit: 'trái', stock: 100, cost: 3000, minStock: 20 },
  { id: 'bot_sua', name: 'Bột sữa', unit: 'g', stock: 5000, cost: 80, minStock: 1000 },
  { id: 'sinh_to_xoai', name: 'Sinh tố xoài', unit: 'ml', stock: 3000, cost: 50, minStock: 500 },
  { id: 'nguyen_la', name: 'Trà Nguyên Lá (Ủ)', unit: 'ml', stock: 20000, cost: 15, minStock: 5000 },
  { id: 'kem_trung', name: 'Kem trứng', unit: 'ml', stock: 3000, cost: 60, minStock: 500 },
  { id: 'khoai_mon_dam', name: 'Khoai môn dầm', unit: 'g', stock: 3000, cost: 50, minStock: 500 },
  { id: 'tran_chau_khoai_mon', name: 'Trân châu khoai môn', unit: 'g', stock: 5000, cost: 30, minStock: 1000 },
  { id: 'cacao', name: 'Bột Cacao', unit: 'g', stock: 3000, cost: 100, minStock: 500 },
  { id: 'sot_choco', name: 'Sốt choco', unit: 'ml', stock: 2000, cost: 40, minStock: 500 },
  { id: 'vun_oreo', name: 'Vụn bánh Oreo', unit: 'g', stock: 2000, cost: 30, minStock: 500 },
  { id: 'kem_buon_me', name: 'Kem buôn mê', unit: 'ml', stock: 5000, cost: 50, minStock: 1000 },
  { id: 'nươc_soi', name: 'Nước sôi', unit: 'ml', stock: 100000, cost: 0, minStock: 1000 },
  { id: 'ly', name: 'Ly nhựa', unit: 'cái', stock: 1000, cost: 500, minStock: 200 },
  { id: 'da', name: 'Đá viên', unit: 'g', stock: 50000, cost: 5, minStock: 10000 }
];

const DEFAULT_MENU = [
  // MATCHA
  { id: 'matcha-kem-man-m', name: 'Matcha kem mặn (M)', price: 30000, category: 'matcha', emoji: '🍵', recipe: { sua: 30, suatuoi: 80, kem_man: 30, matcha: 3, nươc_soi: 30, ly: 1, da: 150 } },
  { id: 'matcha-kem-man-l', name: 'Matcha kem mặn (L)', price: 35000, category: 'matcha', emoji: '🍵', recipe: { sua: 45, suatuoi: 120, kem_man: 40, matcha: 4, nươc_soi: 40, ly: 1, da: 180 } },
  { id: 'matcha-dau-m', name: 'Matcha dâu (M)', price: 32000, category: 'matcha', emoji: '🍵', recipe: { sua: 20, suatuoi: 80, rich: 10, chunky_dau: 20, matcha: 3, nươc_soi: 30, ly: 1, da: 150 } },
  { id: 'matcha-dau-l', name: 'Matcha dâu (L)', price: 37000, category: 'matcha', emoji: '🍵', recipe: { sua: 30, suatuoi: 120, rich: 15, chunky_dau: 30, matcha: 4, nươc_soi: 40, ly: 1, da: 180 } },
  { id: 'matcha-oreo-kem-pmd-m', name: 'Matcha oreo kem phô mai dẻo (M)', price: 35000, category: 'matcha', emoji: '🍵', recipe: { sua: 30, suatuoi: 100, oreo: 20, kem_cheese: 40, matcha: 3, nươc_soi: 30, ly: 1, da: 150 } },
  { id: 'matcha-oreo-kem-pmd-l', name: 'Matcha oreo kem phô mai dẻo (L)', price: 40000, category: 'matcha', emoji: '🍵', recipe: { sua: 45, suatuoi: 140, oreo: 30, kem_cheese: 50, matcha: 4, nươc_soi: 40, ly: 1, da: 180 } },
  { id: 'matcha-latte-m', name: 'Matcha latte (M)', price: 28000, category: 'matcha', emoji: '🍵', recipe: { sua: 30, suatuoi: 80, matcha: 3, nươc_soi: 30, ly: 1, da: 150 } },
  { id: 'matcha-latte-l', name: 'Matcha latte (L)', price: 33000, category: 'matcha', emoji: '🍵', recipe: { sua: 45, suatuoi: 120, matcha: 4, nươc_soi: 40, ly: 1, da: 180 } },
  { id: 'matcha-oatside-m', name: 'Matcha oatside (M)', price: 35000, category: 'matcha', emoji: '🍵', recipe: { sua: 30, oatside: 80, matcha: 3, nươc_soi: 30, ly: 1, da: 150 } },
  { id: 'matcha-oatside-l', name: 'Matcha oatside (L)', price: 40000, category: 'matcha', emoji: '🍵', recipe: { sua: 45, oatside: 120, matcha: 4, nươc_soi: 40, ly: 1, da: 180 } },
  { id: 'matcha-caramel-mh-m', name: 'Matcha caramel muối hồng (M)', price: 32000, category: 'matcha', emoji: '🍵', recipe: { sua: 30, suatuoi: 80, caramel_muoi: 10, matcha: 3, nươc_soi: 30, ly: 1, da: 150 } },
  { id: 'matcha-caramel-mh-l', name: 'Matcha caramel muối hồng (L)', price: 37000, category: 'matcha', emoji: '🍵', recipe: { sua: 45, suatuoi: 120, caramel_muoi: 15, matcha: 4, nươc_soi: 40, ly: 1, da: 180 } },
  { id: 'matcha-sua-gau-l', name: 'Matcha sữa gấu (L)', price: 35000, category: 'matcha', emoji: '🍵', recipe: { sua: 50, sua_gau: 1, matcha: 4, nươc_soi: 40, ly: 1, da: 180 } },
  { id: 'matcha-suong-sao-m', name: 'Matcha sương sáo (M)', price: 32000, category: 'matcha', emoji: '🍵', recipe: { sua: 30, suatuoi: 80, suong_sao: 50, matcha: 3, nươc_soi: 30, ly: 1, da: 150 } },
  { id: 'matcha-suong-sao-l', name: 'Matcha sương sáo (L)', price: 37000, category: 'matcha', emoji: '🍵', recipe: { sua: 45, suatuoi: 120, suong_sao: 70, matcha: 4, nươc_soi: 40, ly: 1, da: 180 } },
  { id: 'matcha-kem-cheese-m', name: 'Matcha kem cheese (M)', price: 32000, category: 'matcha', emoji: '🍵', recipe: { sua: 30, suatuoi: 80, kem_cheese: 40, matcha: 3, nươc_soi: 30, ly: 1, da: 150 } },
  { id: 'matcha-kem-cheese-l', name: 'Matcha kem cheese (L)', price: 37000, category: 'matcha', emoji: '🍵', recipe: { sua: 45, suatuoi: 120, kem_cheese: 50, matcha: 4, nươc_soi: 40, ly: 1, da: 180 } },

  // COFFEE
  { id: 'cf-da-m', name: 'Cà phê đá (M)', price: 18000, category: 'cf', emoji: '☕', recipe: { cf: 60, duong: 15, ly: 1, da: 150 } },
  { id: 'cf-da-l', name: 'Cà phê đá (L)', price: 22000, category: 'cf', emoji: '☕', recipe: { cf: 80, duong: 25, ly: 1, da: 180 } },
  { id: 'cf-sua-m', name: 'Cà phê sữa (M)', price: 20000, category: 'cf', emoji: '☕', recipe: { cf: 60, sua: 30, ly: 1, da: 150 } },
  { id: 'cf-sua-l', name: 'Cà phê sữa (L)', price: 25000, category: 'cf', emoji: '☕', recipe: { cf: 80, sua: 45, ly: 1, da: 180 } },
  { id: 'cf-muoi-m', name: 'Cà phê muối (M)', price: 25000, category: 'cf', emoji: '☕', recipe: { cf: 30, sua: 20, kem_man: 30, ly: 1, da: 150 } },
  { id: 'cf-muoi-l', name: 'Cà phê muối (L)', price: 30000, category: 'cf', emoji: '☕', recipe: { cf: 40, sua: 30, kem_man: 40, ly: 1, da: 180 } },
  { id: 'cf-kem-deo-buon-me-m', name: 'Cf kem dẻo buôn mê (M)', price: 28000, category: 'cf', emoji: '☕', recipe: { cf: 40, sua: 30, suatuoi: 20, kem_choco: 40, ly: 1, da: 150 } },
  { id: 'cf-kem-deo-buon-me-l', name: 'Cf kem dẻo buôn mê (L)', price: 33000, category: 'cf', emoji: '☕', recipe: { cf: 50, sua: 40, suatuoi: 30, kem_choco: 50, ly: 1, da: 180 } },
  { id: 'bac-xiu-m', name: 'Bạc xỉu (M)', price: 22000, category: 'cf', emoji: '☕', recipe: { cf: 30, sua: 30, suatuoi: 80, ly: 1, da: 150 } },
  { id: 'bac-xiu-l', name: 'Bạc xỉu (L)', price: 27000, category: 'cf', emoji: '☕', recipe: { cf: 40, sua: 45, suatuoi: 120, ly: 1, da: 180 } },
  { id: 'bac-xiu-kem-deo-buon-me-m', name: 'Bạc xỉu kem dẻo buôn mê (M)', price: 30000, category: 'cf', emoji: '☕', recipe: { cf: 30, sua: 30, suatuoi: 80, kem_choco: 40, ly: 1, da: 150 } },
  { id: 'bac-xiu-kem-deo-buon-me-l', name: 'Bạc xỉu kem dẻo buôn mê (L)', price: 35000, category: 'cf', emoji: '☕', recipe: { cf: 40, sua: 45, suatuoi: 120, kem_choco: 50, ly: 1, da: 180 } },
  { id: 'bac-xiu-muoi-m', name: 'Bạc xỉu muối (M)', price: 28000, category: 'cf', emoji: '☕', recipe: { cf: 30, sua: 20, suatuoi: 80, kem_man: 30, ly: 1, da: 150 } },
  { id: 'bac-xiu-muoi-l', name: 'Bạc xỉu muối (L)', price: 33000, category: 'cf', emoji: '☕', recipe: { cf: 40, sua: 30, suatuoi: 120, kem_man: 40, ly: 1, da: 180 } },
  { id: 'cf-sua-oatside-m', name: 'Cà phê sữa Oatside (M)', price: 32000, category: 'cf', emoji: '☕', recipe: { cf: 30, sua: 30, oatside: 80, ly: 1, da: 150 } },
  { id: 'cf-sua-oatside-l', name: 'Cà phê sữa Oatside (L)', price: 37000, category: 'cf', emoji: '☕', recipe: { cf: 40, sua: 45, oatside: 120, ly: 1, da: 180 } },
  { id: 'cf-sua-gau-l', name: 'Cà phê sữa gấu (L)', price: 32000, category: 'cf', emoji: '☕', recipe: { cf: 40, sua: 50, sua_gau: 1, ly: 1, da: 180 } },
  { id: 'cf-sua-tuoi-suong-sao-m', name: 'Cf sữa tươi sương sáo (M)', price: 28000, category: 'cf', emoji: '☕', recipe: { cf: 30, sua: 30, suatuoi: 80, suong_sao: 50, ly: 1, da: 150 } },
  { id: 'cf-sua-tuoi-suong-sao-l', name: 'Cf sữa tươi sương sáo (L)', price: 33000, category: 'cf', emoji: '☕', recipe: { cf: 40, sua: 45, suatuoi: 120, suong_sao: 70, ly: 1, da: 180 } },
  { id: 'cf-caramel-muoi-m', name: 'Cà phê caramel muối (M)', price: 28000, category: 'cf', emoji: '☕', recipe: { cf: 30, sua: 20, suatuoi: 80, caramel_muoi: 10, ly: 1, da: 150 } },
  { id: 'cf-caramel-muoi-l', name: 'Cà phê caramel muối (L)', price: 33000, category: 'cf', emoji: '☕', recipe: { cf: 40, sua: 30, suatuoi: 120, caramel_muoi: 15, ly: 1, da: 180 } },

  // TRÀ TRÁI CÂY
  { id: 'luc-tra-chanh-l', name: 'Lục trà chanh (L)', price: 30000, category: 'tra', emoji: '🍹', recipe: { tra_trai_cay: 120, duong: 15, cot_tac: 10, syrup_chanh: 30, tran_chau_trang: 40, ly: 1, da: 180 } },
  { id: 'tra-xoai-chan-day-l', name: 'Trà xoài chanh dây (L)', price: 35000, category: 'tra', emoji: '🍹', recipe: { tra_trai_cay: 120, duong: 15, cot_tac: 5, sot_xoai: 20, syrup_xoai: 20, xoai_ngam: 70, ly: 1, da: 180 } },
  { id: 'tra-xoai-thach-dua-l', name: 'Trà xoài thạch dừa (L)', price: 32000, category: 'tra', emoji: '🍹', recipe: { tra_trai_cay: 120, duong: 15, cot_tac: 5, sot_xoai: 20, syrup_xoai: 20, thach_dua: 40, ly: 1, da: 180 } },
  { id: 'tra-dau-dao-hong-l', name: 'Trà dâu đào hồng (L)', price: 35000, category: 'tra', emoji: '🍹', recipe: { tra_trai_cay: 120, duong: 15, cot_tac: 5, chunky_dau: 20, syrup_dau: 20, hat_no_cu_nang: 30, ly: 1, da: 180 } },
  { id: 'tra-luu-do-thach-dua-l', name: 'Trà lựu đỏ thạch dừa (L)', price: 32000, category: 'tra', emoji: '🍹', recipe: { tra_trai_cay: 120, duong: 15, cot_tac: 5, syrup_luu: 30, thach_dua: 40, ly: 1, da: 180 } },
  { id: 'tra-dao-l', name: 'Trà đào (L)', price: 30000, category: 'tra', emoji: '🍹', recipe: { tra_trai_cay: 120, duong: 15, syrup_dao: 20, sot_dao: 20, topping_dao: 3, ly: 1, da: 180 } },
  { id: 'tra-lai-dac-thom-l', name: 'Trà lài đặc thơm (L)', price: 32000, category: 'tra', emoji: '🍹', recipe: { tra_trai_cay: 120, duong: 15, cot_tac: 5, syrup_thom: 20, sot_thom: 20, topping_thom: 5, ly: 1, da: 180 } },
  { id: 'tra-nho-chuoi-ngoc-l', name: 'Trà nho chuối ngọc (L)', price: 35000, category: 'tra', emoji: '🍹', recipe: { tra_trai_cay: 120, duong: 25, cot_tac: 10, chunky_nho: 30, hat_no_cu_nang: 30, ly: 1, da: 180 } },
  { id: 'tra-thanh-xuan-nhiet-doi-l', name: 'Trà thanh xuân nhiệt đới (L)', price: 37000, category: 'tra', emoji: '🍹', recipe: { tra_trai_cay: 120, duong: 15, syrup_dau: 40, syrup_chanh_day: 20, chanh_day: 1, hat_no_cu_nang: 30, ly: 1, da: 180 } },

  // TRÀ SỮA
  { id: 'luc-tra-sua-xoai-l', name: 'Lục trà sữa xoài (L)', price: 35000, category: 'milktea', emoji: '🧋', recipe: { sua: 30, tra_trai_cay: 120, duong: 10, bot_sua: 10, syrup_xoai: 5, sinh_to_xoai: 40, ly: 1, da: 180 } },
  { id: 'luc-tra-sua-lai-l', name: 'Lục trà sữa lài (L)', price: 30000, category: 'milktea', emoji: '🧋', recipe: { sua: 40, tra_trai_cay: 120, duong: 10, bot_sua: 15, tran_chau_trang: 40, ly: 1, da: 180 } },
  { id: 'nguyen-la-l', name: 'Nguyên lá (L)', price: 30000, category: 'milktea', emoji: '🧋', recipe: { sua: 40, nguyen_la: 120, duong: 10, bot_sua: 15, tran_chau_trang: 40, ly: 1, da: 180 } },
  { id: 'nguyen-la-luc-tra-suong-sao-l', name: 'Nguyên lá / Lục trà sương sáo (L)', price: 32000, category: 'milktea', emoji: '🧋', recipe: { sua: 40, nguyen_la: 120, duong: 10, bot_sua: 15, suong_sao: 70, ly: 1, da: 180 } },
  { id: 'nguyen-la-luc-tra-kem-pmd-l', name: 'Nguyên lá / Lục trà kem phô mai dẻo (L)', price: 37000, category: 'milktea', emoji: '🧋', recipe: { sua: 40, nguyen_la: 120, duong: 10, bot_sua: 15, tran_chau_trang: 40, kem_cheese: 50, ly: 1, da: 180 } },
  { id: 'nguyen-la-luc-tra-kem-man-l', name: 'Nguyên lá / Lục trà kem mặn (L)', price: 35000, category: 'milktea', emoji: '🧋', recipe: { sua: 40, nguyen_la: 120, duong: 10, bot_sua: 15, tran_chau_trang: 40, kem_man: 40, ly: 1, da: 180 } },
  { id: 'nguyen-la-luc-tra-kem-trung-l', name: 'Nguyên lá / Lục trà kem trứng (L)', price: 37000, category: 'milktea', emoji: '🧋', recipe: { sua: 40, nguyen_la: 120, duong: 10, bot_sua: 15, tran_chau_trang: 40, kem_trung: 50, ly: 1, da: 180 } },
  { id: 'luc-tra-sua-lai-khoai-mon-l', name: 'Lục trà sữa lài khoai môn (L)', price: 35000, category: 'milktea', emoji: '🧋', recipe: { sua: 40, tra_trai_cay: 120, duong: 10, bot_sua: 15, khoai_mon_dam: 50, tran_chau_khoai_mon: 40, ly: 1, da: 180 } },
  { id: 'khoai-mon-latte-l', name: 'Khoai môn latte (L)', price: 35000, category: 'milktea', emoji: '🧋', recipe: { sua: 40, suatuoi: 100, khoai_mon_dam: 50, tran_chau_khoai_mon: 40, ly: 1, da: 180 } },
  { id: 'khoai-mon-oatside-l', name: 'Khoai môn Oatside (L)', price: 40000, category: 'milktea', emoji: '🧋', recipe: { sua: 40, oatside: 100, khoai_mon_dam: 50, tran_chau_khoai_mon: 40, ly: 1, da: 180 } },

  // CACAO
  { id: 'cacao-latte-m', name: 'Cacao latte (M)', price: 28000, category: 'cacao', emoji: '🍫', recipe: { sua: 30, suatuoi: 20, cacao: 7, bot_sua: 5, sot_choco: 5, nươc_soi: 40, ly: 1, da: 150 } },
  { id: 'cacao-latte-l', name: 'Cacao latte (L)', price: 33000, category: 'cacao', emoji: '🍫', recipe: { sua: 45, suatuoi: 20, cacao: 10, bot_sua: 10, sot_choco: 10, nươc_soi: 70, ly: 1, da: 180 } },
  { id: 'cacao-oatside-m', name: 'Cacao Oatside (M)', price: 35000, category: 'cacao', emoji: '🍫', recipe: { sua: 30, oatside: 80, cacao: 5, nươc_soi: 30, ly: 1, da: 150 } },
  { id: 'cacao-oatside-l', name: 'Cacao Oatside (L)', price: 40000, category: 'cacao', emoji: '🍫', recipe: { sua: 45, oatside: 120, cacao: 7, nươc_soi: 40, ly: 1, da: 180 } },
  { id: 'oreo-kem-deo-buon-me-m', name: 'Oreo kem dẻo buôn mê (M)', price: 32000, category: 'cacao', emoji: '🍫', recipe: { sua: 20, suatuoi: 100, vun_oreo: 20, kem_choco: 40, ly: 1, da: 150 } },
  { id: 'oreo-kem-deo-buon-me-l', name: 'Oreo kem dẻo buôn mê (L)', price: 37000, category: 'cacao', emoji: '🍫', recipe: { sua: 30, suatuoi: 140, vun_oreo: 30, kem_choco: 50, ly: 1, da: 180 } },
  { id: 'cacao-kem-man-m', name: 'Cacao kem mặn (M)', price: 32000, category: 'cacao', emoji: '🍫', recipe: { sua: 30, suatuoi: 20, cacao: 7, bot_sua: 5, sot_choco: 5, nươc_soi: 40, kem_man: 30, ly: 1, da: 150 } },
  { id: 'cacao-kem-man-l', name: 'Cacao kem mặn (L)', price: 37000, category: 'cacao', emoji: '🍫', recipe: { sua: 45, suatuoi: 20, cacao: 10, bot_sua: 10, sot_choco: 10, nươc_soi: 70, kem_man: 40, ly: 1, da: 180 } },
  { id: 'cacao-caramel-mh-m', name: 'Cacao caramel muối hồng (M)', price: 32000, category: 'cacao', emoji: '🍫', recipe: { sua: 20, suatuoi: 20, cacao: 7, bot_sua: 5, sot_choco: 5, nươc_soi: 40, caramel_muoi: 10, ly: 1, da: 150 } },
  { id: 'cacao-caramel-mh-l', name: 'Cacao caramel muối hồng (L)', price: 37000, category: 'cacao', emoji: '🍫', recipe: { sua: 30, suatuoi: 20, cacao: 10, bot_sua: 10, sot_choco: 10, nươc_soi: 70, caramel_muoi: 15, ly: 1, da: 180 } },
  { id: 'cacao-kem-trung-m', name: 'Cacao kem trứng (M)', price: 35000, category: 'cacao', emoji: '🍫', recipe: { sua: 30, suatuoi: 20, cacao: 7, bot_sua: 5, sot_choco: 5, nươc_soi: 40, kem_trung: 40, ly: 1, da: 150 } },
  { id: 'cacao-kem-trung-l', name: 'Cacao kem trứng (L)', price: 40000, category: 'cacao', emoji: '🍫', recipe: { sua: 45, suatuoi: 20, cacao: 10, bot_sua: 10, sot_choco: 10, nươc_soi: 70, kem_trung: 50, ly: 1, da: 180 } },
  { id: 'cacao-kem-deo-buon-me-m', name: 'Cacao kem dẻo buôn mê (M)', price: 32000, category: 'cacao', emoji: '🍫', recipe: { sua: 30, suatuoi: 20, cacao: 7, bot_sua: 5, sot_choco: 5, nươc_soi: 40, kem_choco: 40, ly: 1, da: 150 } },
  { id: 'cacao-kem-deo-buon-me-l', name: 'Cacao kem dẻo buôn mê (L)', price: 37000, category: 'cacao', emoji: '🍫', recipe: { sua: 45, suatuoi: 20, cacao: 10, bot_sua: 10, sot_choco: 10, nươc_soi: 70, kem_choco: 50, ly: 1, da: 180 } },
  { id: 'cacao-sua-gau-l', name: 'Cacao sữa gấu (L)', price: 35000, category: 'cacao', emoji: '🍫', recipe: { sua: 50, sua_gau: 1, cacao: 7, nươc_soi: 40, ly: 1, da: 180 } },
  { id: 'cacao-kem-deo-phomai-m', name: 'Cacao kem dẻo phô mai (M)', price: 35000, category: 'cacao', emoji: '🍫', recipe: { sua: 30, suatuoi: 20, cacao: 7, bot_sua: 5, sot_choco: 5, nươc_soi: 40, kem_cheese: 40, ly: 1, da: 150 } }
];

const DEFAULT_SHIFTS = [
  { id: 'sh-1', dayOfWeek: 1, shiftName: 'Ca sáng', timeRange: '06:30 - 12:30', employeeId: '', employeeName: '' },
  { id: 'sh-2', dayOfWeek: 1, shiftName: 'Ca chiều', timeRange: '12:30 - 18:30', employeeId: '', employeeName: '' },
  { id: 'sh-3', dayOfWeek: 2, shiftName: 'Ca sáng', timeRange: '06:30 - 12:30', employeeId: '', employeeName: '' },
  { id: 'sh-4', dayOfWeek: 2, shiftName: 'Ca chiều', timeRange: '12:30 - 18:30', employeeId: '', employeeName: '' },
  { id: 'sh-5', dayOfWeek: 3, shiftName: 'Ca sáng', timeRange: '06:30 - 12:30', employeeId: '', employeeName: '' },
  { id: 'sh-6', dayOfWeek: 3, shiftName: 'Ca chiều', timeRange: '12:30 - 18:30', employeeId: '', employeeName: '' },
  { id: 'sh-7', dayOfWeek: 4, shiftName: 'Ca sáng', timeRange: '06:30 - 12:30', employeeId: '', employeeName: '' },
  { id: 'sh-8', dayOfWeek: 4, shiftName: 'Ca chiều', timeRange: '12:30 - 18:30', employeeId: '', employeeName: '' },
  { id: 'sh-9', dayOfWeek: 5, shiftName: 'Ca sáng', timeRange: '06:30 - 12:30', employeeId: '', employeeName: '' },
  { id: 'sh-10', dayOfWeek: 5, shiftName: 'Ca chiều', timeRange: '12:30 - 18:30', employeeId: '', employeeName: '' },
  { id: 'sh-11', dayOfWeek: 6, shiftName: 'Ca sáng', timeRange: '06:30 - 12:30', employeeId: '', employeeName: '' },
  { id: 'sh-12', dayOfWeek: 6, shiftName: 'Ca chiều', timeRange: '12:30 - 18:30', employeeId: '', employeeName: '' },
  { id: 'sh-13', dayOfWeek: 0, shiftName: 'Ca sáng', timeRange: '06:30 - 12:30', employeeId: '', employeeName: '' },
  { id: 'sh-14', dayOfWeek: 0, shiftName: 'Ca chiều', timeRange: '12:30 - 18:30', employeeId: '', employeeName: '' }
];

const DEFAULT_CATEGORIES = [
  { id: 'cf', name: 'Cà phê' },
  { id: 'tra', name: 'Trà trái cây' },
  { id: 'milktea', name: 'Trà sữa' },
  { id: 'matcha', name: 'Matcha' },
  { id: 'cacao', name: 'Cacao' }
];

async function initializeDatabase() {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await User.insertMany(DEFAULT_USERS);
    await Config.create({ bypassLogin: false, activeUser: null });
    console.log('🌱 Default database initialized with Admin user!');
  }
}

// Ensure database has default data
initializeDatabase();

// ==========================================================================
// Dynamic Database Connection Cache & Middleware
// ==========================================================================

const dbCache = {};
function getTenantModel(dbName, modelName, schema) {
  if (modelName === 'User') {
    return User;
  }
  if (!dbCache[dbName]) {
    dbCache[dbName] = mongoose.connection.useDb(dbName, { useCache: true });
  }
  return dbCache[dbName].model(modelName, schema);
}

// Middleware to extract database name based on x-user-id header
app.use((req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId) {
    req.dbName = `no-coffee-${userId}`;
  } else {
    req.dbName = 'no-coffee';
  }
  next();
});

// ==========================================================================
// API Routing
// ==========================================================================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Thiếu thông tin đăng nhập' });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const user = await User.findOne({ username: normalizedUsername });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        managerId: user.managerId,
        avatar: user.avatar || ''
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi đăng nhập', details: err.message });
  }
});

// GET database state
app.get('/api/db', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Chưa cung cấp thông tin tài khoản (x-user-id)' });
    }

    const currentUser = await User.findOne({ id: userId });
    if (!currentUser) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    // 30 days attendance cleanup
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffStr = `${cutoffDate.getFullYear()}-${(cutoffDate.getMonth() + 1).toString().padStart(2, '0')}-${cutoffDate.getDate().toString().padStart(2, '0')}`;
    const TenantAttendance = getTenantModel(req.dbName, 'Attendance', AttendanceSchema);
    await TenantAttendance.deleteMany({ date: { $lt: cutoffStr } });

    // Fetch users globally based on role restrictions
    let usersQuery = {};
    if (currentUser.role === 'manager') {
      usersQuery = { $or: [{ id: currentUser.id }, { managerId: currentUser.id }] };
    } else if (currentUser.role === 'employee') {
      usersQuery = { $or: [{ id: currentUser.id }, { id: currentUser.managerId }] };
    } else if (currentUser.role === 'dev-admin') {
      usersQuery = {}; // Admin sees all
    }
    const users = await User.find(usersQuery);

    // Fetch other models dynamically from tenant's database
    const TenantIngredient = getTenantModel(req.dbName, 'Ingredient', IngredientSchema);
    const TenantMenuItem = getTenantModel(req.dbName, 'MenuItem', MenuItemSchema);
    const TenantOrder = getTenantModel(req.dbName, 'Order', OrderSchema);
    const TenantWaste = getTenantModel(req.dbName, 'Waste', WasteSchema);
    const TenantShift = getTenantModel(req.dbName, 'Shift', ShiftSchema);
    const TenantShiftRequest = getTenantModel(req.dbName, 'ShiftRequest', ShiftRequestSchema);
    const TenantCategory = getTenantModel(req.dbName, 'MenuCategory', MenuCategorySchema);
    const TenantConfig = getTenantModel(req.dbName, 'Config', ConfigSchema);

    const ingredients = await TenantIngredient.find();
    const menu = await TenantMenuItem.find();
    const orders = await TenantOrder.find();
    const waste = await TenantWaste.find();
    const shifts = await TenantShift.find();
    const shiftRequests = await TenantShiftRequest.find();
    const attendance = await TenantAttendance.find();
    const categories = await TenantCategory.find();
    let config = await TenantConfig.findOne();
    if (!config) {
      config = await TenantConfig.create({ bypassLogin: false, activeUser: null });
    }

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
        bypassLogin: config.bypassLogin,
        activeUser: config.activeUser
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi tải Database từ server', details: err.message });
  }
});

// POST reset database
app.post('/api/db/reset', async (req, res) => {
  try {
    const TenantIngredient = getTenantModel(req.dbName, 'Ingredient', IngredientSchema);
    const TenantMenuItem = getTenantModel(req.dbName, 'MenuItem', MenuItemSchema);
    const TenantOrder = getTenantModel(req.dbName, 'Order', OrderSchema);
    const TenantWaste = getTenantModel(req.dbName, 'Waste', WasteSchema);
    const TenantShift = getTenantModel(req.dbName, 'Shift', ShiftSchema);
    const TenantShiftRequest = getTenantModel(req.dbName, 'ShiftRequest', ShiftRequestSchema);
    const TenantAttendance = getTenantModel(req.dbName, 'Attendance', AttendanceSchema);
    const TenantCategory = getTenantModel(req.dbName, 'MenuCategory', MenuCategorySchema);
    const TenantConfig = getTenantModel(req.dbName, 'Config', ConfigSchema);

    await TenantIngredient.deleteMany();
    await TenantMenuItem.deleteMany();
    await TenantOrder.deleteMany();
    await TenantWaste.deleteMany();
    await TenantShift.deleteMany();
    await TenantShiftRequest.deleteMany();
    await TenantAttendance.deleteMany();
    await TenantCategory.deleteMany();
    await TenantConfig.deleteMany();

    const userId = req.headers['x-user-id'];
    const currentUser = await User.findOne({ id: userId });
    if (currentUser && currentUser.role === 'dev-admin') {
      await User.deleteMany();
      await User.insertMany(DEFAULT_USERS);
    }

    // Seed defaults in tenant database on reset
    await TenantIngredient.insertMany(DEFAULT_INGREDIENTS);
    await TenantMenuItem.insertMany(DEFAULT_MENU);
    await TenantShift.insertMany(DEFAULT_SHIFTS);
    await TenantCategory.insertMany(DEFAULT_CATEGORIES);
    await TenantConfig.create({ bypassLogin: false, activeUser: null });

    res.json({ success: true, message: 'Reset cơ sở dữ liệu thành công!' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi reset database', details: err.message });
  }
});

// POST seed 30 days
app.post('/api/db/seed', async (req, res) => {
  try {
    const TenantIngredient = getTenantModel(req.dbName, 'Ingredient', IngredientSchema);
    const TenantMenuItem = getTenantModel(req.dbName, 'MenuItem', MenuItemSchema);
    const TenantOrder = getTenantModel(req.dbName, 'Order', OrderSchema);
    const TenantWaste = getTenantModel(req.dbName, 'Waste', WasteSchema);
    const TenantShift = getTenantModel(req.dbName, 'Shift', ShiftSchema);
    const TenantShiftRequest = getTenantModel(req.dbName, 'ShiftRequest', ShiftRequestSchema);
    const TenantAttendance = getTenantModel(req.dbName, 'Attendance', AttendanceSchema);
    const TenantCategory = getTenantModel(req.dbName, 'MenuCategory', MenuCategorySchema);

    // Clear dynamic logs
    await TenantOrder.deleteMany();
    await TenantWaste.deleteMany();
    await TenantAttendance.deleteMany();

    // If menu or categories are empty, seed them as well
    const categoryCount = await TenantCategory.countDocuments();
    if (categoryCount === 0) {
      await TenantCategory.insertMany(DEFAULT_CATEGORIES);
    }

    const menuCount = await TenantMenuItem.countDocuments();
    if (menuCount === 0) {
      await TenantMenuItem.insertMany(DEFAULT_MENU);
    }

    const shiftCount = await TenantShift.countDocuments();
    if (shiftCount === 0) {
      await TenantShift.insertMany(DEFAULT_SHIFTS);
    }

    // Reset stock to default high to allow deductions in logs
    await TenantIngredient.deleteMany();
    const seedIngredients = DEFAULT_INGREDIENTS.map(ing => ({
      ...ing,
      stock: ing.stock * 5 // 5x stock to avoid negative numbers
    }));
    await TenantIngredient.insertMany(seedIngredients);

    const now = new Date();
    const ordersToInsert = [];
    const wasteToInsert = [];
    const attendanceToInsert = [];

    const menuItems = await TenantMenuItem.find();
    const ingredients = await TenantIngredient.find();

    const getIngredient = (id) => ingredients.find(ing => ing.id === id);

    // Generate 30 days of data
    for (let day = 29; day >= 0; day--) {
      const currentDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
      const todayStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;

      // 1. Attendance
      const dayOfWeek = currentDate.getDay();
      const dayShifts = DEFAULT_SHIFTS.filter(s => s.dayOfWeek === dayOfWeek);
      for (const shift of dayShifts) {
        const checkInHour = shift.shiftName === 'Ca sáng' ? 6 : 12;
        const checkOutHour = checkInHour + 6;
        
        attendanceToInsert.push({
          id: `att-usr-staff-${todayStr}-${shift.id}`,
          employeeId: 'usr-staff',
          employeeName: 'Bé Nhân Viên',
          date: todayStr,
          checkInTime: `${checkInHour.toString().padStart(2, '0')}:00`,
          checkOutTime: `${checkOutHour.toString().padStart(2, '0')}:00`,
          durationHours: 5
        });
      }

      // 2. Sales Orders
      const orderCount = Math.floor(Math.random() * 16) + 10;
      for (let orderIndex = 0; orderIndex < orderCount; orderIndex++) {
        const randHour = Math.floor(Math.random() * 13) + 7;
        const randMinute = Math.floor(Math.random() * 60);
        const orderTime = new Date(currentDate);
        orderTime.setHours(randHour, randMinute, 0, 0);

        const cartItemsCount = Math.floor(Math.random() * 3) + 1;
        const items = [];
        let totalPrice = 0;
        let cogs = 0;

        for (let i = 0; i < cartItemsCount; i++) {
          const drink = menuItems[Math.floor(Math.random() * menuItems.length)];
          const size = Math.random() > 0.35 ? 'S' : 'L';
          const qty = Math.floor(Math.random() * 2) + 1;
          const sugar = ['30%', '50%', '70%', '100%'][Math.floor(Math.random() * 4)];
          const ice = ['50%', '100%'][Math.floor(Math.random() * 2)];

          const sizePriceOffset = size === 'L' ? 5000 : 0;
          const unitPrice = drink.price + sizePriceOffset;

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

      // 3. Waste
      if (Math.random() > 0.75) {
        const ing = ingredients[Math.floor(Math.random() * ingredients.length)];
        const qty = Math.floor(Math.random() * 5) + 1;
        const cost = qty * ing.cost;
        const reason = ['Làm hỏng', 'Hết hạn sử dụng', 'Rơi vỡ', 'Kiến bám'][Math.floor(Math.random() * 4)];
        const reportedBy = 'Anh Quản Lý';
        
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

        ing.stock = Math.max(0, ing.stock - qty);
      }
    }

    for (const ing of ingredients) {
      await ing.save();
    }

    await TenantOrder.insertMany(ordersToInsert);
    await TenantWaste.insertMany(wasteToInsert);
    await TenantAttendance.insertMany(attendanceToInsert);

    res.json({ success: true, message: 'Đã sinh dữ liệu lịch sử thành công!' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi sinh dữ liệu mẫu 30 ngày', details: err.message });
  }
});

// POST checkout order
app.post('/api/orders/checkout', async (req, res) => {
  try {
    const { order } = req.body;
    if (!order) return res.status(400).json({ error: 'Thông tin đơn hàng bị thiếu' });

    const TenantIngredient = getTenantModel(req.dbName, 'Ingredient', IngredientSchema);
    const TenantOrder = getTenantModel(req.dbName, 'Order', OrderSchema);

    // Deduct stock
    for (const item of order.items) {
      if (item.recipe) {
        for (const ingId of Object.keys(item.recipe)) {
          let qtyNeeded = item.recipe[ingId];
          if (item.size === 'L' && ['cf', 'sua', 'suatuoi', 'duong'].includes(ingId)) {
            qtyNeeded = Math.ceil(qtyNeeded * 1.3);
          }
          const totalDeduction = qtyNeeded * item.qty;

          await TenantIngredient.findOneAndUpdate(
            { id: ingId },
            { $inc: { stock: -totalDeduction } }
          );
        }
      }
    }

    const newOrder = new TenantOrder(order);
    await newOrder.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi thanh toán đơn hàng', details: err.message });
  }
});

// POST restock ingredient
app.post('/api/inventory/restock', async (req, res) => {
  try {
    const { id, qty, customCostPerUnit } = req.body;
    const updateObj = { $inc: { stock: qty } };
    if (customCostPerUnit !== undefined && customCostPerUnit !== null) {
      updateObj.$set = { cost: customCostPerUnit };
    }

    const TenantIngredient = getTenantModel(req.dbName, 'Ingredient', IngredientSchema);
    const updated = await TenantIngredient.findOneAndUpdate({ id }, updateObj, { new: true });
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy nguyên liệu' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi nhập kho nguyên liệu', details: err.message });
  }
});

// POST export ingredient
app.post('/api/inventory/export', async (req, res) => {
  try {
    const { id, qty, reason } = req.body;
    if (!id || qty === undefined || qty === null) {
      return res.status(400).json({ error: 'Thiếu thông tin xuất kho' });
    }

    const exportQty = Number(qty);
    if (isNaN(exportQty) || exportQty <= 0) {
      return res.status(400).json({ error: 'Số lượng xuất kho phải lớn hơn 0' });
    }

    const TenantIngredient = getTenantModel(req.dbName, 'Ingredient', IngredientSchema);
    const ingredient = await TenantIngredient.findOne({ id });
    if (!ingredient) {
      return res.status(404).json({ error: 'Không tìm thấy nguyên liệu' });
    }

    if (ingredient.stock < exportQty) {
      return res.status(400).json({ error: `Số lượng xuất (${exportQty}) vượt quá tồn kho hiện tại (${ingredient.stock})` });
    }

    ingredient.stock -= exportQty;
    await ingredient.save();

    // Ghi nhận log hao hụt/xuất kho để thống kê trong báo cáo
    const TenantWaste = getTenantModel(req.dbName, 'Waste', WasteSchema);
    const userId = req.headers['x-user-id'];
    const currentUser = await User.findOne({ id: userId });
    const reportedBy = currentUser ? currentUser.name : 'Quản lý';
    const cost = exportQty * ingredient.cost;

    const newWaste = new TenantWaste({
      id: 'HH-' + Math.floor(100000 + Math.random() * 900000).toString(),
      timestamp: new Date().toISOString(),
      ingredientId: id,
      ingredientName: ingredient.name,
      qty: exportQty,
      unit: ingredient.unit,
      cost: cost,
      reason: reason || 'Xuất kho thủ công',
      reportedBy: reportedBy
    });
    await newWaste.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xuất kho nguyên liệu', details: err.message });
  }
});

// POST add ingredient
app.post('/api/inventory/add', async (req, res) => {
  try {
    const { name, unit, stock, cost, minStock } = req.body;
    if (!name || !unit) {
      return res.status(400).json({ error: 'Tên và đơn vị nguyên liệu không được trống' });
    }

    const TenantIngredient = getTenantModel(req.dbName, 'Ingredient', IngredientSchema);
    const id = 'ing-' + Date.now().toString().slice(-6);
    const newIng = new TenantIngredient({
      id,
      name,
      unit,
      stock: Number(stock) || 0,
      cost: Number(cost) || 0,
      minStock: Number(minStock) || 0
    });
    await newIng.save();
    res.json({ success: true, ingredient: newIng });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi thêm nguyên liệu', details: err.message });
  }
});

// POST update ingredient
app.post('/api/inventory/update', async (req, res) => {
  try {
    const { id, name, unit, stock, cost, minStock } = req.body;
    const TenantIngredient = getTenantModel(req.dbName, 'Ingredient', IngredientSchema);
    const updated = await TenantIngredient.findOneAndUpdate(
      { id },
      { $set: { name, unit, stock: Number(stock) || 0, cost: Number(cost) || 0, minStock: Number(minStock) || 0 } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy nguyên liệu' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật nguyên liệu', details: err.message });
  }
});

// POST delete ingredient
app.post('/api/inventory/delete', async (req, res) => {
  try {
    const { id } = req.body;
    const TenantIngredient = getTenantModel(req.dbName, 'Ingredient', IngredientSchema);
    const deleted = await TenantIngredient.findOneAndDelete({ id });
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy nguyên liệu để xoá' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xoá nguyên liệu', details: err.message });
  }
});

// POST log waste
app.post('/api/waste', async (req, res) => {
  try {
    const { wasteRecord } = req.body;
    if (!wasteRecord) return res.status(400).json({ error: 'Thiếu log hao hụt' });

    const TenantWaste = getTenantModel(req.dbName, 'Waste', WasteSchema);
    const TenantIngredient = getTenantModel(req.dbName, 'Ingredient', IngredientSchema);

    const newWaste = new TenantWaste(wasteRecord);
    await newWaste.save();

    await TenantIngredient.findOneAndUpdate(
      { id: wasteRecord.ingredientId },
      { $inc: { stock: -wasteRecord.qty } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi ghi nhận hao hụt', details: err.message });
  }
});

// POST menu update
app.post('/api/menu/update', async (req, res) => {
  try {
    const { id, price, recipe, image } = req.body;
    const TenantMenuItem = getTenantModel(req.dbName, 'MenuItem', MenuItemSchema);

    const updateObj = {};
    if (price !== undefined) updateObj.price = price;
    if (recipe !== undefined) updateObj.recipe = recipe;
    if (image !== undefined) updateObj.image = image;

    const updated = await TenantMenuItem.findOneAndUpdate({ id }, { $set: updateObj }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy món trong thực đơn' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật món thực đơn', details: err.message });
  }
});

// POST add menu item
app.post('/api/menu/add', async (req, res) => {
  try {
    const { name, price, category, emoji } = req.body;
    const TenantMenuItem = getTenantModel(req.dbName, 'MenuItem', MenuItemSchema);
    const id = 'item-' + Date.now().toString().slice(-6);

    const newMenuItem = new TenantMenuItem({
      id,
      name,
      price,
      category,
      emoji,
      recipe: {},
      image: ''
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
    const TenantMenuItem = getTenantModel(req.dbName, 'MenuItem', MenuItemSchema);
    const deleted = await TenantMenuItem.findOneAndDelete({ id });
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

    const TenantAttendance = getTenantModel(req.dbName, 'Attendance', AttendanceSchema);
    const existing = await TenantAttendance.findOne({ id: attendanceRecord.id });
    if (existing) {
      if (attendanceRecord.checkOutTime) existing.checkOutTime = attendanceRecord.checkOutTime;
      if (attendanceRecord.durationHours !== undefined) existing.durationHours = attendanceRecord.durationHours;
      if (attendanceRecord.checkOutPhoto) existing.checkOutPhoto = attendanceRecord.checkOutPhoto;
      await existing.save();
    } else {
      const newAttendance = new TenantAttendance(attendanceRecord);
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
    const { id, employeeId, shiftName, timeRange } = req.body;
    const TenantShift = getTenantModel(req.dbName, 'Shift', ShiftSchema);
    
    let employeeName = '';
    if (employeeId) {
      const user = await User.findOne({ id: employeeId });
      employeeName = user ? user.name : 'Unknown';
    }

    await TenantShift.findOneAndUpdate(
      { id },
      { $set: { employeeId, employeeName, shiftName, timeRange } }
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
    const TenantConfig = getTenantModel(req.dbName, 'Config', ConfigSchema);
    const updateObj = {};
    if (bypassLogin !== undefined) updateObj.bypassLogin = bypassLogin;
    if (activeUser !== undefined) updateObj.activeUser = activeUser;

    await TenantConfig.findOneAndUpdate({}, { $set: updateObj }, { upsert: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật cấu hình hệ thống', details: err.message });
  }
});

// POST create shift request
app.post('/api/shift-requests/create', async (req, res) => {
  try {
    const { employeeId, dayOfWeek, requestType, requestedShiftName, requestedTimeRange, reason } = req.body;
    const TenantShiftRequest = getTenantModel(req.dbName, 'ShiftRequest', ShiftRequestSchema);
    
    const user = await User.findOne({ id: employeeId });
    const employeeName = user ? user.name : 'Nhân Viên';

    const id = 'req-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100).toString();
    const newRequest = new TenantShiftRequest({
      id,
      employeeId,
      employeeName,
      dayOfWeek,
      requestType,
      requestedShiftName,
      requestedTimeRange,
      reason,
      status: 'pending',
      timestamp: new Date().toISOString()
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
    const TenantShiftRequest = getTenantModel(req.dbName, 'ShiftRequest', ShiftRequestSchema);
    const TenantShift = getTenantModel(req.dbName, 'Shift', ShiftSchema);

    const request = await TenantShiftRequest.findOne({ id });
    if (!request) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });

    request.status = 'approved';
    await request.save();

    if (request.requestType === 'off') {
      await TenantShift.findOneAndUpdate(
        { employeeId: request.employeeId, dayOfWeek: request.dayOfWeek },
        { $set: { employeeId: '', employeeName: '' } }
      );
    } else if (request.requestType === 'change') {
      await TenantShift.findOneAndUpdate(
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
    const TenantShiftRequest = getTenantModel(req.dbName, 'ShiftRequest', ShiftRequestSchema);
    const request = await TenantShiftRequest.findOneAndUpdate({ id }, { $set: { status: 'rejected' } });
    if (!request) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi từ chối yêu cầu', details: err.message });
  }
});

// POST add user (manager registers new employee)
app.post('/api/users/add', async (req, res) => {
  try {
    const { username, password, name, managerId } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin nhân viên' });
    }
    if (!managerId) {
      return res.status(400).json({ error: 'Thiếu thông tin quản lý' });
    }

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
      managerId: managerId,
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

// POST delete user
app.post('/api/users/delete', async (req, res) => {
  try {
    const { id } = req.body;
    const deleted = await User.findOneAndDelete({ id });
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy nhân sự' });

    const TenantShift = getTenantModel(req.dbName, 'Shift', ShiftSchema);
    await TenantShift.updateMany(
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

// POST update profile (avatar, name, password)
app.post('/api/users/update-profile', async (req, res) => {
  try {
    const { id, name, password, avatar } = req.body;
    const updateObj = {};
    if (name !== undefined) updateObj.name = name.trim();
    if (password !== undefined) updateObj.password = password;
    if (avatar !== undefined) updateObj.avatar = avatar;

    const updated = await User.findOneAndUpdate({ id }, { $set: updateObj }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

    res.json({
      success: true,
      user: {
        id: updated.id,
        username: updated.username,
        name: updated.name,
        role: updated.role,
        managerId: updated.managerId,
        avatar: updated.avatar || ''
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật thông tin cá nhân', details: err.message });
  }
});

// POST pay salary
app.post('/api/users/pay-salary', async (req, res) => {
  try {
    const { employeeId, beforeDate } = req.body;
    const query = { employeeId, paidStatus: 'unpaid' };
    if (beforeDate) {
      query.date = { $lte: beforeDate };
    }
    const TenantAttendance = getTenantModel(req.dbName, 'Attendance', AttendanceSchema);
    await TenantAttendance.updateMany(query, { $set: { paidStatus: 'paid' } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hoàn tất thanh toán lương', details: err.message });
  }
});

// POST add category
app.post('/api/categories/add', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên phân nhóm không được để trống' });

    const TenantCategory = getTenantModel(req.dbName, 'MenuCategory', MenuCategorySchema);
    const id = 'cat-' + Date.now().toString().slice(-6);
    const newCat = new TenantCategory({ id, name });
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
    const TenantCategory = getTenantModel(req.dbName, 'MenuCategory', MenuCategorySchema);
    const updated = await TenantCategory.findOneAndUpdate({ id }, { $set: { name } }, { new: true });
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
    const TenantCategory = getTenantModel(req.dbName, 'MenuCategory', MenuCategorySchema);
    const deleted = await TenantCategory.findOneAndDelete({ id });
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy phân nhóm' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xóa phân nhóm', details: err.message });
  }
});

// POST create custom shift slot
app.post('/api/shifts/create', async (req, res) => {
  try {
    const { dayOfWeek, shiftName, timeRange } = req.body;
    const TenantShift = getTenantModel(req.dbName, 'Shift', ShiftSchema);
    const id = 'sh-' + Date.now().toString().slice(-6);
    const newShift = new TenantShift({
      id,
      dayOfWeek,
      shiftName,
      timeRange,
      employeeId: '',
      employeeName: ''
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
    const TenantShift = getTenantModel(req.dbName, 'Shift', ShiftSchema);
    const deleted = await TenantShift.findOneAndDelete({ id });
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy ca làm để xoá' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xoá ca làm', details: err.message });
  }
});

// POST auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, name } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
    }

    const userRole = 'manager';

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
      managerId: null,
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
