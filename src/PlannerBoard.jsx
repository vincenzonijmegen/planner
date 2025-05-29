// ✅ Complete aangepaste JSX inclusief volledige layout, knoppenstructuur, loonkostenoverzicht en planningsrooster

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

import {
  SUPABASE_PROJECT_URL,
  SUPABASE_API_KEY,
  SUPABASE_BUCKET
} from "./config";

import {
  getShiftCountPerMedewerker,
  importeerBeschikbaarheidKnop,
  importeerLoonkostenKnop
} from "./utils/plannerHelpers";

import { dagMap } from "./utils/dagen";
import { exportToPDF } from "./utils/exportToPDF";
import { kleurSchema } from "./utils/kleurSchema";

const supabase = createClient(SUPABASE_PROJECT_URL, SUPABASE_API_KEY);
const dagen = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const shifts = [1, 2];

export default function PlannerBoard({ beschikbaarheid: beschikbaarheidProp }) {
  const [planning, setPlanning] = useState({});
  const [loonkostenPerUur, setLoonkostenPerUur] = useState({});
  const [popup, setPopup] = useState(null);
  const [localBeschikbaarheid, setLocalBeschikbaarheid] = useState(beschikbaarheidProp);
  const [medewerkers, setMedewerkers] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const shiftCountPerMedewerker = getShiftCountPerMedewerker(planning);

  useEffect(() => {
    async function fetchGegevens() {
      const bestanden = ["planning.json", "beschikbaarheid.json", "loonkosten.json"];
      for (const bestand of bestanden) {
        const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(bestand);
        if (error) {
          if (error.status === 404) {
            console.warn(`⛔ Bestand ${bestand} niet gevonden, wordt overgeslagen.`);
            continue;
          } else {
            console.error(`❌ Fout bij ophalen ${bestand}:`, error.message);
            alert(`Fout bij ophalen van ${bestand}: ${error.message}`);
            continue;
          }
        }
        if (data) {
          const text = await data.text();
          const json = JSON.parse(text);
          if (bestand === "planning.json") setPlanning(json);
          localStorage.setItem("planning", JSON.stringify(json));
          if (bestand === "beschikbaarheid.json") setLocalBeschikbaarheid(json);
          if (bestand === "loonkosten.json") setLoonkostenPerUur(json);
        }
      }
    }
    fetchGegevens();
  }, []);

  useEffect(() => {
    if (!localBeschikbaarheid || Object.keys(localBeschikbaarheid).length === 0) return;

    const gegenereerd = Object.entries(localBeschikbaarheid).map(([naamKey]) => {
      const origineleNaam = naamKey;
      return {
        naam: origineleNaam,
        leeftijd: 18,
        maxShifts: 3
      };
    });

    if (gegenereerd.length > 0) {
      setMedewerkers(gegenereerd);
    }
    setIsLoaded(true);
  }, [localBeschikbaarheid]);

  async function opslaanNaarSupabase() {
    const bestanden = [
      { naam: "planning.json", inhoud: planning },
      { naam: "beschikbaarheid.json", inhoud: localBeschikbaarheid },
      { naam: "loonkosten.json", inhoud: loonkostenPerUur }
    ];

    for (const bestand of bestanden) {
      try {
        const blob = new Blob([JSON.stringify(bestand.inhoud, null, 2)], { type: "application/json" });
        const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(bestand.naam, blob, {
          contentType: "application/json",
          upsert: true
        });
        if (error) {
          console.error(`❌ Fout bij uploaden ${bestand.naam}:`, error.message);
          alert(`Fout bij uploaden van ${bestand.naam}: ${error.message}`);
          return;
        }
      } catch (err) {
        console.error(`❌ Fout tijdens verwerking van ${bestand.naam}:`, err);
        alert(`Verwerkingsfout voor ${bestand.naam}: ${err.message}`);
        return;
      }
    }
    alert("✅ Alles succesvol opgeslagen naar Supabase!");
  }

  if (!isLoaded) return <div className="p-4 text-gray-500">⏳ Bezig met laden...</div>;

  return (
    <div className="p-4 bg-gray-100">
      <div className="flex flex-wrap gap-2 items-center mb-4">
        {importeerBeschikbaarheidKnop(setLocalBeschikbaarheid, setMedewerkers)}
        {React.cloneElement(importeerLoonkostenKnop(setLoonkostenPerUur), {
          className: "bg-blue-600 text-white px-4 py-2 rounded shadow"
        })}
        <button onClick={opslaanNaarSupabase} className="bg-indigo-600 text-white px-4 py-2 rounded shadow">
          💾 Opslaan naar Supabase
        </button>
        <button onClick={() => {
          const blob = new Blob([JSON.stringify(planning, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "planning.json";
          document.body.appendChild(link);
          link.click();
          link.remove();
        }} className="bg-gray-700 text-white px-4 py-2 rounded shadow">
          ⬇️ Download planning.json
        </button>
        <button
          onClick={() =>
            exportToPDF({ medewerkers, planning, beschikbaarheid: localBeschikbaarheid, loonkostenPerUur, shiftCountPerMedewerker })
          }
          className="bg-red-600 text-white px-4 py-2 rounded shadow"
        >
          📄 Exporteer naar PDF
        </button>
        <label className="bg-yellow-600 text-white px-4 py-2 rounded shadow cursor-pointer">
          📂 Importeer planning
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const json = JSON.parse(event.target.result);
                    setPlanning(json);
                    localStorage.setItem("planning", JSON.stringify(json));
                  } catch {
                    alert("Kon planning niet laden, controleer het bestand.");
                  }
                };
                reader.readAsText(file);
              }
            }}
          />
        </label>
      </div>

      {popup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-md w-[400px]">
            <h2 className="font-bold mb-4 text-center">
              {popup.medewerker} - {popup.dag} Shift {popup.shift}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {["ijsbereider", "ijsvoorbereider", "schepper"].flatMap((functie) =>
                ["vast", "standby", "laat"].map((soort) => {
                  const label =
                    soort === "standby"
                      ? `⏱️ ${functie}`
                      : soort === "laat"
                      ? `🌙 ${functie}`
                      : functie;
                  return (
                    <button
                      key={`${functie}-${soort}`}
                      className={`${kleurSchema[functie][soort].tailwind} px-3 py-2 rounded font-medium text-sm`}
                      onClick={() => {
                        const { medewerker, dag, shift } = popup;
                        setPlanning((prev) => {
                          const nieuw = { ...prev };
                          if (!nieuw[medewerker]) nieuw[medewerker] = {};
                          if (!nieuw[medewerker][dag]) nieuw[medewerker][dag] = {};
                          nieuw[medewerker][dag][shift] = { functie, soort };
                          localStorage.setItem("planning", JSON.stringify(nieuw));
                          return nieuw;
                        });
                        setPopup(null);
                      }}
                    >
                      {label}
                    </button>
                  );
                })
              )}
            </div>
            <div className="mt-4 text-center">
              <button onClick={() => setPopup(null)} className="text-gray-600 text-sm underline">
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    {medewerkers.length > 0 && (
        <div className="overflow-x-auto mb-4">
          <table className="text-xs border-collapse w-full bg-white shadow">
            <thead className="sticky top-0 bg-white z-10 shadow-sm">
              <tr>
                <th className="border px-2 py-1 w-60 text-left">Type</th>
                {dagen.map((dag) =>
                  shifts.map((shift) => (
                    <th key={`${dag}-${shift}`} className="border px-2 py-1 text-center" style={{ borderLeftWidth: shift === 1 ? '2px' : undefined }}>
                      {dag} {shift}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-2 py-1 font-semibold bg-gray-100">Totaal ingepland</td>
                {dagen.map((dag) =>
                  shifts.map((shift) => {
                    const totaal = medewerkers.filter((m) => {
                      const entry = planning[m.naam]?.[dag]?.[shift];
                      return entry?.functie === "ijsbereider" || entry?.functie === "ijsvoorbereider" || entry?.functie === "schepper";
                    }).length;
                    return (
                      <td
                        key={`Totaal-${dag}-${shift}`}
                        className="border px-2 py-1 text-center bg-gray-50 font-semibold"
                        style={{ borderLeftWidth: shift === 1 ? '2px' : undefined }}
                      >
                        {totaal}
                      </td>
                    );
                  })
                )}
              </tr>
              {["Bereiders", "Voorbereiders", "Scheppers", "Kosten"].map((type) => (
                <tr key={type}>
                  <td className="border px-2 py-1 font-semibold">{type}</td>
                  {dagen.map((dag) =>
                    shifts.map((shift) => {
                      let value = 0;
                      if (type === "Kosten") {
                        value = medewerkers.reduce((totaal, m) => {
                          const entry = planning[m.naam]?.[dag]?.[shift];
                          if (!entry) return totaal;
                          let uren = 6;
                          if (entry.soort === "standby") uren = 4;
                          else if (entry.soort === "laat") uren = 4;
                          const leeftijd = typeof m.leeftijd === "number" ? m.leeftijd : 18;
                          const uurloon = loonkostenPerUur[leeftijd] ?? 15;
                          return totaal + uren * uurloon;
                        }, 0);
                      } else {
                        const functieMap = {
                          Bereiders: "ijsbereider",
                          Voorbereiders: "ijsvoorbereider",
                          Scheppers: "schepper",
                        };
                        const functie = functieMap[type];
                        value = medewerkers.filter(
                          (m) => planning[m.naam]?.[dag]?.[shift]?.functie === functie
                        ).length;
                      }
                      return (
                        <td key={`${type}-${dag}-${shift}`} className="border px-2 py-1 text-center" style={{ borderLeftWidth: shift === 1 ? '2px' : undefined }}>
                          {type === "Kosten" ? `€ ${Math.round(value)}` : value}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    <table className="table-fixed border w-full bg-white text-xs font-sans">
        <thead>
          <tr>
            <th className="border px-4 py-2 text-left w-60">Naam</th>
            {dagen.map((dag) =>
              shifts.map((shift) => (
                <th key={`${dag}-${shift}`} className="border px-2 py-1 text-center">
                  {dag} {shift}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {medewerkers.map((m) => {
            const naamKey = m.naam.trim().toLowerCase();
            return (
              <tr key={m.naam}>
              <td className="border px-4 py-2 text-left whitespace-nowrap w-60 font-bold">
              {m.naam.replace(/\b\w/g, c => c.toUpperCase())} [{m.leeftijd ?? "?"}] ({shiftCountPerMedewerker[m.naam] || 0}/{m.maxShifts ?? "?"})
              {m.opmerking && <span title={m.opmerking} className="ml-1 text-red-600">📌</span>}
              </td>

                {dagen.map((dag) =>
                  shifts.map((shift) => {
                    const entry = planning[m.naam]?.[dag]?.[shift];
                    const beschikbaar = localBeschikbaarheid?.[naamKey]?.[dagMap[dag]]?.[shift];
                    let text = "";
                    let bgColor = "#ffffff";
                    let color = "#000000";

                    if (entry) {
                      const kleur = kleurSchema[entry.functie]?.[entry.soort];
                      bgColor = kleur?.hex || "#ffffff";
                      color = kleur?.tailwind.includes("text-white") ? "#ffffff" : "#000000";
                      const labelMap = {
                        schepper: { vast: "schep", standby: "schep(s)", laat: "schep(l)" },
                        ijsbereider: { vast: "bereider", standby: "bereider(s)", laat: "bereider(l)" },
                        ijsvoorbereider: { vast: "prep", standby: "prep(s)", laat: "prep(l)" },
                      };
                      text = labelMap[entry.functie]?.[entry.soort] || `${entry.functie} (${entry.soort})`;
                    } else if (beschikbaar) {
                      const kleur = kleurSchema.beschikbaar;
                      bgColor = kleur.hex;
                      color = kleur.tailwind.includes("text-white") ? "#ffffff" : "#000000";
                      text = "✓";
                    }

                    return (
                      <td
                        key={`${m.naam}-${dag}-${shift}`}
                        className="border text-center cursor-pointer"
                        style={{
                          borderLeftWidth: shift === 1 ? "2px" : undefined,
                          backgroundColor: (shift === 1 && !text) ? "#FFFBEB" : (shift === 2 && !text ? "#F0F9FF" : bgColor),
                          color,
                          fontWeight: "bold"
                        }}
                        onClick={() => {
                          const entry = planning[m.naam]?.[dag]?.[shift];
                          if (entry) {
                            setPlanning((prev) => {
                              const nieuw = { ...prev };
                              delete nieuw[m.naam][dag][shift];
                              if (Object.keys(nieuw[m.naam][dag]).length === 0) delete nieuw[m.naam][dag];
                              if (Object.keys(nieuw[m.naam]).length === 0) delete nieuw[m.naam];
                              localStorage.setItem("planning", JSON.stringify(nieuw));
                              return nieuw;
                            });
                          } else {
                            setPopup({ medewerker: m.naam, dag, shift });
                          }
                        }}
                      >
                        {text}
                      </td>
                    );
                  })
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
