// MenuView.js - Renders and manages Drink Menu and Recipe Configurations with Base64 Uploader & Dynamic Recipe rows

export class MenuView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
    
    // Temp state holding active recipe edits in the modal
    this.currentRecipeEdit = {}; 
    this.uploadedImageBase64 = '';
  }

  render() {
    this.container.innerHTML = `
      <div class="view-title-row">
        <h2>Quản Lý Menu & Công Thức</h2>
        <button class="btn-primary" id="btn-open-add-menu" style="padding: 6px 12px; font-size: 13px;"><i class="bi bi-plus-circle-fill"></i> Thêm món</button>
      </div>

      <!-- Scrollable list of products and recipes -->
      <div class="menu-list" id="menu-items-mount" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 80px;"></div>

      <!-- Modals mount layer -->
      <div id="menu-modals-mount"></div>
    `;

    this.renderMenuList();
    this.initEvents();
  }

  initEvents() {
    this.container.querySelector('#btn-open-add-menu').addEventListener('click', () => {
      this.openAddMenuModal();
    });
  }

  renderMenuList() {
    const mount = this.container.querySelector('#menu-items-mount');
    const menu = this.controller.getMenuModel().getMenu();
    const inventory = this.controller.getInventoryModel();
    const ingredients = inventory.getIngredients();

    if (menu.length === 0) {
      mount.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;"><i class="bi bi-journal-x"></i> Menu chưa có món nào.</div>`;
      return;
    }

    mount.innerHTML = menu.map(drink => {
      // Build recipe summary text
      const recipeItems = [];
      if (drink.recipe) {
        // Safe check for MongoDB map conversion
        const recipeObj = typeof drink.recipe.entries === 'function' ? Object.fromEntries(drink.recipe) : drink.recipe;
        Object.keys(recipeObj).forEach(ingId => {
          const qty = recipeObj[ingId];
          const ing = ingredients.find(i => i.id === ingId);
          if (ing && qty > 0) {
            recipeItems.push(`<span>${ing.name}: <strong>${qty}${ing.unit}</strong></span>`);
          }
        });
      }

      const recipeSummary = recipeItems.length > 0 
        ? recipeItems.join(' • ') 
        : '<span style="color: var(--danger);">Chưa cấu hình công thức!</span>';

      // Check if image exists, otherwise draw emoji
      const thumbnailHtml = drink.image 
        ? `<img src="${drink.image}" style="width: 44px; height: 44px; object-fit: cover; border-radius: var(--radius-sm);" alt="${drink.name}">`
        : `<span style="font-size: 24px;">${drink.emoji}</span>`;

      return `
        <div class="menu-config-item" style="flex-direction: column; align-items: stretch; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
              <div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: var(--primary-soft); border-radius: var(--radius-sm); overflow: hidden;">
                ${thumbnailHtml}
              </div>
              <div>
                <strong style="color: var(--primary-dark); font-size: 15px;">${drink.name}</strong>
                <div style="font-size: 13px; font-weight: 700; color: var(--accent-dark);">${drink.price.toLocaleString('vi-VN')}đ</div>
              </div>
            </div>
            
            <div style="display: flex; gap: 6px;">
              <button class="btn-secondary btn-edit-recipe" data-id="${drink.id}" style="padding: 6px 12px; font-size: 11px;"><i class="bi bi-pencil"></i> Sửa</button>
              <button class="btn-danger btn-delete-menu-item" data-id="${drink.id}" style="padding: 6px 8px; font-size: 11px;"><i class="bi bi-trash"></i></button>
            </div>
          </div>

          <div style="font-size: 11px; color: var(--text-muted); background: var(--primary-soft); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); line-height: 1.6;">
            <strong>Định lượng:</strong> ${recipeSummary}
          </div>
        </div>
      `;
    }).join('');

    mount.querySelectorAll('.btn-edit-recipe').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.openEditRecipeModal(id);
      });
    });

    mount.querySelectorAll('.btn-delete-menu-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.controller.viewManager.showConfirm('Bạn có chắc chắn muốn xoá đồ uống này khỏi Menu không?', () => {
          this.controller.handleDeleteMenuItem(id);
        });
      });
    });
  }

  // ==========================================================================
  // EDIT MODAL: Price, Base64 compressed image upload, dynamic recipe rows
  // ==========================================================================
  openEditRecipeModal(drinkId) {
    const drink = this.controller.getMenuById(drinkId);
    if (!drink) return;

    const mount = this.container.querySelector('#menu-modals-mount');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '999';

    // Parse recipe map safely
    const recipeObj = typeof drink.recipe.entries === 'function' ? Object.fromEntries(drink.recipe) : drink.recipe;
    
    // Sync to temporary View state
    this.currentRecipeEdit = { ...recipeObj }; 
    this.uploadedImageBase64 = drink.image || '';

    overlay.innerHTML = `
      <div class="modal-content" style="max-height: 90%; width: 95%;">
        <div class="drawer-handle"></div>
        <div class="modal-header">
          <h3>Cấu hình: ${drink.name}</h3>
          <button class="btn-icon-small btn-close-modal">×</button>
        </div>

        <!-- Uploader section -->
        <div class="form-group" style="flex-direction: row; gap: 12px; align-items: center; background: var(--bg-app); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 12px;">
          <div id="recipe-edit-image-preview" style="width: 54px; height: 54px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; overflow: hidden; background: white;">
            ${this.uploadedImageBase64 ? `<img src="${this.uploadedImageBase64}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="bi bi-image" style="font-size: 24px; color: var(--text-light);"></i>`}
          </div>
          <div style="flex: 1;">
            <input type="file" id="edit-drink-image-file" accept="image/*" style="display: none;">
            <button type="button" class="btn-secondary" id="btn-trigger-upload-image" style="font-size: 11px; padding: 6px 12px;"><i class="bi bi-upload"></i> Tải ảnh mới</button>
            <div style="font-size: 9px; color: var(--text-light); margin-top: 4px;">Tải tệp ảnh JPG/PNG. Sẽ tự nén nhỏ.</div>
          </div>
        </div>

        <div class="form-group">
          <label for="edit-drink-price">Giá bán (VND)</label>
          <input type="number" id="edit-drink-price" class="input-field" value="${drink.price}" step="1000" min="0">
        </div>

        <!-- Dynamic Recipes Section -->
        <div class="option-title" style="margin-top: 16px; margin-bottom: 8px;"><i class="bi bi-funnel-fill"></i> Công thức nguyên liệu</div>
        
        <div id="edit-recipe-ingredients-rows" style="max-height: 200px; overflow-y: auto; padding-right: 4px; margin-bottom: 12px;">
          <!-- Rendered dynamically by drawRecipeRows() -->
        </div>

        <!-- Add new ingredient selector drop -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px; padding: 8px; background: var(--primary-soft); border-radius: var(--radius-md); border: 1px dashed var(--primary-light); margin-bottom: 20px;">
          <select id="select-add-recipe-ing" class="select-field" style="padding: 6px; font-size: 12px;"></select>
          <button type="button" class="btn-primary" id="btn-add-recipe-ing-row" style="font-size: 11px; padding: 6px;"><i class="bi bi-plus-lg"></i> Thêm</button>
        </div>

        <button class="btn-primary" id="btn-save-recipe-confirm" style="width: 100%; height: 44px;">
          <i class="bi bi-cloud-arrow-up-fill"></i> Đồng Bộ Cơ Sở Dữ Liệu
        </button>
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

    // Wire Image Uploader
    const fileInput = overlay.querySelector('#edit-drink-image-file');
    const uploaderTrigger = overlay.querySelector('#btn-trigger-upload-image');
    const imagePreview = overlay.querySelector('#recipe-edit-image-preview');

    uploaderTrigger.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.compressImage(file, (base64Str) => {
          this.uploadedImageBase64 = base64Str;
          imagePreview.innerHTML = `<img src="${base64Str}" style="width: 100%; height: 100%; object-fit: cover;">`;
        });
      }
    });

    // Helper functions to manage dynamic rows
    const drawRecipeRows = () => {
      const rowsContainer = overlay.querySelector('#edit-recipe-ingredients-rows');
      const ingredients = this.controller.getInventoryModel().getIngredients();

      if (Object.keys(this.currentRecipeEdit).length === 0) {
        rowsContainer.innerHTML = `<div style="font-size: 11px; text-align: center; color: var(--text-light); padding: 10px;">Chưa gán nguyên liệu nào. Hãy thêm ở dưới.</div>`;
        return;
      }

      rowsContainer.innerHTML = Object.keys(this.currentRecipeEdit).map(ingId => {
        const qty = this.currentRecipeEdit[ingId];
        const ing = ingredients.find(i => i.id === ingId);
        if (!ing) return '';
        
        return `
          <div class="recipe-ingredient-row" data-ing-id="${ingId}" style="grid-template-columns: 2fr 1fr 80px 30px; display: grid; gap: 6px; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ing.name}</span>
            <span style="font-size: 10px; color: var(--text-light);">(${ing.unit})</span>
            <input type="number" class="input-field ing-qty-input" data-ing-id="${ingId}" value="${qty}" min="0.01" step="any" style="padding: 4px; font-size: 12px; text-align: center; height: 28px;">
            <button type="button" class="btn-danger btn-delete-recipe-row" data-ing-id="${ingId}" style="padding: 4px; width: 28px; height: 28px; border-radius: 4px; font-size: 10px;">×</button>
          </div>
        `;
      }).join('');

      // Wire Row Deletion clicks
      rowsContainer.querySelectorAll('.btn-delete-recipe-row').forEach(btnDel => {
        btnDel.addEventListener('click', () => {
          const targetId = btnDel.getAttribute('data-ing-id');
          delete this.currentRecipeEdit[targetId];
          drawRecipeRows();
          updateAddDropdown();
        });
      });

      // Bind input changes to sync values with state
      rowsContainer.querySelectorAll('.ing-qty-input').forEach(input => {
        input.addEventListener('change', () => {
          const targetId = input.getAttribute('data-ing-id');
          this.currentRecipeEdit[targetId] = Number(input.value) || 0;
        });
      });
    };

    const updateAddDropdown = () => {
      const select = overlay.querySelector('#select-add-recipe-ing');
      const ingredients = this.controller.getInventoryModel().getIngredients();
      
      // Filter out ingredients already in the active recipe
      const available = ingredients.filter(i => this.currentRecipeEdit[i.id] === undefined);

      if (available.length === 0) {
        select.innerHTML = `<option value="">Hết nguyên liệu khả dụng</option>`;
        select.disabled = true;
      } else {
        select.disabled = false;
        select.innerHTML = available.map(i => `<option value="${i.id}">${i.name} (${i.unit})</option>`).join('');
      }
    };

    // Add ingredient row handler
    overlay.querySelector('#btn-add-recipe-ing-row').addEventListener('click', () => {
      const select = overlay.querySelector('#select-add-recipe-ing');
      const selectedId = select.value;
      if (selectedId) {
        this.currentRecipeEdit[selectedId] = 0; // Initialize with 0 qty
        drawRecipeRows();
        updateAddDropdown();
      }
    });

    // Initial render
    drawRecipeRows();
    updateAddDropdown();

    // Confirm button save
    overlay.querySelector('#btn-save-recipe-confirm').addEventListener('click', async () => {
      const newPrice = Number(overlay.querySelector('#edit-drink-price').value);
      
      // Recalibrate and read final quantity input values
      overlay.querySelectorAll('.ing-qty-input').forEach(input => {
        const targetId = input.getAttribute('data-ing-id');
        this.currentRecipeEdit[targetId] = Number(input.value) || 0;
      });

      // Clean out items with 0 quantities
      const finalRecipe = {};
      Object.keys(this.currentRecipeEdit).forEach(k => {
        if (this.currentRecipeEdit[k] > 0) {
          finalRecipe[k] = this.currentRecipeEdit[k];
        }
      });

      closeModal();
      
      // Call async save (handles loading screen automatically inside controller)
      await this.controller.handleUpdateRecipeAndImage(drink.id, newPrice, finalRecipe, this.uploadedImageBase64);
    });
  }

  // ==========================================================================
  // ADD MENU MODAL
  // ==========================================================================
  openAddMenuModal() {
    const mount = this.container.querySelector('#menu-modals-mount');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal-content">
        <div class="drawer-handle"></div>
        <div class="modal-header">
          <h3>Thêm Món Mới Vào Menu</h3>
          <button class="btn-icon-small btn-close-modal">×</button>
        </div>

        <form id="add-menu-form">
          <div class="form-group">
            <label for="add-menu-name">Tên món nước</label>
            <input type="text" id="add-menu-name" class="input-field" placeholder="Ví dụ: Hồng trà sữa" required>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div class="form-group">
              <label for="add-menu-price">Giá bán (VND)</label>
              <input type="number" id="add-menu-price" class="input-field" placeholder="25000" min="0" required>
            </div>
            <div class="form-group">
              <label for="add-menu-category">Phân nhóm</label>
              <div style="display: flex; gap: 6px; align-items: center;">
                <select id="add-menu-category" class="select-field" style="flex: 1; height: 38px;"></select>
                <button type="button" id="btn-manage-categories" class="btn-secondary" style="padding: 6px; display: flex; align-items: center; justify-content: center; height: 38px; width: 38px;" title="Quản lý phân nhóm">
                  <i class="bi bi-gear-fill"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="add-menu-emoji">Emoji mặc định</label>
            <select id="add-menu-emoji" class="select-field">
              <option value="☕">☕ Cà phê nóng</option>
              <option value="🥤">🥤 Ly đá</option>
              <option value="🥛">🥛 Cốc bạc xỉu</option>
              <option value="🍑">🍑 Quả đào cam</option>
              <option value="🧋">🧋 Trà sữa trân châu</option>
              <option value="🍋">🍋 Ly nước chanh</option>
              <option value="🍵">🍵 Tách trà xanh</option>
            </select>
          </div>

          <button type="submit" class="btn-primary" style="width: 100%; height: 44px; margin-top: 10px;">
            <i class="bi bi-check-lg"></i> Thêm Vào Menu
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

    const categorySelect = overlay.querySelector('#add-menu-category');
    const populateCategoriesDropdown = (selectEl) => {
      const categories = this.controller.db.getTable('categories');
      selectEl.innerHTML = categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    };

    populateCategoriesDropdown(categorySelect);

    overlay.querySelector('#btn-manage-categories').addEventListener('click', () => {
      this.openManageCategoriesModal(populateCategoriesDropdown);
    });

    overlay.querySelector('#add-menu-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = overlay.querySelector('#add-menu-name').value.trim();
      const price = Number(overlay.querySelector('#add-menu-price').value);
      const category = overlay.querySelector('#add-menu-category').value;
      const emoji = overlay.querySelector('#add-menu-emoji').value;

      if (!category) {
        this.controller.viewManager.showToast('Vui lòng tạo ít nhất một phân nhóm!', 'warning');
        return;
      }

      closeModal();
      await this.controller.handleAddMenuItem(name, price, category, emoji);
    });
  }

  openManageCategoriesModal(onUpdateCallback) {
    const mount = this.container.querySelector('#menu-modals-mount');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '1000'; // Make sure it overlays the add modal

    const drawCategoriesList = () => {
      const listContainer = overlay.querySelector('#categories-list-mount');
      const categories = this.controller.db.getTable('categories');
      if (categories.length === 0) {
        listContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 10px;">Chưa có phân nhóm nào.</div>`;
        return;
      }
      listContainer.innerHTML = categories.map(cat => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-app); border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 6px; gap: 8px;">
          <input type="text" class="input-field cat-name-input" data-id="${cat.id}" value="${cat.name}" style="flex: 1; border: none; background: transparent; padding: 0; font-weight: 600; font-size: 14px; color: var(--text-main);">
          <div style="display: flex; gap: 4px; align-items: center;">
            <button type="button" class="btn-primary btn-save-cat" data-id="${cat.id}" style="padding: 4px 8px; font-size: 11px; display: none;">Lưu</button>
            <button type="button" class="btn-danger btn-delete-cat" data-id="${cat.id}" style="padding: 4px 6px; font-size: 11px;"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      `).join('');

      // Add input listeners
      listContainer.querySelectorAll('.cat-name-input').forEach(input => {
        const catId = input.getAttribute('data-id');
        const saveBtn = listContainer.querySelector(`.btn-save-cat[data-id="${catId}"]`);
        input.addEventListener('input', () => {
          saveBtn.style.display = 'inline-block';
        });
        saveBtn.addEventListener('click', async () => {
          const newName = input.value.trim();
          if (!newName) return;
          this.controller.viewManager.showLoading('Đang sửa phân nhóm...');
          const success = await this.controller.db.updateCategory(catId, newName);
          this.controller.viewManager.hideLoading();
          if (success) {
            this.controller.viewManager.showToast('Đã cập nhật phân nhóm!', 'success');
            saveBtn.style.display = 'none';
            if (typeof onUpdateCallback === 'function') {
              const parentSelect = this.container.querySelector('#add-menu-category');
              if (parentSelect) onUpdateCallback(parentSelect);
            }
          }
        });
      });

      // Wire delete category
      listContainer.querySelectorAll('.btn-delete-cat').forEach(btn => {
        btn.addEventListener('click', () => {
          const catId = btn.getAttribute('data-id');
          this.controller.viewManager.showConfirm('Bạn có chắc chắn muốn xóa phân nhóm này? Lựa chọn này không xóa đồ uống trong nhóm.', async () => {
            this.controller.viewManager.showLoading('Đang xóa phân nhóm...');
            const success = await this.controller.db.deleteCategory(catId);
            this.controller.viewManager.hideLoading();
            if (success) {
              this.controller.viewManager.showToast('Đã xóa phân nhóm!', 'warning');
              drawCategoriesList();
              if (typeof onUpdateCallback === 'function') {
                const parentSelect = this.container.querySelector('#add-menu-category');
                if (parentSelect) onUpdateCallback(parentSelect);
              }
            }
          });
        });
      });
    };

    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 340px; align-self: center; border-radius: var(--radius-lg);">
        <div class="drawer-handle"></div>
        <div class="modal-header">
          <h3>Quản Lý Phân Nhóm</h3>
          <button class="btn-icon-small btn-close-modal">×</button>
        </div>

        <div id="categories-list-mount" style="max-height: 200px; overflow-y: auto; margin-bottom: 12px; padding-right: 4px;"></div>

        <div style="display: flex; gap: 6px; padding: 8px; background: var(--primary-soft); border-radius: var(--radius-md); border: 1px dashed var(--primary-light);">
          <input type="text" id="new-category-name" class="input-field" placeholder="Tên nhóm mới..." style="padding: 6px; font-size: 12px; flex: 1; height: 32px;">
          <button type="button" class="btn-primary" id="btn-add-category-confirm" style="font-size: 11px; padding: 0 12px; height: 32px;"><i class="bi bi-plus-lg"></i> Thêm</button>
        </div>
      </div>
    `;

    mount.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.btn-close-modal').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    overlay.querySelector('#btn-add-category-confirm').addEventListener('click', async () => {
      const input = overlay.querySelector('#new-category-name');
      const name = input.value.trim();
      if (!name) return;

      this.controller.viewManager.showLoading('Đang thêm phân nhóm...');
      const success = await this.controller.db.addCategory(name);
      this.controller.viewManager.hideLoading();
      if (success) {
        input.value = '';
        this.controller.viewManager.showToast(`Đã thêm phân nhóm "${name}" thành công!`, 'success');
        drawCategoriesList();
        if (typeof onUpdateCallback === 'function') {
          const parentSelect = this.container.querySelector('#add-menu-category');
          if (parentSelect) onUpdateCallback(parentSelect);
        }
      }
    });

    drawCategoriesList();
  }

  // File size compressor helper (Canvas scales image to max 200x200px and 70% quality JPEG)
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

        // Convert to highly compact JPEG (8-15KB size)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}
