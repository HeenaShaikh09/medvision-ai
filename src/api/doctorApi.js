// src/api/doctorApi.js

import { supabase } from "./supabaseClient";

const BASE = `${import.meta.env.VITE_SPRING_URL}/api`;

// ── Auth headers ────────────────────────────────────────────────
const hdrs = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ── Helpers ─────────────────────────────────────────────────────
const get = async (url) => {
  const res = await fetch(url, { headers: await hdrs() });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

const post = async (url, body) => {
  const res = await fetch(url, {
    method: "POST",
    headers: await hdrs(),
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const text = await res.text();
  return text ? JSON.parse(text) : true;
};

const put = async (url, body) => {
  const res = await fetch(url, {
    method: "PUT",
    headers: await hdrs(),
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const text = await res.text();
  return text ? JSON.parse(text) : true;
};

const del = async (url) => {
  const res = await fetch(url, {
    method: "DELETE",
    headers: await hdrs(),
  });

  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return true;
};

// ── Doctors ─────────────────────────────────────────────────────
export const getDoctors    = ()        => get(`${BASE}/doctors/all`);
export const getDoctorById = (id)      => get(`${BASE}/doctors/${id}`);
export const addDoctor     = (doc)     => post(`${BASE}/doctors/add`, doc);
export const updateDoctor  = (id, doc) => put(`${BASE}/doctors/update/${id}`, doc);
export const deleteDoctor  = (id)      => del(`${BASE}/doctors/delete/${id}`);

// ── Patients ────────────────────────────────────────────────────
export const getPatientsByDoctor = (doctorId) =>
  get(`${BASE}/patient/by-doctor/${doctorId}`);   // ✅ FIXED

export const getPatientById = (id) =>
  get(`${BASE}/patient/${id}`);

// ── Appointments ────────────────────────────────────────────────
export const getAppointmentsByDoctor = (doctorId) =>
  get(`${BASE}/appointment/by-doctor/${doctorId}`);

export const getTodayAppointments = (doctorId) =>
  get(`${BASE}/appointment/today/${doctorId}`);

export const updateAppointmentStatus = (id, status) =>
  put(`${BASE}/appointment/status/${id}`, { status });

// ── AI ──────────────────────────────────────────────────────────
export const analyzePatient = (patientData) =>
  post(`${BASE}/ai/analyze`, patientData);

export const getAiSummary = (patientData) =>
  post(`${BASE}/ai/summary`, patientData);

// ── Doctor Verification ─────────────────────────────────────────
export const verifyAiReport = (patientId, doctorId, notes) =>
  post(`${BASE}/doctor/verify`, {   // ✅ FIXED
    patientId,
    doctorId,
    notes,
    status: "verified",
  });

export const overrideRisk = (patientId, doctorId, overrideRisk, notes) =>
  post(`${BASE}/doctor/verify`, {   // ✅ FIXED
    patientId,
    doctorId,
    overrideRisk,
    notes,
    status: "overridden",
  });

export const getVerification = (patientId) =>
  get(`${BASE}/doctor/verification/${patientId}`); // ✅ FIXED

// ── Reports ─────────────────────────────────────────────────────
export const getDoctorReport = (doctorId) =>
  get(`${BASE}/report/doctor/${doctorId}`); // ✅ FIXED

export const getPatientReport = (patientId) =>
  get(`${BASE}/report/patient/${patientId}`);