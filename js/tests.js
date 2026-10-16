// js/tests.js
import { supabase } from './supabase.js';

// ================== دوال مساعدة ==================

export function formatMoney(num) {
  if (num === null || num === undefined) return '0 ج.م';
  return Number(num).toLocaleString('ar-EG') + ' ج.م';
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

// ================== جلب التصنيفات ==================

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('test_categories')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ================== جلب التحاليل ==================

export async function fetchTests(filters = {}) {
  let query = supabase
    .from('tests')
    .select(`
      id, name, price, is_active, description, category_id, created_at,
      test_categories ( id, name )
    `)
    .order('created_at', { ascending: false })
    .limit(500);

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category_id', filters.category);
  }

  if (filters.status === 'active') {
    query = query.eq('is_active', true);
  } else if (filters.status === 'inactive') {
    query = query.eq('is_active', false);
  }

  if (filters.search) {
    const s = `%${filters.search}%`;
    query = query.ilike('name', s);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ================== إحصائيات ==================

export async function fetchTestStats() {
  const [allRes, activeRes, inactiveRes, catRes] = await Promise.all([
    supabase.from('tests').select('id', { count: 'exact', head: true }),
    supabase.from('tests').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('tests').select('id', { count: 'exact', head: true }).eq('is_active', false),
    supabase.from('test_categories').select('id', { count: 'exact', head: true })
  ]);

  return {
    total: allRes.count || 0,
    active: activeRes.count || 0,
    inactive: inactiveRes.count || 0,
    categories: catRes.count || 0
  };
}

// ================== إضافة / تعديل / حذف ==================

export async function createTest(data) {
  const { data: result, error } = await supabase
    .from('tests')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateTest(id, data) {
  const { data: result, error } = await supabase
    .from('tests')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deleteTest(id) {
  const { error } = await supabase
    .from('tests')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function toggleTestActive(id, isActive) {
  const { data, error } = await supabase
    .from('tests')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ================== إدارة التصنيفات ==================

export async function createCategory(data) {
  const { data: result, error } = await supabase
    .from('test_categories')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateCategory(id, data) {
  const { data: result, error } = await supabase
    .from('test_categories')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deleteCategory(id) {
  const { error } = await supabase
    .from('test_categories')
    .delete()
    .eq('id', id);
  if (error) throw error;
}