import { useState, useEffect } from "react";
import PlannerBoard from "./PlannerBoard";
import { SUPABASE_PUBLIC_BASE } from "./config";

export default function App() {
  const [planning, setPlanning] = useState({});
  const [beschikbaarheid, setBeschikbaarheid] = useState({});
  const [medewerkers, setMedewerkers] = useState([]);
  const [totaleLoonkosten, setTotaleLoonkosten] = useState(0);

  const fetchJSON = async (bestandsnaam, setFunctie) => {
    try {
      const res = await fetch(`${SUPABASE_PUBLIC_BASE}/${bestandsnaam}`);
      if (!res.ok) throw new Error(`${bestandsnaam} niet gevonden`);
      const json = await res.json();
      setFunctie(json);
    } catch (err) {
      console.error(`Fout bij laden van ${bestandsnaam}:`, err);
    }
  };

  useEffect(() => {
    fetchJSON("planning.json", setPlanning);
    fetchJSON("medewerkers.json", setMedewerkers);
    fetchJSON("beschikbaarheid.json", setBeschikbaarheid);
  }, []);

  return (
    <div className="p-4">
      <div className="text-right text-lg font-bold mb-2">
        Totale loonkosten: €{totaleLoonkosten.toFixed(2)}
      </div>

      <PlannerBoard
        medewerkers={medewerkers}
        beschikbaarheid={beschikbaarheid}
        planning={planning}
        setPlanning={setPlanning}
        onTotalLoonkostenChange={setTotaleLoonkosten}
      />
    </div>
  );
}
