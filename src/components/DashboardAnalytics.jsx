import { useEffect, useState } from "react";

export default function DashboardAnalytics() {
  const [analytics, setAnalytics] = useState({ total: 0, highRisk: 0, lowRisk: 0 });

  useEffect(() => {
    fetch("http://localhost:8080/api/patient/analytics")
      .then(res => res.json())
      .then(data => setAnalytics(data))
      .catch(() => setAnalytics({ total: 0, highRisk: 0, lowRisk: 0 }));
  }, []);

  return (
    <div className="p-6 grid grid-cols-3 gap-4">
      <div className="bg-green-200 p-4 rounded">
        <h2>Total Patients</h2>
        <p className="text-2xl">{analytics.total}</p>
      </div>
      <div className="bg-red-200 p-4 rounded">
        <h2>High Risk</h2>
        <p className="text-2xl">{analytics.highRisk}</p>
      </div>
      <div className="bg-blue-200 p-4 rounded">
        <h2>Low Risk</h2>
        <p className="text-2xl">{analytics.lowRisk}</p>
      </div>
    </div>
  );
}