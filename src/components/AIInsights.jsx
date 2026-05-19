import { useEffect, useState } from "react";

export default function AIInsights() {
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/api/patient/all")
      .then(res => res.json())
      .then(data => setPatients(data));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">AI Insights</h2>
      <table className="w-full border text-center">
        <thead className="bg-gray-200">
          <tr>
            <th>Name</th>
            <th>Disease</th>
            <th>Predicted Risk</th>
          </tr>
        </thead>
        <tbody>
          {patients.map(p => (
            <tr key={p.id} className="border">
              <td>{p.name}</td>
              <td>{p.disease}</td>
              <td>{p.predictedRisk === 1 ? "High" : "Low"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}