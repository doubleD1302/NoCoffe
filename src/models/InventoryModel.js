// InventoryModel.js - Tracks raw materials stock levels syncing to MongoDB

export class InventoryModel {
  constructor(db) {
    this.db = db;
  }

  getIngredients() {
    return this.db.getTable('ingredients');
  }

  getIngredient(id) {
    return this.getIngredients().find(ing => ing.id === id) || null;
  }

  // Stock deduction is handled automatically on backend server during checkout/waste logging,
  // but we keep this stub for local state reference if needed
  deductStock(id, qty) {
    const ingredients = this.getIngredients();
    const ing = ingredients.find(i => i.id === id);
    if (ing) {
      ing.stock = Math.max(0, ing.stock - qty);
      return true;
    }
    return false;
  }

  // Asynchronous restock synced to MongoDB
  async restock(id, qty, customCostPerUnit = null) {
    const success = await this.db.restockIngredient(id, qty, customCostPerUnit);
    return success;
  }

  getStockStatus(ing) {
    if (ing.stock <= ing.minStock) {
      return 'danger'; // Red warning: running out
    }
    if (ing.stock <= ing.minStock * 1.5) {
      return 'warning'; // Yellow warning: restock soon
    }
    return 'success'; // Normal stock level
  }

  hasLowStockAlerts() {
    return this.getIngredients().some(ing => ing.stock <= ing.minStock);
  }
}
