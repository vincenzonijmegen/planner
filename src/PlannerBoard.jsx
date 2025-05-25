import React, { useState, useEffect } from "react";
import {
  SUPABASE_PROJECT_URL,
  
} from "./config";
import {
  getShiftCountPerMedewerker,
  importeerBeschikbaarheidKnop,
  importeerLoonkostenKnop
} from "./utils/plannerHelpers";
import { dagMap } from "./utils/dagen";
import { exportToPDF } from "./utils/exportToPDF";
import { kleurSchema } from "./utils/kleurSchema";


export default function PlannerBoard({ medewerkers, beschikbaarheid: beschikbaarheidProp, planning, setPlanning, onTotalLoonkostenChange }) {
  const [popup, setPopup] = useState(null);
  const [localBeschikbaarheid, setLocalBeschikbaarheid] = useState(beschikbaarheidProp);
  const shiftCountPerMedewerker = getShiftCountPerMedewerker(planning);

  const uploadJSON = async (file, targetFileName) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      let json;
      try {
        json = JSON.parse(evt.target.result);
      } catch (e) {
        alert("Ongeldige JSON: bestand kon niet geparsed worden.");
        return;
      }
      const blob = new Blob([JSON.stringify(json)], { type: "application/json" });
      const SUPABASE_PUBLIC_BASE = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/plannerdata`;
      const response = await fetch(`${SUPABASE_PUBLIC_BASE}/${targetFileName}`, {
        method: "PUT",
        headers: {
          Authorization: (() => {
            const key = import.meta.env.VITE_SUPABASE_API_KEY;
            if (typeof key === 'undefined') {
              console.error("❌ VITE_SUPABASE_API_KEY bestaat niet in de omgeving (import.meta.env). Mogelijk niet goed gedeclareerd of Vercel opnieuw builden.");
              alert("Upload mislukt: omgevingsvariabele ontbreekt.");
              return 'KEY_NOT_SET';
            }
            if (!key) {
              console.error("❌ VITE_SUPABASE_API_KEY is niet ingesteld. Zet deze in .env of Vercel.");
              alert("Upload mislukt: geen API key ingesteld.");
              return 'KEY_NOT_SET';
            }
            return `Bearer ${key}`;
          })(),
          "Content-Type": "application/json",
          "x-upsert": "true"
        },
        body: blob
      });
      if (response.ok) alert(`${targetFileName} geüpload!`);
      else alert(`Fout bij uploaden van ${targetFileName}: ${response.statusText}`);
    };
    reader.readAsText(file);
  };

  const downloadJSON = async (filename) => {
    try {
      const SUPABASE_PUBLIC_BASE = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/plannerdata`;
      const res = await fetch(`${SUPABASE_PUBLIC_BASE}/${filename}`);
      if (!res.ok) throw new Error("Bestand niet gevonden");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(`Download mislukt voor ${filename}`);
    }
  };

  return (
    <div className="p-4 bg-gray-100">
      <div className="flex flex-wrap gap-2 items-center mb-4">
        {importeerBeschikbaarheidKnop(setLocalBeschikbaarheid)}
        {React.cloneElement(importeerLoonkostenKnop((loonkosten) => { console.log("Loonkosten ontvangen:", loonkosten); }), {
          className: "bg-blue-600 text-white px-4 py-2 rounded shadow"
        })}

        {/* Upload knoppen */}
        {["planning.json", "beschikbaarheid.json", "medewerkers.json"].map((filename) => (
          <label key={filename} className="bg-green-600 text-white px-4 py-2 rounded shadow cursor-pointer">
            Upload {filename}
            <input
              type="file"
              accept=".json"
              onChange={(e) => uploadJSON(e.target.files[0], filename)}
              className="hidden"
            />
          </label>
        ))}

        {/* Download knoppen */}
        {["planning.json", "beschikbaarheid.json", "medewerkers.json"].map((filename) => (
          <button
            key={filename}
            onClick={() => downloadJSON(filename)}
            className="bg-gray-700 text-white px-4 py-2 rounded shadow"
          >
            Download {filename}
          </button>
        ))}

        <button
          onClick={() =>
            exportToPDF({ medewerkers, planning, beschikbaarheid: localBeschikbaarheid, loonkostenPerUur: {}, shiftCountPerMedewerker })
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

<label className="bg-green-600 text-white px-4 py-2 rounded shadow cursor-pointer">
  <span>Upload Excel → Supabase</span>
  <input
    type="file"
    accept=".xlsx"
    onChange={(e) => handleExcelUploadToStorage(e)}
    className="hidden"
  />
</label>

<label className="bg-orange-600 text-white px-4 py-2 rounded shadow cursor-pointer">
  Upload Beschikbaarheid → Supabase
  <input
    type="file"
    accept=".json"
    onChange={(e) => handleBeschikbaarheidUpload(e)}
    className="hidden"
  />
</label>


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
import * as XLSX from "xlsx";

const SUPABASE_STORAGE_URL = "https://edzvwddbrdokwutmxfdx.supabase.co/storage/v1/object";
const SUPABASE_BUCKET = "plannerdata";
const SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkenZ3ZGRicmRva3d1dG14ZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNjQ4MDUsImV4cCI6MjA2Mzc0MDgwNX0.C4SRpBwMvQwqkZXK3ykghLi11rAJtqU1RxFinVm-4a8"; // vervang dit met je echte anon key

async function handleExcelUploadToStorage(e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = async (evt) => {
    const workbook = XLSX.read(evt.target.result, { type: "binary" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const parsed = XLSX.utils.sheet_to_json(sheet);

    const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: "application/json" });

    const response = await fetch(
      `${SUPABASE_STORAGE_URL}/${SUPABASE_BUCKET}/o/planning.json`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${SUPABASE_API_KEY}`,
          "Content-Type": "application/json",
          "x-upsert": "true"
        },
        body: blob
      }
    );

    if (response.ok) {
      alert("Geüpload naar Supabase Storage!");
    } else {
      alert("Fout bij uploaden: " + response.statusText);
    }
  };

  reader.readAsBinaryString(file);
}

async function handleBeschikbaarheidUpload(e) {
  const SUPABASE_STORAGE_URL = "https://edzvwddbrdokwutmxfdx.supabase.co/storage/v1/object";
  const SUPABASE_BUCKET = "plannerdata";
  const SUPABASE_API_KEY = "JOUW_ANON_KEY_HIER"; // vervang dit

  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = async (evt) => {
    const blob = new Blob([evt.target.result], { type: "application/json" });

    const response = await fetch(
      `${SUPABASE_STORAGE_URL}/public/${SUPABASE_BUCKET}/beschikbaarheid.json`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${SUPABASE_API_KEY}`,
          "Content-Type": "application/json",
          "x-upsert": "true"
        },
        body: blob
      }
    );

    if (response.ok) {
      alert("✅ Beschikbaarheid geüpload naar Supabase!");
    } else {
      alert("❌ Upload mislukt: " + response.statusText);
    }
  };

  reader.readAsText(file);
}
