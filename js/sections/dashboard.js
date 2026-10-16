// js/sections/dashboard.js
import { fetchBookingStats } from '../bookings.js';
import { fetchPatientStats } from '../patients.js';
import { fetchMessageStats } from '../messages.js';

export async function render(container) {
  container.innerHTML = `
    <div class="section-header">
      <h2>لوحة المعلومات</h2>
      <button class="btn-refresh" id="refreshDashboard">🔄 تحديث</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">إجمالي الحجوزات</div><div class="stat-value" id="dashBookingsTotal">—</div></div>
      <div class="stat-card"><div class="stat-label">حجوزات النهاردة</div><div class="stat-value" id="dashBookingsToday">—</div></div>
      <div class="stat-card"><div class="stat-label">إجمالي المرضى</div><div class="stat-value" id="dashPatientsTotal">—</div></div>
      <div class="stat-card"><div class="stat-label">مرضى النهاردة</div><div class="stat-value" id="dashPatientsToday">—</div></div>
      <div class="stat-card"><div class="stat-label">رسائل غير مقروءة</div><div class="stat-value" id="dashMessagesUnread">—</div></div>
      <div class="stat-card"><div class="stat-label">رسائل النهاردة</div><div class="stat-value" id="dashMessagesToday">—</div></div>
    </div>

    <div class="info-box">
      <h3>مرحباً بك في لوحة التحكم</h3>
      <p>من هنا يمكنك إدارة الحجوزات، المرضى، الرسائل، التحاليل، والباقات.</p>
      <p>اختر القسم المطلوب من القائمة الجانبية للبدء.</p>
    </div>
  `;

  async function loadStats() {
    try {
      const [bStats, pStats, mStats] = await Promise.all([
        fetchBookingStats(),
        fetchPatientStats(),
        fetchMessageStats()
      ]);

      document.getElementById('dashBookingsTotal').textContent = bStats.total;
      document.getElementById('dashBookingsToday').textContent = bStats.today;
      document.getElementById('dashPatientsTotal').textContent = pStats.total;
      document.getElementById('dashPatientsToday').textContent = pStats.today;
      document.getElementById('dashMessagesUnread').textContent = mStats.unread;
      document.getElementById('dashMessagesToday').textContent = mStats.today;
    } catch (err) {
      console.error(err);
    }
  }

  loadStats();
  document.getElementById('refreshDashboard').addEventListener('click', loadStats);
}