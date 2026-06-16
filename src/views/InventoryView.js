// InventoryView.js - Renders Raw Materials Inventory with security checks & Bootstrap Icons

export class InventoryView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
  }

  render() {
    const user = this.controller.getCurrentUser();
    const isEmployee = user && user.role === 'employee';

    // Restock Action button is only visible for Manager/Dev-Admin
    const actionButton = !isEmployee 
      ? `<button class="btn-primary" id="btn-open-restock" style="padding: 6px 12px; font-size: 13px;"><i class="bi bi-plus-circle-fill"></i> Nhập kho</button>` 
      : '';

    this.container.innerHTML = `
      <div class="view-title-row">
        <h2>Kho Nguyên Liệu</h2>
        ${actionButton}
      </div>

      <div class="inventory-list" id="inventory-items-mount"></div>

      <!-- Modals mount layer -->
      <div id="inventory-modals-mount"></div>
    `;

    this.renderInventoryList(isEmployee);
    this.initEvents();
  }

  initEvents() {
    const btn = this.container.querySelector('#btn-open-restock');
    if (btn) {
      btn.addEventListener('click', () => {
        this.openRestockModal();
      });
    }
  }

  renderInventoryList(isEmployee) {
    const mount = this.container.querySelector('#inventory-items-mount');
    const inventory = this.controller.getInventoryModel();
    const ingredients = inventory.getIngredients();

    if (ingredients.length === 0) {
      mount.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted);"><i class="bi bi-box-seam"></i> Kho trống.</div>`;
      return;
    }

    mount.innerHTML = ingredients.map(ing => {
      const status = inventory.getStockStatus(ing);
      let badgeHtml = '';
      if (status === 'danger') {
        badgeHtml = `<span class="badge badge-danger"><i class="bi bi-exclamation-triangle-fill"></i> Nhập gấp</span>`;
      } else if (status === 'warning') {
        badgeHtml = `<span class="badge badge-warning"><i class="bi bi-exclamation-circle-fill"></i> Sắp hết</span>`;
      } else {
        badgeHtml = `<span class="badge badge-success"><i class="bi bi-check-circle-fill"></i> Đầy đủ</span>`;
      }

      // Hide average unit cost for Employees
      const costInfo = isEmployee 
        ? '' 
        : ` • Giá vốn tb: <strong>${ing.cost.toLocaleString('vi-VN')}đ</strong>/${ing.unit}`;

      return `
        <div class="inventory-item-card">
          <div class="inventory-item-details">
            <h4>${ing.name}</h4>
            <div class="inventory-item-sub">
              Mức tối thiểu: ${ing.minStock}${ing.unit}${costInfo}
            </div>
            <div style="margin-top: 6px;">${badgeHtml}</div>
          </div>
          <div class="inventory-stock-status">
            <div class="inventory-stock-number" style="color: var(--${status === 'success' ? 'primary-dark' : status});">
              ${ing.stock.toLocaleString('vi-VN')} ${ing.unit}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  openRestockModal() {
    const inventory = this.controller.getInventoryModel();
    const ingredients = inventory.getIngredients();
    const mount = this.container.querySelector('#inventory-modals-mount');
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const optionsHtml = ingredients.map(ing => 
      `<option value="${ing.id}">${ing.name} (${ing.unit})</option>`
    ).join('');

    overlay.innerHTML = `
      <div class="modal-content">
        <div class="drawer-handle"></div>
        <div class="modal-header">
          <h3>Nhập Kho Nguyên Liệu</h3>
          <button class="btn-icon-small btn-close-modal">×</button>
        </div>

        <form id="restock-form">
          <div class="form-group">
            <label for="restock-ing-id">Nguyên liệu</label>
            <select id="restock-ing-id" class="select-field">
              ${optionsHtml}
            </select>
          </div>

          <div class="form-group">
            <label for="restock-qty">Số lượng nhập</label>
            <!-- Support decimals by changing step and min -->
            <input type="number" id="restock-qty" class="input-field" min="0" step="any" required placeholder="Ví dụ: 10, 2.5...">
          </div>

          <div class="form-group">
            <label for="restock-cost">Giá mua mỗi đơn vị (VND - Tùy chọn)</label>
            <input type="number" id="restock-cost" class="input-field" min="0" placeholder="Để trống nếu giữ nguyên giá vốn">
          </div>

          <button type="submit" class="btn-primary" style="width: 100%; height: 44px; margin-top: 10px;">
            <i class="bi bi-box-seam-fill"></i> Xác Nhận Nhập Kho
          </button>
        </form>
      </div>
    `;

    mount.appendChild(overlay);

    const closeModal = () => {
      overlay.remove();
    };

    overlay.querySelector('.btn-close-modal').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    overlay.querySelector('#restock-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const ingId = overlay.querySelector('#restock-ing-id').value;
      const qty = Number(overlay.querySelector('#restock-qty').value);
      const costVal = overlay.querySelector('#restock-cost').value;
      const parsedCost = costVal !== '' ? Number(costVal) : null;

      const success = await this.controller.handleRestock(ingId, qty, parsedCost);
      if (success) {
        this.render();
        closeModal();
      }
    });
  }
}
