// AuthModel.js - Core authentication model linked to MongoDB API sync

export class AuthModel {
  constructor(db) {
    this.db = db;
  }

  getCurrentUser() {
    return this.db.data.config.activeUser || null;
  }

  setCurrentUser(user) {
    this.db.data.config.activeUser = user;
    this.db.saveConfig(undefined, user); // Fire-and-forget sync config to server
  }

  isBypassLogin() {
    return !!this.db.data.config.bypassLogin;
  }

  setBypassLogin(enabled) {
    this.db.data.config.bypassLogin = enabled;
    this.db.saveConfig(enabled, undefined); // Fire-and-forget sync config to server
  }

  login(username, password) {
    const users = this.db.getTable('users');
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedPassword = String(password).trim();
    const user = users.find(u =>
      String(u.username).trim().toLowerCase() === normalizedUsername &&
      String(u.password).trim() === normalizedPassword
    );
    if (user) {
      this.setCurrentUser(user);
      return user;
    }
    console.warn(`[Auth] Login failed for username="${normalizedUsername}". Available users:`, users.map(u => u.username));
    return null;
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