// MainController.js - Coordinates actions between models and views with Database Loader Overlays

import { AuthModel } from '../models/AuthModel.js';
import { POSModel } from '../models/POSModel.js';
import { InventoryModel } from '../models/InventoryModel.js';
import { WasteModel } from '../models/WasteModel.js';
import { MenuModel } from '../models/MenuModel.js';
import { NotificationHelper } from '../utils/NotificationHelper.js';

export class MainController {
  constructor(db) {
    this.db = db;

    // Instantiate Models
    this.authModel = new AuthModel(this.db);
    this.posModel = new POSModel(this.db);
    this.inventoryModel = new InventoryModel(this.db);
    this.wasteModel = new WasteModel(this.db);
    this.menuModel = new MenuModel(this.db);

    // View bindings
    this.viewManager = null;
    this.views = {};

    this.activeTab = 'home-view'; // Trang Chủ is now default landing tab

    // Notification previous state cache
    this.prevData = null;

    this.menuUpdatePending = false;

    // Listen to database sync events
    document.addEventListener('database-synced', (e) => {
      this.checkDataChanges(e.detail);
    });

    // Background polling: sync from MongoDB server every 10 seconds
    setInterval(() => {
      const user = this.getActiveUser();
      if (user) {
        this.db.fetchDb();
      }
    }, 10000);
  }

  setViewManager(viewManager) {
    this.viewManager = viewManager;
  }

  registerViews(views) {
    this.views = views;
  }

  async start() {
    this.viewManager.showLoading('Đang kết nối cơ sở dữ liệu MongoDB...');
    try {
      await this.db.init(); // Load initial data (no filter yet - just to get config/activeUser)
    } catch (e) {
      console.error(e);
    } finally {
      this.viewManager.hideLoading();
    }

    const user = this.authModel.getCurrentUser();
    this.viewManager.updateHeader(user);

    // Prompt for notification permission on start if default
    if (user && NotificationHelper.permission === 'default') {
      NotificationHelper.requestPermission().then(() => {
        if (this.viewManager) this.viewManager.updateNotificationBellUI();
      });
    }

    if (this.authModel.isBypassLogin() && !user) {
      const devUser = this.db.getTable('users').find(u => u.role === 'dev-admin');
      this.authModel.setCurrentUser(devUser);
      this.viewManager.updateHeader(devUser);
      this.viewManager.applyRoleRestrictions(devUser);
      this.switchTab('home-view');
    } else if (user) {
      // Re-fetch with managerId filter for proper multi-tenant isolation
      if (user.role === 'manager' || user.role === 'dev-admin') {
        await this.db.fetchDb(user.id);
      } else if (user.role === 'employee' && user.managerId) {
        await this.db.fetchDb(user.managerId);
      }
      this.viewManager.applyRoleRestrictions(user);
      this.switchTab(this.activeTab);
      if (user.role === 'manager') {
        this.checkEmptyMenuAndPrompt();
      }
    } else {
      this.viewManager.applyRoleRestrictions(null);
      this.switchTab('login-view');
    }
  }

  // ==========================================================================
  // Authentication Actions
  // ==========================================================================
  async handleLogin(username, password) {
    this.viewManager.showLoading('Đang đăng nhập...');
    try {
      const user = await this.authModel.login(username, password);
      if (user) {
        this.viewManager.updateHeader(user);
        this.viewManager.applyRoleRestrictions(user);
        this.viewManager.showToast(`Chào mừng quay trở lại, ${user.name}!`, 'success');
        
        // Fetch database for this user specifically
        await this.db.fetchDb();
        
        // Request notification permission after login
        if (NotificationHelper.permission === 'default') {
          NotificationHelper.requestPermission().then(() => {
            if (this.viewManager) this.viewManager.updateNotificationBellUI();
          });
        }
        
        this.switchTab('home-view');
        if (user.role === 'manager') {
          this.checkEmptyMenuAndPrompt();
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      this.viewManager.showToast('Lỗi kết nối máy chủ', 'danger');
      return false;
    } finally {
      this.viewManager.hideLoading();
    }
  }

  async handleRegister(username, password, name, role = 'manager') {
    if (this.viewManager) this.viewManager.showLoading('Đang tạo tài khoản Quản lý...');

    // Luôn đăng ký với role manager từ phía server
    const result = await this.authModel.register(username, password, name, 'manager');

    if (this.viewManager) this.viewManager.hideLoading();

    if (result.success) {
      // Thêm manager mới vào cache local
      const newUser = {
        id: result.id || ('usr-' + Date.now().toString().slice(-8)),
        username: username.trim().toLowerCase(),
        password,
        name: name.trim(),
        role: 'manager',
        managerId: null,
        hourlyWage: 25000,
        salaryCycle: 'weekly',
        salaryStartDate: new Date().toISOString().split('T')[0]
      };

      if (!this.db.data.users) this.db.data.users = [];
      const alreadyExists = this.db.data.users.find(u => u.username === newUser.username);
      if (!alreadyExists) {
        this.db.data.users.push(newUser);
      }

      if (this.viewManager) this.viewManager.showToast(`Đăng ký thành công! Chào mừng Quản lý ${name}`, 'success');

      // Đăng nhập ngay với tài khoản vừa tạo
      return await this.handleLogin(username, password);
    } else {
      if (this.viewManager) {
        this.viewManager.showToast(result.error || 'Đăng ký thất bại!', 'danger');
      }
      return false;
    }
  }

  async checkEmptyMenuAndPrompt() {
    const user = this.getActiveUser();
    if (!user || user.role !== 'manager') {
      return;
    }
    const menu = this.db.getTable('menu');
    if (menu.length === 0) {
      this.viewManager.showConfirm('Bạn có muốn sử dụng menu mặc định của Nơ Coffee không?', () => {
        this.viewManager.showConfirm('Bạn có muốn triển khai dữ liệu ảo trong kho cho hợp lý với menu không? Dữ liệu này có thể được điều chỉnh sau đó để khớp với thực tế.', () => {
          this.syncDefaultMenu(true);
        }, () => {
          this.syncDefaultMenu(false);
        });
      });
    }
  }

  async syncDefaultMenu(seedInventory) {
    this.viewManager.showLoading('Đang đồng bộ thực đơn mặc định...');
    try {
      const success = await this.db.syncDefaultMenu(seedInventory);
      if (success) {
        this.viewManager.showToast('Đã đồng bộ thực đơn mặc định thành công!', 'success');
        this.switchTab(this.activeTab);
      } else {
        this.viewManager.showToast('Lỗi khi đồng bộ thực đơn', 'danger');
      }
    } catch (e) {
      console.error(e);
      this.viewManager.showToast('Gặp sự cố khi đồng bộ thực đơn', 'danger');
    } finally {
      this.viewManager.hideLoading();
    }
  }

  logout() {
    this.authModel.logout();
    this.posModel.clearCart();
    this.viewManager.updateHeader(null);
    this.viewManager.applyRoleRestrictions(null);
    this.switchTab('login-view');
    this.viewManager.showToast('Đã đăng xuất thành công', 'success');
  }

  getActiveUser() {
    return this.authModel.getCurrentUser();
  }

  async handleUpdateProfile(id, name, password, avatar, qrCode) {
    try {
      const success = await this.db.updateProfile(id, name, password, avatar, qrCode);
      if (success) {
        const user = this.authModel.getCurrentUser();
        this.viewManager.updateHeader(user);
        this.switchTab(this.activeTab); // Refresh current view
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  getStorePaymentQr() {
    const currentUser = this.getActiveUser();
    if (!currentUser) return '';
    const allUsers = this.getUsers();
    
    // If manager or dev-admin, return their own QR code
    if (currentUser.role === 'manager' || currentUser.role === 'dev-admin') {
      const userObj = allUsers.find(u => u.id === currentUser.id);
      return userObj ? (userObj.qrCode || '') : '';
    } else {
      // If employee, return the manager's QR code
      const manager = allUsers.find(u => u.id === currentUser.managerId);
      return manager ? (manager.qrCode || '') : '';
    }
  }

  isBypassLogin() {
    return this.authModel.isBypassLogin();
  }

  setBypassLogin(enabled) {
    this.authModel.setBypassLogin(enabled);
  }

  async devSwitchRole(roleName) {
    this.viewManager.showLoading('Đang giả lập vai trò...');
    const users = this.db.getTable('users');
    const targetUser = users.find(u => u.role === roleName);
    if (targetUser) {
      this.authModel.setCurrentUser(targetUser);
      this.viewManager.updateHeader(targetUser);
      this.viewManager.applyRoleRestrictions(targetUser);

      // If employee selected and in stats/menu/inventory view, redirect to Home
      if (roleName === 'employee' && (this.activeTab === 'stats-view' || this.activeTab === 'menu-view' || this.activeTab === 'inventory-view')) {
        this.activeTab = 'home-view';
      }

      await this.db.fetchDb(); // Sync latest state from MongoDB
      this.viewManager.hideLoading();
      this.switchTab(this.activeTab);
    } else {
      this.viewManager.hideLoading();
    }
  }

  async seedMockData() {
    this.viewManager.showLoading('Đang khởi tạo 30 ngày dữ liệu lịch sử...');
    try {
      await this.db.seed30DaysData();
      this.viewManager.showToast('Đã sinh dữ liệu ngẫu nhiên 30 ngày bán hàng!', 'success');
      this.switchTab(this.activeTab);
    } catch (e) {
      this.viewManager.showToast('Lỗi khi sinh dữ liệu mẫu', 'danger');
    } finally {
      this.viewManager.hideLoading();
    }
  }
  // ==========================================================================
  // Navigation / Tab Swapping
  // ==========================================================================
  switchTab(viewId) {
    this.activeTab = viewId;
    this.viewManager.showView(viewId);

    const viewInstance = this.views[viewId];
    if (viewInstance && typeof viewInstance.render === 'function') {
      viewInstance.render();
    }
  }

  // ==========================================================================
  // POS Actions
  // ==========================================================================
  getMenu() {
    return this.menuModel.getMenu();
  }

  getMenuById(id) {
    return this.menuModel.getMenuById(id);
  }

  getCart() {
    return this.posModel.getCart();
  }

  getCartCount() {
    return this.posModel.getCartCount();
  }

  getCartTotal() {
    return this.posModel.getCartTotal();
  }

  addToCart(drink, size, sugar, ice, notes) {
    this.posModel.addToCart(drink, size, sugar, ice, notes);
    this.viewManager.showToast(`Đã thêm ${drink.name} vào giỏ hàng`, 'success');
  }

  updateCartQty(index, delta) {
    this.posModel.updateQty(index, delta);
  }

  clearCart() {
    this.posModel.clearCart();
    this.viewManager.showToast('Đã xoá giỏ hàng', 'warning');
  }

  async processCheckout(paymentMethod, cashReceived) {
    this.viewManager.showLoading('Đang xử lý đơn hàng và trừ kho...');
    try {
      const order = await this.posModel.checkout(paymentMethod, cashReceived, this.inventoryModel);
      if (order) {
        this.viewManager.showToast(`Đơn hàng ${order.id} hoàn tất!`, 'success');
        this.switchTab('pos-view');
      } else {
        this.viewManager.showToast('Lỗi khi ghi nhận thanh toán', 'danger');
      }
    } catch (e) {
      console.error(e);
      this.viewManager.showToast('Gặp sự cố kết nối cơ sở dữ liệu', 'danger');
    } finally {
      this.viewManager.hideLoading();
    }
  }

  getOrdersHistory() {
    return this.posModel.getOrdersHistory();
  }

  // ==========================================================================
  // Inventory Actions
  // ==========================================================================
  getInventoryModel() {
    return this.inventoryModel;
  }

  getCurrentUser() {
    return this.authModel.getCurrentUser();
  }

  async handleRestock(ingId, qty, parsedCost) {
    this.viewManager.showLoading('Đang cập nhật kho hàng...');
    try {
      const ing = this.inventoryModel.getIngredient(ingId);
      const success = await this.inventoryModel.restock(ingId, qty, parsedCost);
      if (success && ing) {
        this.viewManager.showToast(`Đã nhập +${qty} ${ing.unit} vào kho cho ${ing.name}`, 'success');
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.viewManager.hideLoading();
    }
    return false;
  }

  async handleExportIngredient(ingId, qty, reason) {
    this.viewManager.showLoading('Đang xử lý xuất kho...');
    try {
      const ing = this.inventoryModel.getIngredient(ingId);
      const success = await this.inventoryModel.exportIngredient(ingId, qty, reason);
      if (success && ing) {
        this.viewManager.showToast(`Đã xuất -${qty} ${ing.unit} từ kho cho ${ing.name}`, 'success');
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.viewManager.hideLoading();
    }
    return false;
  }

  async handleAddIngredient(name, unit, stock, cost, minStock) {
    this.viewManager.showLoading('Đang thêm nguyên liệu...');
    try {
      const success = await this.db.addIngredient(name, unit, stock, cost, minStock);
      if (success) {
        this.viewManager.showToast(`Đã thêm nguyên liệu ${name} thành công!`, 'success');
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.viewManager.hideLoading();
    }
    return false;
  }

  async handleUpdateIngredient(id, name, unit, stock, cost, minStock) {
    this.viewManager.showLoading('Đang cập nhật nguyên liệu...');
    try {
      const success = await this.db.updateIngredient(id, name, unit, stock, cost, minStock);
      if (success) {
        this.viewManager.showToast(`Đã cập nhật nguyên liệu ${name} thành công!`, 'success');
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.viewManager.hideLoading();
    }
    return false;
  }

  async handleDeleteIngredient(id) {
    this.viewManager.showLoading('Đang xoá nguyên liệu...');
    try {
      const success = await this.db.deleteIngredient(id);
      if (success) {
        this.viewManager.showToast('Đã xoá nguyên liệu khỏi kho!', 'warning');
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.viewManager.hideLoading();
    }
    return false;
  }

  // ==========================================================================
  // Waste Actions
  // ==========================================================================
  getWasteModel() {
    return this.wasteModel;
  }

  async handleLogWaste(ingId, qty, reason) {
    this.viewManager.showLoading('Đang trừ kho hao hụt...');
    try {
      const user = this.getCurrentUser();
      const reporter = user ? user.name : 'staff';
      const log = await this.wasteModel.logWaste(ingId, qty, reason, reporter, this.inventoryModel);
      if (log) {
        this.viewManager.showToast(`Đã ghi nhận hao hụt ${qty} đơn vị.`, 'danger');
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.viewManager.hideLoading();
    }
    return false;
  }

  // ==========================================================================
  // Menu Manager Actions
  // ==========================================================================
  getMenuModel() {
    return this.menuModel;
  }

  async handleUpdateRecipeAndImage(id, price, recipe, imageBase64) {
    this.viewManager.showLoading('Đang lưu công thức và tải ảnh lên Database...');
    try {
      const success = await this.menuModel.updatePriceAndRecipe(id, price, recipe);
      if (imageBase64) {
        await this.menuModel.updateImage(id, imageBase64);
      }
      if (success) {
        this.viewManager.showToast('Đã đồng bộ thực đơn lên máy chủ!', 'success');
        this.switchTab('menu-view');
        return true;
      }
    } catch (e) {
      console.error(e);
      this.viewManager.showToast('Lỗi đồng bộ thực đơn', 'danger');
    } finally {
      this.viewManager.hideLoading();
    }
    return false;
  }

  async handleAddMenuItem(name, price, category, emoji) {
    this.viewManager.showLoading('Đang thêm món mới vào thực đơn...');
    try {
      const success = await this.menuModel.addMenuItem(name, price, category, emoji);
      if (success) {
        this.viewManager.showToast(`Đã thêm ${name} vào Menu`, 'success');
        this.switchTab('menu-view');
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.viewManager.hideLoading();
    }
    return false;
  }

  async handleDeleteMenuItem(id) {
    this.viewManager.showLoading('Đang xoá món khỏi Menu...');
    try {
      const success = await this.menuModel.deleteMenuItem(id);
      if (success) {
        this.viewManager.showToast('Đã xoá món nước khỏi Menu', 'warning');
        this.switchTab('menu-view');
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.viewManager.hideLoading();
    }
    return false;
  }

  // ==========================================================================
  // Attendance & Staffing API handlers
  // ==========================================================================
  getUsers() {
    return this.db.getTable('users');
  }

  getShifts() {
    return this.db.getTable('shifts');
  }

  getAttendanceHistory() {
    return this.db.getTable('attendance').sort((a, b) => b.id.localeCompare(a.id));
  }

  async handleCheckIn() {
    this.viewManager.showLoading('Đang điểm danh vào ca...');
    try {
      const user = this.getCurrentUser();
      if (!user) return false;

      const d = new Date();
      const todayStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

      const attendanceRecord = {
        id: `att-${user.id}-${todayStr}`,
        employeeId: user.id,
        employeeName: user.name,
        date: todayStr,
        checkInTime: timeStr,
        checkOutTime: '',
        durationHours: 0
      };

      const success = await this.db.logAttendance(attendanceRecord);
      if (success) {
        this.viewManager.showToast(`Check-in thành công lúc ${timeStr}!`, 'success');
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.viewManager.hideLoading();
    }
    return false;
  }

  async handleCheckOut(attendanceId) {
    this.viewManager.showLoading('Đang điểm danh ra ca...');
    try {
      const user = this.getCurrentUser();
      if (!user) return false;

      const d = new Date();
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

      // Fetch check-in details to calculate hours
      const attendance = this.getAttendanceHistory();
      const currentLog = attendance.find(a => a.id === attendanceId);
      let duration = 0;

      if (currentLog && currentLog.checkInTime) {
        const [inH, inM] = currentLog.checkInTime.split(':').map(Number);
        const inDate = new Date();
        inDate.setHours(inH, inM, 0, 0);

        const diffMs = d.getTime() - inDate.getTime();
        duration = Math.max(0, diffMs / (1000 * 60 * 60)); // calculate in hours
      }

      const attendanceRecord = {
        id: attendanceId,
        employeeId: user.id,
        employeeName: user.name,
        checkOutTime: timeStr,
        durationHours: duration
      };

      const success = await this.db.logAttendance(attendanceRecord);
      if (success) {
        this.viewManager.showToast(`Check-out thành công lúc ${timeStr}! Tổng ca: ${duration.toFixed(2)} giờ`, 'success');
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.viewManager.hideLoading();
    }
    return false;
  }

  async handleUpdateShift(id, employeeId, shiftName, timeRange) {
    this.viewManager.showLoading('Đang xếp lịch làm việc...');
    try {
      const success = await this.db.updateShift(id, employeeId, shiftName, timeRange);
      if (success) {
        this.viewManager.showToast('Đã cập nhật ca trực nhân viên!', 'success');
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.viewManager.hideLoading();
    }
    return false;
  }

  getShiftRequests() {
    return this.db.getTable('shiftRequests') || [];
  }

  async handleCreateShiftRequest(employeeId, dayOfWeek, requestType, requestedShiftName, requestedTimeRange, reason) {
    this.viewManager.showLoading('Đang gửi yêu cầu đổi lịch...');
    try {
      const success = await this.db.createShiftRequest(employeeId, dayOfWeek, requestType, requestedShiftName, requestedTimeRange, reason);
      if (success) {
        this.viewManager.showToast('Gửi yêu cầu đổi lịch thành công!', 'success');
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.viewManager.hideLoading();
    }
    return false;
  }

  async handleApproveShiftRequest(requestId) {
    this.viewManager.showLoading('Đang duyệt yêu cầu...');
    try {
      const success = await this.db.approveShiftRequest(requestId);
      if (success) {
        this.viewManager.showToast('Đã phê duyệt yêu cầu!', 'success');
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.viewManager.hideLoading();
    }
    return false;
  }

  async handleRejectShiftRequest(requestId) {
    this.viewManager.showLoading('Đang từ chối yêu cầu...');
    try {
      const success = await this.db.rejectShiftRequest(requestId);
      if (success) {
        this.viewManager.showToast('Đã từ chối yêu cầu!', 'warning');
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.viewManager.hideLoading();
    }
    return false;
  }

  async handleAddEmployee(name, username, password) {
    this.viewManager.showLoading('Đang tạo nhân sự mới...');
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser || (currentUser.role !== 'manager' && currentUser.role !== 'dev-admin')) {
        this.viewManager.showToast('Chỉ Quản lý mới có thể tạo nhân viên', 'warning');
        return false;
      }
      const managerId = currentUser.id; // Nhân viên thuộc về manager này
      const success = await this.db.addEmployee(name, username, password, managerId);
      if (success) {
        this.viewManager.showToast(`Đã thêm nhân viên ${name} thành công!`, 'success');
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.viewManager.hideLoading();
    }
    return false;
  }

  // Lấy danh sách nhân viên thuộc về manager hiện tại
  getMyEmployees() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return [];
    const allUsers = this.db.getTable('users');
    if (currentUser.role === 'dev-admin') {
      return allUsers.filter(u => u.role === 'employee');
    }
    if (currentUser.role === 'manager') {
      return allUsers.filter(u => u.role === 'employee' && u.managerId === currentUser.id);
    }
    return [];
  }

  // Notification change-checking system
  initPrevData(data) {
    this.prevData = JSON.parse(JSON.stringify(data));
  }

  checkDataChanges(newData) {
    const currentUser = this.getActiveUser();
    if (!currentUser) {
      this.prevData = null;
      return;
    }

    if (!this.prevData) {
      this.initPrevData(newData);
      return;
    }

    // 1. Check Shift Request status changes
    const prevReqs = this.prevData.shiftRequests || [];
    const newReqs = newData.shiftRequests || [];

    // For managers: Notify about new pending shift requests
    if (currentUser.role === 'manager' || currentUser.role === 'dev-admin') {
      newReqs.forEach(req => {
        if (req.status === 'pending') {
          const existedBefore = prevReqs.some(r => r.id === req.id);
          if (!existedBefore) {
            NotificationHelper.notifyShiftRequestCreated(req);
          }
        }
      });
    }

    // For employees: Notify about approved/rejected status
    if (currentUser.role === 'employee') {
      newReqs.forEach(req => {
        if (req.employeeId === currentUser.id && req.status !== 'pending') {
          const prevReq = prevReqs.find(r => r.id === req.id);
          if (prevReq && prevReq.status === 'pending') {
            NotificationHelper.notifyShiftRequestStatus(req);
          }
        }
      });
    }

    // 2. Check Shift changes (for employees)
    if (currentUser.role === 'employee') {
      const prevShifts = this.prevData.shifts || [];
      const newShifts = newData.shifts || [];
      newShifts.forEach(shift => {
        if (shift.employeeId === currentUser.id) {
          const prevShift = prevShifts.find(s => s.id === shift.id);
          // If shift was not assigned to them before, or changed time range/name
          if (prevShift) {
            if (prevShift.employeeId !== currentUser.id) {
              NotificationHelper.notifyShiftUpdated(shift.shiftName, shift.timeRange, shift.dayOfWeek);
            } else if (prevShift.shiftName !== shift.shiftName || prevShift.timeRange !== shift.timeRange) {
              NotificationHelper.notifyShiftUpdated(shift.shiftName, shift.timeRange, shift.dayOfWeek);
            }
          } else {
            // New shift assigned
            NotificationHelper.notifyShiftUpdated(shift.shiftName, shift.timeRange, shift.dayOfWeek);
          }
        }
      });
    }

    // 3. Check Salary Paid (for employees)
    if (currentUser.role === 'employee') {
      const prevAttendance = this.prevData.attendance || [];
      const newAttendance = newData.attendance || [];
      
      let paidCount = 0;
      let totalAmountPaid = 0;
      newAttendance.forEach(att => {
        if (att.employeeId === currentUser.id && att.paidStatus === 'paid') {
          const prevAtt = prevAttendance.find(a => a.id === att.id);
          if (prevAtt && prevAtt.paidStatus === 'unpaid') {
            paidCount++;
            const wage = (att.durationHours || 0) * (currentUser.hourlyWage || 20000);
            totalAmountPaid += wage;
          }
        }
      });
      if (paidCount > 0 && totalAmountPaid > 0) {
        NotificationHelper.notifySalaryPaid(currentUser.name, totalAmountPaid);
      }
    }

    // 4. Check New Order completed (for managers/dev-admin)
    if (currentUser.role === 'manager' || currentUser.role === 'dev-admin') {
      const prevOrders = this.prevData.orders || [];
      const newOrders = newData.orders || [];
      newOrders.forEach(order => {
        const existed = prevOrders.some(o => o.id === order.id);
        if (!existed) {
          NotificationHelper.notifyOrderCompleted(order);
        }
      });
    }

    // 5. Check attendance log (for employees checking in/out)
    if (currentUser.role === 'employee') {
      const prevAttendance = this.prevData.attendance || [];
      const newAttendance = newData.attendance || [];
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      const prevTodayAtt = prevAttendance.find(a => a.employeeId === currentUser.id && a.date === todayStr);
      const newTodayAtt = newAttendance.find(a => a.employeeId === currentUser.id && a.date === todayStr);
      if (newTodayAtt) {
        if (!prevTodayAtt) {
          NotificationHelper.notifyAttendance('checkin', newTodayAtt.checkInTime);
        } else if (newTodayAtt.checkOutTime && !prevTodayAtt.checkOutTime) {
          NotificationHelper.notifyAttendance('checkout', newTodayAtt.checkOutTime);
        }
      }
    }

    // 6. Check Menu changes (to trigger UI sync between employee POS and manager Menu)
    const prevMenu = this.prevData.menu || [];
    const newMenu = newData.menu || [];

    let menuChanged = prevMenu.length !== newMenu.length;
    if (!menuChanged) {
      // Compare item details
      for (const newItem of newMenu) {
        const prevItem = prevMenu.find(m => m.id === newItem.id);
        if (!prevItem) {
          menuChanged = true;
          break;
        }
        if (prevItem.price !== newItem.price || 
            prevItem.name !== newItem.name || 
            prevItem.category !== newItem.category || 
            JSON.stringify(prevItem.recipe) !== JSON.stringify(newItem.recipe) ||
            prevItem.image !== newItem.image) {
          menuChanged = true;
          break;
        }
      }
    }

    if (menuChanged) {
      this.menuUpdatePending = true;
    }

    if (this.menuUpdatePending) {
      const hasModal = document.querySelector('.modal-overlay') !== null;
      if (!hasModal) {
        console.log('🔄 Refreshing current tab to show updated menu:', this.activeTab);
        this.switchTab(this.activeTab);
        this.menuUpdatePending = false;
      }
    }

    // Save snapshot for next comparison
    this.prevData = JSON.parse(JSON.stringify(newData));
  }
}
