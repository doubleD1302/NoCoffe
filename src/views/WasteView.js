// WasteView.js - Renders Waste and Materials Loss tracking using Bootstrap Icons

export class WasteView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
  }

  render() {
    const inventory = this.controller.getInventoryModel();
    const ingredients = inventory.getIngredients();
    const user = this.controller.getCurrentUser();
    const isEmployee = user && user.role === 'employee';

    const optionsHtml = ingredients.map(ing => 
      `<option value="${ing.id}">${ing.name} (${ing.unit})</option>`
    ).join('');

    this.container.innerHTML = `
      <div class="view-title-row">
        <h2>Báo Cáo Hao Hụt</h2>
      </div>

      <!-- Add Waste Event Form -->
      <div class="chart-section" style="margin-bottom: 20px;">
        <div class="chart-title"><i class="bi bi-trash3-fill"></i> Ghi nhận hao hụt mới</div>
        <form id="add-waste-form">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div class="form-group">
              <label for="waste-ing-id">Nguyên liệu</label>
              <select id="waste-ing-id" class="select-field" style="padding: 10px;">
                ${optionsHtml}
              </select>
            </div>
            <div class="form-group">
              <label for="waste-qty">Lượng hao hụt</label>
              <!-- Fix: support decimals by changing min and step -->
              <input type="number" id="waste-qty" class="input-field" min="0.01" step="any" required placeholder="Ví dụ: 0.5, 200..." style="padding: 10px;">
            </div>
          </div>

          <div class="form-group">
            <label for="waste-reason">Lý do hao hụt</label>
            <select id="waste-reason" class="select-field" style="padding: 10px;">
              <option value="Đổ vỡ">Đổ vỡ / Rơi vãi</option>
              <option value="Hỏng vị">Hỏng vị / Pha sai tỷ lệ</option>
              <option value="Quá hạn">Hết hạn sử dụng</option>
              <option value="Hao hụt tự nhiên">Hao hụt tự nhiên</option>
            </select>
          </div>

          <button type="submit" class="btn-danger" style="width: 100%; height: 40px; margin-top: 5px;">
            <i class="bi bi-fire"></i> Ghi Nhận Hao Hụt & Trừ Kho
          </button>
        </form>
      </div>

      <!-- Historical Logs -->
      <div class="chart-section" style="margin-bottom: 80px;">
        <div class="chart-title"><i class="bi bi-clock-history"></i> Lịch sử sự cố hao hụt</div>
        <div class="waste-list" id="waste-logs-mount"></div>
      </div>
    `;

    this.renderWasteLogs(isEmployee);
    this.initEvents();
  }

  initEvents() {
    this.container.querySelector('#add-waste-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const ingId = this.container.querySelector('#waste-ing-id').value;
      const qty = Number(this.container.querySelector('#waste-qty').value);
      const reason = this.container.querySelector('#waste-reason').value;

      const success = await this.controller.handleLogWaste(ingId, qty, reason);
      if (success) {
        this.container.querySelector('#waste-qty').value = '';
        this.render();
      }
    });
  }

  renderWasteLogs(isEmployee) {
    const mount = this.container.querySelector('#waste-logs-mount');
    const logs = this.controller.getWasteModel().getWasteLogs();

    if (logs.length === 0) {
      mount.innerHTML = `<div style="font-size: 12px; text-align: center; color: var(--text-muted); padding: 16px 0;"><i class="bi bi-check-circle"></i> Chưa ghi nhận sự cố hao hụt nào.</div>`;
      return;
    }

    mount.innerHTML = logs.map(item => {
      const date = new Date(item.timestamp);
      const formattedDate = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} - ${date.getDate()}/${date.getMonth() + 1}`;
      
      // Hide waste financial costs from Employees
      const costHtml = isEmployee 
        ? '' 
        : `<div class="waste-log-cost">-${item.cost.toLocaleString('vi-VN')}đ</div>`;

      return `
        <div class="waste-log-card">
          <div>
            <span class="waste-log-title">${item.ingredientName}</span>
            <div class="waste-log-meta">
              Hao hụt: <strong>${item.qty} ${item.unit}</strong> • ${item.reason}<br>
              Người báo: <strong>${item.reportedBy || 'staff'}</strong> • ${formattedDate}
            </div>
          </div>
          ${costHtml}
        </div>
      `;
    }).join('');
  }
}
