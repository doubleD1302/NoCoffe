// AuthModel.js - Core authentication model linked to MongoDB API sync

export class AuthModel {
  constructor(db) {
    this.db = db;
  }

  getCurrentUser() {
    try {
      const cached = localStorage.getItem('activeUser');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  }

  setCurrentUser(user) {
    if (user) {
      localStorage.setItem('activeUser', JSON.stringify(user));
      if (this.db && this.db.data && this.db.data.config) {
        this.db.data.config.activeUser = user;
      }
    } else {
      localStorage.removeItem('activeUser');
      if (this.db && this.db.data && this.db.data.config) {
        this.db.data.config.activeUser = null;
      }
    }
  }

  isBypassLogin() {
    return false; // Luôn yêu cầu đăng nhập thực tế
  }

  setBypassLogin(enabled) {
    // Không hỗ trợ bỏ qua đăng nhập nữa để tăng bảo mật
  }

  async login(username, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (!response.ok) {
        return { error: data.error || 'Đăng nhập thất bại!' };
      }
      if (data.success && data.user) {
        this.setCurrentUser(data.user);
        return { success: true, user: data.user };
      }
      return { error: 'Tên đăng nhập hoặc mật khẩu không chính xác!' };
    } catch (error) {
      console.error('Lỗi khi gọi API đăng nhập:', error);
      return { error: 'Không thể kết nối đến máy chủ' };
    }
  }

  logout() {
    this.setCurrentUser(null);
  }

  // Đăng ký tài khoản mới
  async register(username, password, name, role = 'employee') {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name, role })
      });
      const data = await response.json();
      if (!response.ok) {
        // Server trả về lỗi (4xx), data.error chứa thông báo lỗi
        return { error: data.error || 'Đăng ký thất bại!' };
      }
      return data; // { success: true, role: '...' }
    } catch (error) {
      console.error('Lỗi khi gọi API đăng ký:', error);
      return { error: 'Không thể kết nối đến máy chủ' };
    }
  }

  hasAccess(roleRequired) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;

    const role = currentUser.role;

    // Roles hierarchy: dev-admin > manager > employee
    if (role === 'dev-admin') return true;
    if (roleRequired === 'dev-admin') return false;

    if (role === 'manager') return true;
    if (roleRequired === 'manager') return false;

    return roleRequired === 'employee';
  }
}