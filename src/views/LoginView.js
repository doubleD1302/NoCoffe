// LoginView.js - Renders and manages the Login/Register screen

export class LoginView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
  }

  render() {
    this.container.innerHTML = `
      <div class="login-container">
        <div class="login-card">
          <div class="login-brand">
            <div class="login-logo"><i class="bi bi-ribbon-fill" style="color: var(--primary);"></i></div>
            <h2>Cà Phê Nơ</h2>
            <p>Hệ thống quản trị bán hàng & kho</p>
          </div>
          
          <!-- LOGIN SECTION -->
          <div id="login-section">
            <form id="login-form">
              <div class="form-group">
                <label for="login-username"><i class="bi bi-person-fill"></i> Tên đăng nhập</label>
                <input type="text" id="login-username" class="input-field" placeholder="staff / manager / admin" required autocomplete="username">
              </div>
              <div class="form-group">
                <label for="login-password"><i class="bi bi-lock-fill"></i> Mật khẩu</label>
                <input type="password" id="login-password" class="input-field" placeholder="Nhập mật khẩu" required autocomplete="current-password">
              </div>
              <div id="login-error" style="display:none; color: var(--danger); font-size: 12px; font-weight: 600; margin-top: 8px; padding: 8px 12px; background: rgba(220,53,69,0.08); border-radius: var(--radius-sm); border-left: 3px solid var(--danger);">
                <i class="bi bi-exclamation-circle-fill"></i> Tên đăng nhập hoặc mật khẩu không chính xác!
              </div>
              <button type="submit" class="btn-primary" style="width: 100%; margin-top: 12px; height: 44px; font-size: 15px; font-weight: 700;">
                <i class="bi bi-box-arrow-in-right"></i> Đăng Nhập
              </button>
            </form>

            <div style="text-align: center; margin-top: 16px; font-size: 13px; color: var(--text-muted);">
              Chưa có tài khoản? <a href="#" id="toggle-to-register" style="color: var(--primary); font-weight: 600;">Đăng ký ngay</a>
            </div>

            <div style="margin-top: 20px; border-top: 1px dashed var(--border-color); padding-top: 16px;">
              <p style="font-size: 10px; color: var(--text-light); margin-bottom: 8px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Đăng nhập nhanh (Demo)</p>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <button class="btn-secondary btn-quick-login" data-user="staff" data-pass="123" style="font-size: 12px; padding: 8px 12px; justify-content: flex-start;">
                  <i class="bi bi-person-badge-fill" style="color: var(--success); font-size: 14px;"></i> Nhân viên — staff / 123
                </button>
                <button class="btn-secondary btn-quick-login" data-user="manager" data-pass="123" style="font-size: 12px; padding: 8px 12px; justify-content: flex-start;">
                  <i class="bi bi-person-workspace" style="color: var(--warning); font-size: 14px;"></i> Quản lý — manager / 123
                </button>
                <button class="btn-secondary btn-quick-login" data-user="admin" data-pass="123" style="font-size: 12px; padding: 8px 12px; justify-content: flex-start;">
                  <i class="bi bi-shield-lock-fill" style="color: var(--danger); font-size: 14px;"></i> Dev Admin — admin / 123
                </button>
              </div>
            </div>
          </div>

          <!-- REGISTER SECTION -->
          <div id="register-section" style="display: none;">
            <form id="register-form">
              <div class="form-group">
                <label for="reg-name"><i class="bi bi-person-lines-fill"></i> Họ và Tên</label>
                <input type="text" id="reg-name" class="input-field" placeholder="Ví dụ: Nguyễn Văn A" required>
              </div>
              <div class="form-group">
                <label for="reg-username"><i class="bi bi-person-fill"></i> Tên đăng nhập</label>
                <input type="text" id="reg-username" class="input-field" placeholder="Viết liền không dấu, không khoảng cách" required autocomplete="username">
              </div>
              <div class="form-group">
                <label for="reg-password"><i class="bi bi-lock-fill"></i> Mật khẩu</label>
                <input type="password" id="reg-password" class="input-field" placeholder="Ít nhất 3 ký tự" required autocomplete="new-password">
              </div>
              <div class="form-group">
                <label for="reg-role"><i class="bi bi-briefcase-fill"></i> Vai trò tài khoản</label>
                <select id="reg-role" class="select-field" style="height: 42px;">
                  <option value="employee">👤 Nhân viên phục vụ</option>
                  <option value="manager">🏢 Quản lý cửa hàng</option>
                </select>
              </div>
              <div id="register-error" style="display:none; color: var(--danger); font-size: 12px; font-weight: 600; margin-top: 8px; padding: 8px 12px; background: rgba(220,53,69,0.08); border-radius: var(--radius-sm); border-left: 3px solid var(--danger);">
                <i class="bi bi-exclamation-circle-fill"></i> <span id="register-error-msg"></span>
              </div>
              <button type="submit" class="btn-primary" style="width: 100%; margin-top: 12px; height: 44px; font-size: 15px; font-weight: 700; background: var(--success); border-color: var(--success);">
                <i class="bi bi-person-plus-fill"></i> Tạo Tài Khoản
              </button>
            </form>
            
            <div style="text-align: center; margin-top: 16px; font-size: 13px; color: var(--text-muted);">
              Đã có tài khoản? <a href="#" id="toggle-to-login" style="color: var(--primary); font-weight: 600;">Quay lại đăng nhập</a>
            </div>
          </div>
        </div>
      </div>
    `;

    this.initEvents();
  }

  initEvents() {
    const loginSection = this.container.querySelector('#login-section');
    const registerSection = this.container.querySelector('#register-section');
    const loginError = this.container.querySelector('#login-error');
    const registerError = this.container.querySelector('#register-error');
    const registerErrorMsg = this.container.querySelector('#register-error-msg');

    // Toggle between login and register
    this.container.querySelector('#toggle-to-register').addEventListener('click', (e) => {
      e.preventDefault();
      loginSection.style.display = 'none';
      registerSection.style.display = 'block';
      loginError.style.display = 'none';
    });

    this.container.querySelector('#toggle-to-login').addEventListener('click', (e) => {
      e.preventDefault();
      registerSection.style.display = 'none';
      loginSection.style.display = 'block';
      registerError.style.display = 'none';
    });

    // Login form submit
    this.container.querySelector('#login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      loginError.style.display = 'none';
      const username = this.container.querySelector('#login-username').value.trim().toLowerCase();
      const password = this.container.querySelector('#login-password').value;

      if (!username || !password) {
        loginError.style.display = 'block';
        loginError.querySelector ? null : null;
        return;
      }

      const success = this.controller.handleLogin(username, password);
      if (!success) {
        loginError.style.display = 'block';
      }
    });

    // Register form submit
    this.container.querySelector('#register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      registerError.style.display = 'none';

      const name = this.container.querySelector('#reg-name').value.trim();
      const username = this.container.querySelector('#reg-username').value.trim().toLowerCase();
      const password = this.container.querySelector('#reg-password').value;
      const role = this.container.querySelector('#reg-role').value;

      // Client-side validation
      if (!name || !username || !password) {
        registerErrorMsg.textContent = 'Vui lòng điền đầy đủ tất cả các trường.';
        registerError.style.display = 'block';
        return;
      }
      if (password.length < 3) {
        registerErrorMsg.textContent = 'Mật khẩu phải có ít nhất 3 ký tự.';
        registerError.style.display = 'block';
        return;
      }
      if (!/^[a-z0-9_]+$/.test(username)) {
        registerErrorMsg.textContent = 'Tên đăng nhập chỉ được dùng chữ thường, số và dấu gạch dưới.';
        registerError.style.display = 'block';
        return;
      }

      const success = await this.controller.handleRegister(username, password, name, role);
      if (!success) {
        // Error message is shown by handleRegister via alert or we catch it here
        // The controller will show error feedback if registration fails
      }
    });

    // Quick login buttons
    this.container.querySelectorAll('.btn-quick-login').forEach(btn => {
      btn.addEventListener('click', () => {
        const username = btn.getAttribute('data-user');
        const password = btn.getAttribute('data-pass') || '123';
        loginError.style.display = 'none';
        const success = this.controller.handleLogin(username, password);
        if (!success) {
          loginError.style.display = 'block';
        }
      });
    });
  }
}