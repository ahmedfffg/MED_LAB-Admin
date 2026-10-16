// js/sections/packages.js
import {
  fetchPackages, fetchPackageStats,
  createPackage, updatePackage, deletePackage, togglePackageActive,
  fetchPackageTests, setPackageTests, fetchAllActiveTests,
  formatMoney, formatDateShort
} from '../packages.js';

export async function render(container) {
  container.innerHTML = `
    <div class="section-header">
      <h2>الباقات</h2>
      <div style="display:flex; gap:0.5rem;">
        <button class="btn-refresh" id="refreshPackages">🔄 تحديث</button>
        <button class="btn-primary" id="addPackageBtn">+ إضافة باقة</button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">إجمالي الباقات</div><div class="stat-value" id="pkStatTotal">—</div></div>
      <div class="stat-card"><div class="stat-label">نشطة</div><div class="stat-value" id="pkStatActive">—</div></div>
      <div class="stat-card"><div class="stat-label">غير نشطة</div><div class="stat-value" id="pkStatInactive">—</div></div>
    </div>

    <div class="filters-bar">
      <select id="filterPackageStatus">
        <option value="all">الكل</option>
        <option value="active">نشط</option>
        <option value="inactive">غير نشط</option>
      </select>
      <input type="text" id="searchPackages" placeholder="ابحث باسم الباقة أو الوصف...">
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>الوصف</th>
            <th>السعر</th>
            <th>عدد التحاليل</th>
            <th>الحالة</th>
            <th>تاريخ الإضافة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody id="packagesTableBody">
          <tr><td colspan="7" class="empty-row">جاري التحميل...</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Modal الباقة (بالتبويبات) -->
    <div class="modal-overlay" id="packageModal" style="display:none;">
      <div class="modal-box" style="max-width:800px;">
        <div class="modal-header">
          <h3 id="packageModalTitle">إضافة باقة جديدة</h3>
          <button class="modal-close" id="closePackageModal">✕</button>
        </div>

        <!-- التبويبات -->
        <div class="tabs-bar">
          <button type="button" class="tab-btn active" data-tab="data">📋 البيانات</button>
          <button type="button" class="tab-btn" data-tab="tests">
            🧪 التحاليل <span class="tab-count" id="testsTabCount">(0)</span>
          </button>
        </div>

        <!-- تبويب البيانات -->
        <div class="tab-content active" id="tabData">
          <form id="packageForm" class="modal-body">
            <input type="hidden" id="packageId">

            <div class="form-group">
              <label>اسم الباقة *</label>
              <input type="text" id="pkName" required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>السعر (ج.م) *</label>
                <input type="number" id="pkPrice" required min="0" step="0.01">
              </div>
              <div class="form-group">
                <label>رابط الصورة</label>
                <input type="url" id="pkImageUrl" placeholder="https://...">
              </div>
            </div>

            <div class="form-group">
              <label>الوصف</label>
              <textarea id="pkDescription" rows="3"></textarea>
            </div>

            <div class="form-group">
              <label>
                <input type="checkbox" id="pkIsActive" checked style="width:auto;">
                باقة نشطة (متاحة للحجز)
              </label>
            </div>

            <p id="packageFormError" class="error-msg"></p>
          </form>
        </div>

        <!-- تبويب التحاليل -->
        <div class="tab-content" id="tabTests">
          <div class="modal-body">
            <input type="text" id="searchTestInPkg" placeholder="🔍 ابحث باسم التحليل..."
              style="width:100%; padding:0.75rem; border:1px solid #cbd5e0; border-radius:6px; font-family:inherit; margin-bottom:1rem;">

            <div class="pkg-tests-summary">
              <span>المختار: <strong id="selectedTestsCount">0</strong> تحليل</span>
              <span>مجموع الأسعار: <strong id="selectedTestsTotal">0 ج.م</strong></span>
            </div>

            <div class="pkg-tests-list" id="pkgTestsList">
              <p class="empty-row">جاري التحميل...</p>
            </div>
          </div>
        </div>

        <!-- أزرار الحفظ -->
        <div class="modal-actions" style="padding: 1rem 1.5rem;">
          <button type="button" class="btn-secondary" id="cancelPackageModal">إلغاء</button>
          <button type="submit" form="packageForm" class="btn-primary" id="savePackageBtn">حفظ الباقة</button>
        </div>
      </div>
    </div>
  `;

  // متغيرات الحالة
  let allTests = [];              // كل التحاليل النشطة
  let selectedTestIds = new Set(); // التحاليل المختارة
  let currentTab = 'data';

  loadStats();
  loadTable();

  // ============ الأحداث ============
  document.getElementById('refreshPackages').addEventListener('click', () => {
    loadStats();
    loadTable();
  });

  document.getElementById('addPackageBtn').addEventListener('click', () => openPackageModal());

  document.getElementById('closePackageModal').addEventListener('click', closePackageModal);
  document.getElementById('cancelPackageModal').addEventListener('click', closePackageModal);
  document.getElementById('packageModal').addEventListener('click', (e) => {
    if (e.target.id === 'packageModal') closePackageModal();
  });

  document.getElementById('packageForm').addEventListener('submit', handleSavePackage);

  document.getElementById('filterPackageStatus').addEventListener('change', loadTable);

  let searchTimeout;
  document.getElementById('searchPackages').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadTable, 400);
  });

  // ============ تبويبات ============
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabName === 'data' ? 'tabData' : 'tabTests').classList.add('active');
  }

  // ============ البحث في التحاليل ============
  let testSearchTimeout;
  document.getElementById('searchTestInPkg').addEventListener('input', () => {
    clearTimeout(testSearchTimeout);
    testSearchTimeout = setTimeout(renderTestsList, 200);
  });

  // ============ الدوال ============
  async function loadStats() {
    try {
      const s = await fetchPackageStats();
      document.getElementById('pkStatTotal').textContent = s.total;
      document.getElementById('pkStatActive').textContent = s.active;
      document.getElementById('pkStatInactive').textContent = s.inactive;
    } catch (err) { console.error(err); }
  }

  async function loadTable() {
    const tbody = document.getElementById('packagesTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">جاري التحميل...</td></tr>';

    const filters = {
      status: document.getElementById('filterPackageStatus').value,
      search: document.getElementById('searchPackages').value.trim()
    };

    try {
      const packages = await fetchPackages(filters);

      if (packages.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-row">مفيش باقات مطابقة</td></tr>';
        return;
      }

      tbody.innerHTML = packages.map(p => {
        const testsCount = (p.package_tests || []).length;
        return `
          <tr>
            <td>${p.name}</td>
            <td class="msg-preview">${p.description || '—'}</td>
            <td>${formatMoney(p.price)}</td>
            <td><span class="badge badge-read">${testsCount} تحليل</span></td>
            <td>
              <span class="badge ${p.is_active ? 'badge-paid' : 'badge-unpaid'}">
                ${p.is_active ? 'نشط' : 'غير نشط'}
              </span>
            </td>
            <td class="date-cell">${formatDateShort(p.created_at)}</td>
            <td>
              <button class="btn-view" data-action="edit" data-id="${p.id}">تعديل</button>
              <button class="btn-secondary" data-action="toggle" data-id="${p.id}" style="padding:0.35rem 0.8rem; font-size:0.8rem;">
                ${p.is_active ? 'إلغاء' : 'تفعيل'}
              </button>
              <button class="btn-delete" data-action="delete" data-id="${p.id}">حذف</button>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const action = btn.dataset.action;
          const pkg = packages.find(p => p.id == id);

          if (action === 'edit') {
            await openPackageModal(pkg);
          } else if (action === 'toggle') {
            try {
              await togglePackageActive(id, !pkg.is_active);
              loadStats();
              loadTable();
            } catch (err) {
              alert('فشل التحديث: ' + err.message);
            }
          } else if (action === 'delete') {
            if (confirm(`متأكد إنك عايز تحذف باقة "${pkg.name}"؟`)) {
              try {
                await deletePackage(id);
                loadStats();
                loadTable();
              } catch (err) {
                alert('فشل الحذف: ' + err.message);
              }
            }
          }
        });
      });

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-row error">فشل التحميل: ${err.message}</td></tr>`;
    }
  }

  async function openPackageModal(pkg = null) {
    const modal = document.getElementById('packageModal');
    const title = document.getElementById('packageModalTitle');

    // 1. حمّل كل التحاليل النشطة (لو لسه متحملتش)
    if (allTests.length === 0) {
      document.getElementById('pkgTestsList').innerHTML = '<p class="empty-row">جاري التحميل...</p>';
      try {
        allTests = await fetchAllActiveTests();
      } catch (err) {
        document.getElementById('pkgTestsList').innerHTML = `<p class="error-msg">فشل تحميل التحاليل: ${err.message}</p>`;
        allTests = [];
      }
    }

    // 2. حدد التبويب الافتراضي
    switchTab('data');

    // 3. امسح البحث
    document.getElementById('searchTestInPkg').value = '';
    selectedTestIds.clear();

    // 4. املأ البيانات (لو تعديل)
    if (pkg) {
      title.textContent = 'تعديل الباقة';
      document.getElementById('packageId').value = pkg.id;
      document.getElementById('pkName').value = pkg.name || '';
      document.getElementById('pkPrice').value = pkg.price || 0;
      document.getElementById('pkDescription').value = pkg.description || '';
      document.getElementById('pkImageUrl').value = pkg.image_url || '';
      document.getElementById('pkIsActive').checked = pkg.is_active;

      // جلب تحاليل الباقة
      try {
        const pkgTests = await fetchPackageTests(pkg.id);
        pkgTests.forEach(pt => selectedTestIds.add(Number(pt.test_id)));
      } catch (err) {
        console.error('فشل تحميل تحاليل الباقة:', err);
      }
    } else {
      title.textContent = 'إضافة باقة جديدة';
      document.getElementById('packageForm').reset();
      document.getElementById('packageId').value = '';
      document.getElementById('pkIsActive').checked = true;
    }

    document.getElementById('packageFormError').textContent = '';

    // 5. ارسم قائمة التحاليل
    renderTestsList();
    updateSummary();

    modal.style.display = 'flex';
  }

  function renderTestsList() {
    const list = document.getElementById('pkgTestsList');
    const search = document.getElementById('searchTestInPkg').value.trim().toLowerCase();

    // فلترة
    const filtered = search
      ? allTests.filter(t =>
          t.name.toLowerCase().includes(search) ||
          (t.test_categories?.name || '').toLowerCase().includes(search)
        )
      : allTests;

    if (filtered.length === 0) {
      list.innerHTML = '<p class="empty-row">مفيش تحاليل مطابقة للبحث</p>';
      return;
    }

    list.innerHTML = filtered.map(t => {
      const checked = selectedTestIds.has(Number(t.id)) ? 'checked' : '';
      return `
        <label class="pkg-test-item ${checked ? 'selected' : ''}">
          <input type="checkbox" data-test-id="${t.id}" ${checked}>
          <div class="pkg-test-info">
            <div class="pkg-test-name">${t.name}</div>
            <div class="pkg-test-meta">${t.test_categories?.name || '—'} — ${formatMoney(t.price)}</div>
          </div>
        </label>
      `;
    }).join('');

    // أحداث الـ checkbox
    list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const testId = Number(e.target.dataset.testId);
        if (e.target.checked) {
          selectedTestIds.add(testId);
        } else {
          selectedTestIds.delete(testId);
        }
        e.target.closest('.pkg-test-item').classList.toggle('selected', e.target.checked);
        updateSummary();
      });
    });
  }

  function updateSummary() {
    const count = selectedTestIds.size;
    document.getElementById('selectedTestsCount').textContent = count;
    document.getElementById('testsTabCount').textContent = `(${count})`;

    // مجموع الأسعار
    let total = 0;
    selectedTestIds.forEach(id => {
      const t = allTests.find(x => Number(x.id) === id);
      if (t) total += Number(t.price) || 0;
    });
    document.getElementById('selectedTestsTotal').textContent = formatMoney(total);
  }

  function closePackageModal() {
    document.getElementById('packageModal').style.display = 'none';
  }

  async function handleSavePackage(e) {
    e.preventDefault();
    const id = document.getElementById('packageId').value;
    const errEl = document.getElementById('packageFormError');
    const btn = document.getElementById('savePackageBtn');

    // تحقق من اسم الباقة
    const name = document.getElementById('pkName').value.trim();
    if (!name) {
      errEl.textContent = 'اسم الباقة مطلوب';
      switchTab('data');
      return;
    }

    const data = {
      name: name,
      price: Number(document.getElementById('pkPrice').value),
      description: document.getElementById('pkDescription').value.trim() || null,
      image_url: document.getElementById('pkImageUrl').value.trim() || null,
      is_active: document.getElementById('pkIsActive').checked
    };

    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    errEl.textContent = '';

    try {
      let packageId = id;

      // 1. احفظ أو عدّل الباقة
      if (id) {
        await updatePackage(id, data);
      } else {
        const created = await createPackage(data);
        packageId = created.id;
      }

      // 2. احفظ تحاليل الباقة
      await setPackageTests(packageId, Array.from(selectedTestIds));

      closePackageModal();
      loadStats();
      loadTable();
    } catch (err) {
      errEl.textContent = 'فشل الحفظ: ' + err.message;
      switchTab('data');
    } finally {
      btn.disabled = false;
      btn.textContent = 'حفظ الباقة';
    }
  }
}