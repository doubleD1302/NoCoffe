// NotificationHelper.js - Handles standard browser Notification API and synthesized Web Audio chime sounds

export class NotificationHelper {
  static get isSupported() {
    return 'Notification' in window;
  }

  static get permission() {
    if (!this.isSupported) return 'denied';
    return Notification.permission;
  }

  static async requestPermission() {
    if (!this.isSupported) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.error('Error requesting notification permission:', e);
      return Notification.permission;
    }
  }

  // Play a beautiful, retro, premium synthesized double chime sound using Web Audio API
  static playChime() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Chime note 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.35);
      
      // Chime note 2 (slightly delayed, higher pitch)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      gain2.gain.setValueAtTime(0, ctx.currentTime + 0.1);
      gain2.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.45);
    } catch (e) {
      console.warn('Could not play notification sound (user interaction block or audio context issue):', e);
    }
  }

  // Main method to trigger OS-level notification and sound chime
  static send(title, body = '', options = {}) {
    if (!this.isSupported) return false;
    
    // Play chime sound regardless of permission state if browser allows it
    this.playChime();

    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted. Fallback to sound/toast.');
      return false;
    }

    const defaultOptions = {
      body: body,
      icon: './src/assets/icon.png',
      badge: './src/assets/icon.png',
      tag: 'no-coffee-notif-' + Date.now(),
      renotify: true,
      silent: true // Disable OS system sound to rely on our premium synthesized AudioContext chime
    };

    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
      new Notification(title, mergedOptions);
      return true;
    } catch (e) {
      console.error('Error displaying system notification:', e);
      return false;
    }
  }

  // Helper: Trigger order completion notification
  static notifyOrderCompleted(order) {
    const formattedTotal = Number(order.totalPrice).toLocaleString('vi-VN') + 'đ';
    this.send('🎗️ Đơn hàng mới hoàn tất!', `Mã đơn: ${order.id}\nTổng tiền: ${formattedTotal}\nPhương thức: ${order.paymentMethod}`, {
      tag: 'order-completed-' + order.id
    });
  }

  // Helper: Trigger shifts request status updates (for employee)
  static notifyShiftRequestStatus(request) {
    const statusText = request.status === 'approved' ? 'được Phê Duyệt' : 'bị Từ Chối';
    const daysViet = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayStr = daysViet[request.dayOfWeek];
    const desc = request.requestType === 'off' ? `xin nghỉ phép ngày ${dayStr}` : `đổi ca trực ngày ${dayStr}`;
    
    this.send(
      `🎗️ Yêu cầu của bạn đã ${statusText}!`,
      `Yêu cầu ${desc} đã được xử lý bởi Quản lý.`,
      { tag: 'shift-req-' + request.id + '-' + request.status }
    );
  }

  // Helper: Trigger new shift request (for manager)
  static notifyShiftRequestCreated(request) {
    const daysViet = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayStr = daysViet[request.dayOfWeek];
    const desc = request.requestType === 'off' ? `xin nghỉ phép ngày ${dayStr}` : `đổi sang ca ${request.requestedShiftName} ngày ${dayStr}`;
    
    this.send(
      '🎗️ Yêu cầu đổi lịch mới!',
      `Nhân viên ${request.employeeName} vừa gửi yêu cầu: ${desc}.`,
      { tag: 'new-shift-request-' + request.id }
    );
  }

  // Helper: Trigger shift assignment updated (for employee)
  static notifyShiftUpdated(shiftName, timeRange, dayOfWeek) {
    const daysViet = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayStr = daysViet[dayOfWeek];
    this.send(
      '🎗️ Lịch làm việc thay đổi!',
      `Bạn đã được phân công ca làm mới: ${shiftName} (${timeRange}) vào ${dayStr}.`,
      { tag: 'shift-updated-' + dayOfWeek + '-' + shiftName }
    );
  }

  // Helper: Trigger attendance logs
  static notifyAttendance(type, time) {
    const typeText = type === 'checkin' ? 'Vào Ca' : 'Ra Ca';
    this.send(
      `🎗️ Điểm danh ${typeText} thành công!`,
      `Đã ghi nhận lúc ${time}. Chúc bạn một ca làm việc tốt lành!`,
      { tag: 'attendance-' + type + '-' + Date.now() }
    );
  }

  // Helper: Trigger salary paid
  static notifySalaryPaid(employeeName, amount) {
    const formattedAmount = Number(amount).toLocaleString('vi-VN') + 'đ';
    this.send(
      '🎗️ Lương đã được thanh toán!',
      `Khoản lương ${formattedAmount} của nhân viên ${employeeName} đã được thanh toán thành công.`,
      { tag: 'salary-paid-' + Date.now() }
    );
  }
}
