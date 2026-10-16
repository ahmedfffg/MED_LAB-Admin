// js/packages.js
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

// ================== جلب الباقات ==================

export async function fetchPackages(filters = {}) {
  let query = supabase
    .from('packages')
    .select(`
      *,
      package_tests ( id, test_id )
    `)
    .order('created_at', { ascending: false })
    .limit(500);

  if (filters.status === 'active') {
    query = query.eq('is_active', true);
  } else if (filters.status === 'inactive') {
    query = query.eq('is_active', false);
  }

  if (filters.search) {
    const s = `%${filters.search}%`;
    query = query.or(`name.ilike.${s},description.ilike.${s}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ================== إحصائيات ==================

export async function fetchPackageStats() {
  const [allRes, activeRes, inactiveRes] = await Promise.all([
    supabase.from('packages').select('id', { count: 'exact', head: true }),
    supabase.from('packages').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('packages').select('id', { count: 'exact', head: true }).eq('is_active', false)
  ]);

  return {
    total: allRes.count || 0,
    active: activeRes.count || 0,
    inactive: inactiveRes.count || 0
  };
}

// ================== إضافة / تعديل / حذف ==================

export async function createPackage(data) {
  const { data: result, error } = await supabase
    .from('packages')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updatePackage(id, data) {
  const { data: result, error } = await supabase
    .from('packages')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deletePackage(id) {
  const { error } = await supabase
    .from('packages')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function togglePackageActive(id, isActive) {
  const { data, error } = await supabase
    .from('packages')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ================== إدارة تحاليل الباقة ==================

export async function fetchPackageTests(packageId) {
  const { data, error } = await supabase
    .from('package_tests')
    .select(`
      id, test_id, sort_order,
      tests ( id, name, price, test_categories ( name ) )
    `)
    .eq('package_id', packageId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addTestToPackage(packageId, testId) {
  const { data, error } = await supabase
    .from('package_tests')
    .insert({ package_id: packageId, test_id: testId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeTestFromPackage(packageTestId) {
  const { error } = await supabase
    .from('package_tests')
    .delete()
    .eq('id', packageTestId);
  if (error) throw error;
}

// ================== جلب كل التحاليل (لاختيار منها) ==================

export async function fetchAllTestsForSelection() {
  const { data, error } = await supabase
    .from('tests')
    .select('id, name, price, test_categories ( name )')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ================== دوال للتعامل مع التحاليل بشكل جماعي ==================

/**
 * استبدال كل تحاليل باقة دفعة واحدة
 * @param {number} packageId
 * @param {number[]} testIds - مصفوفة ids التحاليل المختارة
 */
export async function setPackageTests(packageId, testIds) {
  // 1. امسح كل التحاليل القديمة
  const { error: delError } = await supabase
    .from('package_tests')
    .delete()
    .eq('package_id', packageId);
  if (delError) throw delError;

  // 2. لو مفيش تحاليل مختارة، خلاص
  if (!testIds || testIds.length === 0) return;

  // 3. ضيف التحاليل الجديدة
  const rows = testIds.map((testId, index) => ({
    package_id: packageId,
    test_id: testId,
    sort_order: index
  }));

  const { error: insError } = await supabase
    .from('package_tests')
    .insert(rows);
  if (insError) throw insError;
}

/**
 * جلب كل التحاليل النشطة (للاستخدام في الاختيار المتعدد)
 */
export async function fetchAllActiveTests() {
  const { data, error } = await supabase
    .from('tests')
    .select('id, name, price, test_categories ( name )')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}
