// src/api/reportApi.js
// ── MedVision AI — Fully aligned with "AI Integrated Healthcare
//    for Predictive Diagnosis & Intelligent Decision Support"
// ─────────────────────────────────────────────────────────────

import { supabase } from './supabaseClient';

const SPRING = `${import.meta.env.VITE_SPRING_URL}/api/report`;
const AI     = `${import.meta.env.VITE_FASTAPI_URL}/report`;
// ── Auth helper ───────────────────────────────────────────────
const hdrs = async () => {
  const { data } = await supabase.auth.getSession();
  const tok = data?.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
  };
};

const post = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST', headers: await hdrs(), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

const get = async (url) => {
  const res = await fetch(url, { headers: await hdrs() });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

// ════════════════════════════════════════════════════════════
// SPRING BOOT — structured patient/doctor data
// ════════════════════════════════════════════════════════════

export const getPatientReport  = (id)  => get(`${SPRING}/patient/${id}`);
export const getDoctorReport   = (id)  => get(`${SPRING}/doctor/${id}`);
export const getTrendReport    = ()    => get(`${SPRING}/trends`);
export const getApptAnalytics  = ()    => get(`${SPRING}/appointments`);
export const getPredictionLog  = ()    => get(`${SPRING}/audit`);

// ════════════════════════════════════════════════════════════
// PYTHON FASTAPI — AI / Predictive Intelligence Layer
// ════════════════════════════════════════════════════════════

/**
 * PREDICTIVE DIAGNOSIS
 * Core "predictive diagnosis" feature — takes patient symptoms,
 * vitals, history and returns differential diagnosis list with
 * probability scores, risk pathway, and follow-up recommendation.
 *
 * Returns:
 * {
 *   riskScore: 5,
 *   riskLevel: "High Risk",
 *   clinicalSummary: "...",
 *   differentialDiagnosis: [
 *     { condition: "Type 2 Diabetes", probability: 0.87, icd10: "E11" },
 *     { condition: "Metabolic Syndrome", probability: 0.71, icd10: "E88.81" }
 *   ],
 *   riskPathway: "Obesity → Insulin resistance → Hyperglycemia → Diabetes",
 *   factorBreakdown: { "Age > 60": 2, "Chronic disease": 2, "Fever": 1 },
 *   recommendedSpecialist: "Endocrinology",
 *   followUpDays: 14,
 *   urgencyFlag: "urgent" | "routine",
 *   drugInteractions: [],
 *   triageScore: 65
 * }
 */
export const getAiPatientReport = (patient, appointments = []) =>
  post(`${AI}/patient-risk`, { patient, appointments });

/**
 * DRUG INTERACTION CHECK
 * Checks a list of medication names against known interactions.
 * Returns alerts for dangerous combinations.
 *
 * Returns:
 * {
 *   hasInteractions: true,
 *   alerts: [
 *     { drug1: "Metformin", drug2: "Glipizide", severity: "high",
 *       effect: "Hypoglycemia risk", action: "Monitor blood glucose" }
 *   ]
 * }
 */
export const checkDrugInteractions = (medications, patientId) =>
  post(`${AI}/drug-interactions`, { medications, patient_id: patientId });

/**
 * VITALS TREND ANALYSIS
 * Analyses patient visit history to show predictive trend —
 * is the patient getting better or worse over time?
 *
 * Returns:
 * {
 *   trend: "deteriorating" | "stable" | "improving",
 *   trendScore: -2,    // negative = getting worse
 *   visitHistory: [
 *     { date: "2026-03-01", riskScore: 2, symptoms: ["Fever"] },
 *     { date: "2026-04-01", riskScore: 4, symptoms: ["Fever","Fatigue"] },
 *   ],
 *   prediction: "Risk score likely to reach 6/8 within 60 days without intervention",
 *   recommendedAction: "Book follow-up within 14 days"
 * }
 */
export const getVitalsTrend = (patientId, visitHistory) =>
  post(`${AI}/vitals-trend`, { patient_id: patientId, visit_history: visitHistory });

/**
 * COHORT / POPULATION ANALYSIS
 * AI narrative summary of a filtered patient cohort.
 * Used in Custom Analysis tab.
 */
export const getCohortAnalysis = (patients, filters = {}) =>
  post(`${AI}/cohort-analysis`, { patients, ...filters });

/**
 * DOCTOR DAILY BRIEF
 * AI summary for a doctor at start of shift:
 * "You have 8 patients today. 2 are high risk. Patient Farhat Khan
 *  needs immediate attention. Recommended: start with ward round B."
 *
 * This was defined but NEVER CALLED — now wired into the overview tab.
 */
export const getDailyBrief = (doctorName, appointmentsToday, highRiskPatients, newPatients) =>
  post(`${AI}/daily-brief`, {
    doctor_name:          doctorName,
    appointments_today:   appointmentsToday,
    high_risk_patients:   highRiskPatients,
    new_patients:         newPatients,
  });

/**
 * PREDICTION AUDIT TRAIL
 * Analyses past AI predictions vs actual doctor diagnoses.
 * Shows model accuracy over time — critical for ABDM compliance.
 *
 * Returns:
 * {
 *   totalPredictions: 45,
 *   correct: 38,
 *   accuracy: 84.4,
 *   modelDrift: "stable",
 *   topMissedConditions: ["PCOD", "Hypothyroidism"]
 * }
 */
export const getPredictionAudit = (predictions) =>
  post(`${AI}/prediction-audit`, { predictions });

/**
 * DISEASE OUTBREAK DETECTION
 * Flags if >30% of patients share the same diagnosis —
 * signals a potential outbreak for public health notification.
 */
export const checkOutbreak = (patients) =>
  post(`${AI}/outbreak-check`, patients);

/**
 * SPECIALIST MATCHING
 * Given symptoms and diagnosis, returns the best-matched
 * specialist from the available doctors list.
 */
export const matchSpecialist = (symptoms, diagnosis, doctors) =>
  post(`${AI}/match-specialist`, { symptoms, diagnosis, doctors });

/**
 * FOLLOW-UP RECOMMENDATION
 * Based on risk score and condition, calculates optimal
 * follow-up interval in days.
 */
export const getFollowUpRecommendation = (patient, riskScore, condition) =>
  post(`${AI}/follow-up`, { patient, risk_score: riskScore, condition });

/** Check Python AI service is alive */
export const checkAiHealth = async () => {
  try {
    const r = await fetch('http://localhost:8001/health');
    return r.ok;
  } catch { return false; }
};
