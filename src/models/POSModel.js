// POSModel.js - Controls Point of Sale shopping cart & server-side transaction syncing

export class POSModel {
  constructor(db) {
    this.db = db;
    this.cart = [];
  }

  getCart() {
    return this.cart;
  }

  addToCart(drink, size, sugar, ice, notes) {
    const isLVariant = drink.id.endsWith('-l') || drink.name.endsWith('(L)');
    const sizePriceOffset = (size === 'L' && !isLVariant) ? 5000 : 0;
    const unitPrice = drink.price + sizePriceOffset;

    // Check if duplicate item exists in cart with same configurations
    const existingIndex = this.cart.findIndex(item =>
      item.id === drink.id &&
      item.size === size &&
      item.sugar === sugar &&
      item.ice === ice &&
      item.notes === notes
    );

    if (existingIndex !== -1) {
      this.cart[existingIndex].qty += 1;
    } else {
      // Build recipe map for backend stock deductions
      const recipeObj = {};
      if (drink.recipe) {
        // drink.recipe might be a Map or standard Object depending on MongoDB parsing
        const recipeSource = typeof drink.recipe.entries === 'function' ? Object.fromEntries(drink.recipe) : drink.recipe;
        Object.assign(recipeObj, recipeSource);
      }

      this.cart.push({
        id: drink.id,
        name: drink.name,
        emoji: drink.emoji || '☕',
        price: unitPrice,
        qty: 1,
        size: size,
        sugar: sugar,
        ice: ice,
        notes: notes,
        recipe: recipeObj
      });
    }
  }

  updateQty(index, delta) {
    if (index < 0 || index >= this.cart.length) return;
    this.cart[index].qty += delta;
    if (this.cart[index].qty <= 0) {
      this.cart.splice(index, 1);
    }
  }

  removeFromCart(index) {
    if (index < 0 || index >= this.cart.length) return;
    this.cart.splice(index, 1);
  }

  clearCart() {
    this.cart = [];
  }

  getCartTotal() {
    return this.cart.reduce((total, item) => total + (item.price * item.qty), 0);
  }

  getCartCount() {
    return this.cart.reduce((count, item) => count + item.qty, 0);
  }

  // Completing the checkout asynchronously on server
  async checkout(paymentMethod, cashReceived, inventoryModel) {
    if (this.cart.length === 0) return null;

    const total = this.getCartTotal();
    const cashChange = paymentMethod === 'Tiền mặt' ? Math.max(0, cashReceived - total) : 0;

    // Calculate total COGS from client inventory details
    let totalCogs = 0;
    this.cart.forEach(item => {
      let itemCogs = 0;
      if (item.recipe) {
        Object.keys(item.recipe).forEach(ingId => {
          let qtyNeeded = item.recipe[ingId];
          const isLVariant = item.id.endsWith('-l') || item.name.endsWith('(L)');
          if (item.size === 'L' && !isLVariant && ['cf', 'sua', 'suatuoi', 'duong'].includes(ingId)) {
            qtyNeeded = Math.ceil(qtyNeeded * 1.3);
          }
          const ing = inventoryModel.getIngredient(ingId);
          if (ing) {
            itemCogs += qtyNeeded * ing.cost;
          }
        });
      }
      totalCogs += itemCogs * item.qty;
    });

    const orderRecord = {
      id: 'DH-' + Date.now().toString().slice(-6),
      timestamp: new Date().toISOString(),
      items: [...this.cart],
      totalPrice: total,
      cogs: totalCogs,
      paymentMethod: paymentMethod,
      status: 'preparing',
      cashReceived: paymentMethod === 'Tiền mặt' ? cashReceived : total,
      cashChange: cashChange
    };

    // Save to server-side MongoDB Database
    const success = await this.db.processCheckout(orderRecord);
    if (success) {
      this.clearCart();
      return orderRecord;
    }
    return null;
  }

  getOrdersHistory() {
    return this.db.getTable('orders').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}
