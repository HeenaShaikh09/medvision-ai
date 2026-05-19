const ExportCSV = ({ data }) => {
  const exportFile = () => {
    const rows = data.map(p =>
      [p.id, p.name, p.email, p.age, p.disease, p.predictedRisk]
    );

    let csv = "ID,Name,Email,Age,Disease,Risk\n";
    rows.forEach(r => {
      csv += r.join(",") + "\n";
    });

    const blob = new Blob([csv]);
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "patients.csv";
    a.click();
  };

  return (
    <button
      onClick={exportFile}
      className="bg-yellow-500 text-white px-3 py-2 rounded mb-3"
    >
      Export CSV
    </button>
  );
};

export default ExportCSV;