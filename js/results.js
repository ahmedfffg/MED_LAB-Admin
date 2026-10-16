// js/results.js
import { supabase } from './supabase.js';

const BUCKET = 'results';

// ================== دوال مساعدة ==================

export function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function getPublicUrl(filePath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export function translateBookingStatus(s) {
  const map = {
    'pending': 'قيد الانتظار',
    'confirmed': 'مؤكد',
    'in_progress': 'جاري',
    'completed': 'مكتمل',
    'cancelled': 'ملغي'
  };
  return map[s] || s || '—';
}

// ================== البحث عن حجز ==================

/**
 * البحث عن حجز بكود الحجز بالظبط
 */
export async function findBookingByCode(code) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, booking_code, patient_name, patient_phone, patient_email,
      status, total, created_at
    `)
    .eq('booking_code', code.trim())
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * البحث عن حجوزات بالاسم أو الهاتف أو كود الحجز
 */
export async function searchBookings(query) {
  if (!query || query.trim().length < 2) return [];

  const s = `%${query.trim()}%`;
  const { data, error } = await supabase
    .from('bookings')
    .select('id, booking_code, patient_name, patient_phone, status, created_at')
    .or(`booking_code.ilike.${s},patient_name.ilike.${s},patient_phone.ilike.${s}`)
    .order('created_at', { ascending: false })
    .limit(15);

  if (error) throw error;
  return data || [];
}

// ================== رفع ملف ==================

export async function uploadResultFile(file, bookingCode) {
  if (file.type !== 'application/pdf') {
    throw new Error('الملف لازم يكون PDF');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('حجم الملف أكبر من 10 ميجا');
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${bookingCode}/${timestamp}_${safeName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'application/pdf'
    });

  if (error) throw error;

  return {
    path: data.path,
    publicUrl: getPublicUrl(data.path)
  };
}

// ================== إضافة نتيجة ==================

export async function createResult(data) {
  const { data: result, error } = await supabase
    .from('results')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result;
}

// ================== جلب النتائج ==================

export async function fetchResults(filters = {}) {
  let query = supabase
    .from('results')
    .select(`
      id, file_name, file_path, result_date, test_type, notes, created_at,
      patient_id, booking_id,
      bookings ( id, booking_code, patient_name, patient_phone )
    `)
    .order('created_at', { ascending: false })
    .limit(300);

  if (filters.search) {
    const s = `%${filters.search}%`;
    query = query.or(
      `file_name.ilike.${s},test_type.ilike.${s},notes.ilike.${s}`
    );
  }

  if (filters.date) {
    query = query.eq('result_date', filters.date);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchResultStats() {
  const today = new Date().toISOString().split('T')[0];

  const [allRes, todayRes] = await Promise.all([
    supabase.from('results').select('id', { count: 'exact', head: true }),
    supabase.from('results').select('id', { count: 'exact', head: true })
      .eq('result_date', today)
  ]);

  return {
    total: allRes.count || 0,
    today: todayRes.count || 0
  };
}

// ================== حذف نتيجة ==================

export async function deleteResult(id, filePath) {
  if (filePath) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([filePath]);
    if (storageError) console.warn('فشل حذف الملف:', storageError);
  }

  const { error } = await supabase
    .from('results')
    .delete()
    .eq('id', id);
  if (error) throw error;
}