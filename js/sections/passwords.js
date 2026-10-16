// js/sections/passwords.js
import { supabase } from '../supabase.js';

export async function render(container) {
  // ✅ التحقق من الدور
  const role = window.currentUser?.role || 'viewer';
  const isAdmin = role === 'admin';
  const canViewPasswords = role === 'admin' || role === 'technician' || role === 'receptionist';
  const canChangePassword = role === 'admin'; // تغيير كلمة المرور للأدمن فقط

  // لو viewer أو مش مصرح له، نعرض رسالة
  if (!canViewPasswords) {
    container.innerHTML = `
      <div class="section-header">
        <h2>كلمات سر الحجوزات</h2>
      </div>
      <div class="info-box" style="border-right-color:#e05260; text-align:center; padding:3rem 1.5rem;">
        <div style="font-size:3rem; margin-bottom:1rem;">🔒</div>
        <h3 style="color:#e05260;">غير مصرح لك بالوصول لهذا القسم</h3>
        <p style="color:#718b9b;">تواصل مع الأدمن لو محتاج صلاحيات إضافية.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="section-header">
      <h2>كلمات سر الحجوزات</h2>
      <button class="btn-refresh" id="refreshPasswords">🔄 تحديث</button>
    </div>

    <div class="info-box" style="margin-bottom:1.5rem;">
      <h3>ℹ️ إزاي يستلم المريض نتايجه؟</h3>
      <p>1. المريض بيحجز من الموقع، وبيجيله <strong>كود الحجز</strong> + <strong>كلمة مرور</strong> تلقائياً في شاشة التأكيد.</p>
      <p>2. هنا تقدر تشوف كل الحجوزات وكلمات المرور بتاعتها، وتديلها للمريض لو نساها.</p>
      <p>3. المريض بيروح لصفحة "استلام النتائج" ويدخل <strong>الكود + كلمة المرور</strong> عشان يشوف نتايجه.</p>
    </div>

    <div class="stats-grid" style="margin-bottom:1.5rem;">
      <div class="stat-card"><div class="stat-label">إجمالي الحجوزات</div><div class="stat-value" id="pwStatTotal">—</div></div>
      <div class="stat-card"><div class="stat-label">عندها كلمة مرور</div><div class="stat-value" id="pwStatWithPw">—</div></div>
      <div class="stat-card"><div class="stat-label">بدون كلمة مرور</div><div class="stat-value" id="pwStatWithoutPw">—</div></div>
    </div>

    <div class="filters-bar">
      <input type="text" id="searchPwBookings" placeholder="ابحث بكود الحجز / اسم المريض / الهاتف...">
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>كود الحجز</th>
            <th>المريض</th>
            <th>الهاتف</th>
            <th>كلمة المرور</th>
            <th>تاريخ التعيين</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody id="passwordsTableBody">
          <tr><td colspan="6" class="empty-row">جاري التحميل...</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Modal عرض/تعديل كلمة المرور -->
    <div class="modal-overlay" id="pwModal" style="display:none;">
      <div class="modal-box" style="max-width:640px;">
        <div class="modal-header">
          <h3 id="pwModalTitle">كلمة مرور الحجز</h3>
          <button class="modal-close" id="closePwModal">✕</button>
        </div>
        <div class="modal-body">
          <!-- بيانات الحجز -->
          <div class="form-group">
            <label>كود الحجز</label>
            <input type="text" id="pwModalCode" readonly style="direction:ltr; text-align:center; font-family:monospace; font-weight:700;">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>اسم المريض</label>
              <input type="text" id="pwModalPatient" readonly>
            </div>
            <div class="form-group">
              <label>الهاتف</label>
              <input type="text" id="pwModalPhone" readonly>
            </div>
          </div>

          <!-- كلمة المرور الحالية -->
          <hr style="margin: 1.5rem 0; border: none; border-top: 1px dashed #dde9ef;">

          <div style="background:#f0f9ff; padding:1rem 1.25rem; border-radius:12px; border-right:4px solid #0b8bb8; margin-bottom:1.25rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
              <i class="fas fa-lock" style="color:#0b8bb8;"></i>
              <strong style="color:#0b8bb8;">كلمة المرور الحالية</strong>
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center;">
              <input 
                type="text" 
                id="pwModalPassword" 
                readonly 
                style="flex:1; direction:ltr; text-align:center; font-family:monospace; font-weight:800; letter-spacing:3px; font-size:1.1rem; background:#fff; border:1.5px solid #cfe0f0; color:#076d92;"
              >
              <button 
                type="button" 
                class="btn-secondary" 
                id="copyOldPwBtn" 
                style="width:auto; white-space:nowrap;"
                title="نسخ كلمة المرور الحالية"
              >
                📋 نسخ
              </button>
            </div>
          </div>

          <!-- تغيير كلمة المرور -->
          ${canChangePassword ? `
          <div style="background:#fffaf0; padding:1rem 1.25rem; border-radius:12px; border-right:4px solid #e89b1f;">
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
              <i class="fas fa-key" style="color:#e89b1f;"></i>
              <strong style="color:#e89b1f;">تغيير كلمة المرور (اختياري)</strong>
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
              <input 
                type="text" 
                id="pwModalNewPassword" 
                placeholder="اكتب كلمة مرور جديدة..." 
                style="flex:1; min-width:180px; direction:ltr; text-align:center; font-family:monospace; letter-spacing:2px; font-size:1rem;"
              >
              <button 
                type="button" 
                class="btn-secondary" 
                id="generateNewPwBtn" 
                style="width:auto; white-space:nowrap;"
                title="توليد كلمة مرور عشوائية"
              >
                🎲 توليد
              </button>
              <button 
                type="button" 
                class="btn-secondary" 
                id="copyNewPwBtn" 
                style="width:auto; white-space:nowrap;"
                title="نسخ كلمة المرور الجديدة"
              >
                📋 نسخ
              </button>
            </div>
            <small style="display:block; margin-top:0.5rem; color:#8a5a1a;">
              💡 اتركها فاضية لو مش عايز تغيّر كلمة المرور الحالية
            </small>
          </div>
          ` : `
          <div style="background:#f5f5f5; padding:1rem 1.25rem; border-radius:12px; border-right:4px solid #718b9b; text-align:center;">
            <i class="fas fa-info-circle" style="color:#718b9b;"></i>
            <p style="color:#718b9b; margin:0.5rem 0 0; font-size:0.9rem;">
              صلاحية تغيير كلمة المرور متاحة للأدمن فقط
            </p>
          </div>
          `}

          <p id="pwModalError" class="error-msg" style="margin-top:1rem;"></p>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancelPwModal">إغلاق</button>
          ${canChangePassword ? `
          <button type="button" class="btn-primary" id="savePwBtn">💾 حفظ التغييرات</button>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  let allBookings = [];
  let currentBooking = null;

  loadStats();
  loadTable();

  // ============================================
  // الأحداث
  // ============================================
  document.getElementById('refreshPasswords').addEventListener('click', () => {
    loadStats();
    loadTable();
  });

  let searchTimeout;
  document.getElementById('searchPwBookings').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadTable, 400);
  });

  document.getElementById('closePwModal').addEventListener('click', closePwModal);
  document.getElementById('cancelPwModal').addEventListener('click', closePwModal);
  document.getElementById('pwModal').addEventListener('click', (e) => {
    if (e.target.id === 'pwModal') closePwModal();
  });

  // زر نسخ كلمة المرور القديمة
  document.getElementById('copyOldPwBtn').addEventListener('click', () => {
    copyToClipboard(document.getElementById('pwModalPassword').value, 'كلمة المرور الحالية');
  });

  // زر نسخ كلمة المرور الجديدة (لو موجود)
  const copyNewPwBtn = document.getElementById('copyNewPwBtn');
  if (copyNewPwBtn) {
    copyNewPwBtn.addEventListener('click', () => {
      const newPw = document.getElementById('pwModalNewPassword').value.trim();
      if (!newPw) {
        alert('⚠️ مفيش كلمة مرور جديدة مكتوبة. اكتب أو اضغط "توليد" الأول.');
        return;
      }
      copyToClipboard(newPw, 'كلمة المرور الجديدة');
    });
  }

  // زر توليد (لو موجود)
  const generateBtn = document.getElementById('generateNewPwBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      const newPw = generatePassword();
      document.getElementById('pwModalNewPassword').value = newPw;
      // animation بسيطة
      const inp = document.getElementById('pwModalNewPassword');
      inp.style.background = '#fff9d6';
      setTimeout(() => { inp.style.background = ''; }, 600);
    });
  }

  // زر حفظ (لو موجود)
  const saveBtn = document.getElementById('savePwBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveNewPassword);
  }

  // ============================================
  // الدوال
  // ============================================
  async function copyToClipboard(text, label) {
    if (!text || text === '— لم تُعيَّن —') {
      alert('مفيش ' + label + ' للنسخ');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      // feedback بصري
      const btn = event?.target?.closest('button');
      if (btn) {
        const original = btn.innerHTML;
        btn.innerHTML = '✓ تم النسخ';
        btn.style.background = '#d4f5e9';
        btn.style.color = '#1a5a3a';
        setTimeout(() => {
          btn.innerHTML = original;
          btn.style.background = '';
          btn.style.color = '';
        }, 1500);
      } else {
        alert('✓ تم نسخ ' + label);
      }
    } catch (err) {
      alert('فشل النسخ: ' + err.message);
    }
  }

  async function loadStats() {
    try {
      const { count: total } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true });

      const { count: withPw } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .not('password_hash', 'is', null);

      const { count: withoutPw } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .is('password_hash', null);

      document.getElementById('pwStatTotal').textContent = total || 0;
      document.getElementById('pwStatWithPw').textContent = withPw || 0;
      document.getElementById('pwStatWithoutPw').textContent = withoutPw || 0;
    } catch (err) {
      console.error('فشل تحميل الإحصائيات:', err);
    }
  }

  async function loadTable() {
    const tbody = document.getElementById('passwordsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">جاري التحميل...</td></tr>';

    const search = document.getElementById('searchPwBookings').value.trim();

    try {
      let query = supabase
        .from('bookings')
        .select('id, booking_code, patient_name, patient_phone, password_plain, password_hash, password_set_at, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (search) {
        const s = `%${search}%`;
        query = query.or(
          `booking_code.ilike.${s},patient_name.ilike.${s},patient_phone.ilike.${s}`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      allBookings = data || [];

      if (allBookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-row">مفيش حجوزات مطابقة</td></tr>';
        return;
      }

      tbody.innerHTML = allBookings.map(b => `
        <tr>
          <td><code>${b.booking_code || '—'}</code></td>
          <td>${b.patient_name || '—'}</td>
          <td>${b.patient_phone || '—'}</td>
          <td>
            ${b.password_plain
              ? `<span style="background:#d4f5e9;color:#1a5a3a;padding:0.25rem 0.7rem;border-radius:8px;font-family:monospace;font-weight:700;letter-spacing:1px;font-size:0.85rem;">${b.password_plain}</span>`
              : '<span class="badge badge-unpaid">بدون كلمة مرور</span>'}
          </td>
          <td class="date-cell">${b.password_set_at ? formatDateShort(b.password_set_at) : '—'}</td>
          <td>
            <button class="btn-view" data-action="view" data-id="${b.id}">عرض</button>
            <button class="btn-view" data-action="copy" data-id="${b.id}" style="background:#14a085;">📋 نسخ</button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const action = btn.dataset.action;
          const booking = allBookings.find(b => b.id == id);

          if (action === 'view') {
            openPwModal(booking);
          } else if (action === 'copy') {
            if (booking.password_plain) {
              navigator.clipboard.writeText(
                `كود الحجز: ${booking.booking_code}\nكلمة المرور: ${booking.password_plain}`
              ).then(() => {
                // feedback بصري على الزر
                const original = btn.innerHTML;
                btn.innerHTML = '✓ تم';
                setTimeout(() => { btn.innerHTML = original; }, 1200);
              }).catch(() => {
                alert('فشل النسخ');
              });
            } else {
              alert('مفيش كلمة مرور لهذا الحجز');
            }
          }
        });
      });

    } catch (err) {
      console.error('فشل تحميل الحجوزات:', err);
      tbody.innerHTML = `<tr><td colspan="6" class="empty-row error">فشل التحميل: ${err.message}</td></tr>`;
    }
  }

  function openPwModal(booking) {
    currentBooking = booking;

    document.getElementById('pwModalTitle').textContent = `كلمة مرور: ${booking.patient_name}`;
    document.getElementById('pwModalCode').value = booking.booking_code || '';
    document.getElementById('pwModalPatient').value = booking.patient_name || '';
    document.getElementById('pwModalPhone').value = booking.patient_phone || '';
    document.getElementById('pwModalPassword').value = booking.password_plain || '— لم تُعيَّن —';

    const newPwField = document.getElementById('pwModalNewPassword');
    if (newPwField) newPwField.value = '';

    document.getElementById('pwModalError').textContent = '';
    document.getElementById('pwModalError').style.color = '';

    document.getElementById('pwModal').style.display = 'flex';
  }

  function closePwModal() {
    document.getElementById('pwModal').style.display = 'none';
    currentBooking = null;
  }

  async function saveNewPassword() {
    if (!currentBooking) return;

    const newPwField = document.getElementById('pwModalNewPassword');
    if (!newPwField) return;

    const newPw = newPwField.value.trim();
    const errEl = document.getElementById('pwModalError');
    const btn = document.getElementById('savePwBtn');

    if (!newPw) {
      errEl.textContent = 'اكتب كلمة مرور جديدة أو اضغط "توليد"';
      errEl.style.color = '#e05260';
      newPwField.focus();
      return;
    }

    if (newPw.length < 6) {
      errEl.textContent = 'كلمة المرور لازم تكون 6 حروف/أرقام على الأقل';
      errEl.style.color = '#e05260';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    errEl.textContent = '';
    errEl.style.color = '';

    try {
      const { data, error } = await supabase.rpc('set_booking_password_secure', {
        p_booking_code: currentBooking.booking_code,
        p_password: newPw
      });

      if (error) throw error;

      if (data === true) {
        errEl.textContent = '✓ تم حفظ كلمة المرور بنجاح';
        errEl.style.color = '#14a085';

        // ✅ تحديث كلمة المرور القديمة في المودال (بتظهر دلوقتي كجديدة)
        document.getElementById('pwModalPassword').value = newPw;

        // تفريغ حقل الجديدة
        newPwField.value = '';

        // تحديث الجدول بعد ثانية
        setTimeout(() => {
          loadStats();
          loadTable();
        }, 800);

        // إغلاق المودال بعد 1.2 ثانية
        setTimeout(() => {
          closePwModal();
        }, 1400);
      } else {
        errEl.textContent = 'فشل الحفظ: الحجز مش موجود';
        errEl.style.color = '#e05260';
      }

    } catch (err) {
      errEl.textContent = 'خطأ: ' + err.message;
      errEl.style.color = '#e05260';
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 حفظ التغييرات';
    }
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRTUVWXY346789';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }
}