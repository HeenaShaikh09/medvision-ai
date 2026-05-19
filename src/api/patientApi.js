import { supabase } from './supabaseClient';

const BASE_URL = `${import.meta.env.VITE_SPRING_URL}/api/patient`;

// ─────────────────────────────────────────────
// AUTH HELPER — attaches Supabase JWT to every request
// ─────────────────────────────────────────────
const authHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ─────────────────────────────────────────────
// REGISTER PATIENT (Supabase Auth + Spring Boot)
// ─────────────────────────────────────────────
export const registerPatient = async ({ name, email, password, age, disease }) => {
  try {
    // 1. Create Supabase auth user
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // 2. Register in Spring Boot backend
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ name, email, password, age, disease }),
    });

    if (!res.ok) throw new Error(`Backend registration failed: ${res.status}`);

    const backendData = await res.json();

    return {
      supabaseUser: data?.user ?? null,
      backendData,
    };
  } catch (err) {
    console.error('Error registering patient:', err);
    throw err;
  }
};

// ─────────────────────────────────────────────
// LOGIN PATIENT (Supabase Auth)
// ─────────────────────────────────────────────
export const loginPatient = async ({ email, password }) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  } catch (err) {
    console.error('Login error:', err);
    throw err;
  }
};

// ─────────────────────────────────────────────
// GET ALL PATIENTS → returns array directly
// ─────────────────────────────────────────────
export const getAllPatients = async () => {
  try {
    const res = await fetch(`${BASE_URL}/all`, {
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch patients: ${res.status}`);
    const data = await res.json();
    // Guarantee we always return an array
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error fetching patients:', err);
    return [];
  }
};

// ─────────────────────────────────────────────
// ADD PATIENT
// ─────────────────────────────────────────────
export const addPatient = async (patient) => {
  try {
    const res = await fetch(`${BASE_URL}/add`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(patient),
    });
    if (!res.ok) throw new Error(`Failed to add patient: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error adding patient:', err);
    throw err;
  }
};

// ─────────────────────────────────────────────
// UPDATE PATIENT
// ─────────────────────────────────────────────
export const updatePatient = async (id, data) => {
  try {
    const res = await fetch(`${BASE_URL}/update/${id}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Update failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error updating patient:', err);
    throw err;
  }
};

// ─────────────────────────────────────────────
// DELETE PATIENT
// ─────────────────────────────────────────────
export const deletePatient = async (id) => {
  try {
    const res = await fetch(`${BASE_URL}/delete/${id}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
    // DELETE returns plain string "Deleted successfully", not JSON
    return true;
  } catch (err) {
    console.error('Error deleting patient:', err);
    throw err;
  }
};

// ─────────────────────────────────────────────
// GET DASHBOARD ANALYTICS → { total, highRisk, lowRisk }
// ─────────────────────────────────────────────
export const getAnalytics = async () => {
  try {
    const res = await fetch(`${BASE_URL}/analytics`, {
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch analytics: ${res.status}`);
    return await res.json(); // { total: N, highRisk: N, lowRisk: N }
  } catch (err) {
    console.error('Analytics error:', err);
    return { total: 0, highRisk: 0, lowRisk: 0 };
  }
};

// ─────────────────────────────────────────────
// AI SUMMARY → returns { summary: "..." }
// ─────────────────────────────────────────────
export const getSummary = async (patient) => {
  try {
    const res = await fetch(`${import.meta.env.VITE_SPRING_URL}/api/ai/summary`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(patient),
    });
    if (!res.ok) throw new Error(`Failed to get AI summary: ${res.status}`);
    return await res.json(); // { summary: "..." } — use as res.summary in caller
  } catch (err) {
    console.error('AI summary error:', err);
    throw err;
  }
};