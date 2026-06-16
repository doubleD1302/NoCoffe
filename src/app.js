// app.js - Main bootloader for the Nơ Coffee SPA application

import { Database } from './models/Database.js';
import { MainController } from './controllers/MainController.js';
import { ViewManager } from './views/ViewManager.js';

import { LoginView } from './views/LoginView.js';
import { HomeView } from './views/HomeView.js';
import { POSView } from './views/POSView.js';
import { InventoryView } from './views/InventoryView.js';
import { StatsView } from './views/StatsView.js';
import { WasteView } from './views/WasteView.js';
import { MenuView } from './views/MenuView.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize MongoDB-Express Sync database client
  const db = new Database();

  // Initialize Core Controller
  const controller = new MainController(db);

  // Initialize View Coordinator
  const viewManager = new ViewManager(controller);
  controller.setViewManager(viewManager);

  // Bind View Component Instances (including HomeView)
  const views = {
    'login-view': new LoginView(document.getElementById('login-view'), controller),
    'home-view': new HomeView(document.getElementById('home-view'), controller),
    'pos-view': new POSView(document.getElementById('pos-view'), controller),
    'inventory-view': new InventoryView(document.getElementById('inventory-view'), controller),
    'stats-view': new StatsView(document.getElementById('stats-view'), controller),
    'waste-view': new WasteView(document.getElementById('waste-view'), controller),
    'menu-view': new MenuView(document.getElementById('menu-view'), controller),
  };

  controller.registerViews(views);

  // Start Application Lifecycle
  controller.start();
  
  console.log("🎗️ Nơ Coffee app booted successfully with MongoDB sync!");
});
