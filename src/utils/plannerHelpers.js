import * as XLSX from "xlsx";

export function importeerLoonkostenKnop(setLoonkosten) {
  return (
    <button
      className="bg-blue-500 text-white px-3 py-1 rounded"
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".xlsx,.xls";
        input.onchange = (e) => {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);

            const mapping = {};
            json.forEach((row) => {
              const leeftijd = parseInt(row["Leeftijd"]);
              const uurloon = parseFloat(row["Uurloon"]);
              if (!isNaN(leeftijd) && !isNaN(uurloon)) {
                mapping[leeftijd] = uurloon;
              }
            });

            typeof setLoonkosten === 'function' ? setLoonkosten(mapping) : console.error("❌ setLoonkosten is not a function", setLoonkosten);
            localStorage.setItem("loonkosten", JSON.stringify(mapping));
          };
          reader.readAsArrayBuffer(file);
        };
        input.click();
      }}
    >
      Uurlonen importeren
    </button>
  );
}


export function handleBeschikbaarheidUpload(e, setBeschikbaarheid, setMedewerkers) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = (evt) => {
    const wb = XLSX.read(evt.target.result, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { raw: false });

    const structuur = {};

    data.forEach((row) => {
      const naam = (row["Naam"] || "").trim().toLowerCase();
      if (!naam) return;

      const dagen = {
        Ma: "maandag", Di: "dinsdag", Wo: "woensdag", Do: "donderdag",
        Vr: "vrijdag", Za: "zaterdag", Zo: "zondag"
      };

const geboortedatumRaw = row["geboortedatum"];
      const geboortedatumStr = typeof geboortedatumRaw === "string" ? geboortedatumRaw.trim() : geboortedatumRaw;

      let leeftijd = 18;

      if (typeof geboortedatumRaw === "number") {
        const geboortedatum = new Date((geboortedatumRaw - 25569) * 86400 * 1000);
        const vandaag = new Date();
        leeftijd = vandaag.getFullYear() - geboortedatum.getFullYear();
        const m = vandaag.getMonth() - geboortedatum.getMonth();
        if (m < 0 || (m === 0 && vandaag.getDate() < geboortedatum.getDate())) {
          leeftijd--;
        }
      } else if (geboortedatumStr instanceof Date && !isNaN(geboortedatumStr)) {
        const geboortedatum = geboortedatumStr;
        const vandaag = new Date();
        leeftijd = vandaag.getFullYear() - geboortedatum.getFullYear();
        const m = vandaag.getMonth() - geboortedatum.getMonth();
        if (m < 0 || (m === 0 && vandaag.getDate() < geboortedatum.getDate())) {
          leeftijd--;
        }
      } else if (typeof geboortedatumStr === "string") {
        const parts = geboortedatumStr.split("-");
        if (parts.length === 3) {
          const [dag, maand, jaar] = parts.map(Number);
          const geboortedatum = new Date(jaar, maand - 1, dag);
          const vandaag = new Date();
          leeftijd = vandaag.getFullYear() - geboortedatum.getFullYear();
          const m = vandaag.getMonth() - geboortedatum.getMonth();
          if (m < 0 || (m === 0 && vandaag.getDate() < geboortedatum.getDate())) {
            leeftijd--;
          }
        }
      } = vandaag.getFullYear() - geboortedatum.getFullYear();
  const m = vandaag.getMonth() - geboortedatum.getMonth();
  if (m < 0 || (m === 0 && vandaag.getDate() < geboortedatum.getDate())) {
    leeftijd--;
  }
} else if (geboortedatumStr instanceof Date && !isNaN(geboortedatumStr)) {
  // Excel leverde echte Date
  const geboortedatum = geboortedatumStr;
  const vandaag = new Date();
  leeftijd = vandaag.getFullYear() - geboortedatum.getFullYear();
  const m = vandaag.getMonth() - geboortedatum.getMonth();
  if (m < 0 || (m === 0 && vandaag.getDate() < geboortedatum.getDate())) {
    leeftijd--;
  }
} else if (typeof geboortedatumStr === "string") {
  const parts = geboortedatumStr.split("-");
  if (parts.length === 3) {
    const [dag, maand, jaar] = parts.map(Number);
    const geboortedatum = new Date(jaar, maand - 1, dag);
    const vandaag = new Date();
    leeftijd = vandaag.getFullYear() - geboortedatum.getFullYear();
    const m = vandaag.getMonth() - geboortedatum.getMonth();
    if (m < 0 || (m === 0 && vandaag.getDate() < geboortedatum.getDate())) {
      leeftijd--;
    }
  }
}

      const beschikbaarheidMedewerker = {
        opmerking: row?.Opmerking || "",
        maxShifts: parseInt(row?.MaxShifts) || 5,
        leeftijd
      };

      Object.keys(row).forEach((kolom) => {
        const match = kolom.match(/^(Ma|Di|Wo|Do|Vr|Za|Zo)\s?([12])$/);
        if (match) {
          const [_, dagCode, shiftStr] = match;
          const dag = dagen[dagCode];
          const shift = parseInt(shiftStr);
          const waarde = (row[kolom] || "").toString().toLowerCase();

          if (!beschikbaarheidMedewerker[dag]) beschikbaarheidMedewerker[dag] = {};
          beschikbaarheidMedewerker[dag][shift] = waarde === "beschikbaar" || waarde === "ja";
        }
      });

      structuur[naam] = {
        ...beschikbaarheidMedewerker,
        leeftijd
      };
    });

    console.log("✅ Beschikbaarheid ingelezen:", structuur);
    if (typeof setBeschikbaarheid === "function") {
      setBeschikbaarheid(structuur);
    } else {
      console.error("❌ setBeschikbaarheid is not a function", setBeschikbaarheid);
    }

    if (typeof setMedewerkers === "function") {
      const medewerkers = Object.entries(structuur).map(([naam, data]) => {
        return {
          naam: naam.charAt(0).toUpperCase() + naam.slice(1),
          leeftijd: data?.leeftijd ?? 18,
          maxShifts: data?.maxShifts ?? 3,
          opmerking: data?.opmerking || ""
        };
      });
      setMedewerkers(medewerkers);
    } else {
      console.error("❌ setMedewerkers is not a function", setMedewerkers);
    }

    localStorage.setItem("beschikbaarheid", JSON.stringify(structuur));
  };

  reader.readAsArrayBuffer(file);
}

export function importeerBeschikbaarheidKnop(setBeschikbaarheid, setMedewerkers) {
  return (
    <label className="bg-green-600 text-white px-4 py-2 rounded cursor-pointer">
      Import beschikbaarheid
      <input
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) =>
          handleBeschikbaarheidUpload(
            e,
            typeof setBeschikbaarheid === "function" ? setBeschikbaarheid : () => {},
            typeof setMedewerkers === "function" ? setMedewerkers : () => {}
          )
        }
      />
    </label>
  );
}



export function handleFileUpload(e, setVakanties, setMedewerkers, beschikbaarheid) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = (evt) => {
    const wb = XLSX.read(evt.target.result, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws).filter(
      (r) =>
        r &&
        typeof r.Naam === "string" &&
        r.Naam.trim() !== "" &&
        r.Startdatum &&
        r.Einddatum
    );
    
    console.log("📥 Gelezen data uit Excel:", data);
    setVakanties(data);
    console.log("📅 Vakanties opgeslagen:", data);

    const namenUitVakantie = data.map((r) => (r.Naam || "").trim().toLowerCase()).filter(Boolean);
    const namenUitBeschikbaarheid = Object.keys(beschikbaarheid).map((n) => n.trim().toLowerCase());
    const alleNamen = Array.from(new Set([...namenUitVakantie, ...namenUitBeschikbaarheid]));
    // Voeg alleen medewerkers toe die nog niet in de lijst staan
setMedewerkers((vorige) => {
  const bestaandeNamen = new Set(vorige.map((m) => m.naam.trim().toLowerCase()));
  const nieuwe = alleNamen
    .filter((n) => !bestaandeNamen.has(n))
    .map((naam) => ({
      naam: naam.charAt(0).toUpperCase() + naam.slice(1),
      leeftijd: 18,
      maxShifts: 5,
      opmerking: ""
    }));
  return [...vorige, ...nieuwe];
});
  };

  reader.readAsArrayBuffer(file);
}

export function handleFeestdagenUpload(e, setFeestdagen, setFeestdagOorspronkelijk) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = (evt) => {
    const wb = XLSX.read(evt.target.result, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);

    const datums = data
      .filter((r) => r.Datum)
      .map((r) => {
        const raw = r.Datum;
        const d = typeof raw === "number"
          ? XLSX.SSF.parse_date_code(raw)
            ? new Date((raw - 25569) * 86400 * 1000)
            : new Date(NaN)
          : new Date(raw);

        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toLocaleDateString("sv-SE");
      });

    setFeestdagen(datums);
    setFeestdagOorspronkelijk(data);
  };

  reader.readAsArrayBuffer(file);
}

export function getFileChangeHandler({
  setVakanties,
  setMedewerkers,
  beschikbaarheid,
  setFeestdagen,
  setFeestdagOorspronkelijk,
  setBeschikbaarheid
}) {
  return (type) => (e) => {
    if (type === "vakanties") {
      handleFileUpload(e, setVakanties, setMedewerkers, beschikbaarheid);
    } else if (type === "feestdagen") {
      handleFeestdagenUpload(e, setFeestdagen, setFeestdagOorspronkelijk);
    } else if (type === "beschikbaarheid") {
      handleBeschikbaarheidUpload(e, setBeschikbaarheid, setMedewerkers);
    }
  };
}

export function calculateShiftTotals(medewerkers = [], dagen = [], shifts = [], planning = {}) {
  const totals = {};

  medewerkers.forEach((medewerker) => {
    dagen.forEach((dag) => {
      shifts.forEach((shift) => {
        const ingepland = planning[medewerker.naam]?.[dag]?.[shift];
        if (ingepland) {
          const { functie } = ingepland;
          if (!totals[dag]) totals[dag] = {};
          if (!totals[dag][shift]) totals[dag][shift] = { ijsbereider: 0, ijsvoorbereider: 0, schepper: 0 };
          if (functie) totals[dag][shift][functie] += 1;
        }
      });
    });
  });

  return totals;
}

export function berekenLoonkostenPerDag(dagen, medewerkers, planning, salarissenPerLeeftijd) {
  const loonkosten = {};

  dagen.forEach((dag) => {
    let totaal = 0;
    medewerkers.forEach(({ naam, leeftijd }) => {
      const shiftsVoorDag = planning[naam]?.[dag] || {};
      Object.values(shiftsVoorDag).forEach(({ soort }) => {
        const uren = soort === "vast" ? 6 : 4;
        const uurloon = salarissenPerLeeftijd[leeftijd] || 0;
        totaal += uren * uurloon;
      });
    });
    loonkosten[dag] = totaal;
  });

  return loonkosten;
}

export function getShiftCountPerMedewerker(planning = {}) {
  const shiftCount = {};

  Object.keys(planning).forEach((naam) => {
    let count = 0;
    const dagen = planning[naam] || {};
    Object.values(dagen).forEach((shiftsPerDag) => {
      Object.values(shiftsPerDag).forEach((shift) => {
        if (
          shift &&
          typeof shift === "object" &&
          "functie" in shift &&
          typeof shift.functie === "string" &&
          ["ijsbereider", "ijsvoorbereider", "schepper"].includes(shift.functie.trim().toLowerCase())
        ) {
          count += 1;
        }
      });
    });
    shiftCount[naam] = count;
  });

  return shiftCount;
}

export function resetMedewerkerPlanning(naam, setPlanning) {
  setPlanning((prev) => {
    const nieuwe = { ...prev };
    delete nieuwe[naam];
    localStorage.setItem("planning", JSON.stringify(nieuwe));
    return nieuwe;
  });
}

export function getCellColor(medewerker, dag, shift, localBeschikbaarheid, planning) {
  const key = medewerker.trim().toLowerCase();
  const ingepland = planning[medewerker]?.[dag]?.[shift];
  if (ingepland) {
    const { functie, soort } = ingepland;
    if (functie === "ijsbereider") return { backgroundColor: soort === "vast" ? "#1e3a8a" : "#3b82f6", color: "white" };
    if (functie === "ijsvoorbereider") return { backgroundColor: soort === "vast" ? "#bfdbfe" : "#93c5fd" };
    if (functie === "schepper") return { backgroundColor: soort === "vast" ? "#f59e0b" : "#fcd34d" };
  }

  const dagMap = {
    ma: "maandag", di: "dinsdag", wo: "woensdag",
    do: "donderdag", vr: "vrijdag", za: "zaterdag", zo: "zondag"
  };
  const langeDag = dagMap[dag.toLowerCase()] || dag;

  const beschikbaar = localBeschikbaarheid[key]?.[langeDag]?.[shift] ?? false;
  if (beschikbaar) {
    return { backgroundColor: "#90ee90" }; // lichtgroen
  }

  return { backgroundColor: "#ffffff" }; // wit
}
