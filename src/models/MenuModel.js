// MenuModel.js - Manages drinks menu and recipe configurations syncing to MongoDB

export class MenuModel {
  constructor(db) {
    this.db = db;
  }

  getMenu() {
    return this.db.getTable('menu');
  }

  getMenuById(id) {
    return this.getMenu().find(item => item.id === id) || null;
  }

  async updatePriceAndRecipe(id, newPrice, recipeObj) {
    if (newPrice < 0) return false;
    const success = await this.db.updateMenuItem(id, newPrice, recipeObj, undefined);
    return success;
  }

  async updateImage(id, imageBase64) {
    const success = await this.db.updateMenuItem(id, undefined, undefined, imageBase64);
    return success;
  }

  async addMenuItem(name, price, category, emoji) {
    const success = await this.db.addMenuItem(name, price, category, emoji);
    return success;
  }

  async deleteMenuItem(id) {
    const success = await this.db.deleteMenuItem(id);
    return success;
  }
}
