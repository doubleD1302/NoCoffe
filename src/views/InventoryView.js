// InventoryView.js - Renders Raw Materials Inventory with security checks & Bootstrap Icons

export class InventoryView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
  }

  render() {
    const user = this.controller.getCurrentUser();
    const isEmployee = user && user.role === 'employee';

    // Restock & Add Action buttons are only visible for Manager/Dev-Admin
    const actionButtons = !isEmployee 
      ? `<div style="display: flex; gap: 8px;">
          <button class="btn-secondary" id="btn-open-add-ingredient" style="padding: 6px 12px; font-size: 13px;"><i class="bi bi-plus-circle-fill"></i> Thêm nguyên liệu</button>
          <button class="btn-primary" id="btn-open-restock" style="padding: 6px 12px; font-size: 13px;"><i class="bi bi-box-seam-fill"></i> Nhập kho</button>
         </div>` 
      : '';

    this.container.innerHTML = `
      <div class="view-title-row">
        <h2>Kho Nguyên Liệu</h2>
        ${actionButtons}
      </div>

      <div class="inventory-list" id="inventory-items-mount"></div>

      <!-- Modals mount layer -->
      <div id="inventory-modals-mount"></div>
    `;

    this.renderInventoryList(isEmployee);
    this.initEvents();
  }

  initEvents() {
    const btnRestock = this.container.querySelector('#btn-open-restock');
    if (btnRestock) {
      btnRestock.addEventListener('click', () => {
        this.openRestockModal();
      });
    }

    const btnAdd = this.container.querySelector('#btn-open-add-ingredient');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        this.openAddIngredientModal();
      });
    }
  }

  renderInventoryList(isEmployee) {
    const mount = this.container.querySelector('#inventory-items-mount');
    const inventory = this.controller.getInventoryModel();
    const ingredients = inventory.getIngredients();

    if (ingredients.length === 0) {
      mount.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted);"><i class="bi bi-box-seam"></i> Kho trống. Mời bạn thêm nguyên liệu mới.</div>`;
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
        <div class="inventory-item-card" style="flex-direction: column; align-items: stretch; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div class="inventory-item-details">
              <h4>${ing.name}</h4>
              <div class="inventory-item-sub">
                Mức tối thiểu: ${ing.minStock}${ing.unit}${costInfo}
              </div>
              <div style="margin-top: 6px;">${badgeHtml}</div>
            </div>
            <div class="inventory-stock-status" style="display: flex; align-items: center; gap: 12px;">
              <div class="inventory-stock-number" style="color: var(--${status === 'success' ? 'primary-dark' : status}); font-weight: 700;">
                ${ing.stock.toLocaleString('vi-VN')} ${ing.unit}
              </div>
              ${!isEmployee ? `
                <div style="display: flex; gap: 4px;">
                  <button class="btn-secondary btn-edit-ingredient" data-id="${ing.id}" style="padding: 6px 10px; font-size: 11px;"><i class="bi bi-pencil"></i></button>
                  <button class="btn-danger btn-delete-ingredient" data-id="${ing.id}" style="padding: 6px 8px; font-size: 11px;"><i class="bi bi-trash"></i></button>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (!isEmployee) {
      mount.querySelectorAll('.btn-edit-ingredient').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openEditIngredientModal(id);
        });
      });

      mount.querySelectorAll('.btn-delete-ingredient').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.controller.viewManager.showConfirm('Bạn có chắc chắn muốn xoá nguyên liệu này khỏi kho không? Lựa chọn này có thể ảnh hưởng đến các công thức liên quan.', async () => {
            const success = await this.controller.handleDeleteIngredient(id);
            if (success) {
              this.render();
            }
          });
        });
      });
    }
  }

  openRestockModal() {
    const inventory = this.controller.getInventoryModel();
    const ingredients = inventory.getIngredients();
    const mount = this.container.querySelector('#inventory-modals-mount');
    
    if (ingredients.length === 0) {
      this.controller.viewManager.showToast('Vui lòng thêm nguyên liệu mới trước khi nhập kho!', 'warning');
      return;
    }

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

    const closeModal = () => overlay.remove();
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

  openAddIngredientModal() {
    const mount = this.container.querySelector('#inventory-modals-mount');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    overlay.innerHTML = `
      <div class="modal-content">
        <div class="drawer-handle"></div>
        <div class="modal-header">
          <h3>Thêm Nguyên Liệu Mới</h3>
          <button class="btn-icon-small btn-close-modal">×</button>
        </div>

        <form id="add-ing-form">
          <div class="form-group">
            <label for="add-ing-name">Tên nguyên liệu</label>
            <input type="text" id="add-ing-name" class="input-field" required placeholder="Ví dụ: Cà phê hạt, Sữa đặc...">
          </div>

          <div class="form-group">
            <label for="add-ing-unit">Đơn vị tính</label>
            <input type="text" id="add-ing-unit" class="input-field" required placeholder="Ví dụ: g, ml, cái...">
          </div>

          <div class="form-group">
            <label for="add-ing-min">Mức tối thiểu cảnh báo</label>
            <input type="number" id="add-ing-min" class="input-field" min="0" step="any" required placeholder="Ví dụ: 1000">
          </div>

          <div class="form-group">
            <label for="add-ing-stock">Số lượng ban đầu</label>
            <input type="number" id="add-ing-stock" class="input-field" min="0" step="any" required placeholder="Ví dụ: 5000">
          </div>

          <div class="form-group">
            <label for="add-ing-cost">Giá vốn mua mỗi đơn vị (VND)</label>
            <input type="number" id="add-ing-cost" class="input-field" min="0" required placeholder="Ví dụ: 150">
          </div>

          <button type="submit" class="btn-primary" style="width: 100%; height: 44px; margin-top: 10px;">
            <i class="bi bi-check-lg"></i> Xác Nhận Thêm
          </button>
        </form>
      </div>
    `;

    mount.appendChild(overlay);

    const closeModal = () => overlay.remove();
    overlay.querySelector('.btn-close-modal').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    overlay.querySelector('#add-ing-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = overlay.querySelector('#add-ing-name').value.trim();
      const unit = overlay.querySelector('#add-ing-unit').value.trim();
      const minStock = Number(overlay.querySelector('#add-ing-min').value);
      const initialStock = Number(overlay.querySelector('#add-ing-stock').value);
      const unitCost = Number(overlay.querySelector('#add-ing-cost').value);

      const success = await this.controller.handleAddIngredient(name, unit, minStock, initialStock, unitCost);
      if (success) {
        this.render();
        closeModal();
      }
    });
  }

  openEditIngredientModal(id) {
    const inventory = this.controller.getInventoryModel();
    const ing = inventory.getIngredient(id);
    if (!ing) return;

    const mount = this.container.querySelector('#inventory-modals-mount');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    overlay.innerHTML = `
      <div class="modal-content">
        <div class="drawer-handle"></div>
        <div class="modal-header">
          <h3>Chỉnh Sửa Nguyên Liệu</h3>
          <button class="btn-icon-small btn-close-modal">×</button>
        </div>

        <form id="edit-ing-form">
          <div class="form-group">
            <label for="edit-ing-name">Tên nguyên liệu</label>
            <input type="text" id="edit-ing-name" class="input-field" required value="${ing.name}">
          </div>

          <div class="form-group">
            <label for="edit-ing-unit">Đơn vị tính</label>
            <input type="text" id="edit-ing-unit" class="input-field" required value="${ing.unit}">
          </div>

          <div class="form-group">
            <label for="edit-ing-min">Mức tối thiểu cảnh báo</label>
            <input type="number" id="edit-ing-min" class="input-field" min="0" step="any" required value="${ing.minStock}">
          </div>

          <div class="form-group">
            <label for="edit-ing-cost">Giá vốn mua mỗi đơn vị (VND)</label>
            <input type="number" id="edit-ing-cost" class="input-field" min="0" required value="${ing.cost}">
          </div>

          <button type="submit" class="btn-primary" style="width: 100%; height: 44px; margin-top: 10px;">
            <i class="bi bi-save-fill"></i> Lưu Thay Đổi
          </button>
        </form>
      </div>
    `;

    mount.appendChild(overlay);

    const closeModal = () => overlay.remove();
    overlay.querySelector('.btn-close-modal').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    overlay.querySelector('#edit-ing-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = overlay.querySelector('#edit-ing-name').value.trim();
      const unit = overlay.querySelector('#edit-ing-unit').value.trim();
      const minStock = Number(overlay.querySelector('#edit-ing-min').value);
      const cost = Number(overlay.querySelector('#edit-ing-cost').value);

      const success = await this.controller.handleUpdateIngredient(id, name, unit, minStock, cost);
      if (success) {
        this.render();
        closeModal();
      }
    });
  }
}
