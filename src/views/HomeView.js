// HomeView.js - Renders and manages the Home Page (Check-in, Schedules, Shift Planners, Wages)

export class HomeView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
    
    // Default selected day in scheduler (1: Monday, 2: Tuesday ... 6: Saturday, 0: Sunday)
    const today = new Date().getDay();
    this.activeSchedulerDay = today;
  }

  render() {
    const user = this.controller.getCurrentUser();
    if (!user) {
      this.container.innerHTML = `<div style="padding: 20px; text-align: center;">Vui lòng đăng nhập.</div>`;
      return;
    }

    if (user.role === 'employee') {
      this.renderEmployeeView(user);
    } else {
      this.renderManagerView(user);
    }
  }

  // ==========================================================================
  // EMPLOYEE VIEW
  // ==========================================================================
  renderEmployeeView(user) {
    const hour = new Date().getHours();
    let greeting = 'Chào buổi tối! 🌟';
    if (hour < 12) greeting = 'Chào buổi sáng! ☕';
    else if (hour < 18) greeting = 'Chào buổi chiều! ☀️';

    const todayStr = this.getTodayStr();
    const attendanceLogs = this.controller.getAttendanceHistory();
    const todayLog = attendanceLogs.find(a => a.employeeId === user.id && a.date === todayStr);

    let statusText = 'Chưa vào ca';
    let checkInBtnText = 'CHECK-IN VÀO CA';
    let checkInBtnClass = 'btn-checkin-start';
    let checkInIcon = 'bi-box-arrow-in-right';
    let timesInfo = '';

    if (todayLog) {
      if (todayLog.checkOutTime) {
        statusText = 'Đã hoàn thành ca trực';
        checkInBtnText = 'ĐÃ RA CA';
        checkInBtnClass = 'btn-checkin-disabled';
        checkInIcon = 'bi-check2-circle';
        timesInfo = `
          <div style="margin-top: 8px; font-size: 12px; color: var(--text-muted); line-height: 1.5;">
            📥 Vào ca: <strong>${todayLog.checkInTime}</strong><br>
            📤 Ra ca: <strong>${todayLog.checkOutTime}</strong><br>
            ⏳ Tổng thời gian: <strong>${todayLog.durationHours.toFixed(2)} giờ</strong>
          </div>
        `;
      } else {
        statusText = 'Đang trong ca trực';
        checkInBtnText = 'CHECK-OUT RA CA';
        checkInBtnClass = 'btn-checkout-stop';
        checkInIcon = 'bi-box-arrow-left';
        timesInfo = `
          <div style="margin-top: 8px; font-size: 12px; color: var(--text-muted); line-height: 1.5;">
            📥 Vào ca lúc: <strong style="color: var(--success);">${todayLog.checkInTime}</strong>
          </div>
        `;
      }
    }

    // Today's shift info
    const dayOfWeek = new Date().getDay();
    const shifts = this.controller.getShifts();
    const todayShift = shifts.find(s => s.employeeId === user.id && Number(s.dayOfWeek) === dayOfWeek);
    const shiftText = todayShift 
      ? `Ca trực hôm nay: <strong>${todayShift.shiftName} (${todayShift.timeRange})</strong>`
      : 'Hôm nay: <strong style="color: var(--text-muted);">Không có ca trực (Lịch nghỉ)</strong>';

    // Weekly schedule list
    const daysName = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    let scheduleHtml = '';
    for (let d = 1; d <= 7; d++) {
      const targetDay = d % 7;
      const shift = shifts.find(s => s.employeeId === user.id && Number(s.dayOfWeek) === targetDay);
      const isToday = targetDay === dayOfWeek;
      const highlightBg = isToday ? 'background: var(--primary-soft); border-left: 3px solid var(--primary); font-weight: bold;' : '';
      
      scheduleHtml += `
        <div class="schedule-row" style="${highlightBg} display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid var(--border-color); font-size: 12px;">
          <span style="color: ${isToday ? 'var(--primary-dark)' : 'var(--text-main)'};">${daysName[targetDay]} ${isToday ? '(Hôm nay)' : ''}</span>
          <span style="color: ${shift ? 'var(--primary-light)' : 'var(--text-light)'}; font-weight: 600;">
            ${shift ? `${shift.shiftName} (${shift.timeRange})` : 'Nghỉ'}
          </span>
        </div>
      `;
    }

    // Shift requests list
    const myRequests = this.controller.getShiftRequests().filter(r => r.employeeId === user.id);
    let requestsHtml = '';
    if (myRequests.length === 0) {
      requestsHtml = `<div style="font-size: 11px; text-align: center; color: var(--text-light); padding: 10px 0;">Chưa có yêu cầu đổi lịch nào.</div>`;
    } else {
      requestsHtml = myRequests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5).map(req => {
        let statusBadge = '';
        if (req.status === 'pending') statusBadge = '<span class="badge badge-warning">Đang chờ duyệt</span>';
        else if (req.status === 'approved') statusBadge = '<span class="badge badge-success">Đã duyệt</span>';
        else statusBadge = '<span class="badge badge-danger">Từ chối</span>';

        const dayStr = daysName[req.dayOfWeek];
        const desc = req.requestType === 'off' 
          ? `Xin nghỉ ${dayStr}` 
          : `Đổi sang ${req.requestedShiftName} ${dayStr}`;

        return `
          <div style="padding: 10px 0; border-bottom: 1px solid var(--border-color); font-size: 11px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>${desc}</strong><br>
              <span style="color: var(--text-muted);">Lý do: ${req.reason || 'Không có'}</span>
            </div>
            <div>${statusBadge}</div>
          </div>
        `;
      }).join('');
    }

    // Calculate wages and withholding
    const salInfo = this.calculateEmployeeSalary(user, attendanceLogs);
    const hasQr = user.qrCode ? true : false;

    const salaryBlockHtml = `
      <div class="chart-section" style="margin-bottom: 20px;">
        <div class="chart-title"><i class="bi bi-wallet2"></i> Báo Cáo Chấm Công & Tính Lương</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div style="background: var(--primary-soft); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); text-align: center;">
            <div style="font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Lương thực nhận</div>
            <div style="font-size: 16px; font-weight: 800; color: var(--success); margin-top: 4px;">${salInfo.payableAmount.toLocaleString('vi-VN')}đ</div>
          </div>
          <div style="background: var(--bg-app); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); text-align: center;">
            <div style="font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Đang tạm giữ (Tuần mới)</div>
            <div style="font-size: 16px; font-weight: 800; color: var(--warning); margin-top: 4px;">${salInfo.withheldAmount.toLocaleString('vi-VN')}đ</div>
          </div>
        </div>

        <div style="font-size: 12px; line-height: 1.6; margin-bottom: 12px; padding: 0 4px; display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Tổng số ca đã hoàn thành:</span>
            <strong>${salInfo.totalDays} ngày công</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Tổng số giờ làm việc:</span>
            <strong>${salInfo.totalHours.toFixed(2)} giờ</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Mức lương giờ thiết lập:</span>
            <strong>${(user.hourlyWage || 20000).toLocaleString('vi-VN')}đ/giờ</strong>
          </div>
        </div>

        <div style="border-top: 1px solid var(--border-color); padding-top: 12px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 8px;">QR CODE NHẬN LƯƠNG</div>
          <div id="employee-qr-display" style="width: 140px; height: 140px; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; background: var(--bg-app); border: 1px dashed var(--border-color); border-radius: var(--radius-md); overflow: hidden;">
            ${hasQr ? `<img src="${user.qrCode}" style="width: 100%; height: 100%; object-fit: contain;">` : `<i class="bi bi-qr-code" style="font-size: 48px; color: var(--text-light);"></i>`}
          </div>
          <input type="file" id="qr-upload-input" accept="image/*" style="display: none;">
          <button type="button" class="btn-secondary" id="btn-upload-qr" style="padding: 6px 12px; font-size: 11px;">
            <i class="bi bi-upload"></i> ${hasQr ? 'Thay đổi mã QR' : 'Tải lên mã QR'}
          </button>
        </div>
      </div>
    `;

    this.container.innerHTML = `
      <div class="home-employee-layout">
        <!-- Greetings header -->
        <div style="margin-bottom: 20px;">
          <h2 style="font-family: var(--font-heading); font-size: 20px; font-weight: 800; color: var(--primary-dark);">${greeting}</h2>
          <p style="font-size: 13px; color: var(--text-muted);">Chúc bạn ${user.name} một ngày làm việc tràn đầy năng lượng!</p>
        </div>

        <!-- Attendance Card -->
        <div class="chart-section" style="text-align: center; padding: 24px 16px; margin-bottom: 20px; border-radius: var(--radius-lg);">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 8px;">
            ĐIỂM DANH HÀNG NGÀY
          </div>
          <div style="margin-bottom: 12px; font-size: 14px; font-weight: 500;">${shiftText}</div>

          <div style="margin: 20px 0; display: flex; justify-content: center;">
            <button class="btn-checkin-tactile ${checkInBtnClass}" id="btn-toggle-checkin" ${todayLog && todayLog.checkOutTime ? 'disabled' : ''}>
              <div class="tactile-circle">
                <i class="bi ${checkInIcon}" style="font-size: 32px;"></i>
                <span style="font-size: 11px; font-weight: bold; margin-top: 4px;">${checkInBtnText}</span>
              </div>
            </button>
          </div>

          <div style="font-size: 13px; font-weight: 600; color: var(--primary-dark);">
            Trạng thái: <span style="color: ${todayLog && !todayLog.checkOutTime ? 'var(--success)' : 'var(--text-muted)'};">${statusText}</span>
          </div>
          ${timesInfo}
        </div>

        <!-- Salary Block -->
        ${salaryBlockHtml}

        <!-- Schedule Section -->
        <div class="chart-section" style="margin-bottom: 20px;">
          <div class="chart-title" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span><i class="bi bi-calendar3"></i> Lịch trực tuần của tôi</span>
            <button class="btn-secondary" id="btn-request-shift-change" style="padding: 4px 10px; font-size: 10px; border-radius: 8px;">
              <i class="bi bi-send-fill"></i> Đổi ca / Xin nghỉ
            </button>
          </div>
          <div style="background: var(--surface); border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-color);">
            ${scheduleHtml}
          </div>
        </div>

        <!-- Shift Requests Section -->
        <div class="chart-section" style="margin-bottom: 80px;">
          <div class="chart-title"><i class="bi bi-envelope-paper-fill"></i> Yêu cầu đổi lịch gần đây</div>
          <div style="background: var(--surface); border-radius: var(--radius-md); padding: 0 10px;">
            ${requestsHtml}
          </div>
        </div>
      </div>

      <div id="home-modals-mount"></div>
    `;

    this.initEmployeeEvents(todayLog, user);
  }

  initEmployeeEvents(todayLog, user) {
    const btn = this.container.querySelector('#btn-toggle-checkin');
    if (btn && (!todayLog || !todayLog.checkOutTime)) {
      btn.addEventListener('click', () => {
        this.openCameraAttendanceModal(todayLog ? true : false, todayLog, user);
      });
    }

    const btnRequest = this.container.querySelector('#btn-request-shift-change');
    if (btnRequest) {
      btnRequest.addEventListener('click', () => {
        this.openShiftRequestModal();
      });
    }

    // QR upload
    const qrUpload = this.container.querySelector('#qr-upload-input');
    const btnUploadQr = this.container.querySelector('#btn-upload-qr');
    if (btnUploadQr && qrUpload) {
      btnUploadQr.addEventListener('click', () => qrUpload.click());
      qrUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const img = new Image();
            img.onload = async () => {
              const canvas = document.createElement('canvas');
              const MAX_SIZE = 300;
              let w = img.width;
              let h = img.height;
              if (w > h) {
                if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; }
              } else {
                if (h > MAX_SIZE) { w *= MAX_SIZE / h; w = MAX_SIZE; }
              }
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              const base64 = canvas.toDataURL('image/jpeg', 0.75);
              
              this.controller.viewManager.showLoading('Đang tải ảnh QR lên...');
              const success = await this.controller.db.updateQrCode(user.id, base64);
              this.controller.viewManager.hideLoading();
              if (success) {
                this.controller.viewManager.showToast('Đã cập nhật QR nhận lương!', 'success');
                this.render();
              }
            };
            img.src = event.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  // Camera check-in / check-out modal
  openCameraAttendanceModal(isCheckOut, todayLog, user) {
    const mount = this.container.querySelector('#home-modals-mount');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '999';

    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 360px; align-self: center; border-radius: var(--radius-lg); padding: 20px;">
        <div class="drawer-handle"></div>
        <div class="modal-header">
          <h3>Xác nhận chụp ảnh ${isCheckOut ? 'Ra Ca' : 'Vào Ca'}</h3>
          <button class="btn-icon-small btn-close-modal">×</button>
        </div>

        <div style="position: relative; width: 100%; text-align: center; margin-bottom: 16px;">
          <video id="camera-video" autoplay playsinline style="width: 100%; height: 240px; border-radius: var(--radius-md); object-fit: cover; background: #222; transform: scaleX(-1);"></video>
          <canvas id="camera-canvas" style="display: none;"></canvas>
          <div id="camera-preview-container" style="display: none; width: 100%; height: 240px; border-radius: var(--radius-md); overflow: hidden; background: #222;">
            <img id="camera-preview-img" style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);">
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button type="button" class="btn-secondary" id="btn-camera-capture" style="height: 40px; font-weight: 600;">
            <i class="bi bi-camera-fill"></i> Chụp ảnh
          </button>
          <button type="button" class="btn-primary" id="btn-camera-confirm" style="display: none; height: 40px; font-weight: 700;">
            <i class="bi bi-check-circle-fill"></i> Xác nhận chấm công
          </button>
        </div>
      </div>
    `;

    mount.appendChild(overlay);

    const video = overlay.querySelector('#camera-video');
    const canvas = overlay.querySelector('#camera-canvas');
    const previewContainer = overlay.querySelector('#camera-preview-container');
    const previewImg = overlay.querySelector('#camera-preview-img');
    const btnCapture = overlay.querySelector('#btn-camera-capture');
    const btnConfirm = overlay.querySelector('#btn-camera-confirm');

    let localStream = null;
    let capturedBase64 = '';

    // Start video stream
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => {
        localStream = stream;
        video.srcObject = stream;
      })
      .catch(err => {
        console.error('Không thể truy cập camera, chạy giả lập kiểm thử:', err);
        // Headless fallback
        this.controller.viewManager.showToast('Không thể mở camera. Chế độ giả lập chấm công.', 'warning');
        
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#4f46e5';
        ctx.fillRect(0, 0, 320, 240);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.fillText(`${user.name} - Giả lập`, 20, 80);
        ctx.fillText(isCheckOut ? 'Check-out' : 'Check-in', 20, 110);
        ctx.fillText(new Date().toLocaleString('vi-VN'), 20, 140);
        capturedBase64 = canvas.toDataURL('image/jpeg', 0.6);

        previewImg.src = capturedBase64;
        video.style.display = 'none';
        previewContainer.style.display = 'block';
        btnCapture.style.display = 'none';
        btnConfirm.style.display = 'block';
      });

    const stopCamera = () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };

    const close = () => {
      stopCamera();
      overlay.remove();
    };

    overlay.querySelector('.btn-close-modal').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    btnCapture.addEventListener('click', () => {
      if (btnCapture.innerText.includes('Chụp ảnh')) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        capturedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        previewImg.src = capturedBase64;
        video.style.display = 'none';
        previewContainer.style.display = 'block';
        
        btnCapture.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Chụp lại';
        btnConfirm.style.display = 'block';
      } else {
        capturedBase64 = '';
        video.style.display = 'block';
        previewContainer.style.display = 'none';
        btnCapture.innerHTML = '<i class="bi bi-camera-fill"></i> Chụp ảnh';
        btnConfirm.style.display = 'none';
      }
    });

    btnConfirm.addEventListener('click', async () => {
      if (!capturedBase64) return;
      
      stopCamera();
      overlay.remove();

      this.controller.viewManager.showLoading('Đang ghi nhận chấm công...');
      try {
        const d = new Date();
        const todayStr = this.getTodayStr();
        const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

        let attendanceRecord = {};

        if (!isCheckOut) {
          attendanceRecord = {
            id: `att-${user.id}-${todayStr}`,
            employeeId: user.id,
            employeeName: user.name,
            date: todayStr,
            checkInTime: timeStr,
            checkOutTime: '',
            durationHours: 0,
            checkInPhoto: capturedBase64,
            paidStatus: 'unpaid'
          };
        } else {
          let duration = 0;
          if (todayLog && todayLog.checkInTime) {
            const [inH, inM] = todayLog.checkInTime.split(':').map(Number);
            const inDate = new Date();
            inDate.setHours(inH, inM, 0, 0);
            const diffMs = d.getTime() - inDate.getTime();
            duration = Math.max(0, diffMs / (1000 * 60 * 60));
          }

          attendanceRecord = {
            id: todayLog.id,
            employeeId: user.id,
            employeeName: user.name,
            checkOutTime: timeStr,
            durationHours: duration,
            checkOutPhoto: capturedBase64
          };
        }

        const success = await this.controller.db.logAttendance(attendanceRecord);
        this.controller.viewManager.hideLoading();
        if (success) {
          this.controller.viewManager.showToast(
            `${isCheckOut ? 'Check-out' : 'Check-in'} thành công lúc ${timeStr}!`, 
            'success'
          );
          this.render();
        }
      } catch (e) {
        console.error(e);
        this.controller.viewManager.hideLoading();
      }
    });
  }

  openShiftRequestModal() {
    const mount = this.container.querySelector('#home-modals-mount');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '999';

    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 340px; align-self: center; border-radius: var(--radius-lg);">
        <div class="drawer-handle"></div>
        <div class="modal-header">
          <h3>Yêu cầu chỉnh sửa lịch làm</h3>
          <button class="btn-icon-small btn-close-modal">×</button>
        </div>

        <form id="shift-request-form" style="display: flex; flex-direction: column; gap: 12px;">
          <div class="form-group">
            <label for="req-day">Chọn ngày trực muốn thay đổi</label>
            <select id="req-day" class="select-field">
              <option value="1">Thứ Hai</option>
              <option value="2">Thứ Ba</option>
              <option value="3">Thứ Tư</option>
              <option value="4">Thứ Năm</option>
              <option value="5">Thứ Sáu</option>
              <option value="6">Thứ Bảy</option>
              <option value="0">Chủ Nhật</option>
            </select>
          </div>

          <div class="form-group">
            <label for="req-type">Loại yêu cầu</label>
            <select id="req-type" class="select-field">
              <option value="change">Xin đổi ca trực</option>
              <option value="off">Xin nghỉ phép 1 ngày</option>
            </select>
          </div>

          <div class="form-group" id="req-target-shift-group">
            <label for="req-target-shift">Chọn ca trực mong muốn</label>
            <select id="req-target-shift" class="select-field">
              <option value="Ca sáng|06:30 - 12:30">Ca sáng (06:30 - 12:30)</option>
              <option value="Ca chiều|12:30 - 18:30">Ca chiều (12:30 - 18:30)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="req-reason">Lý do xin đổi ca/nghỉ</label>
            <textarea id="req-reason" class="input-field" rows="2" required placeholder="Lý do bận học, việc gia đình..."></textarea>
          </div>

          <button type="submit" class="btn-primary" style="height: 40px; margin-top: 8px;">
            <i class="bi bi-send-fill"></i> Gửi Yêu Cầu Cho Quản Lý
          </button>
        </form>
      </div>
    `;

    mount.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.btn-close-modal').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    const typeSelect = overlay.querySelector('#req-type');
    const shiftGroup = overlay.querySelector('#req-target-shift-group');

    typeSelect.addEventListener('change', () => {
      if (typeSelect.value === 'off') {
        shiftGroup.style.display = 'none';
      } else {
        shiftGroup.style.display = 'flex';
      }
    });

    overlay.querySelector('#shift-request-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = this.controller.getCurrentUser();
      const day = Number(overlay.querySelector('#req-day').value);
      const type = typeSelect.value;
      const reason = overlay.querySelector('#req-reason').value;

      let shiftName = '';
      let timeRange = '';

      if (type === 'change') {
        const val = overlay.querySelector('#req-target-shift').value;
        const parts = val.split('|');
        shiftName = parts[0];
        timeRange = parts[1];
      }

      close();
      const success = await this.controller.handleCreateShiftRequest(
        user.id,
        day,
        type,
        shiftName,
        timeRange,
        reason
      );
      if (success) {
        this.render();
      }
    });
  }

  // ==========================================================================
  // MANAGER VIEW
  // ==========================================================================
  renderManagerView(user) {
    const activeStaffList = this.controller.getUsers().filter(u => u.role === 'employee');
    const shifts = this.controller.getShifts();
    const attendanceLogs = this.controller.getAttendanceHistory();
    const pendingRequests = this.controller.getShiftRequests().filter(r => r.status === 'pending');

    const todayStr = this.getTodayStr();

    // Roster of Employees with Wage alerts
    const staffHtml = activeStaffList.map(st => {
      const isLate = this.isSalaryLate(st, attendanceLogs);
      const lateIndicator = isLate 
        ? `<span class="badge badge-danger" style="font-size: 9px; margin-left: 6px; animation: pulse 1.5s infinite;">Sắp trễ lương</span>`
        : '';
      return `
        <div class="staff-row" data-id="${st.id}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed var(--border-color); cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary-soft); display: flex; align-items: center; justify-content: center; font-weight: bold; color: var(--primary);">
              ${st.name[0]}
            </div>
            <div>
              <strong style="font-size: 13px;">${st.name}</strong> ${lateIndicator}<br>
              <span style="font-size: 10px; color: var(--text-light);">Tài khoản: ${st.username}</span>
            </div>
          </div>
          <div class="badge badge-success">Nhân viên</div>
        </div>
      `;
    }).join('');

    // Attendance Log Rows
    const attendanceHtml = attendanceLogs.slice(0, 8).map(att => {
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-app); border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 6px; font-size: 11px;">
          <div>
            <strong>${att.employeeName}</strong><br>
            <span style="color: var(--text-muted);">${att.date}</span>
          </div>
          <div style="text-align: right;">
            📥 <strong>${att.checkInTime}</strong> ${att.checkOutTime ? `➡️ 📤 <strong>${att.checkOutTime}</strong>` : '⏳ <span style="color: var(--success); font-weight: 700;">Đang trực</span>'}<br>
            <span style="color: var(--text-light); font-size: 9px;">${att.durationHours ? `${att.durationHours.toFixed(1)} giờ` : ''}</span>
          </div>
        </div>
      `;
    }).join('');

    // Dynamic scheduler logic based on selected activeSchedulerDay
    const getStartTime = (timeRange) => {
      if (!timeRange) return 0;
      const match = timeRange.match(/^(\d{2}):(\d{2})/);
      if (!match) return 0;
      return Number(match[1]) * 60 + Number(match[2]);
    };

    const filteredShifts = shifts.filter(s => Number(s.dayOfWeek) === this.activeSchedulerDay);
    filteredShifts.sort((a, b) => getStartTime(a.timeRange) - getStartTime(b.timeRange));

    const isToday = this.activeSchedulerDay === new Date().getDay();

    let shiftListHtml = '';
    if (filteredShifts.length === 0) {
      shiftListHtml = `<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 12px;">Không có ca làm nào trong ngày này.</div>`;
    } else {
      shiftListHtml = filteredShifts.map(sh => {
        const isAssigned = sh.employeeId ? true : false;
        
        if (!isAssigned) {
          return `
            <div class="scheduler-shift-card unassigned" data-shift-id="${sh.id}" style="border: 2px dashed var(--border-color); background: var(--bg-app); border-radius: var(--radius-md); padding: 12px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-bottom: 8px;">
              <div>
                <strong style="color: var(--text-light); font-size: 13px;">${sh.shiftName} (${sh.timeRange})</strong><br>
                <span style="font-size: 11px; color: var(--text-muted);">Trống ca - Nhấp để phân công nhân sự</span>
              </div>
              <div style="font-size: 18px; color: var(--text-light); font-weight: bold; margin-right: 4px;">+</div>
            </div>
          `;
        } else {
          let attendanceBadge = '';
          if (isToday) {
            const attToday = attendanceLogs.find(a => a.employeeId === sh.employeeId && a.date === todayStr);
            if (attToday) {
              if (attToday.checkOutTime) {
                attendanceBadge = '<span class="badge badge-success" style="font-size: 9px;"><i class="bi bi-patch-check-fill"></i> Đã ra ca</span>';
              } else {
                attendanceBadge = '<span class="badge badge-warning" style="font-size: 9px;"><i class="bi bi-clock-fill"></i> Đang trực</span>';
              }
            } else {
              attendanceBadge = '<span class="badge badge-danger" style="font-size: 9px;">Chưa check-in</span>';
            }
          }

          return `
            <div class="scheduler-shift-card assigned" data-shift-id="${sh.id}" style="background: white; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <div>
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                  <strong style="font-size: 13px; color: var(--primary-dark);">${sh.shiftName} (${sh.timeRange})</strong>
                  ${attendanceBadge}
                </div>
                <span style="font-size: 12px; color: var(--text-main); font-weight: 600;">Nhân viên: ${sh.employeeName}</span>
              </div>
              <i class="bi bi-chevron-right" style="color: var(--text-light); font-size: 13px;"></i>
            </div>
          `;
        }
      }).join('');
    }

    const addShiftBtnHtml = !isToday 
      ? `<button class="btn-primary" id="btn-add-shift-slot" style="padding: 4px 10px; font-size: 10px; border-radius: 8px;">
          <i class="bi bi-plus-circle-fill"></i> Thêm ca trực
         </button>`
      : '';

    // Day Selector Tabs
    const daysHeader = ['Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'CN'];
    const daysIdx = [1, 2, 3, 4, 5, 6, 0];
    const dayTabsHtml = `
      <div style="display: flex; gap: 4px; overflow-x: auto; margin-bottom: 12px; padding: 4px; background: var(--bg-app); border-radius: var(--radius-md);">
        ${daysIdx.map((day, i) => {
          const isActive = this.activeSchedulerDay === day;
          const isCurr = new Date().getDay() === day;
          const indicator = isCurr ? ' <span style="color:var(--danger); font-size: 8px; vertical-align: top;">●</span>' : '';
          return `
            <button class="day-tab-btn" data-day="${day}" style="flex: 1; border: none; padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: var(--radius-sm); cursor: pointer; background: ${isActive ? 'var(--primary)' : 'transparent'}; color: ${isActive ? 'white' : 'var(--text-muted)'}; white-space: nowrap; text-align: center;">
              ${daysHeader[i]}${indicator}
            </button>
          `;
        }).join('')}
      </div>
    `;

    // Pending Requests approval UI
    let pendingReqHtml = '';
    if (pendingRequests.length === 0) {
      pendingReqHtml = `<div style="font-size: 12px; text-align: center; color: var(--text-muted); padding: 14px 0;">Không có yêu cầu đổi lịch đang chờ phê duyệt.</div>`;
    } else {
      const daysViet = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      pendingReqHtml = pendingRequests.map(req => {
        const desc = req.requestType === 'off'
          ? `<span style="color: var(--danger); font-weight: bold;">Xin nghỉ</span> ngày <strong>${daysViet[req.dayOfWeek]}</strong>`
          : `<span style="color: var(--primary); font-weight: bold;">Đổi sang ${req.requestedShiftName}</span> ngày <strong>${daysViet[req.dayOfWeek]}</strong>`;
        
        return `
          <div style="background: var(--surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span>Nhân viên: <strong>${req.employeeName}</strong></span>
              <span style="color: var(--text-muted); font-size: 10px;">${new Date(req.timestamp).toLocaleDateString('vi-VN')}</span>
            </div>
            <div style="font-size: 12px; line-height: 1.4;">
              Yêu cầu: ${desc}<br>
              Lý do: <span style="font-style: italic; color: var(--text-muted); font-weight: 500;">"${req.reason}"</span>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
              <button class="btn-danger btn-deny-req" data-id="${req.id}" style="padding: 4px 12px; font-size: 11px; border-radius: 8px;">Từ chối</button>
              <button class="btn-primary btn-approve-req" data-id="${req.id}" style="padding: 4px 12px; font-size: 11px; border-radius: 8px;">Phê duyệt</button>
            </div>
          </div>
        `;
      }).join('');
    }

    this.container.innerHTML = `
      <div class="home-manager-layout">
        <div style="margin-bottom: 16px;">
          <h2 style="font-family: var(--font-heading); font-size: 20px; font-weight: 800; color: var(--primary-dark);">Bảng Quản Trị Nhân Sự</h2>
        </div>

        <!-- Weekly shifts scheduler tabs and day ca làm list -->
        <div class="chart-section" style="margin-bottom: 20px;">
          <div class="chart-title" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span><i class="bi bi-calendar-check-fill"></i> Quản lý ca trực ngày</span>
            ${addShiftBtnHtml}
          </div>
          ${dayTabsHtml}
          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${shiftListHtml}
          </div>
        </div>

        <!-- Pending Approvals section -->
        <div class="chart-section" style="margin-bottom: 20px;">
          <div class="chart-title"><i class="bi bi-bell-fill" style="color: var(--warning);"></i> Phê duyệt đổi ca & xin nghỉ</div>
          <div style="display: flex; flex-direction: column;">
            ${pendingReqHtml}
          </div>
        </div>

        <!-- Two Column grid -->
        <div style="display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 80px;">
          <!-- Active Staffs list -->
          <div class="chart-section">
            <div class="chart-title" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <span><i class="bi bi-people-fill"></i> Nhân sự nội bộ</span>
              <button class="btn-primary" id="btn-open-add-staff" style="padding: 4px 10px; font-size: 10px; border-radius: 8px;">
                <i class="bi bi-person-plus-fill"></i> Thêm nhân viên
              </button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${staffHtml}
            </div>
          </div>

          <!-- Attendance Logs -->
          <div class="chart-section">
            <div class="chart-title"><i class="bi bi-clock-history"></i> Nhật ký vào ca gần đây</div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${attendanceHtml.length > 0 ? attendanceHtml : '<div style="font-size:12px; text-align:center; color:var(--text-light); padding:10px;">Chưa có nhật ký điểm danh.</div>'}
            </div>
          </div>
        </div>
      </div>

      <div id="home-modals-mount"></div>
    `;

    this.initManagerEvents();
  }

  initManagerEvents() {
    // Day tabs
    this.container.querySelectorAll('.day-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeSchedulerDay = Number(btn.getAttribute('data-day'));
        this.render();
      });
    });

    // Add shift
    const btnAddShift = this.container.querySelector('#btn-add-shift-slot');
    if (btnAddShift) {
      btnAddShift.addEventListener('click', () => {
        this.openAddShiftModal();
      });
    }

    // Click shift cards
    this.container.querySelectorAll('.scheduler-shift-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-shift-id');
        this.openShiftDetailsAndEditModal(id);
      });
    });

    // Add Staff Modal Trigger
    const btnAddStaff = this.container.querySelector('#btn-open-add-staff');
    if (btnAddStaff) {
      btnAddStaff.addEventListener('click', () => {
        this.openAddStaffModal();
      });
    }

    // Click Staff Rows to manage
    this.container.querySelectorAll('.staff-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-id');
        this.openStaffDetailsModal(id);
      });
    });

    // Approve shift requests
    this.container.querySelectorAll('.btn-approve-req').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const success = await this.controller.handleApproveShiftRequest(id);
        if (success) this.render();
      });
    });

    // Deny shift requests
    this.container.querySelectorAll('.btn-deny-req').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const success = await this.controller.handleRejectShiftRequest(id);
        if (success) this.render();
      });
    });
  }

  openAddShiftModal() {
    const mount = this.container.querySelector('#home-modals-mount');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '999';

    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 320px; align-self: center; border-radius: var(--radius-lg);">
        <div class="drawer-handle"></div>
        <div class="modal-header">
          <h3>Thêm ca trực mới</h3>
          <button class="btn-icon-small btn-close-modal">×</button>
        </div>

        <form id="add-shift-form" style="display: flex; flex-direction: column; gap: 12px;">
          <div class="form-group">
            <label for="add-shift-name">Tên ca trực</label>
            <input type="text" id="add-shift-name" class="input-field" required placeholder="Ví dụ: Ca sáng">
          </div>

          <div class="form-group">
            <label for="add-shift-time">Thời gian ca</label>
            <input type="text" id="add-shift-time" class="input-field" required placeholder="Ví dụ: 06:30 - 12:30">
          </div>

          <button type="submit" class="btn-primary" style="height: 40px; margin-top: 8px;">
            <i class="bi bi-check-lg"></i> Thêm ca trực
          </button>
        </form>
      </div>
    `;

    mount.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.btn-close-modal').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    overlay.querySelector('#add-shift-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = overlay.querySelector('#add-shift-name').value.trim();
      const time = overlay.querySelector('#add-shift-time').value.trim();

      close();
      this.controller.viewManager.showLoading('Đang tạo ca trực...');
      const success = await this.controller.db.createShift(this.activeSchedulerDay, name, time);
      this.controller.viewManager.hideLoading();
      if (success) {
        this.controller.viewManager.showToast('Đã tạo ca trực thành công!', 'success');
        this.render();
      }
    });
  }

  openShiftDetailsAndEditModal(shiftId) {
    const shift = this.controller.getShifts().find(s => s.id === shiftId);
    if (!shift) return;

    const isToday = Number(shift.dayOfWeek) === new Date().getDay();
    const mount = this.container.querySelector('#home-modals-mount');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '999';

    const todayStr = this.getTodayStr();
    const attendanceLogs = this.controller.getAttendanceHistory();
    const todayLog = attendanceLogs.find(a => a.employeeId === shift.employeeId && a.date === todayStr);

    let attStatusHtml = '';
    if (shift.employeeId) {
      if (todayLog) {
        const checkInPhotoHtml = todayLog.checkInPhoto 
          ? `<div style="text-align: center; margin-top: 4px;"><img src="${todayLog.checkInPhoto}" style="max-width: 140px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);"></div>` 
          : '<span style="color: var(--text-muted); font-style: italic;">Không có ảnh chụp</span>';

        const checkOutPhotoHtml = todayLog.checkOutPhoto 
          ? `<div style="text-align: center; margin-top: 4px;"><img src="${todayLog.checkOutPhoto}" style="max-width: 140px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);"></div>` 
          : '<span style="color: var(--text-muted); font-style: italic;">Chưa ra ca hoặc không có ảnh</span>';

        attStatusHtml = `
          <div style="background: var(--primary-soft); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: 11px; margin-bottom: 12px;">
            <strong style="color: var(--primary-dark);"><i class="bi bi-clock-history"></i> Trạng thái chấm công hôm nay:</strong>
            <div style="margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div>
                <strong>📥 Vào ca: ${todayLog.checkInTime}</strong>
                ${checkInPhotoHtml}
              </div>
              <div>
                <strong>📤 Ra ca: ${todayLog.checkOutTime || 'Đang trực'}</strong>
                ${checkOutPhotoHtml}
              </div>
            </div>
          </div>
        `;
      } else {
        attStatusHtml = `
          <div style="background: var(--bg-app); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: 11px; margin-bottom: 12px; color: var(--text-muted); text-align: center;">
            <i class="bi bi-exclamation-circle"></i> Chưa ghi nhận chấm công hôm nay cho nhân viên này.
          </div>
        `;
      }
    }

    const activeStaffList = this.controller.getUsers().filter(u => u.role === 'employee');
    const staffOptions = [
      `<option value="">-- Để trống ca trực --</option>`,
      ...activeStaffList.map(st => `<option value="${st.id}" ${st.id === shift.employeeId ? 'selected' : ''}>${st.name}</option>`)
    ].join('');

    const warningBanner = isToday 
      ? `<div class="badge badge-danger" style="width: 100%; text-align: center; padding: 8px; font-size: 11px; margin-bottom: 12px; border-radius: var(--radius-sm);">
          ⚠️ Không thể chỉnh sửa ca làm việc trong ngày hiện tại!
         </div>`
      : '';

    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 360px; align-self: center; border-radius: var(--radius-lg);">
        <div class="drawer-handle"></div>
        <div class="modal-header">
          <h3>Chi tiết ca trực</h3>
          <button class="btn-icon-small btn-close-modal">×</button>
        </div>

        ${warningBanner}
        ${attStatusHtml}

        <form id="edit-shift-form" style="display: flex; flex-direction: column; gap: 12px;">
          <div class="form-group">
            <label for="edit-shift-name">Tên ca trực</label>
            <input type="text" id="edit-shift-name" class="input-field" value="${shift.shiftName}" required ${isToday ? 'disabled' : ''}>
          </div>

          <div class="form-group">
            <label for="edit-shift-time">Thời gian ca</label>
            <input type="text" id="edit-shift-time" class="input-field" value="${shift.timeRange}" required placeholder="Ví dụ: 06:30 - 12:30" ${isToday ? 'disabled' : ''}>
          </div>

          <div class="form-group">
            <label for="edit-shift-assignee">Nhân sự phân công</label>
            <select id="edit-shift-assignee" class="select-field" ${isToday ? 'disabled' : ''}>
              ${staffOptions}
            </select>
          </div>

          ${!isToday ? `
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px; margin-top: 8px;">
              <button type="button" class="btn-danger" id="btn-delete-shift" style="height: 40px;"><i class="bi bi-trash"></i> Xóa</button>
              <button type="submit" class="btn-primary" style="height: 40px;"><i class="bi bi-check-lg"></i> Lưu thay đổi</button>
            </div>
          ` : ''}
        </form>
      </div>
    `;

    mount.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.btn-close-modal').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    if (!isToday) {
      overlay.querySelector('#btn-delete-shift').addEventListener('click', () => {
        this.controller.viewManager.showConfirm('Bạn có chắc chắn muốn xóa ca trực này khỏi danh sách?', async () => {
          close();
          this.controller.viewManager.showLoading('Đang xóa ca trực...');
          const success = await this.controller.db.deleteShift(shiftId);
          this.controller.viewManager.hideLoading();
          if (success) {
            this.controller.viewManager.showToast('Đã xóa ca trực thành công!', 'warning');
            this.render();
          }
        });
      });

      overlay.querySelector('#edit-shift-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = overlay.querySelector('#edit-shift-name').value.trim();
        const time = overlay.querySelector('#edit-shift-time').value.trim();
        const empId = overlay.querySelector('#edit-shift-assignee').value;

        close();
        this.controller.viewManager.showLoading('Đang cập nhật ca trực...');
        const success = await this.controller.db.updateShift(shiftId, empId, name, time);
        this.controller.viewManager.hideLoading();
        if (success) {
          this.controller.viewManager.showToast('Đã cập nhật ca trực thành công!', 'success');
          this.render();
        }
      });
    }
  }

  openAddStaffModal() {
    const mount = this.container.querySelector('#home-modals-mount');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '999';

    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 340px; align-self: center; border-radius: var(--radius-lg);">
        <div class="drawer-handle"></div>
        <div class="modal-header">
          <h3>Đăng ký tài khoản nhân viên</h3>
          <button class="btn-icon-small btn-close-modal">×</button>
        </div>

        <form id="add-staff-form" style="display: flex; flex-direction: column; gap: 12px;">
          <div class="form-group">
            <label for="staff-name">Tên nhân viên</label>
            <input type="text" id="staff-name" class="input-field" required placeholder="Ví dụ: Nguyễn Văn A">
          </div>

          <div class="form-group">
            <label for="staff-username">Tài khoản (Tên đăng nhập)</label>
            <input type="text" id="staff-username" class="input-field" required placeholder="Tên đăng nhập viết liền không dấu">
          </div>

          <div class="form-group">
            <label for="staff-password">Mật khẩu</label>
            <input type="password" id="staff-password" class="input-field" required placeholder="Nhập mật khẩu tài khoản">
          </div>

          <button type="submit" class="btn-primary" style="height: 40px; margin-top: 8px;">
            <i class="bi bi-person-plus-fill"></i> Tạo Tài Khoản Nhân Viên
          </button>
        </form>
      </div>
    `;

    mount.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.btn-close-modal').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    overlay.querySelector('#add-staff-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = overlay.querySelector('#staff-name').value.trim();
      const username = overlay.querySelector('#staff-username').value.trim();
      const password = overlay.querySelector('#staff-password').value;

      close();
      const success = await this.controller.handleAddEmployee(name, username, password);
      if (success) {
        this.render();
      }
    });
  }

  openStaffDetailsModal(staffId) {
    const staff = this.controller.getUsers().find(u => u.id === staffId);
    if (!staff) return;

    const mount = this.container.querySelector('#home-modals-mount');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '999';

    const attendanceLogs = this.controller.getAttendanceHistory();
    const salInfo = this.calculateEmployeeSalary(staff, attendanceLogs);
    const isLate = this.isSalaryLate(staff, attendanceLogs);

    const statusLabel = isLate 
      ? '<span class="badge badge-danger" style="animation: pulse 1.5s infinite;"><i class="bi bi-exclamation-circle-fill"></i> Sắp trễ lương / Trễ lương</span>'
      : '<span class="badge badge-success">Bình thường</span>';

    overlay.innerHTML = `
      <div class="modal-content" style="max-height: 90%; overflow-y: auto; max-width: 360px;">
        <div class="drawer-handle"></div>
        <div class="modal-header">
          <h3>Quản lý nhân sự: ${staff.name}</h3>
          <button class="btn-icon-small btn-close-modal">×</button>
        </div>

        <!-- Wage configuration -->
        <div style="background: var(--bg-app); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 16px;">
          <strong style="font-size: 13px; color: var(--primary-dark); display: block; margin-bottom: 8px;"><i class="bi bi-gear-fill"></i> Cấu hình tính lương</strong>
          <form id="wage-config-form" style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label for="cfg-wage">Lương giờ (đ):</label>
              <input type="number" id="cfg-wage" class="input-field" value="${staff.hourlyWage || 20000}" style="width: 140px; padding: 4px; height: 28px;">
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label for="cfg-cycle">Chu kỳ:</label>
              <select id="cfg-cycle" class="select-field" style="width: 140px; padding: 4px; height: 28px;">
                <option value="weekly" ${staff.salaryCycle === 'weekly' ? 'selected' : ''}>Mỗi tuần (7 ngày)</option>
                <option value="monthly" ${staff.salaryCycle === 'monthly' ? 'selected' : ''}>Mỗi tháng (30 ngày)</option>
              </select>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label for="cfg-start">Ngày tính lương:</label>
              <input type="date" id="cfg-start" class="input-field" value="${staff.salaryStartDate || '2026-06-01'}" style="width: 140px; padding: 4px; height: 28px;">
            </div>
            <button type="submit" class="btn-secondary" style="margin-top: 4px; padding: 4px 8px; font-size: 11px; align-self: flex-end;">
              <i class="bi bi-save"></i> Lưu cấu hình
            </button>
          </form>
        </div>

        <!-- Salary status -->
        <div style="font-size: 12px; line-height: 1.6; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: var(--text-muted);">Trạng thái thanh toán:</span>
            ${statusLabel}
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Lương cần trả (các tuần trước):</span>
            <strong style="color: var(--success);">${salInfo.payableAmount.toLocaleString('vi-VN')}đ</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Lương tạm giữ (tuần hiện tại):</span>
            <strong style="color: var(--warning);">${salInfo.withheldAmount.toLocaleString('vi-VN')}đ</strong>
          </div>
        </div>

        <!-- Payment sections -->
        <div style="border-top: 1px solid var(--border-color); padding-top: 12px; margin-bottom: 16px;">
          <strong style="font-size: 13px; color: var(--primary-dark); display: block; margin-bottom: 10px;"><i class="bi bi-wallet2"></i> Thực hiện thanh toán lương cần trả</strong>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button type="button" class="btn-secondary" id="btn-pay-cash" style="font-size: 11px; padding: 8px 4px; height: 38px;" ${salInfo.payableAmount <= 0 ? 'disabled' : ''}>
              💵 Trả Tiền Mặt
            </button>
            <button type="button" class="btn-primary" id="btn-pay-qr" style="font-size: 11px; padding: 8px 4px; height: 38px;" ${salInfo.payableAmount <= 0 ? 'disabled' : ''}>
              📲 Quét Mã QR
            </button>
          </div>
        </div>

        <!-- Delete Staff section -->
        <div style="border-top: 1px solid var(--border-color); padding-top: 12px; display: flex; justify-content: flex-end;">
          <button type="button" class="btn-danger" id="btn-delete-staff-confirm" style="font-size: 11px; padding: 6px 12px;">
            <i class="bi bi-person-x-fill"></i> Xóa nhân viên này
          </button>
        </div>
      </div>
    `;

    mount.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.btn-close-modal').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    // Save Wage Config
    overlay.querySelector('#wage-config-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const wage = Number(overlay.querySelector('#cfg-wage').value);
      const cycle = overlay.querySelector('#cfg-cycle').value;
      const start = overlay.querySelector('#cfg-start').value;

      this.controller.viewManager.showLoading('Đang lưu cấu hình lương...');
      const success = await this.controller.db.updateWageConfig(staffId, wage, cycle, start);
      this.controller.viewManager.hideLoading();
      if (success) {
        this.controller.viewManager.showToast('Đã lưu cấu hình lương thành công!', 'success');
        close();
        this.render();
      }
    });

    // Delete Staff
    overlay.querySelector('#btn-delete-staff-confirm').addEventListener('click', () => {
      this.controller.viewManager.showConfirm('Bạn có chắc chắn muốn xóa nhân sự này khỏi hệ thống? Các ca làm việc sẽ trống.', async () => {
        close();
        this.controller.viewManager.showLoading('Đang xóa nhân sự...');
        const success = await this.controller.db.deleteEmployee(staffId);
        this.controller.viewManager.hideLoading();
        if (success) {
          this.controller.viewManager.showToast('Đã xóa nhân sự khỏi hệ thống!', 'warning');
          this.render();
        }
      });
    });

    // Pay Cash
    overlay.querySelector('#btn-pay-cash').addEventListener('click', () => {
      this.controller.viewManager.showConfirm(`Xác nhận bạn đã thanh toán bằng tiền mặt số tiền ${salInfo.payableAmount.toLocaleString('vi-VN')}đ cho ${staff.name}?`, async () => {
        close();
        this.controller.viewManager.showLoading('Đang hoàn tất thanh toán...');
        const success = await this.controller.db.paySalary(staffId);
        this.controller.viewManager.hideLoading();
        if (success) {
          this.controller.viewManager.showToast('Đã xác nhận trả lương tiền mặt!', 'success');
          this.render();
        }
      });
    });

    // Pay QR
    overlay.querySelector('#btn-pay-qr').addEventListener('click', () => {
      this.openPayQrModal(staff, salInfo.payableAmount);
    });
  }

  openPayQrModal(staff, payableAmount) {
    const mount = this.container.querySelector('#home-modals-mount');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '1000';

    const hasQr = staff.qrCode ? true : false;

    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 320px; align-self: center; border-radius: var(--radius-lg); text-align: center; padding: 20px;">
        <div class="drawer-handle"></div>
        <div class="modal-header">
          <h3>Chuyển khoản QR</h3>
          <button class="btn-icon-small btn-close-modal">×</button>
        </div>

        <div style="font-size: 13px; font-weight: 700; color: var(--primary-dark); margin-bottom: 12px;">
          Thanh toán: <span style="color: var(--success);">${payableAmount.toLocaleString('vi-VN')}đ</span> cho ${staff.name}
        </div>

        <div id="payment-qr-display" style="width: 200px; height: 200px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; background: var(--bg-app); border: 1px dashed var(--border-color); border-radius: var(--radius-md); overflow: hidden;">
          ${hasQr ? `<img src="${staff.qrCode}" style="width: 100%; height: 100%; object-fit: contain;">` : `
            <div style="font-size: 11px; padding: 10px; color: var(--text-light);">
              <i class="bi bi-qr-code" style="font-size: 36px; display: block; margin-bottom: 6px;"></i>
              Nhân viên chưa tải lên QR nhận lương.
            </div>
          `}
        </div>

        <div style="margin-bottom: 16px;">
          <input type="file" id="manager-upload-staff-qr" accept="image/*" style="display: none;">
          <button type="button" class="btn-secondary" id="btn-manager-upload-qr" style="padding: 6px 12px; font-size: 11px;">
            <i class="bi bi-upload"></i> ${hasQr ? 'Thay đổi mã QR nhân viên' : 'Tải lên mã QR của nhân viên'}
          </button>
        </div>

        <div style="display: flex; gap: 8px; justify-content: center;">
          <button type="button" class="btn-secondary btn-close-modal" style="height: 38px; width: 80px;">Hủy</button>
          <button type="button" class="btn-primary" id="btn-pay-qr-confirm" style="height: 38px; flex: 1;" ${hasQr ? '' : 'disabled'}>
            <i class="bi bi-check-lg"></i> Xác nhận Đã chuyển khoản
          </button>
        </div>
      </div>
    `;

    mount.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelectorAll('.btn-close-modal').forEach(b => b.addEventListener('click', close));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    const fileInput = overlay.querySelector('#manager-upload-staff-qr');
    const uploadBtn = overlay.querySelector('#btn-manager-upload-qr');
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 300;
            let w = img.width;
            let h = img.height;
            if (w > h) {
              if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; }
            } else {
              if (h > MAX_SIZE) { w *= MAX_SIZE / h; w = MAX_SIZE; }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const base64 = canvas.toDataURL('image/jpeg', 0.75);

            this.controller.viewManager.showLoading('Đang lưu QR nhân viên...');
            const success = await this.controller.db.updateQrCode(staff.id, base64);
            this.controller.viewManager.hideLoading();
            if (success) {
              this.controller.viewManager.showToast('Đã lưu ảnh QR của nhân viên!', 'success');
              close();
              this.openPayQrModal(this.controller.getUsers().find(u => u.id === staff.id), payableAmount);
            }
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    overlay.querySelector('#btn-pay-qr-confirm').addEventListener('click', async () => {
      close();
      const staffModal = this.container.querySelector('.modal-overlay');
      if (staffModal) staffModal.remove();

      this.controller.viewManager.showLoading('Đang hoàn tất thanh toán chuyển khoản...');
      const success = await this.controller.db.paySalary(staff.id);
      this.controller.viewManager.hideLoading();
      if (success) {
        this.controller.viewManager.showToast('Đã xác nhận thanh toán chuyển khoản QR!', 'success');
        this.render();
      }
    });
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================
  calculateEmployeeSalary(employee, attendanceLogs) {
    const unpaidLogs = attendanceLogs.filter(a => a.employeeId === employee.id && a.paidStatus === 'unpaid' && a.checkOutTime);
    
    if (unpaidLogs.length === 0) {
      return {
        totalDays: 0,
        totalHours: 0,
        withheldAmount: 0,
        payableAmount: 0
      };
    }

    unpaidLogs.sort((a, b) => a.date.localeCompare(b.date));

    const startDate = new Date(employee.salaryStartDate || '2026-06-01');
    const hourlyWage = employee.hourlyWage || 20000;

    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;

    const logsWithWeekIndex = unpaidLogs.map(log => {
      const logDate = new Date(log.date);
      const diffMs = logDate.getTime() - startDate.getTime();
      const weekIndex = Math.floor(diffMs / weekMs);
      return { log, weekIndex };
    });

    let maxWeekIndex = -Infinity;
    logsWithWeekIndex.forEach(item => {
      if (item.weekIndex > maxWeekIndex) {
        maxWeekIndex = item.weekIndex;
      }
    });

    let withheldAmount = 0;
    let payableAmount = 0;
    let totalHours = 0;
    let totalDays = 0;

    logsWithWeekIndex.forEach(item => {
      const wage = item.log.durationHours * hourlyWage;
      totalHours += item.log.durationHours;
      totalDays += 1;

      if (item.weekIndex === maxWeekIndex) {
        withheldAmount += wage;
      } else {
        payableAmount += wage;
      }
    });

    return {
      totalDays,
      totalHours,
      withheldAmount,
      payableAmount
    };
  }

  isSalaryLate(employee, attendanceLogs) {
    const unpaidLogs = attendanceLogs.filter(a => a.employeeId === employee.id && a.paidStatus === 'unpaid' && a.checkOutTime);
    if (unpaidLogs.length === 0) return false;

    unpaidLogs.sort((a, b) => a.date.localeCompare(b.date));
    const oldestLogDate = new Date(unpaidLogs[0].date);
    
    const cycleDays = employee.salaryCycle === 'monthly' ? 30 : 7;
    const today = new Date();
    const diffDays = (today.getTime() - oldestLogDate.getTime()) / (24 * 60 * 60 * 1000);
    
    return diffDays >= cycleDays;
  }

  getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }
}
