// WasteModel.js - Tracks raw materials waste logs syncing to MongoDB

export class WasteModel {
  constructor(db) {
    this.db = db;
  }

  getWasteLogs() {
    return this.db.getTable('waste').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async logWaste(ingredientId, qty, reason, reportedBy, inventoryModel) {
    const ing = inventoryModel.getIngredient(ingredientId);
    if (!ing || qty <= 0) return null;

    const lossCost = qty * ing.cost;

    const wasteRecord = {
      id: 'HH-' + Date.now().toString().slice(-6),
      timestamp: new Date().toISOString(),
      ingredientId: ingredientId,
      ingredientName: ing.name,
      qty: qty,
      unit: ing.unit,
      cost: lossCost,
      reason: reason,
      reportedBy: reportedBy || 'unknown'
    };

    // Save to MongoDB server database
    const success = await this.db.logWaste(wasteRecord);
    if (success) {
      return wasteRecord;
    }
    return null;
  }

  getTotalWasteCost() {
    return this.getWasteLogs().reduce((sum, item) => sum + item.cost, 0);
  }
}
