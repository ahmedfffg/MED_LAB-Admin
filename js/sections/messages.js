// js/sections/messages.js
import {
  fetchMessages, fetchMessageStats, markAsRead,
  markAsUnread, deleteMessage, formatDateTime,
  truncate, translateStatus, translateMessageType
} from '../messages.js';

export async function render(container) {
  container.innerHTML = `
    <div class="section-header">
      <h2>الرسائل</h2>
      <button class="btn-refresh" id="refreshMessages">🔄 تحديث</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">الإجمالي</div><div class="stat-value" id="mStatTotal">—</div></div>
      <div class="stat-card"><div class="stat-label">غير مقروءة</div><div class="stat-value" id="mStatUnread">—</div></div>
      <div class="stat-card"><div class="stat-label">مقروءة</div><div class="stat-value" id="mStatRead">—</div></div>
      <div class="stat-card"><div class="stat-label">النهاردة</div><div class="stat-value" id="mStatToday">—</div></div>
    </div>

    <div class="filters-bar">
      <select id="filterMessageStatus">
        <option value="all">الكل</option>
        <option value="unread">غير مقروءة</option>
        <option value="read">مقروءة</option>
        <option value="new">جديدة</option>
        <option value="replied">تم الرد</option>
        <option value="closed">مغلقة</option>
      </select>
      <input type="text" id="searchMessages" placeholder="ابحث بالاسم / الإيميل / الموضوع...">
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>الحالة</th>
            <th>النوع</th>
            <th>الاسم</th>
            <th>الإيميل</th>
            <th>الهاتف</th>
            <th>الموضوع</th>
            <th>مقتطف</th>
            <th>التاريخ</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody id="messagesTableBody">
          <tr><td colspan="9" class="empty-row">جاري التحميل...</td></tr>
        </tbody>
      </table>
    </div>

    <div class="modal-overlay" id="messageModal" style="display:none;">
      <div class="modal-box">
        <div class="modal-header">
          <h3 id="msgModalTitle">تفاصيل الرسالة</h3>
          <button class="modal-close" id="closeMsgModal">✕</button>
        </div>
        <div class="modal-body" id="msgModalBody"></div>
        <div class="modal-actions" style="padding: 1rem 1.5rem; flex-wrap: wrap; gap: 0.5rem;">
          <button type="button" class="btn-delete" id="deleteMsgBtn">حذف</button>
          <button type="button" class="btn-secondary" id="markReadBtn">تعليم كمقروءة</button>
          <button type="button" class="btn-primary" id="markRepliedBtn">تم الرد</button>
        </div>
      </div>
    </div>
  `;

  loadStats();
  loadTable();

  document.getElementById('refreshMessages').addEventListener('click', () => {
    loadStats();
    loadTable();
  });

  document.getElementById('filterMessageStatus').addEventListener('change', loadTable);

  let searchTimeout;
  document.getElementById('searchMessages').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadTable, 400);
  });

  document.getElementById('closeMsgModal').addEventListener('click', closeMsgModal);
  document.getElementById('messageModal').addEventListener('click', (e) => {
    if (e.target.id === 'messageModal') closeMsgModal();
  });

  async function loadStats() {
    try {
      const s = await fetchMessageStats();
      document.getElementById('mStatTotal').textContent = s.total;
      document.getElementById('mStatUnread').textContent = s.unread;
      document.getElementById('mStatRead').textContent = s.read;
      document.getElementById('mStatToday').textContent = s.today;
    } catch (err) { console.error(err); }
  }

  async function loadTable() {
    const tbody = document.getElementById('messagesTableBody');
    tbody.innerHTML = '<tr><td colspan="9" class="empty-row">جاري التحميل...</td></tr>';

    const filters = {
      status: document.getElementById('filterMessageStatus').value,
      search: document.getElementById('searchMessages').value.trim()
    };

    try {
      const messages = await fetchMessages(filters);

      if (messages.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-row">مفيش رسائل مطابقة</td></tr>';
        return;
      }

      tbody.innerHTML = messages.map(m => `
        <tr class="${m.status === 'new' ? 'row-unread' : ''}">
          <td>
            <span class="badge badge-msg-${m.status || 'new'}">
              ${translateStatus(m.status)}
            </span>
          </td>
          <td>${translateMessageType(m.message_type)}</td>
          <td>${m.name || '—'}</td>
          <td>${m.email || '—'}</td>
          <td>${m.phone || '—'}</td>
          <td>${m.subject || '—'}</td>
          <td class="msg-preview">${truncate(m.message, 50)}</td>
          <td class="date-cell">${formatDateTime(m.created_at)}</td>
          <td>
            <button class="btn-view" data-action="view" data-id="${m.id}">عرض</button>
            <button class="btn-delete" data-action="delete" data-id="${m.id}">حذف</button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const action = btn.dataset.action;
          const msg = messages.find(m => m.id == id);

          if (action === 'view') {
            await openMessage(msg);
          } else if (action === 'delete') {
            if (confirm(`متأكد إنك عايز تحذف رسالة "${msg.name}"؟`)) {
              try {
                await deleteMessage(id);
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
      tbody.innerHTML = `<tr><td colspan="9" class="empty-row error">فشل التحميل: ${err.message}</td></tr>`;
    }
  }

  async function openMessage(msg) {
    // لو جديدة، علّمها كمقروءة تلقائياً
    if (msg.status === 'new') {
      try {
        await markAsRead(msg.id);
        msg.status = 'read';
        loadStats();
        loadTable();
      } catch (err) { console.error(err); }
    }

    document.getElementById('msgModalTitle').textContent = msg.subject || 'رسالة بدون موضوع';
    document.getElementById('msgModalBody').innerHTML = `
      <div class="msg-detail">
        <p><strong>الاسم:</strong> ${msg.name || '—'}</p>
        <p><strong>الإيميل:</strong> ${msg.email || '—'}</p>
        <p><strong>الهاتف:</strong> ${msg.phone || '—'}</p>
        <p><strong>النوع:</strong> ${translateMessageType(msg.message_type)}</p>
        <p><strong>الحالة:</strong> ${translateStatus(msg.status)}</p>
        <p><strong>التاريخ:</strong> ${formatDateTime(msg.created_at)}</p>
        <hr>
        <p class="msg-full-text">${(msg.message || '').replace(/\n/g, '<br>')}</p>
        ${msg.admin_reply ? `
          <hr>
          <p><strong>رد الإدارة:</strong></p>
          <p class="msg-full-text" style="background:#f0fdf4;">${msg.admin_reply.replace(/\n/g, '<br>')}</p>
          <p style="font-size:0.85rem;color:#718096;">تاريخ الرد: ${formatDateTime(msg.replied_at)}</p>
        ` : ''}
      </div>
    `;

    // زر تعليم كمقروءة
    const readBtn = document.getElementById('markReadBtn');
    if (msg.status === 'new') {
      readBtn.style.display = 'inline-block';
      readBtn.onclick = async () => {
        try {
          await markAsRead(msg.id);
          loadStats();
          loadTable();
          closeMsgModal();
        } catch (err) {
          alert('فشل التحديث: ' + err.message);
        }
      };
    } else {
      readBtn.style.display = 'none';
    }

    // زر تم الرد
    document.getElementById('markRepliedBtn').onclick = async () => {
      try {
        await markAsRead(msg.id);
        const { error } = await supabase
          .from('contact_messages')
          .update({ status: 'replied', replied_at: new Date().toISOString() })
          .eq('id', msg.id);
        if (error) throw error;
        loadStats();
        loadTable();
        closeMsgModal();
      } catch (err) {
        alert('فشل التحديث: ' + err.message);
      }
    };

    // زر الحذف
    document.getElementById('deleteMsgBtn').onclick = async () => {
      if (confirm(`متأكد إنك عايز تحذف رسالة "${msg.name}"؟`)) {
        try {
          await deleteMessage(msg.id);
          closeMsgModal();
          loadStats();
          loadTable();
        } catch (err) {
          alert('فشل الحذف: ' + err.message);
        }
      }
    };

    document.getElementById('messageModal').style.display = 'flex';
  }

  function closeMsgModal() {
    document.getElementById('messageModal').style.display = 'none';
  }
}