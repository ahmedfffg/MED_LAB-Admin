// js/sections/patients.js
import {
  fetchPatients, fetchPatientStats, createPatient,
  updatePatient,
  fetchPatientBookings, fetchPatientResults,
  fetchPatientDetailedStats, deletePatientCompletely,
  translateGender, translateVisitType, translateBookingStatus,
  translatePayment, formatDateShort, formatDateTime, formatMoney
} from '../patients.js';

export async function render(container) {
  container.innerHTML = `
    <div class="section-header">
      <h2>المرضى</h2>
      <div style="display:flex; gap:0.5rem;">
        <button class="btn-refresh" id="refreshPatients">🔄 تحديث</button>
        <button class="btn-primary" id="addPatientBtn">+ إضافة مريض</button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">إجمالي المرضى</div><div class="stat-value" id="pStatTotal">—</div></div>
      <div class="stat-card"><div class="stat-label">مسجلين النهاردة</div><div class="stat-value" id="pStatToday">—</div></div>
      <div class="stat-card"><div class="stat-label">ذكور</div><div class="stat-value" id="pStatMale">—</div></div>
      <div class="stat-card"><div class="stat-label">إناث</div><div class="stat-value" id="pStatFemale">—</div></div>
    </div>

    <div class="filters-bar">
      <input type="text" id="searchPatients" placeholder="ابحث بالاسم / الهاتف / الكود / الإيميل / الرقم القومي...">
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>الكود</th>
            <th>الاسم</th>
            <th>الهاتف</th>
            <th>النوع</th>
            <th>السن</th>
            <th>الإيميل</th>
            <th>تاريخ التسجيل</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody id="patientsTableBody">
          <tr><td colspan="8" class="empty-row">جاري التحميل...</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Modal إضافة/تعديل مريض -->
    <div class="modal-overlay" id="patientModal" style="display:none;">
      <div class="modal-box">
        <div class="modal-header">
          <h3 id="modalTitle">إضافة مريض جديد</h3>
          <button class="modal-close" id="closeModal">✕</button>
        </div>
        <form id="patientForm" class="modal-body">
          <input type="hidden" id="patientId">

          <div class="form-row">
            <div class="form-group">
              <label>الاسم الكامل *</label>
              <input type="text" id="pFullName" required>
            </div>
            <div class="form-group">
              <label>الهاتف *</label>
              <input type="tel" id="pPhone" required pattern="[0-9]+">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>الإيميل</label>
              <input type="email" id="pEmail">
            </div>
            <div class="form-group">
              <label>الرقم القومي</label>
              <input type="text" id="pNationalId">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>النوع</label>
              <select id="pGender">
                <option value="">— اختر —</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
                <option value="other">آخر</option>
              </select>
            </div>
            <div class="form-group">
              <label>السن</label>
              <input type="number" id="pAge" min="0" max="120">
            </div>
            <div class="form-group">
              <label>تاريخ الميلاد</label>
              <input type="date" id="pBirthDate">
            </div>
          </div>

          <div class="form-group">
            <label>العنوان</label>
            <input type="text" id="pAddress">
          </div>

          <div class="form-group">
            <label>عرفتنا منين</label>
            <input type="text" id="pReferralSource" placeholder="مثال: الطبيب الخاص بي">
          </div>

          <div class="form-group">
            <label>ملاحظات</label>
            <textarea id="pNotes" rows="3"></textarea>
          </div>

          <p id="patientFormError" class="error-msg"></p>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="cancelModal">إلغاء</button>
            <button type="submit" class="btn-primary" id="savePatientBtn">حفظ</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal تفاصيل المريض -->
    <div class="modal-overlay" id="patientDetailsModal" style="display:none;">
      <div class="modal-box" style="max-width:980px;">
        <div class="modal-header">
          <h3 id="detailsModalTitle">تفاصيل المريض</h3>
          <button class="modal-close" id="closeDetailsModal">✕</button>
        </div>

        <div class="tabs-bar">
          <button type="button" class="tab-btn active" data-tab="info">📋 البيانات</button>
          <button type="button" class="tab-btn" data-tab="bookings">📅 الحجوزات <span class="tab-count" id="bookingsTabCount">(0)</span></button>
          <button type="button" class="tab-btn" data-tab="results">📄 النتائج <span class="tab-count" id="resultsTabCount">(0)</span></button>
        </div>

        <div class="tab-content active" id="tabInfo">
          <div class="modal-body" id="patientInfoBody">
            <p>جاري التحميل...</p>
          </div>
        </div>

        <div class="tab-content" id="tabBookings">
          <div class="modal-body" id="patientBookingsBody">
            <p>جاري التحميل...</p>
          </div>
        </div>

        <div class="tab-content" id="tabResults">
          <div class="modal-body" id="patientResultsBody">
            <p>جاري التحميل...</p>
          </div>
        </div>

        <div class="modal-actions" style="justify-content: space-between;">
          <button type="button" class="btn-delete" id="deletePatientFromDetailsBtn">🗑️ حذف المريض</button>
          <div style="display:flex; gap:0.5rem;">
            <button type="button" class="btn-secondary" id="cancelDetailsModal">إغلاق</button>
            <button type="button" class="btn-primary" id="editPatientFromDetailsBtn">✏️ تعديل</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal تفاصيل حجز (داخل صفحة المريض) -->
    <div class="modal-overlay" id="patientBookingDetailModal" style="display:none;">
      <div class="modal-box" style="max-width:900px;">
        <div class="modal-header">
          <h3 id="patientBookingDetailTitle">تفاصيل الحجز</h3>
          <button class="modal-close" id="closePatientBookingDetailModal">✕</button>
        </div>
        <div class="modal-body" id="patientBookingDetailBody">
          <p>جاري التحميل...</p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="closePatientBookingDetailBtn">إغلاق</button>
        </div>
      </div>
    </div>
  `;

  let currentPatient = null;
  let currentDetailedPatient = null;
  let currentPatientBookings = [];

  loadStats();
  loadTable();

  // ============================================
  // الأحداث الأساسية
  // ============================================
  document.getElementById('refreshPatients').addEventListener('click', () => {
    loadStats();
    loadTable();
  });

  document.getElementById('addPatientBtn').addEventListener('click', () => openModal());
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('cancelModal').addEventListener('click', closeModal);
  document.getElementById('patientModal').addEventListener('click', (e) => {
    if (e.target.id === 'patientModal') closeModal();
  });

  document.getElementById('closeDetailsModal').addEventListener('click', closeDetailsModal);
  document.getElementById('cancelDetailsModal').addEventListener('click', closeDetailsModal);
  document.getElementById('patientDetailsModal').addEventListener('click', (e) => {
    if (e.target.id === 'patientDetailsModal') closeDetailsModal();
  });

  document.getElementById('closePatientBookingDetailModal').addEventListener('click', closePatientBookingDetail);
  document.getElementById('closePatientBookingDetailBtn').addEventListener('click', closePatientBookingDetail);
  document.getElementById('patientBookingDetailModal').addEventListener('click', (e) => {
    if (e.target.id === 'patientBookingDetailModal') closePatientBookingDetail();
  });

  let searchTimeout;
  document.getElementById('searchPatients').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadTable, 400);
  });

  document.getElementById('patientForm').addEventListener('submit', handleSave);

  // تبويبات تفاصيل المريض
  document.querySelectorAll('#patientDetailsModal .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchPatientTab(btn.dataset.tab));
  });

  // أزرار التفاصيل
  document.getElementById('deletePatientFromDetailsBtn').addEventListener('click', () => {
    if (currentDetailedPatient) confirmDelete(currentDetailedPatient);
  });

  document.getElementById('editPatientFromDetailsBtn').addEventListener('click', () => {
    if (currentDetailedPatient) {
      closeDetailsModal();
      openModal(currentDetailedPatient);
    }
  });

  // ============================================
  // الدوال
  // ============================================
  async function loadStats() {
    try {
      const s = await fetchPatientStats();
      document.getElementById('pStatTotal').textContent = s.total;
      document.getElementById('pStatToday').textContent = s.today;
      document.getElementById('pStatMale').textContent = s.male;
      document.getElementById('pStatFemale').textContent = s.female;
    } catch (err) { console.error(err); }
  }

  async function loadTable() {
    const tbody = document.getElementById('patientsTableBody');
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row">جاري التحميل...</td></tr>';

    try {
      const patients = await fetchPatients({
        search: document.getElementById('searchPatients').value.trim()
      });

      if (patients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-row">مفيش مرضى مطابقين</td></tr>';
        return;
      }

      tbody.innerHTML = patients.map(p => `
        <tr>
          <td><code>${p.patient_code || '—'}</code></td>
          <td>${p.full_name || '—'}</td>
          <td>${p.phone || '—'}</td>
          <td>${translateGender(p.gender)}</td>
          <td>${p.age || '—'}</td>
          <td>${p.email || '—'}</td>
          <td class="date-cell">${formatDateShort(p.created_at)}</td>
          <td>
            <button class="btn-view" data-action="view" data-id="${p.id}">عرض</button>
            <button class="btn-view" data-action="edit" data-id="${p.id}" style="background:#0b8bb8;">تعديل</button>
            <button class="btn-delete" data-action="delete" data-id="${p.id}">حذف</button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const action = btn.dataset.action;
          const patient = patients.find(p => p.id == id);

          if (action === 'view') await openPatientDetails(patient);
          else if (action === 'edit') openModal(patient);
          else if (action === 'delete') confirmDelete(patient);
        });
      });

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-row error">فشل التحميل: ${err.message}</td></tr>`;
    }
  }

  // ============================================
  // Modal إضافة/تعديل
  // ============================================
  function openModal(patient = null) {
    const modal = document.getElementById('patientModal');
    const title = document.getElementById('modalTitle');

    if (patient) {
      title.textContent = 'تعديل بيانات المريض';
      document.getElementById('patientId').value = patient.id;
      document.getElementById('pFullName').value = patient.full_name || '';
      document.getElementById('pPhone').value = patient.phone || '';
      document.getElementById('pEmail').value = patient.email || '';
      document.getElementById('pNationalId').value = patient.national_id || '';
      document.getElementById('pGender').value = patient.gender || '';
      document.getElementById('pAge').value = patient.age || '';
      document.getElementById('pBirthDate').value = patient.birth_date || '';
      document.getElementById('pAddress').value = patient.address || '';
      document.getElementById('pReferralSource').value = patient.referral_source || '';
      document.getElementById('pNotes').value = patient.notes || '';
    } else {
      title.textContent = 'إضافة مريض جديد';
      document.getElementById('patientForm').reset();
      document.getElementById('patientId').value = '';
    }

    document.getElementById('patientFormError').textContent = '';
    modal.style.display = 'flex';
  }

  function closeModal() {
    document.getElementById('patientModal').style.display = 'none';
  }

  async function handleSave(e) {
    e.preventDefault();
    const id = document.getElementById('patientId').value;
    const errEl = document.getElementById('patientFormError');
    const btn = document.getElementById('savePatientBtn');

    const data = {
      full_name: document.getElementById('pFullName').value.trim(),
      phone: document.getElementById('pPhone').value.trim(),
      email: document.getElementById('pEmail').value.trim() || null,
      national_id: document.getElementById('pNationalId').value.trim() || null,
      gender: document.getElementById('pGender').value || null,
      age: document.getElementById('pAge').value ? Number(document.getElementById('pAge').value) : null,
      birth_date: document.getElementById('pBirthDate').value || null,
      address: document.getElementById('pAddress').value.trim() || null,
      referral_source: document.getElementById('pReferralSource').value.trim() || null,
      notes: document.getElementById('pNotes').value.trim() || null
    };

    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    errEl.textContent = '';

    try {
      if (id) await updatePatient(id, data);
      else await createPatient(data);
      closeModal();
      loadStats();
      loadTable();
    } catch (err) {
      errEl.textContent = 'فشل الحفظ: ' + err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'حفظ';
    }
  }

  // ============================================
  // Modal تفاصيل المريض
  // ============================================
  async function openPatientDetails(patient) {
    currentDetailedPatient = patient;
    currentPatientBookings = [];

    document.getElementById('detailsModalTitle').textContent = `تفاصيل: ${patient.full_name}`;

    switchPatientTab('info');

    // بيانات المريض الأساسية
    const genderText = translateGender(patient.gender);
    const birthText = patient.birth_date ? formatDateShort(patient.birth_date) : '—';

    document.getElementById('patientInfoBody').innerHTML = `
      <div class="msg-detail">
        <h4 style="color:#0b8bb8;margin-bottom:0.5rem;">👤 البيانات الأساسية</h4>
        <p><strong>كود المريض:</strong> <code>${patient.patient_code || '—'}</code></p>
        <p><strong>الاسم:</strong> ${patient.full_name || '—'}</p>
        <p><strong>الهاتف:</strong> ${patient.phone || '—'}</p>
        <p><strong>الإيميل:</strong> ${patient.email || '—'}</p>
        <p><strong>الرقم القومي:</strong> ${patient.national_id || '—'}</p>
        <p><strong>النوع:</strong> ${genderText}</p>
        <p><strong>السن:</strong> ${patient.age || '—'}</p>
        <p><strong>تاريخ الميلاد:</strong> ${birthText}</p>
        <hr style="margin:0.8rem 0;">
        <p><strong>العنوان:</strong> ${patient.address || '—'}</p>
        <p><strong>عرفتنا منين:</strong> ${patient.referral_source || '—'}</p>
        <p><strong>ملاحظات:</strong> ${patient.notes || '—'}</p>
        <hr style="margin:0.8rem 0;">
        <p><strong>تاريخ التسجيل:</strong> ${formatDateTime(patient.created_at)}</p>
      </div>
    `;

    // جلب إحصائيات تفصيلية + حجوزات + نتائج
    try {
      const [stats, bookings, results] = await Promise.all([
        fetchPatientDetailedStats(patient.id),
        fetchPatientBookings(patient.id),
        fetchPatientResults(patient.id)
      ]);

      currentPatientBookings = bookings;

      document.getElementById('bookingsTabCount').textContent = `(${stats.bookingsCount})`;
      document.getElementById('resultsTabCount').textContent = `(${stats.resultsCount})`;

      // ملخص النشاط
      document.getElementById('patientInfoBody').innerHTML += `
        <hr>
        <h4 style="margin: 1rem 0 0.5rem; color: #0b8bb8;">📊 ملخص النشاط</h4>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:0.6rem;">
          <div style="background:#f0f9ff; padding:0.7rem 0.9rem; border-radius:8px; border-right:3px solid #0b8bb8;">
            <div style="font-size:0.78rem; color:#718b9b;">عدد الحجوزات</div>
            <div style="font-size:1.2rem; font-weight:800; color:#0b8bb8;">${stats.bookingsCount}</div>
          </div>
          <div style="background:#f0fdf7; padding:0.7rem 0.9rem; border-radius:8px; border-right:3px solid #14a085;">
            <div style="font-size:0.78rem; color:#718b9b;">مكتملة</div>
            <div style="font-size:1.2rem; font-weight:800; color:#14a085;">${stats.completedBookings}</div>
          </div>
          <div style="background:#fffaf0; padding:0.7rem 0.9rem; border-radius:8px; border-right:3px solid #e89b1f;">
            <div style="font-size:0.78rem; color:#718b9b;">قيد الانتظار</div>
            <div style="font-size:1.2rem; font-weight:800; color:#e89b1f;">${stats.pendingBookings}</div>
          </div>
          <div style="background:#fef0f0; padding:0.7rem 0.9rem; border-radius:8px; border-right:3px solid #e05260;">
            <div style="font-size:0.78rem; color:#718b9b;">ملغية</div>
            <div style="font-size:1.2rem; font-weight:800; color:#e05260;">${stats.cancelledBookings}</div>
          </div>
          <div style="background:#f0f9ff; padding:0.7rem 0.9rem; border-radius:8px; border-right:3px solid #0b8bb8;">
            <div style="font-size:0.78rem; color:#718b9b;">إجمالي المدفوع</div>
            <div style="font-size:1.05rem; font-weight:800; color:#0b8bb8;">${formatMoney(stats.totalPaid)}</div>
          </div>
          <div style="background:#fef0f0; padding:0.7rem 0.9rem; border-radius:8px; border-right:3px solid #e05260;">
            <div style="font-size:0.78rem; color:#718b9b;">المتبقي</div>
            <div style="font-size:1.05rem; font-weight:800; color:#e05260;">${formatMoney(stats.remaining)}</div>
          </div>
        </div>
      `;

      // ============ الحجوزات ============
      if (bookings.length === 0) {
        document.getElementById('patientBookingsBody').innerHTML =
          '<p class="empty-row">مفيش حجوزات لهذا المريض</p>';
      } else {
        document.getElementById('patientBookingsBody').innerHTML = bookings.map((b, idx) => buildBookingCard(b, idx)).join('');
      }

      // ============ النتائج ============
      if (results.length === 0) {
        document.getElementById('patientResultsBody').innerHTML =
          '<p class="empty-row">مفيش نتائج لهذا المريض</p>';
      } else {
        document.getElementById('patientResultsBody').innerHTML = `
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>نوع التحليل</th>
                  <th>اسم الملف</th>
                  <th>تاريخ النتيجة</th>
                  <th>تاريخ الرفع</th>
                </tr>
              </thead>
              <tbody>
                ${results.map(r => `
                  <tr>
                    <td>${r.test_type || '—'}</td>
                    <td>${r.file_name || '—'}</td>
                    <td class="date-cell">${formatDateShort(r.result_date)}</td>
                    <td class="date-cell">${formatDateTime(r.created_at)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

    } catch (err) {
      console.error('فشل تحميل تفاصيل المريض:', err);
      document.getElementById('patientBookingsBody').innerHTML =
        `<p class="error-msg">فشل التحميل: ${err.message}</p>`;
    }

    document.getElementById('patientDetailsModal').style.display = 'flex';
  }

  // ============================================
  // بناء كارت حجز داخل صفحة المريض
  // ============================================
  function buildBookingCard(b, idx) {
    const itemsCount = (b.booking_items || []).length;
    const statusColors = {
      pending: '#e89b1f',
      confirmed: '#0b8bb8',
      in_progress: '#8a5a1a',
      completed: '#14a085',
      cancelled: '#e05260'
    };
    const statusColor = statusColors[b.status] || '#718b9b';

    const visitBadge = b.visit_type === 'home'
      ? '<span style="background:#fff3e0;color:#e89b1f;padding:0.2rem 0.7rem;border-radius:10px;font-size:0.78rem;font-weight:700;">🏠 عينة منزلية</span>'
      : '<span style="background:#e8f4fd;color:#0b8bb8;padding:0.2rem 0.7rem;border-radius:10px;font-size:0.78rem;font-weight:700;">🏥 في المعمل</span>';

    const fullAddress = b.home_full_address || [
      b.home_governorate, b.home_district, b.home_area,
      b.home_building_number ? 'رقم العقار: ' + b.home_building_number : '',
      b.home_landmark ? 'علامة: ' + b.home_landmark : ''
    ].filter(Boolean).join(' - ');

    return `
      <div style="border:1px solid #dde9ef;border-radius:12px;margin-bottom:1rem;overflow:hidden;">
        <div style="background:#f0f9ff;padding:0.9rem 1rem;display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex-wrap:wrap;border-bottom:1px solid #dde9ef;">
          <div style="display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap;">
            <strong style="color:#0b8bb8;">#${idx + 1}</strong>
            <code style="background:#fff;padding:0.15rem 0.5rem;border-radius:6px;font-size:0.82rem;">${b.booking_code || '—'}</code>
            <span style="background:${statusColor};color:#fff;padding:0.2rem 0.7rem;border-radius:10px;font-size:0.78rem;font-weight:700;">${translateBookingStatus(b.status)}</span>
            ${visitBadge}
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn-view" data-booking-action="view" data-booking-id="${b.id}" style="background:#0b8bb8;">عرض التفاصيل</button>
          </div>
        </div>

        <div style="padding:0.9rem 1rem;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:0.6rem;font-size:0.88rem;">
            <div><span style="color:#718b9b;">📅 الموعد:</span> <strong>${b.scheduled_at ? formatDateTime(b.scheduled_at) : formatDateTime(b.created_at)}</strong></div>
            <div><span style="color:#718b9b;">💰 الإجمالي:</span> <strong style="color:#0b8bb8;">${formatMoney(b.total)}</strong></div>
            <div><span style="color:#718b9b;">✅ المدفوع:</span> <strong style="color:#14a085;">${formatMoney(b.paid_amount)}</strong></div>
            <div><span style="color:#718b9b;">⏳ المتبقي:</span> <strong style="color:#e05260;">${formatMoney(b.remaining_amount)}</strong></div>
            <div><span style="color:#718b9b;">💳 الدفع:</span> <strong>${translatePayment(b.payment_status)}</strong></div>
            <div><span style="color:#718b9b;">🧪 التحاليل:</span> <strong>${itemsCount}</strong></div>
            ${b.referring_doctor ? `<div><span style="color:#718b9b;">👨‍⚕️ الطبيب المحول:</span> <strong>${b.referring_doctor}</strong></div>` : ''}
            ${b.referral_source ? `<div><span style="color:#718b9b;">📢 عرفتنا منين:</span> <strong>${b.referral_source}</strong></div>` : ''}
            ${b.visit_type === 'home' && fullAddress ? `<div style="grid-column:1/-1;"><span style="color:#718b9b;">📍 العنوان:</span> <strong>${fullAddress}</strong></div>` : ''}
            ${b.notes ? `<div style="grid-column:1/-1;"><span style="color:#718b9b;">📝 ملاحظات:</span> ${b.notes}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // ============================================
  // فتح تفاصيل حجز معين من داخل صفحة المريض
  // ============================================
  function openPatientBookingDetail(bookingId) {
    const b = currentPatientBookings.find(x => x.id == bookingId);
    if (!b) return;

    document.getElementById('patientBookingDetailTitle').textContent = `حجز: ${b.patient_name || ''}`;

    const fullAddress = b.home_full_address || [
      b.home_governorate, b.home_district, b.home_area,
      b.home_building_number ? 'رقم العقار: ' + b.home_building_number : '',
      b.home_landmark ? 'علامة: ' + b.home_landmark : ''
    ].filter(Boolean).join(' - ');

    const items = b.booking_items || [];
    let itemsTotal = 0;
    const itemsRows = items.map((it, i) => {
      itemsTotal += Number(it.line_total) || 0;
      const typeLabel = it.item_type === 'package' ? '📦 باقة' : '🧪 تحليل';
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${typeLabel}</td>
          <td>${it.item_name || '—'}</td>
          <td>${formatMoney(it.unit_price)}</td>
          <td>${it.quantity}</td>
          <td>${formatMoney(it.line_total)}</td>
        </tr>
      `;
    }).join('');

    const mapLink = b.location_url
      ? `<p><strong>📍 رابط الموقع:</strong> <a href="${b.location_url}" target="_blank" rel="noopener" style="color:#0b8bb8;font-weight:700;">فتح على Google Maps</a></p>`
      : '';

    document.getElementById('patientBookingDetailBody').innerHTML = `
      <div class="msg-detail">
        <h4 style="color:#0b8bb8;margin-bottom:0.5rem;">👤 بيانات المريض</h4>
        <p><strong>الاسم:</strong> ${b.patient_name || '—'}</p>
        <p><strong>الهاتف:</strong> ${b.patient_phone || '—'}</p>
        <p><strong>السن:</strong> ${b.patient_age != null ? b.patient_age + ' سنة' : '—'}</p>
        <p><strong>الجنس:</strong> ${translateGender(b.patient_gender)}</p>

        <hr style="margin:0.8rem 0;">
        <h4 style="color:#0b8bb8;margin-bottom:0.5rem;">🩺 بيانات التحويل</h4>
        <p><strong>الطبيب المحول:</strong> ${b.referring_doctor || '—'}</p>
        <p><strong>عرفتنا منين:</strong> ${b.referral_source || '—'}</p>

        <hr style="margin:0.8rem 0;">
        <h4 style="color:#0b8bb8;margin-bottom:0.5rem;">🏠 بيانات الزيارة</h4>
        <p><strong>نوع الزيارة:</strong> ${translateVisitType(b.visit_type)}</p>
        ${b.visit_type === 'home' ? `
          <p><strong>المحافظة:</strong> ${b.home_governorate || '—'}</p>
          <p><strong>الحي / المركز:</strong> ${b.home_district || '—'}</p>
          <p><strong>المنطقة:</strong> ${b.home_area || '—'}</p>
          <p><strong>رقم العقار:</strong> ${b.home_building_number || '—'}</p>
          <p><strong>علامة مميزة:</strong> ${b.home_landmark || '—'}</p>
          <p><strong>العنوان الكامل:</strong> ${fullAddress || '—'}</p>
          <p><strong>رسوم العينة:</strong> ${formatMoney(b.home_visit_fee || 0)}</p>
          ${mapLink}
          ${b.location_lat && b.location_lng ? `
            <div id="patient-booking-map" style="height:320px;border-radius:10px;overflow:hidden;margin-top:0.6rem;"></div>
          ` : ''}
        ` : ''}
        <p><strong>الموعد:</strong> ${b.scheduled_at ? formatDateTime(b.scheduled_at) : '—'}</p>

        <hr style="margin:0.8rem 0;">
        <h4 style="color:#0b8bb8;margin-bottom:0.5rem;">🧪 التحاليل (${items.length})</h4>
        ${items.length === 0
          ? '<p class="empty-row">لا توجد تحاليل مسجلة</p>'
          : `
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
                <tbody>${itemsRows}</tbody>
              </table>
            </div>
            <div style="margin-top:0.8rem;padding:0.7rem 1rem;background:#f0f9ff;border-radius:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
              <strong>إجمالي البنود:</strong>
              <strong style="color:#0b8bb8;font-size:1.05rem;">${formatMoney(itemsTotal)}</strong>
            </div>
          `}

        <hr style="margin:0.8rem 0;">
        <h4 style="color:#0b8bb8;margin-bottom:0.5rem;">💰 المالية</h4>
        <p><strong>حالة الحجز:</strong> ${translateBookingStatus(b.status)}</p>
        <p><strong>حالة الدفع:</strong> ${translatePayment(b.payment_status)}</p>
        <p><strong>طريقة الدفع:</strong> ${b.payment_method || '—'}</p>
        <p><strong>الإجمالي:</strong> ${formatMoney(b.total)}</p>
        <p><strong>المدفوع:</strong> ${formatMoney(b.paid_amount)}</p>
        <p><strong>الباقي:</strong> ${formatMoney(b.remaining_amount)}</p>
        <p><strong>ملاحظات:</strong> ${b.notes || '—'}</p>
      </div>
    `;

    document.getElementById('patientBookingDetailModal').style.display = 'flex';

    // نرسم الخريطة لو عينة منزلية
    if (b.visit_type === 'home' && b.location_lat && b.location_lng) {
      setTimeout(() => {
        const el = document.getElementById('patient-booking-map');
        if (!el || typeof L === 'undefined' || el._leaflet_id) return;

        const map = L.map(el).setView([b.location_lat, b.location_lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);
        L.marker([b.location_lat, b.location_lng]).addTo(map)
          .bindPopup('<b>' + (b.patient_name || '') + '</b><br>' + (fullAddress || ''))
          .openPopup();
      }, 250);
    }
  }

  function closePatientBookingDetail() {
    document.getElementById('patientBookingDetailModal').style.display = 'none';
  }

  // ربط زرار "عرض التفاصيل" في كروت الحجوزات
  document.getElementById('patientBookingsBody').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-booking-action="view"]');
    if (btn) openPatientBookingDetail(btn.dataset.bookingId);
  });

  function switchPatientTab(tabName) {
    document.querySelectorAll('#patientDetailsModal .tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });

    const tabMap = { 'info': 'tabInfo', 'bookings': 'tabBookings', 'results': 'tabResults' };
    document.querySelectorAll('#patientDetailsModal .tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabMap[tabName]).classList.add('active');
  }

  function closeDetailsModal() {
    document.getElementById('patientDetailsModal').style.display = 'none';
    currentDetailedPatient = null;
    currentPatientBookings = [];
  }

  // ============================================
  // الحذف
  // ============================================
  async function confirmDelete(patient) {
    let stats;
    try {
      stats = await fetchPatientDetailedStats(patient.id);
    } catch (err) {
      stats = { bookingsCount: 0, resultsCount: 0 };
    }

    const message =
      `⚠️ تحذير: حذف نهائي!\n\n` +
      `هتحذف المريض: ${patient.full_name}\n` +
      `كود: ${patient.patient_code || '—'}\n\n` +
      `هيتحذف معاه:\n` +
      `• ${stats.bookingsCount} حجز\n` +
      `• ${stats.resultsCount} نتيجة\n` +
      `• كل الملفات المرتبطة\n\n` +
      `العملية دي لا يمكن التراجع عنها. متأكد؟`;

    if (!confirm(message)) return;

    const doubleConfirm = prompt(`للتأكيد النهائي، اكتب كلمة "حذف" (بالعربي):`);
    if (doubleConfirm !== 'حذف') {
      alert('تم إلغاء الحذف');
      return;
    }

    try {
      await deletePatientCompletely(patient.id);

      if (currentDetailedPatient && currentDetailedPatient.id === patient.id) {
        closeDetailsModal();
      }

      alert(`✓ تم حذف "${patient.full_name}" وكل بياناته بنجاح`);
      loadStats();
      loadTable();

    } catch (err) {
      console.error('فشل الحذف:', err);
      alert('فشل الحذف: ' + err.message);
    }
  }
}
