import { useState } from "react";

export default function BestelApp() {
  const [leverancier, setLeverancier] = useState("Profi Gelato");
  const [profi, setProfi] = useState({});
  const [hanos, setHanos] = useState({});

  const profiProducten = [
    { naam: "Hazelnootpasta", prijs: 108 },
    { naam: "Pistachepasta", prijs: 108 },
    { naam: "Vanillepasta", prijs: 196.6 },
    { naam: "Kwarkpoeder 1 kg", prijs: 30.5 },
    { naam: "Limoncello", prijs: 17.8 },
  ];

  const hanosProducten = [
    { naam: "Friese Vlag Prof. lang houdbaar vol", prijs: 1.55 },
    { naam: "Bakgember Shavings /POLAK", prijs: 1.78 },
    { naam: "Fudge Caramel" },
    { naam: "Ananaspuree" },
    { naam: "Peerpuree" },
  ];

  const generateWhatsappText = () => {
    const items = Object.entries(profi)
      .filter(([_, aantal]) => aantal && aantal > 0)
      .map(([naam, aantal]) => `- ${naam}: ${aantal}`)
      .join("\n");
    return `Hallo, hierbij mijn bestelling voor Profi Gelato:\n${items}`;
  };

  const renderProductList = (producten, state, setState) => (
    <div className="space-y-2">
      {producten.map((item) => (
        <div key={item.naam} className="flex justify-between items-center gap-2">
          <span>{item.naam}</span>
          <input
            type="number"
            min="0"
            className="w-20 p-1 border rounded"
            value={state[item.naam] || ""}
            onChange={(e) =>
              setState({ ...state, [item.naam]: parseInt(e.target.value) || "" })
            }
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">📦 Bestellingen</h1>

      <div className="flex gap-4">
        <button
          onClick={() => setLeverancier("Profi Gelato")}
          className={\`p-2 rounded \${leverancier === "Profi Gelato" ? "bg-green-500 text-white" : "bg-gray-200"}\`}
        >
          Profi Gelato
        </button>
        <button
          onClick={() => setLeverancier("Hanos")}
          className={\`p-2 rounded \${leverancier === "Hanos" ? "bg-blue-500 text-white" : "bg-gray-200"}\`}
        >
          Hanos
        </button>
      </div>

      {leverancier === "Profi Gelato" && (
        <div>
          <h2 className="text-xl font-semibold">🟢 Profi Gelato</h2>
          {renderProductList(profiProducten, profi, setProfi)}
          <a
            href={\`https://wa.me/?text=\${encodeURIComponent(generateWhatsappText())}\`}
            target="_blank"
            className="block mt-2 bg-green-500 text-white text-center p-2 rounded"
          >
            Verstuur via WhatsApp
          </a>
        </div>
      )}

      {leverancier === "Hanos" && (
        <div>
          <h2 className="text-xl font-semibold">🛒 Hanos (looproute)</h2>
          {renderProductList(hanosProducten, hanos, setHanos)}
        </div>
      )}
    </div>
  );
}
