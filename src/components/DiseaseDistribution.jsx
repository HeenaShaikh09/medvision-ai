import { useEffect, useState } from "react";

export default function DiseaseDistribution() {
  const [distribution, setDistribution] = useState({});

  useEffect(() => {
    fetch("http://localhost:8080/api/patient/all")
      .then(res => res.json())
      .then(data => {
        const dist = {};
        data.forEach(p => {
          dist[p.disease] = (dist[p.disease] || 0) + 1;
        });
        setDistribution(dist);
      });
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Disease Distribution</h2>
      <ul>
        {Object.entries(distribution).map(([disease, count]) => (
          <li key={disease}>{disease}: {count}</li>
        ))}
      </ul>
    </div>
  );
}   