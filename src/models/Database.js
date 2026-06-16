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
        bypassLogin: true,
        activeUser: null
      }
    };
  }

  // Load complete state from MongoDB server
  async init() {
    await this.fetchDb();
  }

  // Load complete state from MongoDB server (multi-tenant: filter by userId)
  async fetchDb(userId = null) {
    try {
      if (!userId && this.data.config.activeUser) {
        userId = this.data.config.activeUser.id;
      }
      const url = userId ? `/api/db?userId=${encodeURIComponent(userId)}` : '/api/db';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Không thể kết nối đến máy chủ Database');
      this.data = await res.json();
      console.log('🍃 Consolidated MongoDB state synced locally!');
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
      const res = await fetch('/api/db/reset', { method: 'POST' });
      if (res.ok) {
        const activeUser = this.data.config.activeUser;
        await this.fetchDb(activeUser ? activeUser.id : null);
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
      const res = await fetch('/api/db/seed', { method: 'POST' });
      if (res.ok) {
        await this.fetchDb();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST checkout order
  async processCheckout(orderRecord) {
    try {
      const activeUser = this.data.config.activeUser;
      if (activeUser) {
        orderRecord.ownerId = activeUser.id;
      }
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderRecord })
      });
      if (res.ok) {
        await this.fetchDb(activeUser ? activeUser.id : null);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST restock ingredient
  async restockIngredient(id, qty, customCostPerUnit) {
    try {
      const activeUser = this.data.config.activeUser;
      const ownerId = activeUser ? activeUser.id : null;
      const res = await fetch('/api/inventory/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, qty, customCostPerUnit, ownerId })
      });
      if (res.ok) {
        await this.fetchDb(ownerId);
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
      const activeUser = this.data.config.activeUser;
      if (activeUser) {
        wasteRecord.ownerId = activeUser.id;
      }
      const res = await fetch('/api/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wasteRecord })
      });
      if (res.ok) {
        await this.fetchDb(activeUser ? activeUser.id : null);
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
      const activeUser = this.data.config.activeUser;
      const res = await fetch('/api/menu/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, price, recipe, image })
      });
      if (res.ok) {
        await this.fetchDb(activeUser ? activeUser.id : null);
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
      const activeUser = this.data.config.activeUser;
      const ownerId = activeUser ? activeUser.id : null;
      const res = await fetch('/api/menu/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price, category, emoji, ownerId })
      });
      if (res.ok) {
        await this.fetchDb(ownerId);
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
      const activeUser = this.data.config.activeUser;
      const res = await fetch('/api/menu/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await this.fetchDb(activeUser ? activeUser.id : null);
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
      const activeUser = this.data.config.activeUser;
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceRecord })
      });
      if (res.ok) {
        await this.fetchDb(activeUser ? activeUser.id : null);
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
      const activeUser = this.data.config.activeUser;
      const managerId = activeUser ? activeUser.id : null;
      const res = await fetch('/api/shifts/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, employeeId, shiftName, timeRange, managerId })
      });
      if (res.ok) {
        await this.fetchDb(managerId);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST Config - chỉ lưu lên server, KHÔNG gọi fetchDb() tránh race condition ghi đè activeUser
  async saveConfig(bypassLogin, activeUser) {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, password, managerId })
      });
      if (res.ok) {
        const data = await res.json();
        // Thêm nhân viên mới vào cache local ngay lập tức
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
            password // giữ password trong cache local
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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

  // POST pay salary
  async paySalary(employeeId, beforeDate) {
    try {
      const res = await fetch('/api/users/pay-salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const activeUser = this.data.config.activeUser;
      const ownerId = activeUser ? activeUser.id : null;
      const res = await fetch('/api/categories/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ownerId })
      });
      if (res.ok) {
        await this.fetchDb(ownerId);
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
      const activeUser = this.data.config.activeUser;
      const res = await fetch('/api/categories/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name })
      });
      if (res.ok) {
        await this.fetchDb(activeUser ? activeUser.id : null);
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
      const activeUser = this.data.config.activeUser;
      const res = await fetch('/api/categories/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await this.fetchDb(activeUser ? activeUser.id : null);
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
      const activeUser = this.data.config.activeUser;
      const ownerId = activeUser ? activeUser.id : null;
      const res = await fetch('/api/shifts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayOfWeek, shiftName, timeRange, ownerId })
      });
      if (res.ok) {
        await this.fetchDb(ownerId);
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
      const activeUser = this.data.config.activeUser;
      const res = await fetch('/api/shifts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await this.fetchDb(activeUser ? activeUser.id : null);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST add ingredient
  async addIngredient(name, unit, minStock, initialStock, unitCost) {
    try {
      const activeUser = this.data.config.activeUser;
      const ownerId = activeUser ? activeUser.id : null;
      const res = await fetch('/api/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, unit, minStock, initialStock, unitCost, ownerId })
      });
      if (res.ok) {
        await this.fetchDb(ownerId);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // POST update ingredient
  async updateIngredient(id, name, unit, minStock, cost) {
    try {
      const activeUser = this.data.config.activeUser;
      const ownerId = activeUser ? activeUser.id : null;
      const res = await fetch('/api/inventory/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, unit, minStock, cost })
      });
      if (res.ok) {
        await this.fetchDb(ownerId);
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
      const activeUser = this.data.config.activeUser;
      const ownerId = activeUser ? activeUser.id : null;
      const res = await fetch('/api/inventory/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await this.fetchDb(ownerId);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }
}
