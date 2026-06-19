// ViewManager.js - Coordinates screen navigation, toasts, and role-based permissions

import { NotificationHelper } from '../utils/NotificationHelper.js';

export class ViewManager {
  constructor(controller) {
    this.controller = controller;
    
    // Core DOM Elements
    this.viewport = document.getElementById('view-viewport');
    this.navBar = document.getElementById('bottom-nav-bar');
    this.toastContainer = document.getElementById('toast-container');
    
    // Header DOM Elements
    this.headerUserBadge = document.getElementById('header-user-badge');
    this.headerRoleDot = document.getElementById('header-role-dot');
    this.headerRoleName = document.getElementById('header-role-name');
    this.headerNotificationBtn = document.getElementById('header-notification-btn');
    this.headerNotificationDot = document.getElementById('header-notification-dot');
    
    // Dev Tools DOM Elements
    this.devFloatTrigger = document.getElementById('dev-float-trigger');
    this.devRoleSwitcher = document.getElementById('dev-role-switcher');
    this.devPanelToggle = document.getElementById('dev-panel-toggle');
    this.devBypassLogin = document.getElementById('dev-bypass-login');
    this.devSeedBtn = document.getElementById('dev-seed-btn');
    
    this.initEvents();
    this.updateNotificationBellUI();
  }

  initEvents() {
    // Nav Bar Tabs Click
    this.navBar.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const viewId = tab.getAttribute('data-view');
        this.controller.switchTab(viewId);
      });
    });

    // Profile Click - triggers profile menu modal
    this.headerUserBadge.addEventListener('click', () => {
      this.openProfileModal();
    });

    // Dev Toggle button clicks
    this.devFloatTrigger.addEventListener('click', () => {
      this.devRoleSwitcher.classList.remove('hidden');
      this.devFloatTrigger.classList.add('hidden');
    });

    this.devPanelToggle.addEventListener('click', () => {
      this.devRoleSwitcher.classList.add('hidden');
      this.devFloatTrigger.classList.remove('hidden');
    });

    // Dev Role Switcher buttons
    this.devRoleSwitcher.querySelectorAll('.btn-dev-role').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetRole = btn.getAttribute('data-role');
        this.controller.devSwitchRole(targetRole);
        
        // Highlight active
        this.devRoleSwitcher.querySelectorAll('.btn-dev-role').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.showToast(`Vai trò giả lập: ${btn.innerText}`, 'warning');
      });
    });

    // Dev Bypass Login Checkbox
    this.devBypassLogin.addEventListener('change', (e) => {
      this.controller.setBypassLogin(e.target.checked);
      this.showToast(e.target.checked ? 'Đã bật bỏ qua đăng nhập' : 'Yêu cầu đăng nhập thông thường', 'success');
    });

    // Dev Seed 30 days
    this.devSeedBtn.addEventListener('click', () => {
      this.showConfirm('Hệ thống sẽ reset và sinh ngẫu nhiên 30 ngày bán hàng lịch sử để kiểm tra báo cáo. Bạn có chắc chắn muốn thực hiện?', () => {
        this.controller.seedMockData();
      });
    });

    // Notification Bell Click
    if (this.headerNotificationBtn) {
      this.headerNotificationBtn.addEventListener('click', () => {
        this.handleNotificationBellClick();
      });
    }
  }

  updateHeader(user) {
    if (!user) {
      this.headerRoleName.innerText = 'Khách';
      this.headerRoleDot.style.display = 'inline-block';
      this.headerRoleDot.className = 'role-dot';
      const existingImg = this.headerUserBadge.querySelector('.header-avatar-img');
      if (existingImg) existingImg.remove();

      this.devFloatTrigger.classList.add('hidden');
      this.devRoleSwitcher.classList.add('hidden');
      return;
    }

    this.headerRoleName.innerText = user.name;
    
    const existingImg = this.headerUserBadge.querySelector('.header-avatar-img');
    if (user.avatar) {
      this.headerRoleDot.style.display = 'none';
      if (existingImg) {
        existingImg.src = user.avatar;
      } else {
        const img = document.createElement('img');
        img.className = 'header-avatar-img';
        img.src = user.avatar;
        img.style.width = '20px';
        img.style.height = '20px';
        img.style.borderRadius = '50%';
        img.style.objectFit = 'cover';
        this.headerUserBadge.insertBefore(img, this.headerRoleName);
      }
    } else {
      this.headerRoleDot.style.display = 'inline-block';
      this.headerRoleDot.className = `role-dot role-${user.role}`;
      if (existingImg) existingImg.remove();
    }
    
    const isMainAdmin = user.username === '13022005uit';
    if (isMainAdmin) {
      this.devFloatTrigger.classList.remove('hidden');
    } else {
      this.devFloatTrigger.classList.add('hidden');
      this.devRoleSwitcher.classList.add('hidden');
    }
    
    // Highlight correct dev role button if initialized
    this.devRoleSwitcher.querySelectorAll('.btn-dev-role').forEach(btn => {
      if (btn.getAttribute('data-role') === user.role) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    this.devBypassLogin.checked = this.controller.isBypassLogin();
  }

  applyRoleRestrictions(user) {
    if (!user) {
      this.navBar.classList.add('hidden');
      return;
    }

    this.navBar.classList.remove('hidden');
    
    // Check elements visibility based on roles
    const tabs = this.navBar.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      const viewId = tab.getAttribute('data-view');
      
      if (viewId === 'stats-view' || viewId === 'inventory-view') {
        // Manager or Dev-admin only
        if (user.role === 'employee') {
          tab.style.display = 'none';
        } else {
          tab.style.display = 'flex';
        }
      } else {
        tab.style.display = 'flex';
      }
    });
  }

  showView(viewId) {
    const panels = this.viewport.querySelectorAll('.view-panel');
    panels.forEach(panel => {
      if (panel.id === viewId) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });

    // Sync Bottom Tab Bar
    this.navBar.querySelectorAll('.nav-tab').forEach(tab => {
      if (tab.getAttribute('data-view') === viewId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  showConfirm(message, callback, cancelCallback) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '9999';
    overlay.style.alignItems = 'center'; // Center confirm modal on all sizes
    
    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 320px; border-radius: var(--radius-lg); text-align: center; padding: 24px; align-self: center; border: 1px solid var(--border-color);">
        <div style="font-size: 36px; margin-bottom: 12px;">❔</div>
        <h3 style="font-family: var(--font-heading); font-size: 15px; margin-bottom: 20px; line-height: 1.5; color: var(--text-main); font-weight: 700;">${message}</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <button class="btn-secondary btn-cancel-confirm" style="height: 38px;">Hủy</button>
          <button class="btn-primary btn-ok-confirm" style="height: 38px;">Đồng ý</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      overlay.style.opacity = '0';
      overlay.querySelector('.modal-content').style.transform = 'scale(0.9)';
      overlay.querySelector('.modal-content').style.transition = 'all 0.15s ease';
      setTimeout(() => overlay.remove(), 150);
    };

    overlay.querySelector('.btn-cancel-confirm').addEventListener('click', () => {
      close();
      if (typeof cancelCallback === 'function') cancelCallback();
    });
    overlay.querySelector('.btn-ok-confirm').addEventListener('click', () => {
      close();
      if (typeof callback === 'function') callback();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        close();
        if (typeof cancelCallback === 'function') cancelCallback();
      }
    });
  }

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '<i class="bi bi-bell-fill"></i>';
    if (type === 'success') icon = '<i class="bi bi-check-circle-fill" style="color: var(--success);"></i>';
    if (type === 'warning') icon = '<i class="bi bi-exclamation-triangle-fill" style="color: var(--warning);"></i>';
    if (type === 'danger') icon = '<i class="bi bi-exclamation-octagon-fill" style="color: var(--danger);"></i>';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    this.toastContainer.appendChild(toast);
    
    // Animate out after 2.5s
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, -20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 2500);
  }

  showLoading(text = 'Đang đồng bộ cơ sở dữ liệu...') {
    const overlay = document.getElementById('app-loading-overlay');
    if (overlay) {
      overlay.querySelector('.loading-text').innerText = text;
      overlay.classList.remove('hidden');
    }
  }

  hideLoading() {
    const overlay = document.getElementById('app-loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  openProfileModal() {
    const user = this.controller.getActiveUser();
    if (!user) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '9999';
    overlay.style.alignItems = 'center';

    const drawProfileMenu = () => {
      const avatarHtml = user.avatar 
        ? `<img src="${user.avatar}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);">`
        : `<div style="width: 64px; height: 64px; border-radius: 50%; background: var(--primary-soft); display: flex; align-items: center; justify-content: center; border: 2px solid var(--border-color);"><i class="bi bi-person-fill" style="font-size: 32px; color: var(--primary-dark);"></i></div>`;

      overlay.innerHTML = `
        <div class="modal-content" style="max-width: 320px; border-radius: var(--radius-lg); text-align: center; padding: 20px; align-self: center;">
          <div class="drawer-handle"></div>
          <div class="modal-header">
            <h3>Tài Khoản Cá Nhân</h3>
            <button class="btn-icon-small btn-close-modal">×</button>
          </div>
          
          <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; margin: 16px 0;">
            ${avatarHtml}
            <div>
              <h4 style="font-size: 16px; font-weight: 700; color: var(--text-main);">${user.name}</h4>
              <span style="font-size: 11px; color: var(--text-muted);">@${user.username} • ${user.role === 'dev-admin' ? 'Quản trị viên' : (user.role === 'manager' ? 'Quản lý' : 'Nhân viên')}</span>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
            <button class="btn-primary" id="btn-edit-profile" style="height: 40px; width: 100%;"><i class="bi bi-pencil-square"></i> Sửa thông tin</button>
            <button class="btn-danger" id="btn-logout-confirm" style="height: 40px; width: 100%;"><i class="bi bi-box-arrow-right"></i> Đăng xuất</button>
          </div>
        </div>
      `;

      overlay.querySelector('.btn-close-modal').addEventListener('click', () => overlay.remove());
      overlay.querySelector('#btn-edit-profile').addEventListener('click', drawEditForm);
      overlay.querySelector('#btn-logout-confirm').addEventListener('click', () => {
        overlay.remove();
        this.showConfirm('Bạn có muốn đăng xuất không?', () => {
          this.controller.logout();
        });
      });
    };

    const drawEditForm = () => {
      let tempAvatar = user.avatar || '';
      let tempQr = user.qrCode || '';
      const isManager = user.role === 'manager' || user.role === 'dev-admin';

      overlay.innerHTML = `
        <div class="modal-content" style="max-width: 320px; border-radius: var(--radius-lg); padding: 20px; align-self: center;">
          <div class="modal-header">
            <h3>Sửa Thông Tin</h3>
            <button class="btn-icon-small btn-back-profile">←</button>
          </div>

          <form id="edit-profile-form" style="margin-top: 12px; display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px; background: var(--bg-app); padding: 8px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div id="profile-edit-avatar-preview" style="width: 48px; height: 48px; border-radius: 50%; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; overflow: hidden; background: white;">
                ${tempAvatar ? `<img src="${tempAvatar}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="bi bi-person" style="font-size: 24px; color: var(--text-light);"></i>`}
              </div>
              <div style="flex: 1;">
                <input type="file" id="edit-profile-avatar-file" accept="image/*" style="display: none;">
                <button type="button" class="btn-secondary" id="btn-trigger-upload-avatar" style="font-size: 10px; padding: 4px 8px;"><i class="bi bi-upload"></i> Chọn ảnh</button>
              </div>
            </div>

            ${isManager ? `
            <div style="display: flex; align-items: center; gap: 12px; background: var(--bg-app); padding: 8px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div id="profile-edit-qr-preview" style="width: 48px; height: 48px; border-radius: var(--radius-sm); border: 1px dashed var(--border-color); display: flex; align-items: center; justify-content: center; overflow: hidden; background: white;">
                ${tempQr ? `<img src="${tempQr}" style="width: 100%; height: 100%; object-fit: contain;">` : `<i class="bi bi-qr-code" style="font-size: 24px; color: var(--text-light);"></i>`}
              </div>
              <div style="flex: 1;">
                <input type="file" id="edit-profile-qr-file" accept="image/*" style="display: none;">
                <button type="button" class="btn-secondary" id="btn-trigger-upload-qr" style="font-size: 10px; padding: 4px 8px;"><i class="bi bi-upload"></i> Tải QR cửa hàng</button>
              </div>
            </div>
            ` : ''}

            <div class="form-group">
              <label for="profile-name">Họ và tên</label>
              <input type="text" id="profile-name" class="input-field" value="${user.name}" required>
            </div>

            <div class="form-group">
              <label for="profile-password">Mật khẩu mới</label>
              <input type="password" id="profile-password" class="input-field" placeholder="Để trống nếu không đổi">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px; margin-top: 8px;">
              <button type="button" class="btn-secondary btn-cancel-edit" style="height: 38px;">Hủy</button>
              <button type="submit" class="btn-primary" style="height: 38px;">Lưu</button>
            </div>
          </form>
        </div>
      `;

      const avatarInput = overlay.querySelector('#edit-profile-avatar-file');
      const avatarTrigger = overlay.querySelector('#btn-trigger-upload-avatar');
      const avatarPreview = overlay.querySelector('#profile-edit-avatar-preview');

      avatarTrigger.addEventListener('click', () => avatarInput.click());
      avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.compressImage(file, (base64Str) => {
            tempAvatar = base64Str;
            avatarPreview.innerHTML = `<img src="${base64Str}" style="width: 100%; height: 100%; object-fit: cover;">`;
          });
        }
      });

      // QR Upload Event handler (for managers)
      if (isManager) {
        const qrInput = overlay.querySelector('#edit-profile-qr-file');
        const qrTrigger = overlay.querySelector('#btn-trigger-upload-qr');
        const qrPreview = overlay.querySelector('#profile-edit-qr-preview');

        qrTrigger.addEventListener('click', () => qrInput.click());
        qrInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            this.compressImage(file, (base64Str) => {
              tempQr = base64Str;
              qrPreview.innerHTML = `<img src="${base64Str}" style="width: 100%; height: 100%; object-fit: contain;">`;
            });
          }
        });
      }

      overlay.querySelector('.btn-back-profile').addEventListener('click', drawProfileMenu);
      overlay.querySelector('.btn-cancel-edit').addEventListener('click', drawProfileMenu);

      overlay.querySelector('#edit-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = overlay.querySelector('#profile-name').value.trim();
        const newPassword = overlay.querySelector('#profile-password').value.trim() || undefined;

        this.showLoading('Đang cập nhật tài khoản...');
        const success = await this.controller.handleUpdateProfile(user.id, newName, newPassword, tempAvatar, tempQr);
        this.hideLoading();

        if (success) {
          this.showToast('Cập nhật tài khoản thành công!', 'success');
          overlay.remove();
        } else {
          this.showToast('Cập nhật tài khoản thất bại!', 'danger');
        }
      });
    };

    drawProfileMenu();
    document.body.appendChild(overlay);
  }

  compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateNotificationBellUI() {
    if (!this.headerNotificationBtn) return;
    const perm = NotificationHelper.permission;
    
    if (perm === 'granted') {
      this.headerNotificationBtn.classList.remove('denied');
      this.headerNotificationDot.classList.add('hidden');
      this.headerNotificationBtn.title = 'Thông báo: Đã bật';
      
      const banner = document.getElementById('home-notification-banner');
      if (banner) {
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(-10px)';
        banner.style.transition = 'all 0.3s ease';
        setTimeout(() => banner.remove(), 300);
      }
    } else if (perm === 'denied') {
      this.headerNotificationBtn.classList.add('denied');
      this.headerNotificationDot.classList.add('hidden');
      this.headerNotificationBtn.title = 'Thông báo: Đã chặn (vui lòng mở lại trong cài đặt)';
      
      const banner = document.getElementById('home-notification-banner');
      if (banner) banner.remove();
    } else {
      // default
      this.headerNotificationBtn.classList.remove('denied');
      this.headerNotificationDot.classList.remove('hidden'); // Show dot to draw attention
      this.headerNotificationBtn.title = 'Nhấp để bật thông báo';
    }
  }

  async handleNotificationBellClick() {
    const perm = NotificationHelper.permission;
    if (perm === 'granted') {
      NotificationHelper.send('🎗️ Thông báo đã được kích hoạt!', 'Bạn sẽ nhận được các thông báo ca trực và đơn hàng tại đây.');
      this.showToast('Thông báo đang hoạt động bình thường!', 'success');
    } else if (perm === 'denied') {
      this.showToast('Vui lòng mở cài đặt trình duyệt để cho phép quyền thông báo cho trang web này.', 'danger');
    } else {
      this.showToast('Đang yêu cầu quyền gửi thông báo...', 'warning');
      const newPerm = await NotificationHelper.requestPermission();
      this.updateNotificationBellUI();
      if (newPerm === 'granted') {
        NotificationHelper.send('🎗️ Kích hoạt thành công!', 'Cảm ơn bạn đã bật thông báo từ Nơ Coffee.');
        this.showToast('Đã bật thông báo thành công!', 'success');
        
        // Refresh home view to hide permission banner
        const activeUser = this.controller.getCurrentUser();
        if (activeUser && this.controller.activeTab === 'home-view') {
          this.controller.switchTab('home-view');
        }
      } else {
        this.showToast('Quyền gửi thông báo bị từ chối.', 'danger');
      }
    }
  }
}
