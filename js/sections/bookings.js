// js/sections/bookings.js
import {
  fetchBookings, fetchBookingStats, updateBookingStatus,
  updateBooking, deleteBooking,
  formatDate, formatMoney, translateStatus,
  translatePayment, translateSource
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
            <th>المصدر</th>
            <th>الإجمالي</th>
            <th>المدفوع</th>
            <th>الحالة</th>
            <th>الدفع</th>
            <th>التاريخ</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody id="bookingsTableBody">
          <tr><td colspan="10" class="empty-row">جاري التحميل...</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Modal تفاصيل / تعديل الحجز -->
    <div class="modal-overlay" id="bookingModal" style="display:none;">
      <div class="modal-box" style="max-width:760px;">
        <div class="modal-header">
          <h3 id="bookingModalTitle">تفاصيل الحجز</h3>
          <button class="modal-close" id="closeBookingModal">✕</button>
        </div>

        <div class="tabs-bar">
          <button type="button" class="tab-btn active" data-tab="details">📋 التفاصيل</button>
          <button type="button" class="tab-btn" data-tab="edit">✏️ تعديل</button>
        </div>

        <div class="tab-content active" id="tabDetails">
          <div class="modal-body" id="bookingDetailsBody">
            <p>جاري التحميل...</p>
          </div>
        </div>

        <div class="tab-content" id="tabEdit">
          <form id="editBookingForm" class="modal-body">
            <input type="hidden" id="editBookingId">

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
    tbody.innerHTML = '<tr><td colspan="10" class="empty-row">جاري التحميل...</td></tr>';

    const filters = {
      status: document.getElementById('filterStatus').value,
      search: document.getElementById('searchBookings').value.trim()
    };

    try {
      const bookings = await fetchBookings(filters);

      if (bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-row">مفيش حجوزات مطابقة</td></tr>';
        return;
      }

      tbody.innerHTML = bookings.map(b => `
        <tr>
          <td><code>${b.booking_code || '—'}</code></td>
          <td>${b.patient_name || '—'}</td>
          <td>${b.patient_phone || '—'}</td>
          <td>${translateSource(b.source)}</td>
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
        </tr>
      `).join('');

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

          if (action === 'view') {
            openBookingModal(booking, 'details');
          } else if (action === 'edit') {
            openBookingModal(booking, 'edit');
          } else if (action === 'delete') {
            confirmDelete(booking);
          }
        });
      });

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="10" class="empty-row error">فشل التحميل: ${err.message}</td></tr>`;
    }
  }

  function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabName === 'details' ? 'tabDetails' : 'tabEdit').classList.add('active');

    document.getElementById('saveBookingBtn').style.display =
      tabName === 'edit' ? 'inline-block' : 'none';
  }

  async function openBookingModal(booking, defaultTab = 'details') {
    currentBooking = booking;

    document.getElementById('bookingModalTitle').textContent =
      `حجز: ${booking.patient_name}`;

    document.getElementById('bookingDetailsBody').innerHTML = `
      <div class="msg-detail">
        <p><strong>كود الحجز:</strong> <code>${booking.booking_code || '—'}</code></p>
        <p><strong>المريض:</strong> ${booking.patient_name || '—'}</p>
        <p><strong>الهاتف:</strong> ${booking.patient_phone || '—'}</p>
        <p><strong>الإيميل:</strong> ${booking.patient_email || '—'}</p>
        <p><strong>المصدر:</strong> ${translateSource(booking.source)}</p>
        <p><strong>الحالة:</strong> ${translateStatus(booking.status)}</p>
        <p><strong>حالة الدفع:</strong> ${translatePayment(booking.payment_status)}</p>
        <hr>
        <p><strong>الإجمالي:</strong> ${formatMoney(booking.total)}</p>
        <p><strong>المدفوع:</strong> ${formatMoney(booking.paid_amount)}</p>
        <p><strong>الباقي:</strong> ${formatMoney(booking.remaining_amount)}</p>
        <hr>
        <p><strong>تاريخ الحجز:</strong> ${formatDate(booking.created_at)}</p>
        <p><strong>ملاحظات:</strong> ${booking.notes || '—'}</p>
      </div>
    `;

    document.getElementById('editBookingId').value = booking.id;
    document.getElementById('editPatientName').value = booking.patient_name || '';
    document.getElementById('editPatientPhone').value = booking.patient_phone || '';
    document.getElementById('editPatientEmail').value = booking.patient_email || '';
    document.getElementById('editSource').value = booking.source || 'online';
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
      source: document.getElementById('editSource').value,
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