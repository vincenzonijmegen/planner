console.log("🚀 PlannerBoard geladen");


import React, { useState, useEffect } from "react";
import {
  getShiftCountPerMedewerker,
  importeerBeschikbaarheidKnop,
  importeerLoonkostenKnop,
} from "./utils/plannerHelpers";
import { dagMap } from "./utils/dagen";
import { exportToPDF } from "./utils/exportToPDF";
import { kleurSchema } from "./utils/kleurSchema";

const dagen = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const shifts = [1, 2];

export default function PlannerBoard({ beschikbaarheid: beschikbaarheidProp, planning, setPlanning, onTotalLoonkostenChange }) {
  const [medewerkers, setMedewerkers] = useState(() => {
    try {
      const saved = localStorage.getItem("medewerkers");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter((m) => m && typeof m === "object" && m.naam) : [];
    } catch {
      return [];
    }
  });

  const [beschikbaarheid, setLocalBeschikbaarheid] = useState(() => {
    try {
      const saved = localStorage.getItem("beschikbaarheid");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (beschikbaarheidProp && Object.keys(beschikbaarheidProp).length > 0) {
      setLocalBeschikbaarheid(beschikbaarheidProp);
      localStorage.setItem("beschikbaarheid", JSON.stringify(beschikbaarheidProp));
    }
  }, [beschikbaarheidProp]);

  const [popup, setPopup] = useState(null);
  const shiftCountPerMedewerker = getShiftCountPerMedewerker(planning);

  const [loonkostenPerUur, setLoonkostenPerUur] = useState(() => {
    try {
      const saved = localStorage.getItem("loonkosten");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const gestructureerdeUpdate = (prev, popup, functie, soort) => {
    return {
      ...prev,
      [popup.medewerker]: {
        ...prev[popup.medewerker],
        [popup.dag]: {
          ...prev[popup.medewerker]?.[popup.dag],
          [popup.shift]: { functie, soort },
        },
      },
    };
  };

  const updatePlanning = (functie, soort) => {
    if (popup) {
      setPlanning((prev) => {
        const nieuwePlanning = gestructureerdeUpdate(prev, popup, functie, soort);
        localStorage.setItem("planning", JSON.stringify(nieuwePlanning));
        return nieuwePlanning;
      });
      setPopup(null);
    }
  };

  useEffect(() => {
    let totaal = 0;
    medewerkers.forEach((m) => {
      dagen.forEach((dag) => {
        shifts.forEach((shift) => {
          const entry = planning[m.naam]?.[dag]?.[shift];
          if (entry) {
            let uren = 6;
            if (entry.soort === "standby") uren = 4;
            else if (entry.soort === "laat") uren = 4;

            const leeftijd = typeof m.leeftijd === 'number' ? m.leeftijd : 18;
            const uurloon = loonkostenPerUur[leeftijd] ?? 15;
            totaal += uren * uurloon;
          }
        });
      });
    });

    if (typeof onTotalLoonkostenChange === 'function') {
      onTotalLoonkostenChange(totaal);
    }
  }, [planning, medewerkers]);

  return (
    <div className="p-4 bg-gray-100">
      <div className="flex gap-2 items-center mb-4">

        {importeerBeschikbaarheidKnop(setLocalBeschikbaarheid, setMedewerkers)}

        {React.cloneElement(importeerLoonkostenKnop(setLoonkostenPerUur), {
          className: "bg-blue-600 text-white px-4 py-2 rounded shadow"
        })}

        <button
          onClick={() =>
            exportToPDF({ medewerkers, planning, beschikbaarheid, loonkostenPerUur, shiftCountPerMedewerker })
          }
          className="bg-red-600 text-white px-4 py-2 rounded shadow"
        >
          Exporteer naar PDF
        </button>

        <button
          onClick={() => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(planning));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "planning-backup.json");
            downloadAnchor.click();
          }}
          className="bg-purple-600 text-white px-4 py-2 rounded shadow"
        >

          Download planning
        </button>

        <label className="bg-yellow-600 text-white px-4 py-2 rounded shadow cursor-pointer">
          <span>Importeer planning</span>
          <input
            type="file"
            accept="application/json"
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
            className="hidden"
          />
        </label>

</div>

      

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

      {/* Medewerkerplanning */}
      {medewerkers.length > 0 && (
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
          ...
          <tbody>
  {medewerkers.map((m) => {
    const naamKey = m.naam.trim().toLowerCase();

    return (
      <tr key={m.naam}>
       <td
  className={`border px-4 py-2 text-left whitespace-nowrap w-60 font-bold ${
    (shiftCountPerMedewerker[m.naam] || 0) > (m.maxShifts ?? Infinity)
      ? "bg-red-200"
      : (shiftCountPerMedewerker[m.naam] || 0) < (m.maxShifts ?? 0)
      ? "bg-yellow-200"
      : ""
  }`}
  title={m.opmerking || ""}
>
  <span className="flex items-center gap-1">
    {m.naam.split(" ").map((part, i) =>
      i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    ).join(" ")} [{m.leeftijd ?? "?"}] ({shiftCountPerMedewerker[m.naam] || 0}/{m.maxShifts ?? "?"})
    {m.opmerking && (
      <span
        className="text-red-600 text-sm"
        title={m.opmerking}
      >
        📌
      </span>
    )}
  </span>
</td>

        {dagen.map((dag) =>
          shifts.map((shift) => {
            const entry = planning[m.naam]?.[dag]?.[shift];
            const beschikbaar = beschikbaarheid?.[naamKey]?.[dagMap[dag]]?.[shift];

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
                  borderLeftWidth: shift === 1 ? '2px' : undefined,
                  backgroundColor: (shift === 1 && !text) ? '#FFFBEB' : (shift === 2 && !text ? '#F0F9FF' : bgColor),
                  color,
                  fontWeight: "bold"
                }}
                title={`Shift ${shift} op ${dagMap[dag]}`}
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
      )}

      {popup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-md w-[400px]">
            <h2 className="font-bold mb-4 text-center">
              {popup.medewerker} - {popup.dag} Shift {popup.shift}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {["ijsbereider", "ijsvoorbereider", "schepper"].map((functie) =>
                ["vast", "standby", "laat"].map((soort) => (
                  <button
                    key={`${functie}-${soort}`}
                    className={`${kleurSchema[functie][soort].tailwind} px-3 py-2 rounded font-medium text-sm`}
                    onClick={() => updatePlanning(functie, soort)}
                  >
                    {soort === "standby" ? `⏱️ ${functie}` : soort === "laat" ? `🌙 ${functie}` : functie}
                  </button>
                ))
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
