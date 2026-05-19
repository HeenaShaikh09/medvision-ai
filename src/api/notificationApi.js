// src/api/notificationApi.js
// ── BIGINT version — your doctors/patients use numeric bigint IDs ──

import { supabase } from "../supabaseClient";

// ── Helper: safely parse bigint ID ───────────────────────────
// Your Spring Boot tables use auto-increment bigint, NOT uuid.
// This strips the "doctorId:role" format your app sometimes uses.
const toInt = (id) => {
  if (id == null) return null;
  const n = parseInt(String(id).split(":")[0], 10);
  return isNaN(n) ? null : n;
};

// ───────────────────────────────────────────────────
// CREATE NOTIFICATIONS
// ───────────────────────────────────────────────────

export async function createReportReadyNotification({
  doctorId, patientId, patientName, riskScore,
}) {
  const dId = toInt(doctorId);
  const pId = toInt(patientId);

  const rows = [];

  // Doctor notification
  if (dId) {
    rows.push({
      type: "report_ready",
      title: `📋 AI Report Ready — ${patientName || "Patient"}`,
      message: `Risk score: ${riskScore ?? "?"}/8. Tap to review and verify.`,
      doctor_id: dId,
      patient_id: pId,
      is_read: false,
      action_url: `/doctor-dashboard/verify/${pId}`,
      action_label: "Review now",
    });
  }

  // Patient notification — THIS IS WHAT WAS MISSING
  if (pId) {
    rows.push({
      type: "report_ready",
      title: `📋 Your AI Report is Ready`,
      message: `Risk score: ${riskScore ?? "?"}/8. Pending doctor review.`,
      doctor_id: dId,
      patient_id: pId,
      is_read: false,
      action_url: `/my-health/reports`,
      action_label: "View report",
    });
  }

  if (rows.length === 0) return;
  const { error } = await supabase.from("notifications").insert(rows);
  if (error) console.error("createReportReadyNotification:", error.message);
}

export async function createHighRiskAlert({
  doctorId, patientId, patientName, riskScore,
}) {
  const { error } = await supabase.from("notifications").insert([{
    type: "high_risk_alert",
    title: `🚨 High Risk — ${patientName || "Patient"}`,
    message: `Critical score: ${riskScore}/8. Immediate review required.`,
    doctor_id: toInt(doctorId),
    patient_id: toInt(patientId),
    is_read: false,
    action_url: `/doctor-dashboard`,
    action_label: "View urgently",
  }]);
  if (error) console.error("createHighRiskAlert:", error.message);
}

export async function createVerifiedNotification({
  doctorId, patientId, patientName, doctorName,
}) {
  const dId = toInt(doctorId);
  const pId = toInt(patientId);

  // Two rows: doctor gets confirmation, patient gets their result
  const { error } = await supabase.from("notifications").insert([
    {
      type: "report_verified",
      title: `✅ Report Verified`,
      message: `You verified ${patientName || "the patient"}'s report.`,
      doctor_id: dId,
      patient_id: pId,
      is_read: false,
      action_url: `/doctor-dashboard`,
      action_label: "Back to queue",
    },
    {
      type: "report_verified",
      title: `✅ Report Doctor-Verified`,
      message: `Dr. ${doctorName || "your doctor"} verified your health report. Tap to view.`,
      doctor_id: dId,
      patient_id: pId,
      is_read: false,
      action_url: `/my-health/reports`,
      action_label: "See report",
    },
  ]);
  if (error) console.error("createVerifiedNotification:", error.message);
}

export async function createAppointmentNotification({
  patientId, doctorName, date, time,
}) {
  const { error } = await supabase.from("notifications").insert([{
    type: "appointment_booked",
    title: `📅 Appointment Confirmed`,
    message: `Appointment with Dr. ${doctorName} on ${date} at ${time}.`,
    patient_id: toInt(patientId),
    is_read: false,
    action_url: `/my-health/appointments`,
    action_label: "View appointment",
  }]);
  if (error) console.error("createAppointmentNotification:", error.message);
}

// ───────────────────────────────────────────────────
// FETCH
// ───────────────────────────────────────────────────

export async function getDoctorNotifications(doctorId) {
  const dId = toInt(doctorId);
  if (!dId) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("doctor_id", dId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) { console.error("getDoctorNotifications:", error.message); return []; }
  return data || [];
}

export async function getPatientNotifications(patientId) {
  const pId = toInt(patientId);
  if (!pId) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("patient_id", pId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) { console.error("getPatientNotifications:", error.message); return []; }
  return data || [];
}

export async function getUnreadCount(role, userId) {
  const id = toInt(userId);
  if (!id) return 0;
  const column = role === "patient" ? "patient_id" : "doctor_id";
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq(column, id)
    .eq("is_read", false);
  if (error) return 0;
  return count || 0;
}

// ───────────────────────────────────────────────────
// UPDATE / DELETE
// ───────────────────────────────────────────────────

export async function markRead(notificationId) {
  if (!notificationId) return;
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
  if (error) console.error("markRead:", error.message);
}

export async function markAllRead(role, userId) {
  const id = toInt(userId);
  if (!id) return;
  const column = role === "patient" ? "patient_id" : "doctor_id";
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq(column, id)
    .eq("is_read", false);
  if (error) console.error("markAllRead:", error.message);
}

export async function deleteNotification(id) {
  if (!id) return;
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id);
  if (error) console.error("deleteNotification:", error.message);
}

// ───────────────────────────────────────────────────
// REALTIME
// ───────────────────────────────────────────────────

export function subscribeToNotifications(role, userId, callback) {
  const id = toInt(userId);
  if (!id) return () => {};

  const column = role === "patient" ? "patient_id" : "doctor_id";
  const channelName = `notif-${role}-${id}`; // unique per user — fixes shared channel bug

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `${column}=eq.${id}`,
      },
      (payload) => {
        if (payload.new) callback(payload.new);
      }
    )
    .subscribe((status) => {
      console.log(`Realtime [${channelName}]:`, status);
    });

  return () => supabase.removeChannel(channel);
}
