// js/bookings.js
import { supabase } from './supabase.js';

// ================== دوال مساعدة ==================

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatMoney(num) {
  if (num === null || num === undefined) return '0 ج.م';
  return Number(num).toLocaleString('ar-EG') + ' ج.م';
}

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

export function translatePayment(status) {
  const map = {
    'unpaid': 'غير مدفوع',
    'partial': 'مدفوع جزئياً',
    'paid': 'مدفوع',
    'refunded': 'مسترجع'
  };
  return map[status] || status;
}

export function translateSource(source) {
  const map = {
    'online': 'الموقع',
    'in_clinic': 'داخل المعمل',
    'phone': 'هاتف',
    'whatsapp': 'واتساب'
  };
  return map[source] || source;
}

export function translateVisitType(type) {
  const map = {
    'lab': 'في المعمل',
    'home': 'عينة منزلية'
  };
  return map[type] || '—';
}

export function translateGender(g) {
  const map = { 'male': 'ذكر', 'female': 'أنثى', 'other': 'آخر' };
  return map[g] || '—';
}

// ================== جلب الحجوزات ==================

export async function fetchBookings(filters = {}) {
  let query = supabase
    .from('bookings')
    .select(`
      *,
      booking_items ( id, item_type, item_name, unit_price, quantity, line_total )
    `)
    .eq('source', 'online')
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters.search) {
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [allRes, todayRes, pendingRes, completedRes] = await Promise.all([
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('source', 'online'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('source', 'online').gte('created_at', today.toISOString()),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('source', 'online').eq('status', 'pending'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('source', 'online').eq('status', 'completed')
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
      booking_items ( id, item_type, item_name, unit_price, quantity, line_total )
    `)
    .eq('id', bookingId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchBookingDetails(bookingId) {
  return fetchBookingWithItems(bookingId);
}

// ================== حذف حجز ==================

export async function deleteBooking(bookingId) {
  const { error: itemsError } = await supabase
    .from('booking_items')
    .delete()
    .eq('booking_id', bookingId);
  if (itemsError) throw itemsError;

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', bookingId);
  if (error) throw error;
}
