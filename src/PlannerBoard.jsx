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
import { uploadJSONBestandS3 } from "./utils/r2ClientUpload";

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
        const url = `https://planner-upload-v2.herman-48b.workers.dev/upload/public/${bestand}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Fout bij ophalen van ${bestand}: ${res.statusText}`);
        const json = await res.json();

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
        await uploadJSONBestandS3(`public/${bestand.naam}`, bestand.inhoud);
      } catch (err) {
        alert(`❌ Upload van ${bestand.naam} mislukt: ${err.message}`);
        return;
      }
    }
    alert("✅ Alles succesvol opgeslagen naar R2!");
  }

  if (!isLoaded && medewerkers.length === 0) {
    return (
      <div className="p-4">
        <div className="text-gray-500 mb-4">⏳ Bezig met laden... of nog geen gegevens gevonden.</div>
        <div className="flex flex-wrap gap-2 items-center mb-4">
          {importeerBeschikbaarheidKnop(setLocalBeschikbaarheid, setMedewerkers)}
          {React.cloneElement(importeerLoonkostenKnop(setLoonkostenPerUur), {
            className: "bg-blue-600 text-white px-4 py-2 rounded shadow"
          })}
          <button onClick={opslaanNaarR2} className="bg-indigo-600 text-white px-4 py-2 rounded shadow">
            💾 Opslaan naar Cloudflare R2
          </button>
        </div>
      </div>
    );
  }

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

      <table className="table-fixed border w-full bg-white text-xs font-sans">
        <thead>
          <tr>
            <th className="border px-4 py-2 text-left w-60">Naam</th>
            {dagen.map((dag) =>
              shifts.map((shift) => (
                <th key={`kop-${dag}-${shift}`} className="border px-2 py-1 text-center">
                  {dag} {shift}
                </th>
              ))
            )}
            <th className="border px-4 py-2 text-right bg-white">Totaal</th>
          </tr>
        </thead>

        <tbody>
        {["schepper", "ijsbereider", "ijsvoorbereider"].map((functie) => (
  <tr key={`functie-totaal-${functie}`} className="bg-blue-50 text-[11px] font-medium text-center">
    <td className="border px-2 py-1 text-right italic font-bold">
      {functie === "schepper" ? "S" : functie === "ijsbereider" ? "B" : "P"}
    </td>
    {dagen.map((dag) =>
      shifts.map((shift) => {
        const aantal = medewerkers.reduce((som, m) => {
          const naamKey = m.naam.trim().toLowerCase();
          const entry = planning[naamKey]?.[dag]?.[shift];
          return entry?.functie === functie ? som + 1 : som;
        }, 0);

        return (
          <td key={`${functie}-${dag}-${shift}`} className="border px-1 py-1 text-center text-gray-800">
            {aantal > 0 ? aantal : ""}
          </td>
        );
      })
    )}
    <td className="border bg-gray-100" />
  </tr>
))}

<tr className="bg-blue-100 text-[11px] font-bold text-center">
  <td className="border px-2 py-1 text-right italic">∑</td>
  {dagen.map((dag) =>
    shifts.map((shift) => {
      const totaal = medewerkers.reduce((som, m) => {
        const naamKey = m.naam.trim().toLowerCase();
        const entry = planning[naamKey]?.[dag]?.[shift];
        return entry ? som + 1 : som;
      }, 0);

      return (
        <td key={`totaal-${dag}-${shift}`} className="border px-1 py-1 text-gray-900 bg-blue-100">
          {totaal > 0 ? totaal : ""}
        </td>
      );
    })
  )}
  <td className="border bg-gray-100" />
</tr>

          <tr className="bg-yellow-100 font-semibold">
  <td className="border px-4 py-1 text-right italic font-bold">€ per shift:</td>
  {dagen.map((dag) =>
    shifts.map((shift) => {
      const totaal = medewerkers.reduce((som, m) => {
        const naamKey = m.naam.trim().toLowerCase();
                    const entry = planning[naamKey]?.[dag]?.[shift];
        if (!entry) return som;
        const uren = (entry.soort === "standby" || entry.soort === "laat") ? 4 : 6;
        const leeftijd = typeof m.leeftijd === "number" ? m.leeftijd : 18;
        const uurloon = loonkostenPerUur[leeftijd] ?? 15;
        return som + uren * uurloon;
      }, 0);
      return (
        <td key={`loonkosten-${dag}-${shift}`} className="border px-1 py-1 text-center text-gray-800 font-bold bg-yellow-50">
          € {Math.round(totaal)}
        </td>
      );
    })
  )}
  <td className="border bg-gray-100" />
</tr>

          {medewerkers.map((m) => {
            const naamKey = m.naam.trim().toLowerCase();
            const totaleLoonkosten = dagen.flatMap(dag =>
              shifts.map(shift => {
                const entry = planning[naamKey]?.[dag]?.[shift];
                if (!entry) return 0;
                const uren = (entry.soort === "standby" || entry.soort === "laat") ? 4 : 6;
                const leeftijd = typeof m.leeftijd === "number" ? m.leeftijd : 18;
                const uurloon = loonkostenPerUur[leeftijd] ?? 15;
                return uren * uurloon;
              })
            ).reduce((a, b) => a + b, 0);

            return (
              <tr key={m.naam}>
                <td className={`border px-4 py-2 text-left whitespace-nowrap w-60 font-bold ${m.statusKleur}`}>
                  {m.naam.replace(/\b\w/g, c => c.toUpperCase())} [{m.leeftijd ?? "?"}] ({shiftCountPerMedewerker[m.naam] || 0}/{m.maxShifts ?? "?"})
                  {m.opmerking && <span title={m.opmerking} className="ml-1 text-red-600">📌</span>}
                </td>
                {dagen.map((dag) =>
                  shifts.map((shift) => {
                    const entry = planning[naamKey]?.[dag]?.[shift];
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
                          const naamKey = m.naam.trim().toLowerCase();
                          const entry = planning[naamKey]?.[dag]?.[shift];
                          if (entry) {
                            setPlanning((prev) => {
                              const nieuw = { ...prev };
                              delete nieuw[naamKey][dag][shift];
                              if (Object.keys(nieuw[naamKey][dag]).length === 0) delete nieuw[naamKey][dag];
                              if (Object.keys(nieuw[naamKey]).length === 0) delete nieuw[naamKey];
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
                <td className="border px-2 py-1 text-right font-semibold bg-gray-50">
                  € {Math.round(totaleLoonkosten)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="border px-4 py-2 font-bold text-right bg-gray-200" colSpan={dagen.length * shifts.length + 1}>
              Totale loonkosten:
            </td>
            <td className="border px-4 py-2 font-bold text-right bg-gray-200">
              € {
                medewerkers.reduce((totaal, m) => {
                  const naamKey = m.naam.trim().toLowerCase();
                  return totaal + dagen.flatMap(dag =>
                    shifts.map(shift => {
                      const entry = planning[naamKey]?.[dag]?.[shift];
                      if (!entry) return 0;
                      const uren = (entry.soort === "standby" || entry.soort === "laat") ? 4 : 6;
                      const leeftijd = typeof m.leeftijd === "number" ? m.leeftijd : 18;
                      const uurloon = loonkostenPerUur[leeftijd] ?? 15;
                      return uren * uurloon;
                    })
                  ).reduce((a, b) => a + b, 0);
                }, 0).toFixed(0)
              }
            </td>
          </tr>
        </tfoot>
      </table>
    {popup && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-4 rounded shadow-md w-[400px]">
      <h2 className="font-bold mb-4 text-center">
        {popup.medewerker} - {popup.dag} Shift {popup.shift}
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {["ijsbereider", "ijsvoorbereider", "schepper"].flatMap((functie) =>
          ["vast", "standby", "laat"].map((soort) => {
            const kleur = kleurSchema[functie]?.[soort];
            const label = soort === "standby" ? `⏱️ ${functie === "ijsvoorbereider" ? "prep" : functie}` : soort === "laat" ? `🌙 ${functie === "ijsvoorbereider" ? "prep" : functie}` : functie === "ijsvoorbereider" ? "prep" : functie;

            return (
              <button
                key={`${functie}-${soort}`}
                className={`${kleur.tailwind} px-3 py-2 rounded font-medium text-sm`}
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
    </div>
  );
}
