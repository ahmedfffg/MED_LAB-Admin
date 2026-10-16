// js/sections/patients.js
import {
  fetchPatients, fetchPatientStats, createPatient,
  updatePatient,
  fetchPatientBookings, fetchPatientResults,
  fetchPatientDetailedStats, deletePatientCompletely,
  translateGender, formatDateShort, formatDateTime
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
      <div class="modal-box" style="max-width:820px;">
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
  `;

  let currentPatient = null;
  let currentDetailedPatient = null;

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

          if (action === 'view') {
            await openPatientDetails(patient);
          } else if (action === 'edit') {
            openModal(patient);
          } else if (action === 'delete') {
            confirmDelete(patient);
          }
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
      if (id) {
        await updatePatient(id, data);
      } else {
        await createPatient(data);
      }
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

    document.getElementById('detailsModalTitle').textContent =
      `تفاصيل: ${patient.full_name}`;

    // reset tabs
    switchPatientTab('info');

    // بيانات المريض الأساسية
    const genderText = translateGender(patient.gender);
    const birthText = patient.birth_date ? formatDateShort(patient.birth_date) : '—';

    document.getElementById('patientInfoBody').innerHTML = `
      <div class="msg-detail">
        <p><strong>كود الحجز:</strong> <code>${patient.patient_code || '—'}</code></p>
        <p><strong>الاسم:</strong> ${patient.full_name || '—'}</p>
        <p><strong>الهاتف:</strong> ${patient.phone || '—'}</p>
        <p><strong>الإيميل:</strong> ${patient.email || '—'}</p>
        <p><strong>الرقم القومي:</strong> ${patient.national_id || '—'}</p>
        <p><strong>النوع:</strong> ${genderText}</p>
        <p><strong>السن:</strong> ${patient.age || '—'}</p>
        <p><strong>تاريخ الميلاد:</strong> ${birthText}</p>
        <hr>
        <p><strong>العنوان:</strong> ${patient.address || '—'}</p>
        <p><strong>عرفتنا منين:</strong> ${patient.referral_source || '—'}</p>
        <p><strong>ملاحظات:</strong> ${patient.notes || '—'}</p>
        <hr>
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

      // تحديث العدادات في التبويبات
      document.getElementById('bookingsTabCount').textContent = `(${stats.bookingsCount})`;
      document.getElementById('resultsTabCount').textContent = `(${stats.resultsCount})`;

      // إضافة ملخص الإحصائيات في تبويب البيانات
      document.getElementById('patientInfoBody').innerHTML += `
        <hr>
        <h4 style="margin: 1rem 0 0.5rem; color: #0b8bb8;">📊 ملخص النشاط</h4>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:0.75rem;">
          <div style="background:#f0f9ff; padding:0.75rem 1rem; border-radius:8px; border-right:3px solid #0b8bb8;">
            <div style="font-size:0.8rem; color:#718b9b;">عدد الحجوزات</div>
            <div style="font-size:1.3rem; font-weight:800; color:#0b8bb8;">${stats.bookingsCount}</div>
          </div>
          <div style="background:#f0fdf7; padding:0.75rem 1rem; border-radius:8px; border-right:3px solid #14a085;">
            <div style="font-size:0.8rem; color:#718b9b;">حجوزات مكتملة</div>
            <div style="font-size:1.3rem; font-weight:800; color:#14a085;">${stats.completedBookings}</div>
          </div>
          <div style="background:#fffaf0; padding:0.75rem 1rem; border-radius:8px; border-right:3px solid #e89b1f;">
            <div style="font-size:0.8rem; color:#718b9b;">إجمالي المدفوع</div>
            <div style="font-size:1.3rem; font-weight:800; color:#e89b1f;">${stats.totalPaid.toLocaleString('ar-EG')} ج.م</div>
          </div>
          <div style="background:#fef0f0; padding:0.75rem 1rem; border-radius:8px; border-right:3px solid #e05260;">
            <div style="font-size:0.8rem; color:#718b9b;">المتبقي</div>
            <div style="font-size:1.3rem; font-weight:800; color:#e05260;">${stats.remaining.toLocaleString('ar-EG')} ج.م</div>
          </div>
        </div>
      `;

      // الحجوزات
      if (bookings.length === 0) {
        document.getElementById('patientBookingsBody').innerHTML =
          '<p class="empty-row">مفيش حجوزات لهذا المريض</p>';
      } else {
        document.getElementById('patientBookingsBody').innerHTML = `
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>كود الحجز</th>
                  <th>الحالة</th>
                  <th>الإجمالي</th>
                  <th>المدفوع</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                ${bookings.map(b => `
                  <tr>
                    <td><code>${b.booking_code || '—'}</code></td>
                    <td><span class="badge badge-${b.status}">${translateStatus(b.status)}</span></td>
                    <td>${Number(b.total || 0).toLocaleString('ar-EG')} ج.م</td>
                    <td>${Number(b.paid_amount || 0).toLocaleString('ar-EG')} ج.م</td>
                    <td class="date-cell">${formatDateShort(b.created_at)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      // النتائج
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

  function switchPatientTab(tabName) {
    document.querySelectorAll('#patientDetailsModal .tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });

    const tabMap = {
      'info': 'tabInfo',
      'bookings': 'tabBookings',
      'results': 'tabResults'
    };

    document.querySelectorAll('#patientDetailsModal .tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabMap[tabName]).classList.add('active');
  }

  function closeDetailsModal() {
    document.getElementById('patientDetailsModal').style.display = 'none';
    currentDetailedPatient = null;
  }

  // ============================================
  // الحذف
  // ============================================
  async function confirmDelete(patient) {
    // جلب إحصائيات المريض الأول
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

    // تأكيد مزدوج
    const doubleConfirm = prompt(
      `للتأكيد النهائي، اكتب كلمة "حذف" (بالعربي):`
    );

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

  // ============================================
  // Helper: ترجمة حالة الحجز
  // ============================================
  function translateStatus(status) {
    const map = {
      'pending': 'قيد الانتظار',
      'confirmed': 'مؤكد',
      'in_progress': 'جاري',
      'completed': 'مكتمل',
      'cancelled': 'ملغي'
    };
    return map[status] || status || '—';
  }
}