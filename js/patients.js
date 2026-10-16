// js/patients.js
import { supabase } from './supabase.js';

// ================== دوال مساعدة ==================

export function translateGender(g) {
  const map = { 'male': 'ذكر', 'female': 'أنثى', 'other': 'آخر' };
  return map[g] || '—';
}

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

// ================== جلب المرضى ==================

export async function fetchPatients(filters = {}) {
  let query = supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (filters.search) {
    const s = `%${filters.search}%`;
    query = query.or(
      `full_name.ilike.${s},phone.ilike.${s},patient_code.ilike.${s},email.ilike.${s},national_id.ilike.${s}`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchPatientStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [allRes, todayRes, maleRes, femaleRes] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true }),
    supabase.from('patients').select('id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString()),
    supabase.from('patients').select('id', { count: 'exact', head: true })
      .eq('gender', 'male'),
    supabase.from('patients').select('id', { count: 'exact', head: true })
      .eq('gender', 'female')
  ]);

  return {
    total: allRes.count || 0,
    today: todayRes.count || 0,
    male: maleRes.count || 0,
    female: femaleRes.count || 0
  };
}

// ================== إضافة / تعديل ==================

export async function createPatient(data) {
  const { data: result, error } = await supabase
    .from('patients')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updatePatient(id, data) {
  const { data: result, error } = await supabase
    .from('patients')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

// ================== حجوزات مريض معين ==================

export async function fetchPatientBookings(patientId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, booking_code, status, total, paid_amount, created_at, scheduled_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ================== نتائج مريض معين ==================

export async function fetchPatientResults(patientId) {
  const { data, error } = await supabase
    .from('results')
    .select('id, file_name, test_type, result_date, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ================== إحصائيات مفصلة لمريض ==================

export async function fetchPatientDetailedStats(patientId) {
  const [bookingsRes, resultsRes] = await Promise.all([
    supabase.from('bookings').select('total, paid_amount, status')
      .eq('patient_id', patientId),
    supabase.from('results').select('id', { count: 'exact', head: true })
      .eq('patient_id', patientId)
  ]);

  const bookings = bookingsRes.data || [];
  const totalSpent = bookings.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
  const totalPaid = bookings.reduce((sum, b) => sum + (Number(b.paid_amount) || 0), 0);
  const completed = bookings.filter(b => b.status === 'completed').length;

  return {
    bookingsCount: bookings.length,
    completedBookings: completed,
    totalSpent,
    totalPaid,
    remaining: totalSpent - totalPaid,
    resultsCount: resultsRes.count || 0
  };
}

// ================== حذف مريض (متكامل) ==================

/**
 * حذف مريض وكل ما يتعلق به:
 * 1. حذف النتائج من Storage
 * 2. حذف النتائج من جدول results
 * 3. حذف booking_items للحجوزات
 * 4. حذف الحجوزات
 * 5. حذف المريض نفسه
 */
export async function deletePatientCompletely(patientId) {
  // 1. جلب النتائج عشان نحذف الملفات من Storage
  const { data: results } = await supabase
    .from('results')
    .select('id, file_path')
    .eq('patient_id', patientId);

  // 2. جلب الحجوزات عشان نحذف الـ items
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('patient_id', patientId);

  const bookingIds = (bookings || []).map(b => b.id);

  // 3. حذف الملفات من Storage
  if (results && results.length > 0) {
    const filePaths = results
      .map(r => r.file_path)
      .filter(Boolean);

    if (filePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('results')
        .remove(filePaths);

      if (storageError) {
        console.warn('⚠️ فشل حذف بعض الملفات من Storage:', storageError);
      }
    }
  }

  // 4. حذف booking_items للحجوزات
  if (bookingIds.length > 0) {
    const { error: itemsError } = await supabase
      .from('booking_items')
      .delete()
      .in('booking_id', bookingIds);

    if (itemsError) throw itemsError;
  }

  // 5. حذف الحجوزات
  const { error: bookingsError } = await supabase
    .from('bookings')
    .delete()
    .eq('patient_id', patientId);

  if (bookingsError) throw bookingsError;

  // 6. حذف النتائج من الجدول
  const { error: resultsError } = await supabase
    .from('results')
    .delete()
    .eq('patient_id', patientId);

  if (resultsError) throw resultsError;

  // 7. حذف المريض
  const { error: patientError } = await supabase
    .from('patients')
    .delete()
    .eq('id', patientId);

  if (patientError) throw patientError;

  return true;
}

/**
 * حذف مريض بدون حجوزاته ونتائجه (soft delete - بس يحذف من patients)
 * الحجوزات هتبقى patient_id = NULL
 */
export async function deletePatientOnly(patientId) {
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', patientId);
  if (error) throw error;
  return true;
}