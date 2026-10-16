// js/sections/results.js
import {
  findBookingByCode, searchBookings,
  uploadResultFile, createResult,
  fetchResults, fetchResultStats, deleteResult,
  getPublicUrl, formatDateShort, formatDateTime,
  translateBookingStatus
} from '../results.js';

export async function render(container) {
  container.innerHTML = `
    <div class="section-header">
      <h2>نتائج التحاليل</h2>
      <div style="display:flex; gap:0.5rem;">
        <button class="btn-refresh" id="refreshResults">🔄 تحديث</button>
        <button class="btn-primary" id="addResultBtn">+ رفع نتيجة</button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">إجمالي النتائج</div><div class="stat-value" id="rStatTotal">—</div></div>
      <div class="stat-card"><div class="stat-label">نتائج النهاردة</div><div class="stat-value" id="rStatToday">—</div></div>
    </div>

    <div class="filters-bar">
      <input type="text" id="searchResults" placeholder="ابحث باسم الملف / نوع التحليل / ملاحظات...">
      <input type="date" id="filterResultDate">
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>كود الحجز</th>
            <th>المريض</th>
            <th>الهاتف</th>
            <th>نوع التحليل</th>
            <th>تاريخ النتيجة</th>
            <th>اسم الملف</th>
            <th>تاريخ الرفع</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody id="resultsTableBody">
          <tr><td colspan="8" class="empty-row">جاري التحميل...</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Modal رفع النتيجة -->
    <div class="modal-overlay" id="resultModal" style="display:none;">
      <div class="modal-box" style="max-width:680px;">
        <div class="modal-header">
          <h3>رفع نتيجة جديدة</h3>
          <button class="modal-close" id="closeResultModal">✕</button>
        </div>
        <div class="modal-body">

          <!-- الخطوة 1: اختيار الحجز -->
          <div class="form-group">
            <label>ابحث عن الحجز (كود الحجز / اسم المريض / الهاتف) *</label>
            <div style="position:relative;">
              <input type="text" id="bookingSearchInput" placeholder="اكتب كود الحجز أو اسم المريض..." autocomplete="off">
              <div id="bookingSearchResults" class="search-dropdown" style="display:none;"></div>
            </div>
            <p id="bookingSearchError" class="error-msg" style="text-align:right; font-size:0.85rem;"></p>
          </div>

          <!-- الحجز المختار -->
          <div id="bookingFoundBox" class="patient-found-box" style="display:none;">
            <div class="patient-found-info">
              <div class="patient-found-icon">📅</div>
              <div>
                <div class="patient-found-name" id="foundBookingName">—</div>
                <div class="patient-found-meta" id="foundBookingMeta">—</div>
              </div>
              <button type="button" class="btn-secondary" id="clearBookingBtn" style="width:auto; padding:0.35rem 0.7rem; font-size:0.8rem;">تغيير</button>
            </div>
          </div>

          <!-- الخطوة 2: بيانات النتيجة -->
          <div id="resultFormFields" style="display:none;">
            <div class="form-row">
              <div class="form-group">
                <label>نوع التحليل</label>
                <input type="text" id="rTestType" placeholder="مثال: صورة دم كاملة">
              </div>
              <div class="form-group">
                <label>تاريخ النتيجة *</label>
                <input type="date" id="rResultDate" required>
              </div>
            </div>

            <div class="form-group">
              <label>ملاحظات</label>
              <textarea id="rNotes" rows="2" placeholder="أي ملاحظات إضافية..."></textarea>
            </div>

            <div class="form-group">
              <label>ملف النتيجة (PDF) *</label>
              <div class="file-drop-zone" id="fileDropZone">
                <input type="file" id="resultFile" accept="application/pdf" style="display:none;">
                <div class="file-drop-content" id="fileDropContent">
                  <div class="file-drop-icon">📄</div>
                  <div class="file-drop-text">اضغط لاختيار ملف PDF أو اسحبه هنا</div>
                  <div class="file-drop-hint">الحجم الأقصى: 10 ميجا</div>
                </div>
                <div class="file-selected" id="fileSelected" style="display:none;">
                  <div class="file-selected-icon">📄</div>
                  <div class="file-selected-info">
                    <div class="file-selected-name" id="fileName">—</div>
                    <div class="file-selected-size" id="fileSize">—</div>
                  </div>
                  <button type="button" class="btn-secondary" id="removeFileBtn" style="width:auto; padding:0.35rem 0.7rem; font-size:0.8rem;">إزالة</button>
                </div>
              </div>
              <div class="upload-progress" id="uploadProgress" style="display:none;">
                <div class="upload-progress-bar" id="uploadProgressBar"></div>
              </div>
            </div>
          </div>

          <p id="resultFormError" class="error-msg"></p>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="cancelResultModal">إلغاء</button>
            <button type="button" class="btn-primary" id="saveResultBtn" disabled>رفع النتيجة</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // ============ متغيرات الحالة ============
  let selectedBooking = null;
  let selectedFile = null;

  // ============ تحميل البيانات ============
  loadStats();
  loadTable();

  document.getElementById('refreshResults').addEventListener('click', () => {
    loadStats();
    loadTable();
  });

  document.getElementById('addResultBtn').addEventListener('click', openResultModal);

  document.getElementById('closeResultModal').addEventListener('click', closeResultModal);
  document.getElementById('cancelResultModal').addEventListener('click', closeResultModal);
  document.getElementById('resultModal').addEventListener('click', (e) => {
    if (e.target.id === 'resultModal') closeResultModal();
  });

  let searchTimeout;
  document.getElementById('searchResults').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadTable, 400);
  });

  document.getElementById('filterResultDate').addEventListener('change', loadTable);

  // ============ الدوال الأساسية ============
  async function loadStats() {
    try {
      const s = await fetchResultStats();
      document.getElementById('rStatTotal').textContent = s.total;
      document.getElementById('rStatToday').textContent = s.today;
    } catch (err) { console.error(err); }
  }

  async function loadTable() {
    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row">جاري التحميل...</td></tr>';

    const filters = {
      search: document.getElementById('searchResults').value.trim(),
      date: document.getElementById('filterResultDate').value
    };

    try {
      const results = await fetchResults(filters);

      if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-row">مفيش نتائج مطابقة</td></tr>';
        return;
      }

      tbody.innerHTML = results.map(r => `
        <tr>
          <td><code>${r.bookings?.booking_code || '—'}</code></td>
          <td>${r.bookings?.patient_name || '—'}</td>
          <td>${r.bookings?.patient_phone || '—'}</td>
          <td>${r.test_type || '—'}</td>
          <td class="date-cell">${formatDateShort(r.result_date)}</td>
          <td>${r.file_name || '—'}</td>
          <td class="date-cell">${formatDateTime(r.created_at)}</td>
          <td>
            <button class="btn-view" data-action="view" data-path="${r.file_path}">عرض</button>
            <button class="btn-delete" data-action="delete" data-id="${r.id}" data-path="${r.file_path}">حذف</button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const action = btn.dataset.action;

          if (action === 'view') {
            const url = getPublicUrl(btn.dataset.path);
            window.open(url, '_blank');
          } else if (action === 'delete') {
            if (confirm('متأكد إنك عايز تحذف النتيجة دي؟')) {
              try {
                await deleteResult(btn.dataset.id, btn.dataset.path);
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
      tbody.innerHTML = `<tr><td colspan="8" class="empty-row error">فشل التحميل: ${err.message}</td></tr>`;
    }
  }

  // ============ Modal ============
  function openResultModal() {
    selectedBooking = null;
    selectedFile = null;

    document.getElementById('bookingSearchInput').value = '';
    document.getElementById('bookingSearchError').textContent = '';
    document.getElementById('bookingSearchResults').style.display = 'none';
    document.getElementById('bookingFoundBox').style.display = 'none';
    document.getElementById('resultFormFields').style.display = 'none';
    document.getElementById('resultFormError').textContent = '';

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('rResultDate').value = today;

    resetFileSelection();
    document.getElementById('saveResultBtn').disabled = true;

    document.getElementById('resultModal').style.display = 'flex';
    setTimeout(() => document.getElementById('bookingSearchInput').focus(), 100);
  }

  function closeResultModal() {
    document.getElementById('resultModal').style.display = 'none';
    selectedBooking = null;
    selectedFile = null;
  }

  // ============ البحث عن الحجز (Live Search) ============
  const searchInput = document.getElementById('bookingSearchInput');
  const searchResults = document.getElementById('bookingSearchResults');
  let bookingSearchTimeout;

  searchInput.addEventListener('input', () => {
    clearTimeout(bookingSearchTimeout);
    const q = searchInput.value.trim();

    if (q.length < 2) {
      searchResults.style.display = 'none';
      return;
    }

    bookingSearchTimeout = setTimeout(() => performSearch(q), 300);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#bookingSearchResults') &&
        !e.target.closest('#bookingSearchInput')) {
      searchResults.style.display = 'none';
    }
  });

  searchInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = searchInput.value.trim();
      if (!code) return;

      searchResults.style.display = 'none';
      const errorEl = document.getElementById('bookingSearchError');
      errorEl.textContent = 'جاري البحث...';
      errorEl.style.color = '#718096';

      try {
        const booking = await findBookingByCode(code);
        if (!booking) {
          errorEl.textContent = 'مفيش حجز بالكود ده';
          errorEl.style.color = '#e05260';
          return;
        }
        selectBooking(booking);
      } catch (err) {
        errorEl.textContent = 'خطأ: ' + err.message;
        errorEl.style.color = '#e05260';
      }
    }
  });

  async function performSearch(query) {
    try {
      const results = await searchBookings(query);

      if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-empty">مفيش نتائج</div>';
        searchResults.style.display = 'block';
        return;
      }

      searchResults.innerHTML = results.map(b => `
        <div class="search-result-item" data-id="${b.id}">
          <div class="search-result-icon">📅</div>
          <div class="search-result-info">
            <div class="search-result-name">${b.patient_name}</div>
            <div class="search-result-meta">
              <code>${b.booking_code}</code> • ${b.patient_phone || 'بدون هاتف'}
            </div>
          </div>
          <div class="search-result-status status-badge-${b.status}">
            ${translateBookingStatus(b.status)}
          </div>
        </div>
      `).join('');

      searchResults.style.display = 'block';

      searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const booking = results.find(r => r.id == item.dataset.id);
          selectBooking(booking);
        });
      });

    } catch (err) {
      console.error(err);
    }
  }

  function selectBooking(booking) {
    selectedBooking = booking;

    document.getElementById('bookingSearchError').textContent = '';
    searchResults.style.display = 'none';
    searchInput.value = '';

    document.getElementById('foundBookingName').textContent = booking.patient_name;
    document.getElementById('foundBookingMeta').textContent =
      `${booking.booking_code} • ${booking.patient_phone || 'بدون هاتف'}`;
    document.getElementById('bookingFoundBox').style.display = 'block';
    document.getElementById('resultFormFields').style.display = 'block';
    updateSaveButton();
  }

  document.getElementById('clearBookingBtn').addEventListener('click', () => {
    selectedBooking = null;
    document.getElementById('bookingSearchInput').value = '';
    document.getElementById('bookingFoundBox').style.display = 'none';
    document.getElementById('resultFormFields').style.display = 'none';
    document.getElementById('bookingSearchError').textContent = '';
    updateSaveButton();
  });

  // ============ إدارة الملف ============
  const dropZone = document.getElementById('fileDropZone');
  const fileInput = document.getElementById('resultFile');

  dropZone.addEventListener('click', (e) => {
    if (e.target.closest('#removeFileBtn')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });

  function handleFileSelect(file) {
    const errorEl = document.getElementById('resultFormError');

    if (file.type !== 'application/pdf') {
      errorEl.textContent = 'الملف لازم يكون PDF';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      errorEl.textContent = 'حجم الملف أكبر من 10 ميجا';
      return;
    }

    selectedFile = file;
    errorEl.textContent = '';

    document.getElementById('fileDropContent').style.display = 'none';
    document.getElementById('fileSelected').style.display = 'flex';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatSize(file.size);

    updateSaveButton();
  }

  function resetFileSelection() {
    selectedFile = null;
    fileInput.value = '';
    document.getElementById('fileDropContent').style.display = 'block';
    document.getElementById('fileSelected').style.display = 'none';
  }

  document.getElementById('removeFileBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    resetFileSelection();
    updateSaveButton();
  });

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' بايت';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' ك.ب';
    return (bytes / (1024 * 1024)).toFixed(2) + ' م.ب';
  }

  function updateSaveButton() {
    const btn = document.getElementById('saveResultBtn');
    const valid = selectedBooking && selectedFile && document.getElementById('rResultDate').value;
    btn.disabled = !valid;
  }

  document.getElementById('rResultDate').addEventListener('change', updateSaveButton);

  // ============ حفظ النتيجة ============
  document.getElementById('saveResultBtn').addEventListener('click', async () => {
    if (!selectedBooking || !selectedFile) return;

    const btn = document.getElementById('saveResultBtn');
    const errorEl = document.getElementById('resultFormError');
    const progress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('uploadProgressBar');

    btn.disabled = true;
    btn.textContent = 'جاري الرفع...';
    errorEl.textContent = '';
    progress.style.display = 'block';
    progressBar.style.width = '30%';

    try {
      // 1. ارفع الملف
      const { path } = await uploadResultFile(
        selectedFile,
        selectedBooking.booking_code
      );
      progressBar.style.width = '70%';

      // 2. سجّل في جدول النتائج
      await createResult({
        booking_id: selectedBooking.id,      // ✅ الربط بالحجز
        patient_id: null,                     // ممكن نسيبه فاضي
        file_name: selectedFile.name,
        file_path: path,
        result_date: document.getElementById('rResultDate').value,
        test_type: document.getElementById('rTestType').value.trim() || null,
        notes: document.getElementById('rNotes').value.trim() || null
      });

      progressBar.style.width = '100%';

      setTimeout(() => {
        closeResultModal();
        loadStats();
        loadTable();
      }, 400);

    } catch (err) {
      errorEl.textContent = 'فشل الرفع: ' + err.message;
      progress.style.display = 'none';
      progressBar.style.width = '0%';
      btn.disabled = false;
      btn.textContent = 'رفع النتيجة';
    }
  });
}