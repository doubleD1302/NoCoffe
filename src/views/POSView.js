// POSView.js - Renders Point of Sale Cashier system using Bootstrap Icons & Base64 Images

const cleanName = (name) => {
  if (!name) return '';
  const parts = name.split('-');
  const cleanedParts = parts.map(part => part.trim()).filter(part => {
    const hasChinese = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(part);
    return !hasChinese;
  });
  let result = cleanedParts.join(' - ').trim();
  result = result.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, '').trim();
  return result;
};

const parseDrinkName = (name) => {
  const match = name.match(/^(.*?)\s*\(([M|L])\)$/i);
  if (match) {
    return {
      baseName: match[1].trim(),
      size: match[2].toUpperCase()
    };
  }
  return {
    baseName: name.trim(),
    size: null
  };
};

export class POSView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
    this.activeCategory = 'all';
  }

  render() {
    this.container.innerHTML = `
      <div class="pos-layout">
        <!-- Category Selector -->
        <div class="category-tabs" id="pos-category-tabs">
          <!-- Rendered dynamically -->
        </div>

        <!-- Drink Grid -->
        <div class="menu-grid" id="pos-menu-grid"></div>

        <!-- Floating Cart Trigger Pill -->
        <div class="floating-cart-trigger hidden" id="pos-cart-trigger">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="cart-count-badge" id="pos-cart-count">0</div>
            <span style="font-size: 13px; font-weight: 500;"><i class="bi bi-cart3"></i> Xem giỏ hàng</span>
          </div>
          <div class="cart-price-total" id="pos-cart-total">0đ</div>
        </div>
      </div>
      
      <!-- Modals Layer (Rendered dynamically) -->
      <div id="pos-modals-mount"></div>
    `;

    this.renderCategoryTabs();
    this.renderMenuGrid();
    this.initCoreEvents();
    this.updateCartTrigger();
  }

  renderCategoryTabs() {
    const tabsContainer = this.container.querySelector('#pos-category-tabs');
    if (!tabsContainer) return;

    const categories = this.controller.db.getTable('categories');

    const getIconClass = (catId) => {
      if (catId === 'all') return 'bi-cup-straw';
      if (catId === 'cf') return 'bi-cup-hot-fill';
      if (catId === 'tra') return 'bi-cup-straw';
      if (catId === 'milktea') return 'bi-cup-straw';
      if (catId === 'matcha') return 'bi-leaf-fill';
      if (catId === 'cacao') return 'bi-cup-hot';
      return 'bi-tag-fill';
    };

    const getFriendlyCategoryName = (catId, catName) => {
      if (catId === 'all') return 'TẤT CẢ MÓN';
      if (catId === 'cf') return 'CÀ PHÊ';
      if (catId === 'tra') return 'TRÀ TRÁI CÂY';
      if (catId === 'milktea') return 'TRÀ SỮA';
      if (catId === 'matcha') return 'MATCHA';
      if (catId === 'cacao') return 'CACAO';
      return cleanName(catName).toUpperCase();
    };

    const buttons = [
      `<button class="category-tab ${this.activeCategory === 'all' ? 'active' : ''}" data-category="all">
        <i class="bi ${getIconClass('all')}"></i>
        <span>${getFriendlyCategoryName('all', 'Tất cả')}</span>
      </button>`,
      ...categories.map(cat => `
        <button class="category-tab ${this.activeCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">
          <i class="bi ${getIconClass(cat.id)}"></i>
          <span>${getFriendlyCategoryName(cat.id, cat.name)}</span>
        </button>
      `)
    ];

    tabsContainer.innerHTML = buttons.join('');

    // Wire events
    tabsContainer.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        tabsContainer.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeCategory = tab.getAttribute('data-category');
        this.renderMenuGrid();
      });
    });
  }

  initCoreEvents() {
    const trigger = this.container.querySelector('#pos-cart-trigger');
    trigger.addEventListener('click', () => {
      this.openCartModal();
    });
  }

  renderMenuGrid() {
    const grid = this.container.querySelector('#pos-menu-grid');
    const menu = this.controller.getMenu();
    const inventory = this.controller.getInventoryModel();
    
    const filtered = menu.filter(item => 
      this.activeCategory === 'all' || item.category === this.activeCategory
    );

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">Không có món nào.</div>`;
      return;
    }

    // Group items by base name
    const groupedMenu = [];
    filtered.forEach(item => {
      const { baseName, size } = parseDrinkName(cleanName(item.name));
      let group = groupedMenu.find(g => g.name === baseName);
      if (!group) {
        group = {
          name: baseName,
          category: item.category,
          emoji: item.emoji || '☕',
          image: item.image || '',
          variants: []
        };
        groupedMenu.push(group);
      }
      if (item.image && !group.image) {
        group.image = item.image;
      }
      if (item.emoji && item.emoji !== '☕' && group.emoji === '☕') {
        group.emoji = item.emoji;
      }
      group.variants.push({
        id: item.id,
        size: size || 'M',
        price: item.price,
        recipe: item.recipe,
        rawItem: item
      });
    });

    grid.innerHTML = groupedMenu.map((group, index) => {
      // Sort variants: M first, then L
      group.variants.sort((a, b) => {
        if (a.size === 'M' && b.size === 'L') return -1;
        if (a.size === 'L' && b.size === 'M') return 1;
        return 0;
      });

      // Warning if any variant has low stock
      let hasLowStock = false;
      group.variants.forEach(variant => {
        if (variant.recipe) {
          const recipeObj = typeof variant.recipe.entries === 'function' ? Object.fromEntries(variant.recipe) : variant.recipe;
          Object.keys(recipeObj).forEach(ingId => {
            const ing = inventory.getIngredient(ingId);
            if (ing && ing.stock <= ing.minStock) {
              hasLowStock = true;
            }
          });
        }
      });

      const warningBadge = hasLowStock 
        ? `<div class="menu-card-warning" title="Nguyên liệu sắp hết"><i class="bi bi-exclamation-triangle-fill"></i></div>` 
        : '';

      // Check category placeholder gradient
      let gradientClass = 'placeholder-gradient-default';
      if (group.category === 'cf') gradientClass = 'placeholder-gradient-cf';
      else if (group.category === 'tra') gradientClass = 'placeholder-gradient-tra';
      else if (group.category === 'milktea') gradientClass = 'placeholder-gradient-milktea';
      else if (group.category === 'matcha') gradientClass = 'placeholder-gradient-matcha';
      else if (group.category === 'cacao') gradientClass = 'placeholder-gradient-cacao';

      // Check if image exists, otherwise draw emoji on gradient
      const thumbnailHtml = group.image 
        ? `<img src="${group.image}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;" alt="${group.name}">`
        : `<div class="menu-card-thumbnail ${gradientClass}" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; border-radius: 12px;"><span class="emoji-span">${group.emoji}</span></div>`;

      // Price range text
      const prices = group.variants.map(v => v.price);
      const minPrice = Math.min(...prices);
      
      const priceText = `${minPrice.toLocaleString('vi-VN')} <span style="text-decoration: underline;">đ</span>`;

      return `
        <div class="menu-card" data-index="${index}">
          ${warningBadge}
          <div class="menu-card-thumbnail">${thumbnailHtml}</div>
          <div class="menu-card-info-row">
            <div class="menu-card-details">
              <span class="menu-card-name">${group.name}</span>
              <span class="menu-card-price">${priceText}</span>
            </div>
            <button class="menu-card-add-btn">
              <i class="bi bi-plus-lg"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.menu-card').forEach(card => {
      card.addEventListener('click', () => {
        const index = Number(card.getAttribute('data-index'));
        const group = groupedMenu[index];
        this.openModifierModal(group);
      });
    });
  }

  updateCartTrigger() {
    const trigger = this.container.querySelector('#pos-cart-trigger');
    const countBadge = this.container.querySelector('#pos-cart-count');
    const totalLabel = this.container.querySelector('#pos-cart-total');

    const totalCount = this.controller.getCartCount();
    const totalPrice = this.controller.getCartTotal();

    if (totalCount > 0) {
      trigger.classList.remove('hidden');
      countBadge.innerText = totalCount;
      totalLabel.innerText = totalPrice.toLocaleString('vi-VN') + 'đ';
    } else {
      trigger.classList.add('hidden');
    }
  }

  openModifierModal(group) {
    if (!group || !group.variants || group.variants.length === 0) return;

    const mount = this.container.querySelector('#pos-modals-mount');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    // Sort variants: M first, then L
    group.variants.sort((a, b) => {
      if (a.size === 'M' && b.size === 'L') return -1;
      if (a.size === 'L' && b.size === 'M') return 1;
      return 0;
    });

    // Gather distinct sizes
    const availableSizes = group.variants.map(v => v.size);
    const hasMVariant = availableSizes.includes('M') || availableSizes.includes(null);
    const hasLVariant = availableSizes.includes('L');

    let sizePillsHtml = '';
    if (hasMVariant && hasLVariant) {
      sizePillsHtml = `
        <button class="option-pill-btn active" data-size="M">Size M</button>
        <button class="option-pill-btn" data-size="L">Size L</button>
      `;
    } else if (hasMVariant && !hasLVariant) {
      sizePillsHtml = `
        <button class="option-pill-btn active" data-size="M">Size M (Mặc định)</button>
        <button class="option-pill-btn" data-size="L">Size L (+5,000đ)</button>
      `;
    } else if (!hasMVariant && hasLVariant) {
      sizePillsHtml = `
        <button class="option-pill-btn active" data-size="L">Size L</button>
      `;
    } else {
      const defSize = group.variants[0].size || 'M';
      sizePillsHtml = `
        <button class="option-pill-btn active" data-size="${defSize}">Size ${defSize}</button>
      `;
    }

    overlay.innerHTML = `
      <div class="modal-content">
        <div class="drawer-handle"></div>
        <div class="modal-header">
          <h3>Cấu hình: ${group.name}</h3>
          <button class="btn-icon-small btn-close-modal">×</button>
        </div>
        
        <div style="display: flex; gap: 14px; align-items: center; background: var(--brand-pink-soft); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--brand-pink-border); margin-bottom: 16px;">
          <div style="width: 50px; height: 50px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; overflow: hidden; background: white; flex-shrink: 0;">
            ${group.image ? `<img src="${group.image}" style="width: 100%; height: 100%; object-fit: cover;">` : `<span style="font-size: 28px;">${group.emoji}</span>`}
          </div>
          <div>
            <h4 style="font-family: var(--font-heading); font-size: 15px; font-weight: 700; color: var(--primary-dark); margin: 0;">${group.name}</h4>
            <div id="modifier-price-display" style="font-size: 14px; font-weight: 800; color: var(--brand-pink-dark); margin-top: 2px;">0đ</div>
          </div>
        </div>

        <div class="option-section">
          <div class="option-title">Kích thước (Size)</div>
          <div class="option-pills" id="modifier-size">
            ${sizePillsHtml}
          </div>
        </div>

        <div class="option-section">
          <div class="option-title">Độ ngọt (Đường)</div>
          <div class="option-pills" id="modifier-sugar">
            <button class="option-pill-btn active" data-val="100%">100% đường</button>
            <button class="option-pill-btn" data-val="70%">70% đường</button>
            <button class="option-pill-btn" data-val="50%">50% đường</button>
            <button class="option-pill-btn" data-val="0%">Không đường</button>
          </div>
        </div>

        <div class="option-section">
          <div class="option-title">Độ lạnh (Đá)</div>
          <div class="option-pills" id="modifier-ice">
            <button class="option-pill-btn active" data-val="100%">100% đá</button>
            <button class="option-pill-btn" data-val="70%">70% đá</button>
            <button class="option-pill-btn" data-val="50%">50% đá</button>
            <button class="option-pill-btn" data-val="0%">Không đá</button>
          </div>
        </div>

        <div class="form-group" style="margin-top: 10px;">
          <label for="modifier-notes"><i class="bi bi-pencil-square"></i> Ghi chú đặc biệt</label>
          <input type="text" id="modifier-notes" class="input-field" placeholder="Ví dụ: Ít sữa, nhiều đá, v.v.">
        </div>

        <!-- Recipe Display Section -->
        <div class="recipe-preview-box">
          <div class="recipe-preview-title">
            <i class="bi bi-receipt-cutoff"></i> Công thức pha chế
          </div>
          <div class="recipe-preview-list" id="modifier-recipe-list">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <button class="btn-primary" id="btn-add-to-cart-confirm" style="width: 100%; height: 44px; margin-top: 10px;">
          <i class="bi bi-plus-lg"></i> Thêm Vào Giỏ Hàng
        </button>
      </div>
    `;

    mount.appendChild(overlay);

    const updateModalState = () => {
      const activeSizeBtn = overlay.querySelector('#modifier-size .active');
      const selectedSize = activeSizeBtn ? activeSizeBtn.getAttribute('data-size') : 'M';
      
      let variantDoc = null;
      let computedPrice = 0;
      
      const exactVariant = group.variants.find(v => v.size === selectedSize);
      if (exactVariant) {
        variantDoc = exactVariant;
        computedPrice = exactVariant.price;
      } else {
        variantDoc = group.variants[0];
        const offset = selectedSize === 'L' ? 5000 : 0;
        computedPrice = variantDoc.price + offset;
      }

      overlay.querySelector('#modifier-price-display').innerText = computedPrice.toLocaleString('vi-VN') + 'đ';

      const recipeListContainer = overlay.querySelector('#modifier-recipe-list');
      const inventory = this.controller.getInventoryModel();
      
      if (!variantDoc.recipe || Object.keys(variantDoc.recipe).length === 0) {
        recipeListContainer.innerHTML = `<div style="font-size: 11px; color: var(--text-light); text-align: center;">Chưa cấu hình công thức cho size này.</div>`;
      } else {
        const recipeObj = typeof variantDoc.recipe.entries === 'function' ? Object.fromEntries(variantDoc.recipe) : variantDoc.recipe;
        const items = [];
        
        Object.keys(recipeObj).forEach(ingId => {
          let qty = recipeObj[ingId];
          const ing = inventory.getIngredient(ingId);
          if (ing && qty > 0) {
            const isFellBackToM = !exactVariant && selectedSize === 'L';
            if (isFellBackToM && ['cf', 'sua', 'suatuoi', 'duong'].includes(ingId)) {
              qty = Math.ceil(qty * 1.3);
            }
            items.push(`
              <div class="recipe-preview-item">
                <span>${ing.name}</span>
                <strong>${qty} ${ing.unit}</strong>
              </div>
            `);
          }
        });
        
        recipeListContainer.innerHTML = items.length > 0 
          ? items.join('') 
          : `<div style="font-size: 11px; color: var(--text-light); text-align: center;">Chưa cấu hình công thức cho size này.</div>`;
      }
    };

    const setupPills = (containerId) => {
      const pContainer = overlay.querySelector('#' + containerId);
      pContainer.querySelectorAll('.option-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          pContainer.querySelectorAll('.option-pill-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          if (containerId === 'modifier-size') {
            updateModalState();
          }
        });
      });
    };

    setupPills('modifier-size');
    setupPills('modifier-sugar');
    setupPills('modifier-ice');

    updateModalState();

    const closeModal = () => {
      overlay.style.opacity = '0';
      overlay.querySelector('.modal-content').style.transform = 'translateY(100%)';
      overlay.querySelector('.modal-content').style.transition = 'all 0.25s ease';
      setTimeout(() => overlay.remove(), 250);
    };

    overlay.querySelector('.btn-close-modal').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    overlay.querySelector('#btn-add-to-cart-confirm').addEventListener('click', () => {
      const activeSizeBtn = overlay.querySelector('#modifier-size .active');
      const size = activeSizeBtn ? activeSizeBtn.getAttribute('data-size') : 'M';
      const sugar = overlay.querySelector('#modifier-sugar .active').getAttribute('data-val');
      const ice = overlay.querySelector('#modifier-ice .active').getAttribute('data-val');
      const notes = overlay.querySelector('#modifier-notes').value.trim();

      let drinkDoc = null;
      const exactVariant = group.variants.find(v => v.size === size);
      if (exactVariant) {
        drinkDoc = exactVariant.rawItem;
      } else {
        drinkDoc = group.variants[0].rawItem;
      }

      this.controller.addToCart(drinkDoc, size, sugar, ice, notes);
      this.updateCartTrigger();
      closeModal();
    });
  }

  openCartModal() {
    const cart = this.controller.getCart();
    if (cart.length === 0) return;

    const mount = this.container.querySelector('#pos-modals-mount');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const itemsHtml = cart.map((item, index) => {
      const descDetails = `Size ${item.size} • Đường ${item.sugar} • Đá ${item.ice}${item.notes ? ` • ${item.notes}` : ''}`;
      const { baseName } = parseDrinkName(item.name);
      return `
        <div class="cart-item-row">
          <div class="cart-item-desc">
            <div class="cart-item-name">${baseName}</div>
            <div class="cart-item-details">${descDetails}</div>
            <div style="font-size: 11px; font-weight: 700; color: var(--accent-dark); margin-top: 2px;">
              ${(item.price * item.qty).toLocaleString('vi-VN')}đ
            </div>
          </div>
          <div class="cart-item-controls">
            <button class="cart-qty-btn btn-qty-minus" data-index="${index}"><i class="bi bi-dash"></i></button>
            <span class="cart-item-qty">${item.qty}</span>
            <button class="cart-qty-btn btn-qty-plus" data-index="${index}"><i class="bi bi-plus"></i></button>
          </div>
        </div>
      `;
    }).join('');

    overlay.innerHTML = `
      <div class="modal-content" style="max-height: 90%;">
        <div class="drawer-handle"></div>
        <div class="modal-header">
          <h3>Giỏ hàng của bạn</h3>
          <button class="btn-icon-small btn-close-modal">×</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px; overflow-y: auto; max-height: 300px; padding-right: 4px;">
          ${itemsHtml}
        </div>

        <div style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 16px;">
          <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 16px; margin-bottom: 20px; color: var(--primary-dark);">
            <span>Tổng cộng:</span>
            <span>${this.controller.getCartTotal().toLocaleString('vi-VN')}đ</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px;">
            <button class="btn-secondary" id="btn-clear-cart" style="height: 48px;"><i class="bi bi-trash"></i> Xoá sạch</button>
            <button class="btn-primary" id="btn-go-to-checkout" style="height: 48px;">Thanh Toán <i class="bi bi-arrow-right-short"></i></button>
          </div>
        </div>
      </div>
    `;

    mount.appendChild(overlay);

    const closeModal = () => {
      overlay.style.opacity = '0';
      overlay.querySelector('.modal-content').style.transform = 'translateY(100%)';
      overlay.querySelector('.modal-content').style.transition = 'all 0.25s ease';
      setTimeout(() => overlay.remove(), 250);
    };

    overlay.querySelector('.btn-close-modal').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    overlay.querySelectorAll('.btn-qty-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = Number(btn.getAttribute('data-index'));
        this.controller.updateCartQty(index, -1);
        this.updateCartTrigger();
        closeModal();
        if (this.controller.getCartCount() > 0) {
          this.openCartModal();
        }
      });
    });

    overlay.querySelectorAll('.btn-qty-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = Number(btn.getAttribute('data-index'));
        this.controller.updateCartQty(index, 1);
        this.updateCartTrigger();
        closeModal();
        this.openCartModal();
      });
    });

    overlay.querySelector('#btn-clear-cart').addEventListener('click', () => {
      this.controller.viewManager.showConfirm('Bạn muốn xoá sạch giỏ hàng hiện tại?', () => {
        this.controller.clearCart();
        this.updateCartTrigger();
        closeModal();
      });
    });

    overlay.querySelector('#btn-go-to-checkout').addEventListener('click', () => {
      closeModal();
      this.openCheckoutModal();
    });
  }

  openCheckoutModal() {
    const total = this.controller.getCartTotal();
    const storeQr = this.controller.getStorePaymentQr();
    const mount = this.container.querySelector('#pos-modals-mount');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    overlay.innerHTML = `
      <div class="modal-content" style="max-height: 95%;">
        <div class="drawer-handle"></div>
        <div class="modal-header">
          <h3>Thanh Toán</h3>
          <button class="btn-icon-small btn-close-modal">×</button>
        </div>

        <div class="option-section">
          <div class="option-title">Phương thức thanh toán</div>
          <div class="option-pills" id="checkout-method">
            <button class="option-pill-btn active" data-val="Tiền mặt"><i class="bi bi-cash"></i> Tiền mặt</button>
            <button class="option-pill-btn" data-val="Chuyển khoản QR"><i class="bi bi-qr-code-scan"></i> Chuyển khoản QR</button>
            <button class="option-pill-btn" data-val="Thẻ"><i class="bi bi-credit-card"></i> Thẻ</button>
          </div>
        </div>

        <!-- Cash panel -->
        <div id="checkout-cash-panel" class="payment-method-panel">
          <div class="form-group">
            <label for="cash-received">Tiền mặt khách đưa (VND)</label>
            <input type="number" id="cash-received" class="input-field" value="${total}" step="5000" min="${total}">
          </div>
          
          <div class="option-pills" style="margin-bottom: 16px;">
            <button class="option-pill-btn btn-quick-cash" data-val="${total}">Đủ (${total.toLocaleString('vi-VN')}đ)</button>
            <button class="option-pill-btn btn-quick-cash" data-val="${Math.ceil(total/10000)*10000}">Chẵn chục</button>
            <button class="option-pill-btn btn-quick-cash" data-val="${Math.ceil(total/50000)*50000}">Chẵn 50k</button>
            <button class="option-pill-btn btn-quick-cash" data-val="100000">100.000đ</button>
            <button class="option-pill-btn btn-quick-cash" data-val="200000">200.000đ</button>
            <button class="option-pill-btn btn-quick-cash" data-val="500000">500.000đ</button>
          </div>

          <div style="background: var(--primary-soft); padding: 12px; border-radius: var(--radius-md); text-align: center; border: 1px solid var(--border-color); margin-bottom: 20px;">
            <span style="font-size: 12px; font-weight: 600; color: var(--text-muted);">TIỀN THỐI LẠI</span>
            <div id="cash-change-val" style="font-size: 22px; font-weight: 800; color: var(--success); margin-top: 2px;">0đ</div>
          </div>
        </div>

        <!-- QR panel -->
        <div id="checkout-qr-panel" class="payment-method-panel hidden">
          <div class="qr-modal-body">
            <div class="qr-canvas-mock" id="checkout-qr-canvas" style="display: flex; align-items: center; justify-content: center; overflow: hidden; background: white; border: 1.5px dashed var(--border-color); border-radius: var(--radius-md); width: 180px; height: 180px; margin: 0 auto 12px; position: relative;">
              ${storeQr ? `
                <img src="${storeQr}" style="width: 100%; height: 100%; object-fit: contain;">
              ` : `
                <svg width="100%" height="100%" viewBox="0 0 100 100">
                  <rect x="0" y="0" width="100" height="100" fill="none" stroke="#ccc" stroke-width="0.5"/>
                  <rect x="5" y="5" width="20" height="20" fill="none" stroke="var(--primary)" stroke-width="4"/>
                  <rect x="10" y="10" width="10" height="10" fill="var(--primary)"/>
                  <rect x="75" y="5" width="20" height="20" fill="none" stroke="var(--primary)" stroke-width="4"/>
                  <rect x="80" y="10" width="10" height="10" fill="var(--primary)"/>
                  <rect x="5" y="75" width="20" height="20" fill="none" stroke="var(--primary)" stroke-width="4"/>
                  <rect x="10" y="80" width="10" height="10" fill="var(--primary)"/>
                  <rect x="35" y="15" width="8" height="8" fill="#555"/>
                  <rect x="50" y="25" width="12" height="6" fill="#333"/>
                  <rect x="30" y="45" width="6" height="12" fill="#444"/>
                  <rect x="60" y="45" width="14" height="14" fill="#333"/>
                  <rect x="40" y="65" width="10" height="10" fill="#222"/>
                  <rect x="65" y="75" width="8" height="10" fill="#444"/>
                  <rect x="45" y="40" width="10" height="8" fill="#555"/>
                </svg>
                <div class="qr-bezel-no"><i class="bi bi-ribbon-fill" style="color: var(--primary);"></i></div>
              `}
            </div>
            
            <div style="font-size: 11px; color: var(--text-muted); line-height: 1.5; text-align: center; margin-bottom: 8px;">
              ${storeQr ? `
                Quét mã QR trên để thanh toán số tiền <strong style="color: var(--primary);">${total.toLocaleString('vi-VN')}đ</strong>
              ` : `
                <strong>VietinBank - 1028374829 - Tiệm Cà Phê Nơ</strong><br>
                Số tiền: <strong style="color: var(--primary);">${total.toLocaleString('vi-VN')}đ</strong><br>
                Nội dung: <strong>Thanh toan don hang No</strong>
              `}
            </div>
            <div class="badge badge-success" style="display: flex; justify-content: center; margin: 0 auto;"><i class="bi bi-patch-check-fill"></i> Đã đồng bộ số dư ngân hàng</div>
          </div>
        </div>

        <!-- Card panel -->
        <div id="checkout-card-panel" class="payment-method-panel hidden" style="text-align: center; padding: 20px 0;">
          <div style="font-size: 44px; margin-bottom: 12px;"><i class="bi bi-device-ssd"></i></div>
          <p style="font-size: 13px; color: var(--text-muted); font-weight: 500;">
            Hãy quẹt thẻ hoặc chạm thẻ lên thiết bị POS...
          </p>
        </div>

        <button class="btn-primary" id="btn-complete-order" style="width: 100%; height: 48px; margin-top: 10px;">
          <i class="bi bi-check2-all"></i> Hoàn Thành & Lưu Đơn (In Bill)
        </button>
      </div>
    `;

    mount.appendChild(overlay);

    const closeModal = () => {
      overlay.style.opacity = '0';
      overlay.querySelector('.modal-content').style.transform = 'translateY(100%)';
      overlay.querySelector('.modal-content').style.transition = 'all 0.25s ease';
      setTimeout(() => overlay.remove(), 250);
    };

    overlay.querySelector('.btn-close-modal').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    const cashPanel = overlay.querySelector('#checkout-cash-panel');
    const qrPanel = overlay.querySelector('#checkout-qr-panel');
    const cardPanel = overlay.querySelector('#checkout-card-panel');
    const inputCash = overlay.querySelector('#cash-received');
    const changeVal = overlay.querySelector('#cash-change-val');

    const calculateChange = () => {
      const received = Number(inputCash.value) || 0;
      const change = Math.max(0, received - total);
      changeVal.innerText = change.toLocaleString('vi-VN') + 'đ';
    };

    calculateChange();
    inputCash.addEventListener('input', calculateChange);

    overlay.querySelectorAll('.btn-quick-cash').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = Number(btn.getAttribute('data-val'));
        inputCash.value = val;
        calculateChange();
      });
    });

    let activeMethod = 'Tiền mặt';
    const methodPills = overlay.querySelector('#checkout-method');
    
    methodPills.querySelectorAll('.option-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        methodPills.querySelectorAll('.option-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        activeMethod = btn.getAttribute('data-val');
        
        cashPanel.classList.add('hidden');
        qrPanel.classList.add('hidden');
        cardPanel.classList.add('hidden');

        if (activeMethod === 'Tiền mặt') {
          cashPanel.classList.remove('hidden');
        } else if (activeMethod === 'Chuyển khoản QR') {
          qrPanel.classList.remove('hidden');
        } else if (activeMethod === 'Thẻ') {
          cardPanel.classList.remove('hidden');
        }
      });
    });

    overlay.querySelector('#btn-complete-order').addEventListener('click', async () => {
      const cashVal = Number(inputCash.value) || total;
      
      if (activeMethod === 'Tiền mặt' && cashVal < total) {
        this.controller.viewManager.showToast('Khách đưa thiếu tiền mặt!', 'danger');
        return;
      }

      closeModal();
      await this.controller.processCheckout(activeMethod, cashVal);
      this.updateCartTrigger();
    });
  }
}
