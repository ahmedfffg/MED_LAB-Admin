// js/messages.js
import { supabase } from './supabase.js';

// ================== دوال مساعدة ==================

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function truncate(text, max = 60) {
  if (!text) return '—';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

export function translateStatus(status) {
  const map = {
    'new': 'جديدة',
    'read': 'مقروءة',
    'replied': 'تم الرد',
    'closed': 'مغلقة'
  };
  return map[status] || status || '—';
}

export function translateMessageType(type) {
  const map = {
    'contact': 'تواصل',
    'inquiry': 'استفسار',
    'complaint': 'شكوى',
    'suggestion': 'اقتراح',
    'booking': 'حجز'
  };
  return map[type] || type || '—';
}

// ================== جلب الرسائل ==================

export async function fetchMessages(filters = {}) {
  let query = supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (filters.search) {
    const s = `%${filters.search}%`;
    query = query.or(
      `name.ilike.${s},email.ilike.${s},subject.ilike.${s},phone.ilike.${s}`
    );
  }

  if (filters.status === 'unread') {
    query = query.eq('status', 'new');
  } else if (filters.status === 'read') {
    query = query.neq('status', 'new');
  } else if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchMessageStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [allRes, unreadRes, readRes, todayRes] = await Promise.all([
    supabase.from('contact_messages').select('id', { count: 'exact', head: true }),
    supabase.from('contact_messages').select('id', { count: 'exact', head: true })
      .eq('status', 'new'),
    supabase.from('contact_messages').select('id', { count: 'exact', head: true })
      .neq('status', 'new'),
    supabase.from('contact_messages').select('id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
  ]);

  return {
    total: allRes.count || 0,
    unread: unreadRes.count || 0,
    read: readRes.count || 0,
    today: todayRes.count || 0
  };
}

// ================== تعديل / حذف ==================

export async function updateMessageStatus(id, newStatus) {
  const { data, error } = await supabase
    .from('contact_messages')
    .update({ status: newStatus })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markAsRead(id) {
  return updateMessageStatus(id, 'read');
}

export async function markAsUnread(id) {
  return updateMessageStatus(id, 'new');
}

export async function deleteMessage(id) {
  const { error } = await supabase
    .from('contact_messages')
    .delete()
    .eq('id', id);
  if (error) throw error;
}