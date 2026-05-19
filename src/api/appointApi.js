// src/api/appointmentApi.js
import { supabase } from './supabaseClient';

const BASE    = `${import.meta.env.VITE_SPRING_URL}/api/appointment`;
const AI_BASE = `${import.meta.env.VITE_SPRING_URL}/api/ai`;
const authHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ── CRUD ──────────────────────────────────────────────────────────

export const getAllAppointments = async () => {
  try {
    const res = await fetch(`${BASE}/all`, { headers: await authHeaders() });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('getAllAppointments error:', err);
    return [];
  }
};

// FIXED: was POST /api/appointment/book → correct endpoint is /create
export const bookAppointment = async (payload) => {
  const res = await fetch(`${BASE}/create`, {
    method:  'POST',
    headers: await authHeaders(),
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Book failed: ${res.status}`);
  return res.json();
};

// FIXED: was PUT /api/appointment/update/{id} → correct endpoint is /status/{id}
// Backend accepts the full payload and reads whatever fields it needs (status, etc.)
export const updateAppointment = async (id, payload) => {
  const res = await fetch(`${BASE}/status/${id}`, {
    method:  'PUT',
    headers: await authHeaders(),
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Update failed: ${res.status}`);
  return res.json();
};

// FIXED: was DELETE /api/appointment/cancel/{id}
// Backend has no DELETE — cancellation is a status update: PUT /status/{id} { status: "cancelled" }
export const cancelAppointment = async (id) => {
  const res = await fetch(`${BASE}/status/${id}`, {
    method:  'PUT',
    headers: await authHeaders(),
    body:    JSON.stringify({ status: 'cancelled' }),
  });
  if (!res.ok) throw new Error(`Cancel failed: ${res.status}`);
  return true;
};

export const getAppointmentsByPatient = async (patientId) => {
  try {
    const res = await fetch(`${BASE}/patient/${patientId}`, { headers: await authHeaders() });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('getAppointmentsByPatient error:', err);
    return [];
  }
};

// ── AI: parse voice/text input → appointment object ───────────────
// FIXED: handles 503 (FastAPI down) gracefully instead of crashing.
// Never throws — always returns a usable object.
export const aiParseAppointment = async (text) => {
  try {
    const res = await fetch(`${AI_BASE}/parse-appointment`, {
      method:  'POST',
      headers: await authHeaders(),
      body:    JSON.stringify({ text }),
    });

    // 503 = FastAPI is down; backend returns structured JSON — don't throw
    if (res.status === 503) {
      console.warn('[AI] parse-appointment: AI service unavailable (503)');
      return { ...parseAppointmentLocally(text), aiUnavailable: true };
    }

    if (!res.ok) throw new Error(`${res.status}`);

    const data = await res.json();
    return { success: true, ...data };

  } catch (err) {
    console.warn('[AI] parse-appointment failed:', err.message);
    return { ...parseAppointmentLocally(text), aiUnavailable: true };
  }
};

// ── AI: suggest best available slot ───────────────────────────────
// FIXED: was POST /api/ai/suggest-slot → backend endpoint is GET /api/ai/suggest-slot
// Never throws — returns a local fallback slot on any error.
export const aiSuggestSlot = async (specialization, urgency = 'routine', doctorId = null) => {
  try {
    const params = new URLSearchParams({
      urgency,
      ...(specialization ? { specialization } : {}),
      ...(doctorId       ? { doctorId       } : {}),
    });

    const res = await fetch(`${AI_BASE}/suggest-slot?${params.toString()}`, {
      method:  'GET',
      headers: await authHeaders(),
    });

    if (!res.ok) {
      console.warn(`[AI] suggest-slot responded ${res.status} — using local fallback`);
      return suggestSlotLocally(urgency);
    }

    const data = await res.json();

    // Normalise: backend returns { suggestedTime, date } → map to { date, time }
    return {
      date:    data.date          || suggestSlotLocally(urgency).date,
      time:    data.suggestedTime || data.time || suggestSlotLocally(urgency).time,
      message: data.available ? 'AI-suggested slot' : 'Next available slot',
    };

  } catch (err) {
    console.warn('[AI] suggest-slot failed:', err.message);
    return suggestSlotLocally(urgency);
  }
};

// ── Client-side NLP fallback ──────────────────────────────────────
// Used when FastAPI is down so the voice assistant still works.
function parseAppointmentLocally(text) {
  const t = text.toLowerCase();
  const result = {
    patientName:    null,
    doctorName:     null,
    specialization: null,
    date:           null,
    time:           null,
    reason:         null,
    urgency:        'routine',
    aiUnavailable:  true,
  };

  // Urgency
  if (t.includes('urgent') || t.includes('emergency') || t.includes('immediately'))
    result.urgency = 'urgent';
  else if (t.includes('follow'))
    result.urgency = 'follow-up';

  // Specialization
  const specMap = {
    'heart|chest|cardiac|cardio':        'Cardiology',
    'brain|neuro|headache|migraine':     'Neurology',
    'skin|rash|derm':                    'Dermatology',
    'bone|joint|ortho|fracture':         'Orthopedics',
    'child|baby|pediatric|kid':          'Pediatrics',
    'cancer|onco|tumor':                 'Oncology',
    'lung|asthma|breath|pulmo':          'Pulmonology',
    'stomach|gastro|digest|liver':       'Gastroenterology',
    'eye|vision|ophthal':                'Ophthalmology',
    'ear|nose|throat|ent|sinus':         'ENT Specialist',
    'mental|anxiety|depression|psychi':  'Psychiatry',
    'diabetes|thyroid|endo|hormone':     'Endocrinology',
    'kidney|urology|urine|bladder':      'Urology',
  };
  for (const [keys, spec] of Object.entries(specMap)) {
    if (new RegExp(keys).test(t)) { result.specialization = spec; break; }
  }
  if (!result.specialization) result.specialization = 'General Physician';

  // Patient name — "for [Name]" pattern
  const nameMatch = text.match(/\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (nameMatch) result.patientName = nameMatch[1];

  // Date
  const today = new Date();
  if (t.includes('today')) {
    result.date = formatDate(today);
  } else if (t.includes('tomorrow')) {
    const d = new Date(); d.setDate(d.getDate() + 1);
    result.date = formatDate(d);
  } else {
    const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    for (let i = 0; i < days.length; i++) {
      if (t.includes(days[i])) {
        const d = new Date();
        const target = (i + 1) % 7;
        let diff = target - d.getDay();
        if (diff <= 0) diff += 7;
        d.setDate(d.getDate() + diff);
        result.date = formatDate(d);
        break;
      }
    }
    // ISO date YYYY-MM-DD or DD/MM/YYYY
    const isoMatch   = text.match(/\d{4}-\d{2}-\d{2}/);
    const slashMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (isoMatch)        result.date = isoMatch[0];
    else if (slashMatch) result.date = `${slashMatch[3]}-${slashMatch[2].padStart(2,'0')}-${slashMatch[1].padStart(2,'0')}`;
  }

  // Time — e.g. "at 10am", "at 2:30pm"
  const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1]);
    const m = timeMatch[2] || '00';
    const ampm = timeMatch[3].toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    result.time = `${String(h).padStart(2,'0')}:${m}`;
  }

  // Reason — after "for", "regarding", "about", "because of"
  const reasonMatch = text.match(/(?:for|regarding|about|because of)\s+([^,.]+)/i);
  if (reasonMatch) result.reason = reasonMatch[1].trim();

  return result;
}

function suggestSlotLocally(urgency) {
  const d = new Date();
  if (urgency === 'urgent') {
    d.setDate(d.getDate() + 1);
    return { date: formatDate(d), time: '09:00', message: 'Earliest available slot for urgent case' };
  }
  d.setDate(d.getDate() + 3);
  return { date: formatDate(d), time: '11:00', message: 'Next available routine slot' };
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}