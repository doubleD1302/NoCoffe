// InventoryView.js - Renders Raw Materials Inventory with security checks & Bootstrap Icons

export class InventoryView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
  }

  render() {
    const user = this.controller.getCurrentUser();
    const isEmployee = user && user.role === 'employee';

    // Action buttons visible for Manager/Dev-Admin
    const actionButtons = !isEmployee 
      ? `
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary" id="btn-open-add-ing" style="padding: 6px 12px; font-size: 13px;"><i class="bi bi-plus-circle"></i> Thêm mới</button>
          <button class="btn-secondary" id="btn-open-export" style="padding: 6px 12px; font-size: 13px; background: var(--danger); border-color: var(--danger); color: white;"><i class="bi bi-box-arrow-up"></i> Xuất kho</button>
          <button class="btn-primary" id="btn-open-restock" style="padding: 6px 12px; font-size: 13px;"><i class="bi bi-box-seam-fill"></i> Nhập kho</button>
        </div>
      ` 
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

    const btnExport = this.container.querySelector('#btn-open-export');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        this.openExportModal();
      });
    }

    const btnAddIng = this.container.querySelector('#btn-open-add-ing');
    if (btnAddIng) {
      btnAddIng.addEventListener('click', () => {
        this.openAddIngredientModal();
      });
    }

    // Event delegation for Edit and Delete buttons on cards
    const mount = this.container.querySelector('#inventory-items-mount');
    if (mount) {
      mount.addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit-ing');
        const btnDelete = e.target.closest('.btn-delete-ing');
        
        if (btnEdit) {
          const ingId = btnEdit.getAttribute('data-id');
          this.openEditIngredientModal(ingId);
        }
        
        if (btnDelete) {
          const ingId = btnDelete.getAttribute('data-id');
          const ingName = this.controller.getInventoryModel().getIngredient(ingId)?.name || '';
          this.controller.viewManager.showConfirm(`Bạn có chắc chắn muốn xoá nguyên liệu "${ingName}" không?`, async () => {
            const success = await this.controller.handleDeleteIngredient(ingId);
            if (success) {
              this.render();
            }
          });
        }
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

      // Edit and Delete buttons for Managers/Admins
      const editButtons = !isEmployee
        ? `
          <div class="inventory-item-actions" style="margin-top: 8px; display: flex; gap: 8px; justify-content: flex-end; width: 100%; border-top: 1px dashed var(--border-color); padding-top: 8px;">
            <button class="btn-secondary btn-edit-ing" data-id="${ing.id}" style="padding: 4px 8px; font-size: 11px; height: auto; display: flex; align-items: center; gap: 4px;"><i class="bi bi-pencil-square"></i> Sửa</button>
            <button class="btn-danger btn-delete-ing" data-id="${ing.id}" style="padding: 4px 8px; font-size: 11px; height: auto; background: var(--danger); border-color: var(--danger); display: flex; align-items: center; gap: 4px;"><i class="bi bi-trash-fill"></i> Xoá</button>
          </div>
        `
        : '';

      return `
        <div class="inventory-item-card" style="display: flex; flex-direction: column; gap: 8px; background: var(--surface); border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
            <div class="inventory-item-details" style="flex: 1;">
              <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 2px;">${ing.name}</h4>
              <div class="inventory-item-sub" style="font-size: 11px; color: var(--text-muted);">
                Mức tối thiểu: ${ing.minStock}${ing.unit}${costInfo}
              </div>
              <div style="margin-top: 6px;">${badgeHtml}</div>
            </div>
            <div class="inventory-stock-status" style="text-align: right; margin-left: 8px;">
              <div class="inventory-stock-number" style="color: var(--${status === 'success' ? 'primary-dark' : status}); font-size: 15px; font-weight: 800;">
                ${ing.stock.toLocaleString('vi-VN')} ${ing.unit}
              </div>
            </div>
          </div>
          ${editButtons}
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
            <input type="text" id="add-ing-unit" class="input-field" required placeholder="Ví dụ: g, ml, cái, hộp...">
          </div>

          <div class="form-group">
            <label for="add-ing-stock">Số lượng tồn kho ban đầu</label>
            <input type="number" id="add-ing-stock" class="input-field" min="0" step="any" required placeholder="Ví dụ: 5000, 3000...">
          </div>

          <div class="form-group">
            <label for="add-ing-cost">Giá vốn trung bình mỗi đơn vị (VND)</label>
            <input type="number" id="add-ing-cost" class="input-field" min="0" required placeholder="Ví dụ: 150, 60...">
          </div>

          <div class="form-group">
            <label for="add-ing-min">Mức cảnh báo tồn kho tối thiểu</label>
            <input type="number" id="add-ing-min" class="input-field" min="0" step="any" required placeholder="Ví dụ: 2000, 1000...">
          </div>

          <button type="submit" class="btn-primary" style="width: 100%; height: 44px; margin-top: 10px;">
            <i class="bi bi-plus-circle-fill"></i> Thêm Nguyên Liệu
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

    overlay.querySelector('#add-ing-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = overlay.querySelector('#add-ing-name').value.trim();
      const unit = overlay.querySelector('#add-ing-unit').value.trim();
      const stock = Number(overlay.querySelector('#add-ing-stock').value);
      const cost = Number(overlay.querySelector('#add-ing-cost').value);
      const minStock = Number(overlay.querySelector('#add-ing-min').value);

      const success = await this.controller.handleAddIngredient(name, unit, stock, cost, minStock);
      if (success) {
        this.render();
        closeModal();
      }
    });
  }

  openEditIngredientModal(ingId) {
    const inventory = this.controller.getInventoryModel();
    const ing = inventory.getIngredient(ingId);
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
            <label for="edit-ing-stock">Số lượng tồn kho</label>
            <input type="number" id="edit-ing-stock" class="input-field" min="0" step="any" required value="${ing.stock}">
          </div>

          <div class="form-group">
            <label for="edit-ing-cost">Giá vốn trung bình mỗi đơn vị (VND)</label>
            <input type="number" id="edit-ing-cost" class="input-field" min="0" required value="${ing.cost}">
          </div>

          <div class="form-group">
            <label for="edit-ing-min">Mức cảnh báo tồn kho tối thiểu</label>
            <input type="number" id="edit-ing-min" class="input-field" min="0" step="any" required value="${ing.minStock}">
          </div>

          <button type="submit" class="btn-primary" style="width: 100%; height: 44px; margin-top: 10px;">
            <i class="bi bi-check-circle-fill"></i> Lưu Thay Đổi
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

    overlay.querySelector('#edit-ing-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = overlay.querySelector('#edit-ing-name').value.trim();
      const unit = overlay.querySelector('#edit-ing-unit').value.trim();
      const stock = Number(overlay.querySelector('#edit-ing-stock').value);
      const cost = Number(overlay.querySelector('#edit-ing-cost').value);
      const minStock = Number(overlay.querySelector('#edit-ing-min').value);

      const success = await this.controller.handleUpdateIngredient(ingId, name, unit, stock, cost, minStock);
      if (success) {
        this.render();
        closeModal();
      }
    });
  }

  openExportModal() {
    const inventory = this.controller.getInventoryModel();
    const ingredients = inventory.getIngredients();
    const mount = this.container.querySelector('#inventory-modals-mount');
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const optionsHtml = ingredients.map(ing => 
      `<option value="${ing.id}">${ing.name} (${ing.unit}) - Tồn: ${ing.stock.toLocaleString('vi-VN')}</option>`
    ).join('');

    overlay.innerHTML = `
      <div class="modal-content">
        <div class="drawer-handle"></div>
        <div class="modal-header">
          <h3>Xuất Kho Nguyên Liệu</h3>
          <button class="btn-icon-small btn-close-modal">×</button>
        </div>

        <form id="export-form">
          <div class="form-group">
            <label for="export-ing-id">Nguyên liệu xuất</label>
            <select id="export-ing-id" class="select-field">
              ${optionsHtml}
            </select>
          </div>

          <div class="form-group">
            <label for="export-qty">Số lượng xuất</label>
            <input type="number" id="export-qty" class="input-field" min="0" step="any" required placeholder="Nhập số lượng xuất...">
          </div>

          <div class="form-group">
            <label for="export-reason">Lý do xuất kho</label>
            <input type="text" id="export-reason" class="input-field" required placeholder="Ví dụ: Sử dụng nội bộ, Hỏng hóc, Trả hàng...">
          </div>

          <button type="submit" class="btn-primary" style="width: 100%; height: 44px; margin-top: 10px; background: var(--danger); border-color: var(--danger);">
            <i class="bi bi-box-arrow-up"></i> Xác Nhận Xuất Kho
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

    overlay.querySelector('#export-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const ingId = overlay.querySelector('#export-ing-id').value;
      const qty = Number(overlay.querySelector('#export-qty').value);
      const reason = overlay.querySelector('#export-reason').value.trim();

      const ing = inventory.getIngredient(ingId);
      if (!ing) {
        this.controller.viewManager.showToast('Không tìm thấy nguyên liệu đã chọn', 'danger');
        return;
      }

      if (qty <= 0) {
        this.controller.viewManager.showToast('Số lượng xuất phải lớn hơn 0', 'danger');
        return;
      }

      if (ing.stock < qty) {
        this.controller.viewManager.showToast(`Số lượng xuất vượt quá tồn kho hiện tại (${ing.stock.toLocaleString('vi-VN')} ${ing.unit})`, 'danger');
        return;
      }

      const success = await this.controller.handleExportIngredient(ingId, qty, reason);
      if (success) {
        this.render();
        closeModal();
      }
    });
  }
}
