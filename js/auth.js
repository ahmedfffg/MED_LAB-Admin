// js/auth.js
import { supabase } from './supabase.js';   // ← استيراد مرة واحدة بس

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session.user;
}
