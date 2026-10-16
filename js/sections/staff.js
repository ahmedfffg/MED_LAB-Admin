// js/sections/staff.js
import {
  fetchStaff, fetchStaffStats, updateStaff,
  deleteStaffProfile, toggleStaffActive,
  translateRole, formatDateShort, formatDateTime
} from '../staff.js';

export async function render(container) {
  container.innerHTML = `
    <div class="section-header">
      <h2>الموظفين</h2>
      <button class="btn-refresh" id="refreshStaff">🔄 تحديث</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">إجمالي الموظفين</div><div class="stat-value" id="stStatTotal">—</div></div>
      <div class="stat-card"><div class="stat-label">الأدمن</div><div class="stat-value" id="stStatAdmins">—</div></div>
      <div class="stat-card"><div class="stat-label">نشطين</div><div class="stat-value" id="stStatActive">—</div></div>
    </div>

    <div class="info-box" style="margin-bottom:1.5rem;">
      <h3>ℹ️ إزاي تضيف موظف جديد؟</h3>
      <p>لإضافة موظف جديد، روح لـ <strong>Supabase Dashboard → Authentication → Users → Add User</strong>.</p>
      <p>بعد ما تضيفه، هيظهر هنا تلقائياً، وتقدر تعدل بياناته (الاسم، الدور، الحالة).</p>
    </div>

    <div class="filters-bar">
      <select id="filterStaffRole">
        <option value="all">كل الأدوار</option>
        <option value="admin">أدمن</option>
        <option value="receptionist">استقبال</option>
        <option value="technician">فني</option>
        <option value="viewer">مشاهدة فقط</option>
      </select>
      <select id="filterStaffStatus">
        <option value="all">الكل</option>
        <option value="active">نشط</option>
        <option value="inactive">موقوف</option>
      </select>
      <input type="text" id="searchStaff" placeholder="ابحث بالاسم أو الهاتف...">
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>الهاتف</th>
            <th>الدور</th>
            <th>الحالة</th>
            <th>تاريخ الإضافة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody id="staffTableBody">
          <tr><td colspan="6" class="empty-row">جاري التحميل...</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Modal تعديل موظف -->
    <div class="modal-overlay" id="staffModal" style="display:none;">
      <div class="modal-box" style="max-width:600px;">
        <div class="modal-header">
          <h3>تعديل بيانات الموظف</h3>
          <button class="modal-close" id="closeStaffModal">✕</button>
        </div>
        <form id="staffForm" class="modal-body">
          <input type="hidden" id="staffId">

          <div class="form-row">
            <div class="form-group">
              <label>الاسم الكامل *</label>
              <input type="text" id="stFullName" required>
            </div>
            <div class="form-group">
              <label>الهاتف</label>
              <input type="tel" id="stPhone">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>الدور *</label>
              <select id="stRole" required>
                <option value="admin">أدمن</option>
                <option value="receptionist">استقبال</option>
                <option value="technician">فني</option>
                <option value="viewer">مشاهدة فقط</option>
              </select>
            </div>
            <div class="form-group">
              <label>الحالة</label>
              <select id="stIsActive">
                <option value="true">نشط</option>
                <option value="false">موقوف</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>ملاحظات</label>
            <textarea id="stNotes" rows="3"></textarea>
          </div>

          <p id="staffFormError" class="error-msg"></p>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="cancelStaffModal">إلغاء</button>
            <button type="submit" class="btn-primary" id="saveStaffBtn">حفظ</button>
          </div>
        </form>
      </div>
    </div>
  `;

  let allStaff = [];

  loadStats();
  loadTable();

  document.getElementById('refreshStaff').addEventListener('click', () => {
    loadStats();
    loadTable();
  });

  document.getElementById('filterStaffRole').addEventListener('change', loadTable);
  document.getElementById('filterStaffStatus').addEventListener('change', loadTable);

  let searchTimeout;
  document.getElementById('searchStaff').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadTable, 400);
  });

  document.getElementById('closeStaffModal').addEventListener('click', closeModal);
  document.getElementById('cancelStaffModal').addEventListener('click', closeModal);
  document.getElementById('staffModal').addEventListener('click', (e) => {
    if (e.target.id === 'staffModal') closeModal();
  });

  document.getElementById('staffForm').addEventListener('submit', handleSave);

  // ============ الدوال ============
  async function loadStats() {
    try {
      const s = await fetchStaffStats();
      document.getElementById('stStatTotal').textContent = s.total;
      document.getElementById('stStatAdmins').textContent = s.admins;
      document.getElementById('stStatActive').textContent = s.active;
    } catch (err) { console.error(err); }
  }

  async function loadTable() {
    const tbody = document.getElementById('staffTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">جاري التحميل...</td></tr>';

    const filters = {
      role: document.getElementById('filterStaffRole').value,
      status: document.getElementById('filterStaffStatus').value,
      search: document.getElementById('searchStaff').value.trim()
    };

    try {
      allStaff = await fetchStaff(filters);

      if (allStaff.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-row">مفيش موظفين مطابقين</td></tr>';
        return;
      }

      tbody.innerHTML = allStaff.map(s => `
        <tr>
          <td>${s.full_name || '—'}</td>
          <td>${s.phone || '—'}</td>
          <td><span class="badge badge-role-${s.role}">${translateRole(s.role)}</span></td>
          <td>
            <span class="badge ${s.is_active ? 'badge-paid' : 'badge-unpaid'}">
              ${s.is_active ? 'نشط' : 'موقوف'}
            </span>
          </td>
          <td class="date-cell">${formatDateShort(s.created_at)}</td>
          <td>
            <button class="btn-view" data-action="edit" data-id="${s.id}">تعديل</button>
            <button class="btn-secondary" data-action="toggle" data-id="${s.id}" style="padding:0.35rem 0.8rem; font-size:0.8rem;">
              ${s.is_active ? 'إيقاف' : 'تفعيل'}
            </button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const action = btn.dataset.action;
          const staff = allStaff.find(s => s.id === id);

          if (action === 'edit') {
            openModal(staff);
          } else if (action === 'toggle') {
            try {
              await toggleStaffActive(id, !staff.is_active);
              loadStats();
              loadTable();
            } catch (err) {
              alert('فشل التحديث: ' + err.message);
            }
          }
        });
      });

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-row error">فشل التحميل: ${err.message}</td></tr>`;
    }
  }

  function openModal(staff) {
    document.getElementById('staffModal').style.display = 'flex';
    document.getElementById('staffId').value = staff.id;
    document.getElementById('stFullName').value = staff.full_name || '';
    document.getElementById('stPhone').value = staff.phone || '';
    document.getElementById('stRole').value = staff.role || 'receptionist';
    document.getElementById('stIsActive').value = staff.is_active ? 'true' : 'false';
    document.getElementById('stNotes').value = staff.notes || '';
    document.getElementById('staffFormError').textContent = '';
  }

  function closeModal() {
    document.getElementById('staffModal').style.display = 'none';
  }

  async function handleSave(e) {
    e.preventDefault();

    const id = document.getElementById('staffId').value;
    const errEl = document.getElementById('staffFormError');
    const btn = document.getElementById('saveStaffBtn');

    const data = {
      full_name: document.getElementById('stFullName').value.trim(),
      phone: document.getElementById('stPhone').value.trim() || null,
      role: document.getElementById('stRole').value,
      is_active: document.getElementById('stIsActive').value === 'true',
      notes: document.getElementById('stNotes').value.trim() || null
    };

    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    errEl.textContent = '';

    try {
      await updateStaff(id, data);
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
}
