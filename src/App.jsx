import { useState, useEffect } from "react";
import PlannerBoard from "./PlannerBoard";
import { SUPABASE_PROJECT_URL } from "./config";

export default function App() {
  const [planning, setPlanning] = useState({});
  const [beschikbaarheid, setBeschikbaarheid] = useState({});
  const [medewerkers, setMedewerkers] = useState([]);
  const [totaleLoonkosten, setTotaleLoonkosten] = useState(0);

  const fetchJSON = async (bestandsnaam, setFunctie) => {
    const SUPABASE_PUBLIC_BASE = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/plannerdata`;
    const url = `${SUPABASE_PUBLIC_BASE}/${bestandsnaam}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${bestandsnaam} niet gevonden`);
      const json = await res.json();
      setFunctie(json);
    } catch (err) {
      console.error(`❌ Fout bij laden van ${bestandsnaam}:`, err.message);
      alert(`Fout bij ophalen van ${bestandsnaam}`);
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
