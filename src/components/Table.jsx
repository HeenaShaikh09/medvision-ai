// src/components/Table.jsx
export default function Table({ columns, data }) {
  return (
    <table className="min-w-full bg-white shadow rounded-lg">
      <thead className="bg-gray-100">
        <tr>
          {columns.map((col) => (
            <th key={col} className="py-2 px-4 text-left">{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx} className="border-t hover:bg-gray-50">
            {columns.map((col) => (
              <td key={col} className="py-2 px-4">{row[col.toLowerCase()]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}