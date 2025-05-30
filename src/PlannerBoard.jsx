import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";

import {
  getShiftCountPerMedewerker,
  importeerBeschikbaarheidKnop,
  importeerLoonkostenKnop
} from "./utils/plannerHelpers";

import { dagMap } from "./utils/dagen";
import { exportToPDF } from "./utils/exportToPDF";
import { kleurSchema } from "./utils/kleurSchema";
import { fetchJSONBestand, uploadJSONBestand } from "./utils/r2Client";

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
        try {
          const json = await fetchJSONBestand(bestand);
          if (bestand === "planning.json") {
            setPlanning(json);
            localStorage.setItem("planning", JSON.stringify(json));
          }
          if (bestand === "beschikbaarheid.json") setLocalBeschikbaarheid(json);
          if (bestand === "loonkosten.json") setLoonkostenPerUur(json);
        } catch (err) {
          console.warn(`⛔ Bestand ${bestand} niet gevonden:`, err.message);
        }
      }
    }
    fetchGegevens();
  }, []);

  useEffect(() => {
    if (!localBeschikbaarheid || Object.keys(localBeschikbaarheid).length === 0) return;

    const gegenereerd = Object.entries(localBeschikbaarheid).map(([naamKey, data]) => ({
      naam: naamKey,
      leeftijd: data?.leeftijd ?? 18,
      maxShifts: data?.maxShifts ?? 3,
      opmerking: data?.opmerking || null
    }));

    const medewerkersMetKleur = gegenereerd.map(m => {
      const ingepland = shiftCountPerMedewerker[m.naam.toLowerCase()] || 0;
      let statusKleur = "";
      if (ingepland > m.maxShifts) statusKleur = "bg-red-200";
      else if (ingepland < m.maxShifts) statusKleur = "bg-yellow-100";
      else statusKleur = "bg-green-100";
      return { ...m, statusKleur };
    });
    setMedewerkers(medewerkersMetKleur);
    setIsLoaded(true);
  }, [localBeschikbaarheid]);

  async function opslaanNaarR2() {
    const bestanden = [
      { naam: "planning.json", inhoud: planning },
      { naam: "beschikbaarheid.json", inhoud: localBeschikbaarheid },
      { naam: "loonkosten.json", inhoud: loonkostenPerUur }
    ];

    for (const bestand of bestanden) {
      try {
        await uploadJSONBestand(bestand.naam, bestand.inhoud);
      } catch (err) {
        alert(`❌ Upload van ${bestand.naam} mislukt: ${err.message}`);
        return;
      }
    }
    alert("✅ Alles succesvol opgeslagen naar R2!");
  }

  if (!isLoaded) return <div className="p-4 text-gray-500">⏳ Bezig met laden...</div>;

  return (
    <div className="p-4 bg-gray-100">
      <div className="flex flex-wrap gap-2 items-center mb-4">
        {importeerBeschikbaarheidKnop(setLocalBeschikbaarheid, setMedewerkers)}
        {React.cloneElement(importeerLoonkostenKnop(setLoonkostenPerUur), {
          className: "bg-blue-600 text-white px-4 py-2 rounded shadow"
        })}
        <button onClick={opslaanNaarR2} className="bg-indigo-600 text-white px-4 py-2 rounded shadow">
          💾 Opslaan naar Cloudflare R2
        </button>
        <button
          onClick={() => exportToPDF({ medewerkers, planning, beschikbaarheid: localBeschikbaarheid, loonkostenPerUur, shiftCountPerMedewerker })}
          className="bg-red-600 text-white px-4 py-2 rounded shadow"
        >
          📄 Exporteer naar PDF
        </button>
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
                    soort === "standby" ? `⏱️ ${functie}` : soort === "laat" ? `🌙 ${functie}` : functie;
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

      <table className="table-fixed border w-full bg-white text-xs font-sans">
        
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
          {['Bereiders', 'Voorbereiders', 'Scheppers', 'Kosten'].map((type) => (
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
                      if (entry.soort === "standby" || entry.soort === "laat") uren = 4;
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
          {medewerkers.map((m) => {
            const naamKey = m.naam.trim().toLowerCase();
            return (
              <tr key={m.naam}>
                <td className={`border px-4 py-2 text-left whitespace-nowrap w-60 font-bold ${m.statusKleur}`}>
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
