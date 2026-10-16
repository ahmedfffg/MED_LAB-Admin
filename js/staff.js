// js/staff.js
import { supabase } from './supabase.js';

// ================== دوال مساعدة ==================

export function translateRole(role) {
  const map = {
    'admin': 'أدمن',
    'receptionist': 'استقبال',
    'technician': 'فني',
    'viewer': 'مشاهدة فقط'
  };
  return map[role] || role;
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

// ================== جلب الموظفين ==================

export async function fetchStaff(filters = {}) {
  // نستخدم RPC أو join
  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.role && filters.role !== 'all') {
    query = query.eq('role', filters.role);
  }

  if (filters.status === 'active') {
    query = query.eq('is_active', true);
  } else if (filters.status === 'inactive') {
    query = query.eq('is_active', false);
  }

  if (filters.search) {
    const s = `%${filters.search}%`;
    query = query.or(`full_name.ilike.${s},phone.ilike.${s}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchStaffStats() {
  const [allRes, adminsRes, activeRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true)
  ]);

  return {
    total: allRes.count || 0,
    admins: adminsRes.count || 0,
    active: activeRes.count || 0
  };
}

// ================== تعديل موظف ==================

export async function updateStaff(id, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ================== حذف موظف (من profiles فقط) ==================

export async function deleteStaffProfile(id) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ================== تغيير حالة التفعيل ==================

export async function toggleStaffActive(id, isActive) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ================== جلب بيانات موظف واحد ==================

export async function fetchStaffById(id) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}