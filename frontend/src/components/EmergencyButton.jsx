export default function EmergencyButton({ active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "darkred" : "red",
        color: "white",
        width: "100%",
        padding: "15px",
        fontSize: "18px",
      }}
    >
      {active ? "Emergency Active" : "Emergency Mode"}
    </button>
  );
}
