// js/sections/tests.js
import {
  fetchTests, fetchTestStats, fetchCategories,
  createTest, updateTest, deleteTest, toggleTestActive,
  createCategory, updateCategory, deleteCategory,
  formatMoney, formatDateShort
} from '../tests.js';

export async function render(container) {
  container.innerHTML = `
    <div class="section-header">
      <h2>التحاليل</h2>
      <div style="display:flex; gap:0.5rem;">
        <button class="btn-refresh" id="refreshTests">🔄 تحديث</button>
        <button class="btn-secondary" id="manageCategoriesBtn">📂 التصنيفات</button>
        <button class="btn-primary" id="addTestBtn">+ إضافة تحليل</button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">إجمالي التحاليل</div><div class="stat-value" id="tStatTotal">—</div></div>
      <div class="stat-card"><div class="stat-label">نشطة</div><div class="stat-value" id="tStatActive">—</div></div>
      <div class="stat-card"><div class="stat-label">غير نشطة</div><div class="stat-value" id="tStatInactive">—</div></div>
      <div class="stat-card"><div class="stat-label">التصنيفات</div><div class="stat-value" id="tStatCategories">—</div></div>
    </div>

    <div class="filters-bar">
      <select id="filterCategory">
        <option value="all">كل التصنيفات</option>
      </select>
      <select id="filterTestStatus">
        <option value="all">الكل</option>
        <option value="active">نشط</option>
        <option value="inactive">غير نشط</option>
      </select>
      <input type="text" id="searchTests" placeholder="ابحث باسم التحليل...">
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>التصنيف</th>
            <th>السعر</th>
            <th>الحالة</th>
            <th>تاريخ الإضافة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody id="testsTableBody">
          <tr><td colspan="6" class="empty-row">جاري التحميل...</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Modal التحليل -->
    <div class="modal-overlay" id="testModal" style="display:none;">
      <div class="modal-box">
        <div class="modal-header">
          <h3 id="testModalTitle">إضافة تحليل جديد</h3>
          <button class="modal-close" id="closeTestModal">✕</button>
        </div>
        <form id="testForm" class="modal-body">
          <input type="hidden" id="testId">

          <div class="form-group">
            <label>اسم التحليل *</label>
            <input type="text" id="tName" required>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>التصنيف *</label>
              <select id="tCategory" required>
                <option value="">— اختر تصنيف —</option>
              </select>
            </div>
            <div class="form-group">
              <label>السعر (ج.م) *</label>
              <input type="number" id="tPrice" required min="0" step="0.01">
            </div>
          </div>

          <div class="form-group">
            <label>الوصف</label>
            <textarea id="tDescription" rows="3"></textarea>
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" id="tIsActive" checked style="width:auto;">
              تحليل نشط (متاح للحجز)
            </label>
          </div>

          <p id="testFormError" class="error-msg"></p>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="cancelTestModal">إلغاء</button>
            <button type="submit" class="btn-primary" id="saveTestBtn">حفظ</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal التصنيفات -->
    <div class="modal-overlay" id="categoriesModal" style="display:none;">
      <div class="modal-box">
        <div class="modal-header">
          <h3>إدارة التصنيفات</h3>
          <button class="modal-close" id="closeCategoriesModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group" style="display:flex; gap:0.5rem;">
            <input type="text" id="newCategoryName" placeholder="اسم تصنيف جديد..." style="flex:1;">
            <button type="button" class="btn-primary" id="addCategoryBtn" style="width:auto;">+ إضافة</button>
          </div>
          <div id="categoriesList" style="margin-top:1rem;">
            <p>جاري التحميل...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  let categories = [];

  await loadCategories();
  loadStats();
  loadTable();

  // ============ الأحداث ============
  document.getElementById('refreshTests').addEventListener('click', () => {
    loadStats();
    loadTable();
  });

  document.getElementById('addTestBtn').addEventListener('click', () => openTestModal());

  document.getElementById('closeTestModal').addEventListener('click', closeTestModal);
  document.getElementById('cancelTestModal').addEventListener('click', closeTestModal);
  document.getElementById('testModal').addEventListener('click', (e) => {
    if (e.target.id === 'testModal') closeTestModal();
  });

  document.getElementById('testForm').addEventListener('submit', handleSaveTest);

  document.getElementById('filterCategory').addEventListener('change', loadTable);
  document.getElementById('filterTestStatus').addEventListener('change', loadTable);

  let searchTimeout;
  document.getElementById('searchTests').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadTable, 400);
  });

  // التصنيفات
  document.getElementById('manageCategoriesBtn').addEventListener('click', openCategoriesModal);
  document.getElementById('closeCategoriesModal').addEventListener('click', () => {
    document.getElementById('categoriesModal').style.display = 'none';
  });
  document.getElementById('categoriesModal').addEventListener('click', (e) => {
    if (e.target.id === 'categoriesModal') {
      document.getElementById('categoriesModal').style.display = 'none';
    }
  });
  document.getElementById('addCategoryBtn').addEventListener('click', handleAddCategory);

  // ============ الدوال ============
  async function loadCategories() {
    try {
      categories = await fetchCategories();
      const filterSel = document.getElementById('filterCategory');
      const formSel = document.getElementById('tCategory');

      // فلتر
      filterSel.innerHTML = '<option value="all">كل التصنيفات</option>' +
        categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

      // نموذج
      formSel.innerHTML = '<option value="">— اختر تصنيف —</option>' +
        categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (err) {
      console.error(err);
    }
  }

  async function loadStats() {
    try {
      const s = await fetchTestStats();
      document.getElementById('tStatTotal').textContent = s.total;
      document.getElementById('tStatActive').textContent = s.active;
      document.getElementById('tStatInactive').textContent = s.inactive;
      document.getElementById('tStatCategories').textContent = s.categories;
    } catch (err) { console.error(err); }
  }

  async function loadTable() {
    const tbody = document.getElementById('testsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">جاري التحميل...</td></tr>';

    const filters = {
      category: document.getElementById('filterCategory').value,
      status: document.getElementById('filterTestStatus').value,
      search: document.getElementById('searchTests').value.trim()
    };

    try {
      const tests = await fetchTests(filters);

      if (tests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-row">مفيش تحاليل مطابقة</td></tr>';
        return;
      }

      tbody.innerHTML = tests.map(t => `
        <tr>
          <td>${t.name}</td>
          <td>${t.test_categories?.name || '—'}</td>
          <td>${formatMoney(t.price)}</td>
          <td>
            <span class="badge ${t.is_active ? 'badge-paid' : 'badge-unpaid'}">
              ${t.is_active ? 'نشط' : 'غير نشط'}
            </span>
          </td>
          <td class="date-cell">${formatDateShort(t.created_at)}</td>
          <td>
            <button class="btn-view" data-action="edit" data-id="${t.id}">تعديل</button>
            <button class="btn-secondary" data-action="toggle" data-id="${t.id}" style="padding:0.35rem 0.8rem; font-size:0.8rem;">
              ${t.is_active ? 'إلغاء' : 'تفعيل'}
            </button>
            <button class="btn-delete" data-action="delete" data-id="${t.id}">حذف</button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const action = btn.dataset.action;
          const test = tests.find(t => t.id == id);

          if (action === 'edit') {
            openTestModal(test);
          } else if (action === 'toggle') {
            try {
              await toggleTestActive(id, !test.is_active);
              loadStats();
              loadTable();
            } catch (err) {
              alert('فشل التحديث: ' + err.message);
            }
          } else if (action === 'delete') {
            if (confirm(`متأكد إنك عايز تحذف "${test.name}"؟`)) {
              try {
                await deleteTest(id);
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
      tbody.innerHTML = `<tr><td colspan="6" class="empty-row error">فشل التحميل: ${err.message}</td></tr>`;
    }
  }

  function openTestModal(test = null) {
    const modal = document.getElementById('testModal');
    const title = document.getElementById('testModalTitle');

    if (test) {
      title.textContent = 'تعديل التحليل';
      document.getElementById('testId').value = test.id;
      document.getElementById('tName').value = test.name || '';
      document.getElementById('tCategory').value = test.category_id || '';
      document.getElementById('tPrice').value = test.price || 0;
      document.getElementById('tDescription').value = test.description || '';
      document.getElementById('tIsActive').checked = test.is_active;
    } else {
      title.textContent = 'إضافة تحليل جديد';
      document.getElementById('testForm').reset();
      document.getElementById('testId').value = '';
      document.getElementById('tIsActive').checked = true;
    }

    document.getElementById('testFormError').textContent = '';
    modal.style.display = 'flex';
  }

  function closeTestModal() {
    document.getElementById('testModal').style.display = 'none';
  }

  async function handleSaveTest(e) {
    e.preventDefault();
    const id = document.getElementById('testId').value;
    const errEl = document.getElementById('testFormError');
    const btn = document.getElementById('saveTestBtn');

    const data = {
      name: document.getElementById('tName').value.trim(),
      category_id: Number(document.getElementById('tCategory').value),
      price: Number(document.getElementById('tPrice').value),
      description: document.getElementById('tDescription').value.trim() || null,
      is_active: document.getElementById('tIsActive').checked
    };

    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    errEl.textContent = '';

    try {
      if (id) {
        await updateTest(id, data);
      } else {
        await createTest(data);
      }
      closeTestModal();
      loadStats();
      loadTable();
    } catch (err) {
      errEl.textContent = 'فشل الحفظ: ' + err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'حفظ';
    }
  }

  // ============ إدارة التصنيفات ============
  function openCategoriesModal() {
    document.getElementById('categoriesModal').style.display = 'flex';
    renderCategoriesList();
  }

  async function renderCategoriesList() {
    const list = document.getElementById('categoriesList');
    list.innerHTML = '<p>جاري التحميل...</p>';

    try {
      const cats = await fetchCategories();

      if (cats.length === 0) {
        list.innerHTML = '<p class="empty-row">مفيش تصنيفات</p>';
        return;
      }

      list.innerHTML = cats.map(c => `
        <div style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem; border-bottom:1px solid #edf2f7;">
          <span style="flex:1;">${c.name}</span>
          <button class="btn-delete" data-cat-action="delete" data-id="${c.id}" style="padding:0.25rem 0.6rem; font-size:0.75rem;">حذف</button>
        </div>
      `).join('');

      list.querySelectorAll('button[data-cat-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const cat = cats.find(c => c.id == id);
          if (confirm(`حذف تصنيف "${cat.name}"؟`)) {
            try {
              await deleteCategory(id);
              renderCategoriesList();
              await loadCategories();
              loadStats();
            } catch (err) {
              alert('فشل الحذف: ' + err.message);
            }
          }
        });
      });
    } catch (err) {
      list.innerHTML = `<p class="error-msg">فشل التحميل: ${err.message}</p>`;
    }
  }

  async function handleAddCategory() {
    const input = document.getElementById('newCategoryName');
    const name = input.value.trim();
    if (!name) return;

    try {
      await createCategory({ name });
      input.value = '';
      await renderCategoriesList();
      await loadCategories();
      loadStats();
    } catch (err) {
      alert('فشل الإضافة: ' + err.message);
    }
  }
}