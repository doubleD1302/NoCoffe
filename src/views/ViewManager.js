// ViewManager.js - Coordinates screen navigation, toasts, and role-based permissions

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
    
    // Dev Tools DOM Elements
    this.devFloatTrigger = document.getElementById('dev-float-trigger');
    this.devRoleSwitcher = document.getElementById('dev-role-switcher');
    this.devPanelToggle = document.getElementById('dev-panel-toggle');
    this.devBypassLogin = document.getElementById('dev-bypass-login');
    this.devSeedBtn = document.getElementById('dev-seed-btn');
    
    this.initEvents();
  }

  initEvents() {
    // Nav Bar Tabs Click
    this.navBar.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const viewId = tab.getAttribute('data-view');
        this.controller.switchTab(viewId);
      });
    });

    // Profile Click - triggers logout/re-login action
    this.headerUserBadge.addEventListener('click', () => {
      this.showConfirm('Bạn có muốn đăng xuất không?', () => {
        this.controller.logout();
      });
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
  }

  updateHeader(user) {
    if (!user) {
      this.headerRoleName.innerText = 'Khách';
      this.headerRoleDot.className = 'role-dot';
      return;
    }

    this.headerRoleName.innerText = user.name;
    this.headerRoleDot.className = `role-dot role-${user.role}`;
    
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
      this.devFloatTrigger.classList.add('hidden');
      this.devRoleSwitcher.classList.add('hidden');
      return;
    }

    this.navBar.classList.remove('hidden');
    
    // Chỉ hiển thị nút mở công cụ giả lập khi là tài khoản Admin duy nhất
    if (user.username === '13022005uit' && user.role === 'dev-admin') {
      this.devFloatTrigger.classList.remove('hidden');
    } else {
      this.devFloatTrigger.classList.add('hidden');
      this.devRoleSwitcher.classList.add('hidden');
    }
    
    // Check elements visibility based on roles
    const tabs = this.navBar.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      const viewId = tab.getAttribute('data-view');
      
      if (viewId === 'stats-view' || viewId === 'menu-view' || viewId === 'inventory-view') {
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

  showConfirm(message, callback) {
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

    overlay.querySelector('.btn-cancel-confirm').addEventListener('click', close);
    overlay.querySelector('.btn-ok-confirm').addEventListener('click', () => {
      close();
      if (typeof callback === 'function') callback();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
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
}
