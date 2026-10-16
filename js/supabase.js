// js/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://rlkqifdteyccagpdtdmu.supabase.co';  // ← حط رابط مشروعك
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsa3FpZmR0ZXljY2FncGR0ZG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2OTQ5NTMsImV4cCI6MjEwNDI3MDk1M30.8iTALoynQXd6T3Is0-xAcoSGWXtkYMHJ2kReDUwQksw';  // ← حط المفتاح العام

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);