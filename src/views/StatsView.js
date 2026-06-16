// StatsView.js - Renders Statistics and Custom SVG Charts using Bootstrap Icons

export class StatsView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
    this.duration = 30; // default 30 days
  }

  render() {
    this.container.innerHTML = `
      <div class="view-title-row">
        <h2>Thống Kê Báo Cáo</h2>
      </div>

      <!-- Duration Toggle Pills -->
      <div class="option-pills" style="margin-bottom: 16px;">
        <button class="option-pill-btn ${this.duration === 1 ? 'active' : ''}" data-dur="1">Hôm nay</button>
        <button class="option-pill-btn ${this.duration === 7 ? 'active' : ''}" data-dur="7">7 ngày qua</button>
        <button class="option-pill-btn ${this.duration === 30 ? 'active' : ''}" data-dur="30">30 ngày qua</button>
      </div>

      <!-- Metrics Dash Cards -->
      <div class="stats-cards-grid" id="stats-metrics-cards"></div>

      <!-- SVG Revenue Trend Chart -->
      <div class="chart-section">
        <div class="chart-title" id="trend-chart-title"><i class="bi bi-graph-up-arrow"></i> Doanh thu theo thời gian</div>
        <div class="svg-chart-container" id="revenue-chart-mount"></div>
      </div>

      <!-- SVG Peak Hours Chart -->
      <div class="chart-section">
        <div class="chart-title"><i class="bi bi-clock-fill"></i> Phân bổ khung giờ đắt hàng</div>
        <div class="svg-chart-container" id="peak-chart-mount"></div>
      </div>

      <!-- Top Seller Leaderboard -->
      <div class="chart-section" style="margin-bottom: 80px;">
        <div class="chart-title"><i class="bi bi-award-fill"></i> Đồ uống bán chạy nhất</div>
        <div class="leaderboard-list" id="best-seller-mount"></div>
      </div>
    `;

    this.initEvents();
    this.refreshMetrics();
  }

  initEvents() {
    this.container.querySelectorAll('.option-pill-btn[data-dur]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.option-pill-btn[data-dur]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.duration = Number(btn.getAttribute('data-dur'));
        this.refreshMetrics();
      });
    });
  }

  refreshMetrics() {
    const orders = this.controller.getOrdersHistory();
    const wasteLogs = this.controller.getWasteModel().getWasteLogs();

    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() - this.duration);
    if (this.duration === 1) {
      thresholdDate.setHours(0, 0, 0, 0); // start of today
    }

    const filteredOrders = orders.filter(o => new Date(o.timestamp) >= thresholdDate && o.status === 'completed');
    const filteredWaste = wasteLogs.filter(w => new Date(w.timestamp) >= thresholdDate);

    const grossRevenue = filteredOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const totalCogs = filteredOrders.reduce((sum, o) => sum + o.cogs, 0);
    const totalWasteCost = filteredWaste.reduce((sum, w) => sum + w.cost, 0);
    const netProfit = grossRevenue - totalCogs - totalWasteCost;
    const totalOrdersCount = filteredOrders.length;

    // Render Metrics Cards with Bootstrap Icons
    const cardsMount = this.container.querySelector('#stats-metrics-cards');
    cardsMount.innerHTML = `
      <div class="stat-metric-card" style="border-left: 4px solid var(--primary);">
        <div class="stat-card-label"><i class="bi bi-cash-stack"></i> Doanh thu</div>
        <div class="stat-card-val">${grossRevenue.toLocaleString('vi-VN')}đ</div>
        <div class="stat-card-sub">${totalOrdersCount} đơn hàng</div>
      </div>
      <div class="stat-metric-card" style="border-left: 4px solid var(--success);">
        <div class="stat-card-label"><i class="bi bi-wallet2"></i> Lợi nhuận ròng</div>
        <div class="stat-card-val" style="color: var(--success);">${netProfit.toLocaleString('vi-VN')}đ</div>
        <div class="stat-card-sub">Tỉ suất: ${grossRevenue > 0 ? Math.round((netProfit/grossRevenue)*100) : 0}%</div>
      </div>
      <div class="stat-metric-card" style="border-left: 4px solid var(--accent);">
        <div class="stat-card-label"><i class="bi bi-journal-check"></i> Giá vốn (COGS)</div>
        <div class="stat-card-val">${totalCogs.toLocaleString('vi-VN')}đ</div>
        <div class="stat-card-sub">Tỉ suất: ${grossRevenue > 0 ? Math.round((totalCogs/grossRevenue)*100) : 0}%</div>
      </div>
      <div class="stat-metric-card" style="border-left: 4px solid var(--danger);">
        <div class="stat-card-label"><i class="bi bi-trash3-fill"></i> Hao hụt & Đổ vỡ</div>
        <div class="stat-card-val" style="color: var(--danger);">${totalWasteCost.toLocaleString('vi-VN')}đ</div>
        <div class="stat-card-sub">${filteredWaste.length} sự cố</div>
      </div>
    `;

    this.renderTrendChart(filteredOrders, thresholdDate);
    this.renderPeakHoursChart(filteredOrders);
    this.renderLeaderboard(filteredOrders);
  }

  renderTrendChart(orders, thresholdDate) {
    const mount = this.container.querySelector('#revenue-chart-mount');
    const title = this.container.querySelector('#trend-chart-title');
    title.innerHTML = this.duration === 1 
      ? '<i class="bi bi-graph-up-arrow"></i> Doanh thu trong ngày' 
      : `<i class="bi bi-graph-up-arrow"></i> Biểu đồ doanh thu ${this.duration} ngày qua`;

    const grouped = {};
    if (this.duration === 1) {
      for (let h = 6; h <= 18; h++) {
        grouped[`${h}h`] = 0;
      }
      orders.forEach(o => {
        const h = new Date(o.timestamp).getHours();
        if (h >= 6 && h <= 18) {
          grouped[`${h}h`] += o.totalPrice;
        }
      });
    } else {
      const daysCount = this.duration;
      const now = new Date();
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
        grouped[dateStr] = 0;
      }
      orders.forEach(o => {
        const d = new Date(o.timestamp);
        const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
        if (grouped[dateStr] !== undefined) {
          grouped[dateStr] += o.totalPrice;
        }
      });
    }

    const labels = Object.keys(grouped);
    const values = Object.values(grouped);
    const maxValue = Math.max(...values, 200000);

    const width = 350;
    const height = 120;
    const paddingLeft = 35;
    const paddingRight = 10;
    const paddingTop = 10;
    const paddingBottom = 20;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const points = values.map((val, idx) => {
      const x = paddingLeft + (idx / (values.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (val / maxValue) * chartHeight;
      return { x, y, val, label: labels[idx] };
    });

    let pathD = '';
    let areaD = `M ${points[0].x} ${paddingTop + chartHeight} `;
    
    points.forEach((p, idx) => {
      if (idx === 0) {
        pathD += `M ${p.x} ${p.y} `;
      } else {
        pathD += `L ${p.x} ${p.y} `;
      }
      areaD += `L ${p.x} ${p.y} `;
    });
    areaD += `L ${points[points.length - 1].x} ${paddingTop + chartHeight} Z`;

    const tickValues = [0, maxValue / 2, maxValue];
    const yTicksHtml = tickValues.map(tv => {
      const y = paddingTop + chartHeight - (tv / maxValue) * chartHeight;
      return `
        <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="#eae2db" stroke-dasharray="2,2"/>
        <text x="${paddingLeft - 6}" y="${y + 3}" font-size="8" fill="var(--text-light)" text-anchor="end">${Math.round(tv/1000)}k</text>
      `;
    }).join('');

    const skipStep = Math.max(1, Math.floor(labels.length / 5));
    const xTicksHtml = points.map((p, idx) => {
      if (idx % skipStep !== 0 && idx !== points.length - 1) return '';
      return `
        <text x="${p.x}" y="${height - 4}" font-size="8" fill="var(--text-light)" text-anchor="middle">${p.label}</text>
      `;
    }).join('');

    const circlesHtml = points.map((p, idx) => {
      if (p.val === 0) return '';
      return `
        <circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#ffffff" stroke="var(--primary)" stroke-width="2" class="chart-point">
          <title>${p.label}: ${p.val.toLocaleString('vi-VN')}đ</title>
        </circle>
      `;
    }).join('');

    mount.innerHTML = `
      <svg class="svg-chart" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        ${yTicksHtml}
        <path d="${areaD}" fill="url(#chart-area-grad)" />
        <path d="${pathD}" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        ${xTicksHtml}
        ${circlesHtml}
      </svg>
    `;
  }

  renderPeakHoursChart(orders) {
    const mount = this.container.querySelector('#peak-chart-mount');

    const hours = {};
    for (let h = 6; h <= 18; h++) {
      hours[h] = 0;
    }

    orders.forEach(o => {
      const date = new Date(o.timestamp);
      const h = date.getHours();
      if (hours[h] !== undefined) {
        hours[h] += 1;
      }
    });

    const values = Object.values(hours);
    const maxOrders = Math.max(...values, 5);

    const width = 350;
    const height = 120;
    const paddingLeft = 25;
    const paddingRight = 10;
    const paddingTop = 10;
    const paddingBottom = 20;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const keys = Object.keys(hours);
    const barCount = keys.length;
    const gap = 4;
    const barWidth = (chartWidth - (barCount - 1) * gap) / barCount;

    const barsHtml = keys.map((hourKey, idx) => {
      const val = hours[hourKey];
      const barHeight = (val / maxOrders) * chartHeight;
      const x = paddingLeft + idx * (barWidth + gap);
      const y = paddingTop + chartHeight - barHeight;

      const hue = 24;
      const light = val === 0 ? 92 : Math.max(35, 75 - (val / maxOrders) * 35);
      const fillCol = `hsl(${hue}, 40%, ${light}%)`;

      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="2" fill="${fillCol}">
          <title>${hourKey}h: ${val} đơn</title>
        </rect>
        <text x="${x + barWidth / 2}" y="${height - 4}" font-size="7" fill="var(--text-light)" text-anchor="middle">${hourKey}h</text>
      `;
    }).join('');

    mount.innerHTML = `
      <svg class="svg-chart" viewBox="0 0 ${width} ${height}">
        <line x1="${paddingLeft}" y1="${paddingTop}" x2="${width - paddingRight}" y2="${paddingTop}" stroke="#eae2db" stroke-dasharray="2,2"/>
        <line x1="${paddingLeft}" y1="${paddingTop + chartHeight/2}" x2="${width - paddingRight}" y2="${paddingTop + chartHeight/2}" stroke="#eae2db" stroke-dasharray="2,2"/>
        <line x1="${paddingLeft}" y1="${paddingTop + chartHeight}" x2="${width - paddingRight}" y2="${paddingTop + chartHeight}" stroke="#8c786e" stroke-width="0.5"/>
        
        <text x="${paddingLeft - 4}" y="${paddingTop + 3}" font-size="7" fill="var(--text-light)" text-anchor="end">${maxOrders}</text>
        <text x="${paddingLeft - 4}" y="${paddingTop + chartHeight/2 + 3}" font-size="7" fill="var(--text-light)" text-anchor="end">${Math.round(maxOrders/2)}</text>
        <text x="${paddingLeft - 4}" y="${paddingTop + chartHeight + 3}" font-size="7" fill="var(--text-light)" text-anchor="end">0</text>

        ${barsHtml}
      </svg>
    `;
  }

  renderLeaderboard(orders) {
    const mount = this.container.querySelector('#best-seller-mount');

    const salesCounts = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        salesCounts[item.name] = (salesCounts[item.name] || 0) + item.qty;
      });
    });

    const sorted = Object.keys(salesCounts)
      .map(name => ({ name, qty: salesCounts[name] }))
      .sort((a, b) => b.qty - a.qty);

    if (sorted.length === 0) {
      mount.innerHTML = `<div style="font-size: 12px; text-align: center; color: var(--text-muted); padding: 10px 0;">Không có dữ liệu bán hàng.</div>`;
      return;
    }

    const maxSales = sorted[0].qty;

    mount.innerHTML = sorted.slice(0, 5).map((item, idx) => {
      const percentage = maxSales > 0 ? (item.qty / maxSales) * 100 : 0;
      return `
        <div class="leaderboard-item">
          <span class="leaderboard-rank">#${idx + 1}</span>
          <span class="leaderboard-name">${item.name}</span>
          <div class="leaderboard-progress-bar">
            <div class="leaderboard-progress-fill" style="width: ${percentage}%"></div>
          </div>
          <span class="leaderboard-sales">${item.qty} ly</span>
        </div>
      `;
    }).join('');
  }
}
