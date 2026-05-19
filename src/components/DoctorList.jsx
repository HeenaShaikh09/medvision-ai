import { useEffect, useState } from "react";
import { getDoctors } from "../api/doctorApi";

const [symptoms, setSymptoms] = useState("");
const [recommended, setRecommended] = useState("");

const handleAI = async () => {
  const result = await getRecommendation(symptoms);
  setRecommended(result);
};
export default function DoctorList() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const data = await getDoctors();
        setDoctors(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching doctors:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Doctor List</h2>
      <ul>
        {doctors.map((doc) => (
          <li key={doc.id}>
            {doc.name} - {doc.specialization} - Patients: {doc.patientsAssigned || 0}
          </li>
        ))}
      </ul>
    </div>
  );
}