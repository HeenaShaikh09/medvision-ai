const PatientModal = ({ patient, onClose }) => {
  if (!patient) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
      <div className="bg-white p-5 rounded w-96">
        <h2 className="text-xl font-bold mb-2">{patient.name}</h2>
        <p>Email: {patient.email}</p>
        <p>Age: {patient.age}</p>
        <p>Disease: {patient.disease}</p>
        <p>Risk: {patient.predictedRisk ? "High" : "Low"}</p>

        <button
          className="mt-3 bg-red-500 text-white px-3 py-1 rounded"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default PatientModal;