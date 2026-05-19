export default function Card({ title, value, icon, bgColor, textColor }) {
  return (
    <div className={`${bgColor} ${textColor} shadow rounded-lg p-5 flex items-center justify-between`}>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <span className="text-4xl">{icon}</span>
    </div>
  );
}