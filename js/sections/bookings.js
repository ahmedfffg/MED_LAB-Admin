// js/sections/bookings.js
import {
  fetchBookings, fetchBookingStats, updateBookingStatus,
  updateBooking, deleteBooking,
  formatDate, formatMoney, translateStatus,
  translatePayment, translateSource, translateVisitType, translateGender
} from '../bookings.js';

export async function render(container) {
  container.innerHTML = `
    <div class="section-header">
      <h2>الحجوزات</h2>
      <button class="btn-refresh" id="refreshBookings">🔄 تحديث</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">الإجمالي</div><div class="stat-value" id="statTotal">—</div></div>
      <div class="stat-card"><div class="stat-label">النهاردة</div><div class="stat-value" id="statToday">—</div></div>
      <div class="stat-card"><div class="stat-label">قيد الانتظار</div><div class="stat-value" id="statPending">—</div></div>
      <div class="stat-card"><div class="stat-label">مكتملة</div><div class="stat-value" id="statCompleted">—</div></div>
    </div>

    <div class="filters-bar">
      <select id="filterStatus">
        <option value="all">كل الحالات</option>
        <option value="pending">قيد الانتظار</option>
        <option value="confirmed">مؤكد</option>
        <option value="in_progress">جاري</option>
        <option value="completed">مكتمل</option>
        <option value="cancelled">ملغي</option>
      </select>
      <input type="text" id="searchBookings" placeholder="ابحث باسم المريض / الهاتف / كود الحجز...">
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>كود الحجز</th>
            <th>المريض</th>
            <th>الهاتف</th>
            <th>الزيارة</th>
            <th>التحاليل</th>
            <th>الإجمالي</th>
            <th>المدفوع</th>
            <th>الحالة</th>
            <th>الدفع</th>
            <th>التاريخ</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody id="bookingsTableBody">
          <tr><td colspan="11" class="empty-row">جاري التحميل...</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Modal تفاصيل / تعديل الحجز -->
    <div class="modal-overlay" id="bookingModal" style="display:none;">
      <div class="modal-box" style="max-width:920px;">
        <div class="modal-header">
          <h3 id="bookingModalTitle">تفاصيل الحجز</h3>
          <button class="modal-close" id="closeBookingModal">✕</button>
        </div>

        <div class="tabs-bar">
          <button type="button" class="tab-btn active" data-tab="details">📋 التفاصيل</button>
          <button type="button" class="tab-btn" data-tab="tests">🧪 التحاليل</button>
          <button type="button" class="tab-btn" data-tab="location">📍 الموقع</button>
          <button type="button" class="tab-btn" data-tab="edit">✏️ تعديل</button>
        </div>

        <div class="tab-content active" id="tabDetails">
          <div class="modal-body" id="bookingDetailsBody">
            <p>جاري التحميل...</p>
          </div>
        </div>

        <div class="tab-content" id="tabTests">
          <div class="modal-body" id="bookingTestsBody">
            <p>جاري التحميل...</p>
          </div>
        </div>

        <div class="tab-content" id="tabLocation">
          <div class="modal-body" id="bookingLocationBody">
            <p>جاري التحميل...</p>
          </div>
        </div>

        <div class="tab-content" id="tabEdit">
          <form id="editBookingForm" class="modal-body">
            <input type="hidden" id="editBookingId">

            <h4 style="color:#0b8bb8;margin-bottom:0.8rem;">👤 بيانات المريض</h4>
            <div class="form-row">
              <div class="form-group">
                <label>اسم المريض *</label>
                <input type="text" id="editPatientName" required>
              </div>
              <div class="form-group">
                <label>الهاتف *</label>
                <input type="tel" id="editPatientPhone" required pattern="[0-9]+">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>السن</label>
                <input type="number" id="editPatientAge" min="0" max="120">
              </div>
              <div class="form-group">
                <label>الجنس</label>
                <select id="editPatientGender">
                  <option value="">—</option>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                  <option value="other">آخر</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>الإيميل</label>
                <input type="email" id="editPatientEmail">
              </div>
              <div class="form-group">
                <label>المصدر</label>
                <select id="editSource">
                  <option value="online">الموقع</option>
                  <option value="in_clinic">داخل المعمل</option>
                  <option value="phone">هاتف</option>
                  <option value="whatsapp">واتساب</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>الطبيب المحول</label>
                <input type="text" id="editReferringDoctor">
              </div>
              <div class="form-group">
                <label>عرفتنا منين</label>
                <input type="text" id="editReferralSource">
              </div>
            </div>

            <hr style="margin:1rem 0;border:none;border-top:1px dashed #dde9ef;">
            <h4 style="color:#0b8bb8;margin-bottom:0.8rem;">🏠 بيانات الزيارة</h4>

            <div class="form-row">
              <div class="form-group">
                <label>نوع الزيارة</label>
                <select id="editVisitType">
                  <option value="lab">في المعمل</option>
                  <option value="home">عينة منزلية</option>
                </select>
              </div>
              <div class="form-group">
                <label>رسوم العينة المنزلية</label>
                <input type="number" id="editHomeVisitFee" min="0" step="0.01">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>المحافظة</label>
                <input type="text" id="editHomeGovernorate">
              </div>
              <div class="form-group">
                <label>الحي / المركز</label>
                <input type="text" id="editHomeDistrict">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>المنطقة</label>
                <input type="text" id="editHomeArea">
              </div>
              <div class="form-group">
                <label>رقم العقار</label>
                <input type="text" id="editHomeBuildingNumber">
              </div>
            </div>

            <div class="form-group">
              <label>علامة مميزة</label>
              <input type="text" id="editHomeLandmark">
            </div>

            <div class="form-group">
              <label>رابط الموقع على الخريطة</label>
              <input type="url" id="editLocationUrl" placeholder="https://www.google.com/maps?q=...">
            </div>

            <hr style="margin:1rem 0;border:none;border-top:1px dashed #dde9ef;">
            <h4 style="color:#0b8bb8;margin-bottom:0.8rem;">💰 الحالة والدفع</h4>

            <div class="form-row">
              <div class="form-group">
                <label>الحالة</label>
                <select id="editStatus">
                  <option value="pending">قيد الانتظار</option>
                  <option value="confirmed">مؤكد</option>
                  <option value="in_progress">جاري</option>
                  <option value="completed">مكتمل</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>
              <div class="form-group">
                <label>طريقة الدفع</label>
                <select id="editPaymentMethod">
                  <option value="">— لم يتم —</option>
                  <option value="cash">نقدي</option>
                  <option value="card">بطاقة</option>
                  <option value="wallet">محفظة</option>
                  <option value="insurance">تأمين</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>الإجمالي (ج.م)</label>
                <input type="number" id="editTotal" min="0" step="0.01">
              </div>
              <div class="form-group">
                <label>المدفوع (ج.م)</label>
                <input type="number" id="editPaidAmount" min="0" step="0.01">
              </div>
            </div>

            <div class="form-group">
              <label>ملاحظات</label>
              <textarea id="editNotes" rows="3"></textarea>
            </div>

            <p id="editBookingError" class="error-msg"></p>
          </form>
        </div>

        <div class="modal-actions" style="justify-content: space-between;">
          <button type="button" class="btn-delete" id="deleteBookingBtn">🗑️ حذف الحجز</button>
          <div style="display:flex; gap:0.5rem;">
            <button type="button" class="btn-secondary" id="cancelBookingModal">إلغاء</button>
            <button type="button" class="btn-primary" id="saveBookingBtn" style="display:none;">حفظ التعديلات</button>
          </div>
        </div>
      </div>
    </div>
  `;

  loadStats();
  loadTable();

  document.getElementById('refreshBookings').addEventListener('click', () => {
    loadStats();
    loadTable();
  });

  document.getElementById('filterStatus').addEventListener('change', loadTable);

  let searchTimeout;
  document.getElementById('searchBookings').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadTable, 400);
  });

  document.getElementById('closeBookingModal').addEventListener('click', closeBookingModal);
  document.getElementById('cancelBookingModal').addEventListener('click', closeBookingModal);
  document.getElementById('bookingModal').addEventListener('click', (e) => {
    if (e.target.id === 'bookingModal') closeBookingModal();
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('editBookingForm').addEventListener('submit', handleSaveEdit);

  let currentBooking = null;

  async function loadStats() {
    try {
      const stats = await fetchBookingStats();
      document.getElementById('statTotal').textContent = stats.total;
      document.getElementById('statToday').textContent = stats.today;
      document.getElementById('statPending').textContent = stats.pending;
      document.getElementById('statCompleted').textContent = stats.completed;
    } catch (err) { console.error(err); }
  }

  async function loadTable() {
    const tbody = document.getElementById('bookingsTableBody');
    tbody.innerHTML = '<tr><td colspan="11" class="empty-row">جاري التحميل...</td></tr>';

    const filters = {
      status: document.getElementById('filterStatus').value,
      search: document.getElementById('searchBookings').value.trim()
    };

    try {
      const bookings = await fetchBookings(filters);

      if (bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="empty-row">مفيش حجوزات مطابقة</td></tr>';
        return;
      }

      tbody.innerHTML = bookings.map(b => {
        const testsCount = (b.booking_items || []).length;
        return `
        <tr>
          <td><code>${b.booking_code || '—'}</code></td>
          <td>${b.patient_name || '—'}</td>
          <td>${b.patient_phone || '—'}</td>
          <td><span class="badge badge-${b.visit_type === 'home' ? 'warning' : 'info'}">${translateVisitType(b.visit_type)}</span></td>
          <td><span class="badge badge-read">${testsCount}</span></td>
          <td>${formatMoney(b.total)}</td>
          <td>${formatMoney(b.paid_amount)}</td>
          <td>
            <select class="status-select status-${b.status}" data-id="${b.id}">
              <option value="pending" ${b.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
              <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>مؤكد</option>
              <option value="in_progress" ${b.status === 'in_progress' ? 'selected' : ''}>جاري</option>
              <option value="completed" ${b.status === 'completed' ? 'selected' : ''}>مكتمل</option>
              <option value="cancelled" ${b.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
            </select>
          </td>
          <td><span class="badge badge-${b.payment_status}">${translatePayment(b.payment_status)}</span></td>
          <td class="date-cell">${formatDate(b.created_at)}</td>
          <td>
            <button class="btn-view" data-action="view" data-id="${b.id}">عرض</button>
            <button class="btn-view" data-action="edit" data-id="${b.id}" style="background:#0b8bb8;">تعديل</button>
            <button class="btn-delete" data-action="delete" data-id="${b.id}">حذف</button>
          </td>
        </tr>`;
      }).join('');

      tbody.querySelectorAll('.status-select').forEach(sel => {
        sel.addEventListener('change', async (e) => {
          const id = e.target.dataset.id;
          const newStatus = e.target.value;
          try {
            await updateBookingStatus(id, newStatus);
            e.target.className = `status-select status-${newStatus}`;
            loadStats();
          } catch (err) {
            alert('فشل تحديث الحالة: ' + err.message);
            loadTable();
          }
        });
      });

      tbody.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const action = btn.dataset.action;
          const booking = bookings.find(b => b.id == id);

          if (action === 'view') openBookingModal(booking, 'details');
          else if (action === 'edit') openBookingModal(booking, 'edit');
          else if (action === 'delete') confirmDelete(booking);
        });
      });

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="11" class="empty-row error">فشل التحميل: ${err.message}</td></tr>`;
    }
  }

  function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const map = { details: 'tabDetails', tests: 'tabTests', location: 'tabLocation', edit: 'tabEdit' };
    const tabEl = document.getElementById(map[tabName]);
    if (tabEl) tabEl.classList.add('active');

    document.getElementById('saveBookingBtn').style.display = tabName === 'edit' ? 'inline-block' : 'none';
  }

  async function openBookingModal(booking, defaultTab = 'details') {
    currentBooking = booking;

    document.getElementById('bookingModalTitle').textContent = `حجز: ${booking.patient_name}`;

    // ============ تاب التفاصيل ============
    const fullAddress = booking.home_full_address || [
      booking.home_governorate,
      booking.home_district,
      booking.home_area,
      booking.home_building_number ? 'رقم العقار: ' + booking.home_building_number : '',
      booking.home_landmark ? 'علامة مميزة: ' + booking.home_landmark : ''
    ].filter(Boolean).join(' - ');

    document.getElementById('bookingDetailsBody').innerHTML = `
      <div class="msg-detail">
        <h4 style="color:#0b8bb8;margin-bottom:0.5rem;">👤 بيانات المريض</h4>
        <p><strong>الاسم:</strong> ${booking.patient_name || '—'}</p>
        <p><strong>الهاتف:</strong> ${booking.patient_phone || '—'}</p>
        <p><strong>الإيميل:</strong> ${booking.patient_email || '—'}</p>
        <p><strong>السن:</strong> ${booking.patient_age != null ? booking.patient_age + ' سنة' : '—'}</p>
        <p><strong>الجنس:</strong> ${translateGender(booking.patient_gender)}</p>

        <hr style="margin:0.8rem 0;">
        <h4 style="color:#0b8bb8;margin-bottom:0.5rem;">🩺 بيانات التحويل</h4>
        <p><strong>الطبيب المحول:</strong> ${booking.referring_doctor || '—'}</p>
        <p><strong>عرفتنا منين:</strong> ${booking.referral_source || '—'}</p>

        <hr style="margin:0.8rem 0;">
        <h4 style="color:#0b8bb8;margin-bottom:0.5rem;">🏠 بيانات الزيارة</h4>
        <p><strong>نوع الزيارة:</strong> ${translateVisitType(booking.visit_type)}</p>
        ${booking.visit_type === 'home' ? `
          <p><strong>المحافظة:</strong> ${booking.home_governorate || '—'}</p>
          <p><strong>الحي / المركز:</strong> ${booking.home_district || '—'}</p>
          <p><strong>المنطقة:</strong> ${booking.home_area || '—'}</p>
          <p><strong>رقم العقار:</strong> ${booking.home_building_number || '—'}</p>
          <p><strong>علامة مميزة:</strong> ${booking.home_landmark || '—'}</p>
          <p><strong>العنوان الكامل:</strong> ${fullAddress || '—'}</p>
          <p><strong>رسوم العينة:</strong> ${formatMoney(booking.home_visit_fee || 0)}</p>
          ${booking.location_url ? `<p><strong>رابط الموقع:</strong> <a href="${booking.location_url}" target="_blank" rel="noopener" style="color:#0b8bb8;">فتح على Google Maps</a></p>` : ''}
        ` : ''}
        <p><strong>الموعد المجدول:</strong> ${booking.scheduled_at ? formatDate(booking.scheduled_at) : '—'}</p>

        <hr style="margin:0.8rem 0;">
        <h4 style="color:#0b8bb8;margin-bottom:0.5rem;">💰 الحالة والمالية</h4>
        <p><strong>حالة الحجز:</strong> ${translateStatus(booking.status)}</p>
        <p><strong>حالة الدفع:</strong> ${translatePayment(booking.payment_status)}</p>
        <p><strong>طريقة الدفع:</strong> ${booking.payment_method || '—'}</p>
        <p><strong>المصدر:</strong> ${translateSource(booking.source)}</p>
        <p><strong>الإجمالي:</strong> ${formatMoney(booking.total)}</p>
        <p><strong>المدفوع:</strong> ${formatMoney(booking.paid_amount)}</p>
        <p><strong>الباقي:</strong> ${formatMoney(booking.remaining_amount)}</p>

        <hr style="margin:0.8rem 0;">
        <p><strong>تاريخ الحجز:</strong> ${formatDate(booking.created_at)}</p>
        <p><strong>ملاحظات:</strong> ${booking.notes || '—'}</p>
      </div>
    `;

    // ============ تاب التحاليل ============
    const items = booking.booking_items || [];
    if (items.length === 0) {
      document.getElementById('bookingTestsBody').innerHTML = '<p class="empty-row">لا توجد تحاليل مسجلة لهذا الحجز</p>';
    } else {
      let itemsTotal = 0;
      const rows = items.map((it, idx) => {
        itemsTotal += Number(it.line_total) || 0;
        const typeLabel = it.item_type === 'package' ? '📦 باقة' : '🧪 تحليل';
        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${typeLabel}</td>
            <td>${it.item_name || '—'}</td>
            <td>${formatMoney(it.unit_price)}</td>
            <td>${it.quantity}</td>
            <td>${formatMoney(it.line_total)}</td>
          </tr>
        `;
      }).join('');

      document.getElementById('bookingTestsBody').innerHTML = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>النوع</th>
                <th>الاسم</th>
                <th>سعر الوحدة</th>
                <th>الكمية</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div style="margin-top:1rem;padding:0.8rem 1rem;background:#f0f9ff;border-radius:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
          <strong>إجمالي البنود:</strong>
          <strong style="color:#0b8bb8;font-size:1.1rem;">${formatMoney(itemsTotal)}</strong>
        </div>
      `;
    }

    // ============ تاب الموقع ============
    if (booking.visit_type === 'home') {
      const hasCoords = booking.location_lat && booking.location_lng;
      const mapLink = booking.location_url;

      document.getElementById('bookingLocationBody').innerHTML = `
        <div style="margin-bottom:1rem;">
          <p><strong>نوع الزيارة:</strong> عينة منزلية</p>
          <p><strong>العنوان الكامل:</strong> ${fullAddress || '—'}</p>
          ${mapLink ? `<p><strong>رابط Google Maps:</strong> <a href="${mapLink}" target="_blank" rel="noopener" style="color:#0b8bb8;font-weight:700;">اضغط للفتح</a></p>` : '<p style="color:#e05260;">لم يتم تسجيل رابط الموقع</p>'}
          ${hasCoords ? `<p><strong>الإحداثيات:</strong> <span style="direction:ltr;display:inline-block;font-family:monospace;">${booking.location_lat} , ${booking.location_lng}</span></p>` : ''}
        </div>
        ${hasCoords ? `
          <div id="admin-map" style="height:400px;border-radius:12px;overflow:hidden;"></div>
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
        ` : '<p class="empty-row">لا توجد إحداثيات مسجلة</p>'}
      `;

      if (hasCoords && typeof L !== 'undefined') {
        setTimeout(() => {
          const el = document.getElementById('admin-map');
          if (!el || el._leaflet_id) return;
          const map = L.map(el).setView([booking.location_lat, booking.location_lng], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
          }).addTo(map);
          L.marker([booking.location_lat, booking.location_lng]).addTo(map)
            .bindPopup('<b>' + (booking.patient_name || '') + '</b><br>' + (fullAddress || ''))
            .openPopup();
        }, 250);
      }
    } else {
      document.getElementById('bookingLocationBody').innerHTML = `
        <div class="info-box" style="text-align:center;padding:2rem;">
          <div style="font-size:3rem;margin-bottom:1rem;">🏥</div>
          <h3>عينة في المعمل</h3>
          <p style="color:#718b9b;">هذا الحجز عينة في المعمل، ولا يوجد عنوان منزلي.</p>
        </div>
      `;
    }

    // ============ تاب التعديل ============
    document.getElementById('editBookingId').value = booking.id;
    document.getElementById('editPatientName').value = booking.patient_name || '';
    document.getElementById('editPatientPhone').value = booking.patient_phone || '';
    document.getElementById('editPatientEmail').value = booking.patient_email || '';
    document.getElementById('editPatientAge').value = booking.patient_age != null ? booking.patient_age : '';
    document.getElementById('editPatientGender').value = booking.patient_gender || '';
    document.getElementById('editSource').value = booking.source || 'online';
    document.getElementById('editReferringDoctor').value = booking.referring_doctor || '';
    document.getElementById('editReferralSource').value = booking.referral_source || '';
    document.getElementById('editVisitType').value = booking.visit_type || 'lab';
    document.getElementById('editHomeVisitFee').value = booking.home_visit_fee || 0;
    document.getElementById('editHomeGovernorate').value = booking.home_governorate || '';
    document.getElementById('editHomeDistrict').value = booking.home_district || '';
    document.getElementById('editHomeArea').value = booking.home_area || '';
    document.getElementById('editHomeBuildingNumber').value = booking.home_building_number || '';
    document.getElementById('editHomeLandmark').value = booking.home_landmark || '';
    document.getElementById('editLocationUrl').value = booking.location_url || '';
    document.getElementById('editStatus').value = booking.status || 'pending';
    document.getElementById('editPaymentMethod').value = booking.payment_method || '';
    document.getElementById('editTotal').value = booking.total || 0;
    document.getElementById('editPaidAmount').value = booking.paid_amount || 0;
    document.getElementById('editNotes').value = booking.notes || '';
    document.getElementById('editBookingError').textContent = '';

    switchTab(defaultTab);
    document.getElementById('bookingModal').style.display = 'flex';
  }

  function closeBookingModal() {
    document.getElementById('bookingModal').style.display = 'none';
    currentBooking = null;
  }

  async function handleSaveEdit(e) {
    e.preventDefault();

    const btn = document.getElementById('saveBookingBtn');
    const errEl = document.getElementById('editBookingError');
    const id = document.getElementById('editBookingId').value;

    const updates = {
      patient_name: document.getElementById('editPatientName').value.trim(),
      patient_phone: document.getElementById('editPatientPhone').value.trim(),
      patient_email: document.getElementById('editPatientEmail').value.trim() || null,
      patient_age: document.getElementById('editPatientAge').value ? Number(document.getElementById('editPatientAge').value) : null,
      patient_gender: document.getElementById('editPatientGender').value || null,
      source: document.getElementById('editSource').value,
      referring_doctor: document.getElementById('editReferringDoctor').value.trim() || null,
      referral_source: document.getElementById('editReferralSource').value.trim() || null,
      visit_type: document.getElementById('editVisitType').value,
      home_visit_fee: Number(document.getElementById('editHomeVisitFee').value) || 0,
      home_governorate: document.getElementById('editHomeGovernorate').value.trim() || null,
      home_district: document.getElementById('editHomeDistrict').value.trim() || null,
      home_area: document.getElementById('editHomeArea').value.trim() || null,
      home_building_number: document.getElementById('editHomeBuildingNumber').value.trim() || null,
      home_landmark: document.getElementById('editHomeLandmark').value.trim() || null,
      location_url: document.getElementById('editLocationUrl').value.trim() || null,
      status: document.getElementById('editStatus').value,
      payment_method: document.getElementById('editPaymentMethod').value || null,
      total: Number(document.getElementById('editTotal').value) || 0,
      paid_amount: Number(document.getElementById('editPaidAmount').value) || 0,
      notes: document.getElementById('editNotes').value.trim() || null
    };

    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    errEl.textContent = '';

    try {
      await updateBooking(id, updates);
      closeBookingModal();
      loadStats();
      loadTable();
    } catch (err) {
      errEl.textContent = 'فشل الحفظ: ' + err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'حفظ التعديلات';
    }
  }

  async function confirmDelete(booking) {
    const confirmed = confirm(
      `متأكد إنك عايز تحذف حجز "${booking.patient_name}"؟\n\n` +
      `كود الحجز: ${booking.booking_code}\n` +
      `الإجمالي: ${formatMoney(booking.total)}\n\n` +
      `⚠️ العملية دي مش ممكن التراجع عنها.`
    );

    if (!confirmed) return;

    try {
      await deleteBooking(booking.id);
      loadStats();
      loadTable();
    } catch (err) {
      alert('فشل الحذف: ' + err.message);
    }
  }

  document.getElementById('deleteBookingBtn').addEventListener('click', () => {
    if (currentBooking) confirmDelete(currentBooking);
  });
}
