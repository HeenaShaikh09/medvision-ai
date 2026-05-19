import React from "react";

const SearchFilter = ({ search, setSearch, risk, setRisk }) => {
  return (
    <div className="flex gap-4 mb-4">
      <input
        type="text"
        placeholder="Search patient..."
        className="p-2 border rounded w-1/2"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <select
        className="p-2 border rounded"
        value={risk}
        onChange={(e) => setRisk(e.target.value)}
      >
        <option value="all">All</option>
        <option value="high">High Risk</option>
        <option value="low">Low Risk</option>
      </select>
    </div>
  );
};

export default SearchFilter;