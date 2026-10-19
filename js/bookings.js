// js/bookings.js
import { supabase } from './supabase.js';

// ================== دوال مساعدة ==================

// تنسيق التاريخ
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// تنسيق المبلغ
export function formatMoney(num) {
  if (num === null || num === undefined) return '0 ج.م';
  return Number(num).toLocaleString('ar-EG') + ' ج.م';
}

// ترجمة حالة الحجز
export function translateStatus(status) {
  const map = {
    'pending': 'قيد الانتظار',
    'confirmed': 'مؤكد',
    'in_progress': 'جاري',
    'completed': 'مكتمل',
    'cancelled': 'ملغي'
  };
  return map[status] || status;
}

// ترجمة حالة الدفع
export function translatePayment(status) {
  const map = {
    'unpaid': 'غير مدفوع',
    'partial': 'مدفوع جزئياً',
    'paid': 'مدفوع',
    'refunded': 'مسترجع'
  };
  return map[status] || status;
}

// ترجمة مصدر الحجز
export function translateSource(source) {
  const map = {
    'online': 'الموقع',
    'in_clinic': 'داخل المعمل',
    'phone': 'هاتف',
    'whatsapp': 'واتساب'
  };
  return map[source] || source;
}

// ================== جلب الحجوزات ==================

/**
 * جلب الحجوزات مع الفلترة + كل تفاصيل التحاليل المختارة
 * ✅ لوحة إدارة الموقع تعرض حجوزات الموقع فقط (online)
 * ✅ كل حجز بييجي معاه booking_items كاملة
 * @param {Object} filters - { status, search }
 */
export async function fetchBookings(filters = {}) {
  let query = supabase
    .from('bookings')
    .select(`
      *,
      booking_items ( id, item_type, item_name, unit_price, quantity, line_total )
    `)
    .eq('source', 'online')  // ✅ الموقع فقط
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters.search) {
    // البحث في اسم المريض أو رقم الهاتف أو كود الحجز
    const s = `%${filters.search}%`;
    query = query.or(
      `patient_name.ilike.${s},patient_phone.ilike.${s},booking_code.ilike.${s}`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error('خطأ في جلب الحجوزات:', error);
    throw error;
  }
  return data || [];
}

// ================== إحصائيات ==================

export async function fetchBookingStats() {
  // النهاردة (من بداية اليوم)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [allRes, todayRes, pendingRes, completedRes] = await Promise.all([
    // ✅ الموقع فقط
    supabase.from('bookings').select('id', { count: 'exact', head: true })
      .eq('source', 'online'),
    // ✅ الموقع فقط + النهاردة
    supabase.from('bookings').select('id', { count: 'exact', head: true })
      .eq('source', 'online')
      .gte('created_at', today.toISOString()),
    // ✅ الموقع فقط + pending
    supabase.from('bookings').select('id', { count: 'exact', head: true })
      .eq('source', 'online')
      .eq('status', 'pending'),
    // ✅ الموقع فقط + completed
    supabase.from('bookings').select('id', { count: 'exact', head: true })
      .eq('source', 'online')
      .eq('status', 'completed')
  ]);

  return {
    total: allRes.count || 0,
    today: todayRes.count || 0,
    pending: pendingRes.count || 0,
    completed: completedRes.count || 0
  };
}

// ================== تعديل الحجز ==================

export async function updateBookingStatus(bookingId, newStatus) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: newStatus })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ================== جلب تفاصيل حجز واحد ==================

export async function fetchBookingDetails(bookingId) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_items (
        id, item_type, item_name, unit_price, quantity, line_total
      )
    `)
    .eq('id', bookingId)
    .single();

  if (error) throw error;
  return data;
}

// ================== تعديل حجز ==================

export async function updateBooking(bookingId, updates) {
  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ================== جلب تفاصيل حجز كاملة ==================

export async function fetchBookingWithItems(bookingId) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_items (
        id, item_type, item_name, unit_price, quantity, line_total
      )
    `)
    .eq('id', bookingId)
    .single();

  if (error) throw error;
  return data;
}

// ================== حذف حجز ==================

export async function deleteBooking(bookingId) {
  // 1. امسح تفاصيل الحجز (booking_items) الأول
  const { error: itemsError } = await supabase
    .from('booking_items')
    .delete()
    .eq('booking_id', bookingId);

  if (itemsError) throw itemsError;

  // 2. امسح الحجز نفسه
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', bookingId);

  if (error) throw error;
}
