// Database.js - Synchronizes client-side states with MongoDB server via fetch API

export class Database {
  constructor() {
    this.data = {
      users: [],
      ingredients: [],
      menu: [],
      orders: [],
      waste: [],
      shifts: [],
      shiftRequests: [],
      attendance: [],
      config: {
        bypassLogin: false,
        activeUser: null
      }
    };
  }

  getActiveUser() {
    try {
      const stored = localStorage.getItem('no_coffee_active_user');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Lỗi lấy activeUser từ localStorage:', e);
    }
    return this.data.config.activeUser || null;
  }

  setActiveUser(user) {
    this.data.config.activeUser = user;
    try {
      if (user) {
        localStorage.setItem('no_coffee_active_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('no_coffee_active_user');
        // Clear all tenant data on logout to prevent data leak between accounts
        this.data = {
          users: [],
          ingredients: [],
          menu: [],
          orders: [],
          waste: [],
          shifts: [],
          shiftRequests: [],
          attendance: [],
          config: {
            bypassLogin: this.data ? this.data.config.bypassLogin : false,
            activeUser: null
          }
        };
      }
    } catch (e) {
      console.error('Lỗi lưu activeUser vào localStorage:', e);
    }
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const user = this.getActiveUser();
    if (user && user.id) {
      headers['x-user-id'] = user.id;
    }
    return headers;
  }

  // Load complete state from MongoDB server
  async init() {
    const localUser = this.getActiveUser();
    if (localUser) {
      this.data.config.activeUser = localUser;
      await this.fetchDb();
    }
  }

  // Load complete state from MongoDB server
  async fetchDb() {
    try {
      const activeUser = this.getActiveUser();
      if (!activeUser) return;
      
      const res = await fetch('/api/db', {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Không thể kết nối đến máy chủ Database');
      this.data = await res.json();
      
      // Preserve active user locally
      this.data.config.activeUser = activeUser;
      console.log('🍃 Consolidated MongoDB state synced locally!');
      
      // Dispatch custom event to notify controller/views of data changes
      document.dispatchEvent(new CustomEvent('database-synced', { detail: this.data }));
    } catch (e) {
      console.error('Lỗi khi tải Database từ máy chủ:', e);
    }
  }

  getTable(table) {
    return this.data[table] || [];
  }

  // POST reset database
  async resetToDefaults() {
    try {
      const res = await fetch('/api/db/reset', {
        method: 'POST',
        headers: this.getHeaders()
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST seed 30 days
  async seed30DaysData() {
    try {
      const res = await fetch('/api/db/seed', {
        method: 'POST',
        headers: this.getHeaders()
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST sync default menu
  async syncDefaultMenu(seedInventory) {
    try {
      const res = await fetch('/api/menu/sync-default', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ seedInventory })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error('Lỗi khi đồng bộ menu mặc định:', e);
    }
    return false;
  }

  // POST checkout order
  async processCheckout(orderRecord) {
    try {
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ order: orderRecord })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST update order status
  async updateOrderStatus(id, status) {
    try {
      const res = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error('Lỗi khi cập nhật trạng thái đơn hàng:', e);
    }
    return false;
  }

  // POST restock ingredient
  async restockIngredient(id, qty, customCostPerUnit) {
    try {
      const res = await fetch('/api/inventory/restock', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id, qty, customCostPerUnit })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST export ingredient
  async exportIngredient(id, qty, reason) {
    try {
      const res = await fetch('/api/inventory/export', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id, qty, reason })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST add ingredient
  async addIngredient(name, unit, stock, cost, minStock) {
    try {
      const res = await fetch('/api/inventory/add', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ name, unit, stock, cost, minStock })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST update ingredient
  async updateIngredient(id, name, unit, stock, cost, minStock) {
    try {
      const res = await fetch('/api/inventory/update', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id, name, unit, stock, cost, minStock })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST delete ingredient
  async deleteIngredient(id) {
    try {
      const res = await fetch('/api/inventory/delete', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST waste
  async logWaste(wasteRecord) {
    try {
      const res = await fetch('/api/waste', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ wasteRecord })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST menu update (price, recipe, base64 image)
  async updateMenuItem(id, price, recipe, image) {
    try {
      const res = await fetch('/api/menu/update', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id, price, recipe, image })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST add menu item
  async addMenuItem(name, price, category, emoji) {
    try {
      const res = await fetch('/api/menu/add', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ name, price, category, emoji })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST delete menu item
  async deleteMenuItem(id) {
    try {
      const res = await fetch('/api/menu/delete', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST attendance Check-in / Check-out
  async logAttendance(attendanceRecord) {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ attendanceRecord })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST Shift assignment updates
  async updateShift(id, employeeId, shiftName, timeRange) {
    try {
      const res = await fetch('/api/shifts/update', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id, employeeId, shiftName, timeRange })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST Config
  async saveConfig(bypassLogin, activeUser) {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ bypassLogin, activeUser })
      });
      return res.ok;
    } catch (e) {
      console.error('Lỗi lưu config:', e);
    }
    return false;
  }

  // POST create shift request
  async createShiftRequest(employeeId, dayOfWeek, requestType, requestedShiftName, requestedTimeRange, reason) {
    try {
      const res = await fetch('/api/shift-requests/create', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ employeeId, dayOfWeek, requestType, requestedShiftName, requestedTimeRange, reason })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST approve shift request
  async approveShiftRequest(id) {
    try {
      const res = await fetch('/api/shift-requests/approve', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST reject shift request
  async rejectShiftRequest(id) {
    try {
      const res = await fetch('/api/shift-requests/reject', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST add user (manager registers new employee for their store)
  async addEmployee(name, username, password, managerId) {
    try {
      const res = await fetch('/api/users/add', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ name, username, password, managerId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.id) {
          if (!this.data.users) this.data.users = [];
          const newEmp = {
            id: data.id,
            username: data.username,
            name: data.name,
            role: 'employee',
            managerId,
            hourlyWage: 20000,
            salaryCycle: 'weekly',
            salaryStartDate: new Date().toISOString().split('T')[0],
            password
          };
          const exists = this.data.users.find(u => u.id === data.id);
          if (!exists) this.data.users.push(newEmp);
        }
        return true;
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Lỗi không xác định khi tạo nhân viên');
      }
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
    return false;
  }

  // POST delete user
  async deleteEmployee(id) {
    try {
      const res = await fetch('/api/users/delete', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST update wage config
  async updateWageConfig(id, hourlyWage, salaryCycle, salaryStartDate) {
    try {
      const res = await fetch('/api/users/update-wage-config', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id, hourlyWage, salaryCycle, salaryStartDate })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST update QR code
  async updateQrCode(id, qrCode) {
    try {
      const res = await fetch('/api/users/update-qr', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id, qrCode })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST update Profile
  async updateProfile(id, name, password, avatar, qrCode) {
    try {
      const res = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id, name, password, avatar, qrCode })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          this.setActiveUser(data.user);
          await this.fetchDb();
          return true;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST pay salary
  async paySalary(employeeId, beforeDate) {
    try {
      const res = await fetch('/api/users/pay-salary', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ employeeId, beforeDate })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST add category
  async addCategory(name) {
    try {
      const res = await fetch('/api/categories/add', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST update category
  async updateCategory(id, name) {
    try {
      const res = await fetch('/api/categories/update', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id, name })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST delete category
  async deleteCategory(id) {
    try {
      const res = await fetch('/api/categories/delete', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST create shift
  async createShift(dayOfWeek, shiftName, timeRange) {
    try {
      const res = await fetch('/api/shifts/create', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ dayOfWeek, shiftName, timeRange })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST delete shift
  async deleteShift(id) {
    try {
      const res = await fetch('/api/shifts/delete', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }
}
