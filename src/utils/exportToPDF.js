import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { dagMap } from "./dagen";

const dagen = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const shifts = [1, 2];

const buildPdfBody = (medewerkers, planning, beschikbaarheid, shiftCountPerMedewerker) => {
  const body = [];

  medewerkers.forEach((m) => {
    const naam = m.naam;
    const count = shiftCountPerMedewerker[naam] || 0;
    const max = m.maxShifts ?? "?";
    const leeftijd = m.leeftijd ?? "?";

    const row = {
      Naam: `${naam.split(" ").map((part, i) =>
        i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
      ).join(" ")} [${leeftijd}] (${count}/${max})`
    };

    dagen.forEach((dag) => {
      shifts.forEach((shift) => {
        const key = `${dag} ${shift}`;
        const entry = planning[naam]?.[dag]?.[shift];
        const naamKey = naam?.toLowerCase();
        const beschikbaar = beschikbaarheid?.[naamKey]?.[dagMap[dag]]?.[shift];

        if (entry) {
          const labelMap = {
            schepper: { vast: "schep", standby: "schep(s)", laat: "schep(l)" },
            ijsbereider: { vast: "bereider", standby: "bereider(s)", laat: "bereider(l)" },
            ijsvoorbereider: { vast: "prep", standby: "prep(s)", laat: "prep(l)" },
          };
          row[key] = labelMap[entry.functie]?.[entry.soort] || `${entry.functie} (${entry.soort})`;
        } else if (beschikbaar) {
          row[key] = "✓";
        } else {
          row[key] = "";
        }
      });
    });

    body.push(row);
  });

  return body;
};

function addLoonkostenTabel(doc, medewerkers, planning, loonkostenPerUur) {
  const kolommen = ["Dag", ...dagen.flatMap(dag => shifts.map(s => `${dag} shift ${s}`))];

  const loonkostenPerShift = {};
  const telling = {
    ijsbereider: {},
    ijsvoorbereider: {},
    schepper: {}
  };

  dagen.forEach(dag => {
    shifts.forEach(shift => {
      const key = `${dag} shift ${shift}`;
      loonkostenPerShift[key] = 0;
      telling.ijsbereider[key] = 0;
      telling.ijsvoorbereider[key] = 0;
      telling.schepper[key] = 0;

      medewerkers.forEach(m => {
        const entry = planning[m.naam]?.[dag]?.[shift];
        if (entry) {
          let uren = 6;
          if (entry.soort === "standby") uren = 4;
          else if (entry.soort === "laat") uren = 4;
          const uurloon = loonkostenPerUur[m.leeftijd] ?? 15;
          loonkostenPerShift[key] += uren * uurloon;
          if (telling[entry.functie]) telling[entry.functie][key]++;
        }
      });
    });
  });

  const body = [
    ["Loonkosten", ...kolommen.slice(1).map(key => `€ ${Math.round(loonkostenPerShift[key] || 0)}`)],
    ["Bereiders", ...kolommen.slice(1).map(key => telling.ijsbereider[key] || 0)],
    ["Voorbereiders", ...kolommen.slice(1).map(key => telling.ijsvoorbereider[key] || 0)],
    ["Scheppers", ...kolommen.slice(1).map(key => telling.schepper[key] || 0)],
    ["Totaal", ...kolommen.slice(1).map(key => {
      const a = telling.ijsbereider[key] || 0;
      const b = telling.ijsvoorbereider[key] || 0;
      const c = telling.schepper[key] || 0;
      return a + b + c;
    })],
  ];

  const startY = doc.lastAutoTable.finalY + 20;
  autoTable(doc, {
    startY,
    head: [kolommen],
    body,
    styles: {
      fontSize: 7,
      cellPadding: 0.5,
      minCellHeight: 4,
      halign: "center",
      valign: "middle",
      lineWidth: 0.1,
      lineColor: [0, 0, 0]
    },
    headStyles: {
      fillColor: [100, 149, 237],
      textColor: 255,
    },
    columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } },
  });
}



function addOpmerkingenOnderLegenda(doc, medewerkers, beschikbaarheid, startY) {
  const opmerkingen = medewerkers
    .map((m) => {
      const naamKey = m.naam.toLowerCase();
      const opmerking = beschikbaarheid?.[naamKey]?.opmerking?.trim();
      if (opmerking) {
        return `• ${m.naam}: ${opmerking}`;
      }
      return null;
    })
    .filter(Boolean);

  if (opmerkingen.length === 0) return startY;

  const ruimteNodig = opmerkingen.length * 6 + 16;
  if (startY + ruimteNodig > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    startY = 20;
  }

  const margeLinks = 20;
  const regelhoogte = 6;

  doc.setFontSize(9);
  doc.setTextColor(33, 37, 41);
  doc.setFont(undefined, "bold");
  doc.text("Opmerkingen:", margeLinks, startY + 10);

  doc.setFont(undefined, "normal");
  opmerkingen.forEach((regel, i) => {
    doc.text(regel, margeLinks + 4, startY + 16 + i * regelhoogte);
  });

  return startY + ruimteNodig;
}

export const exportToPDF = ({ medewerkers, planning, beschikbaarheid, loonkostenPerUur, shiftCountPerMedewerker }) => {
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  const vandaag = new Date();
  const datumStr = vandaag.toLocaleDateString("nl-NL");
  const weekNr = getWeekNumber(vandaag);
  doc.setFontSize(16);
  doc.text(`Beschikbaarheid ijssalon Vincenzo – versie (${datumStr})`, 14, 12);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  const tableColumn = ["Naam", ...dagen.flatMap((dag) => shifts.map((shift) => `${dag} ${shift}`))];
  const body = buildPdfBody(medewerkers, planning, beschikbaarheid, shiftCountPerMedewerker);

  autoTable(doc, {
    startY: 20,
    tableWidth: pageWidth - margin,
    columns: tableColumn.map((key) => ({ header: key, dataKey: key })),
    body,
    styles: {
      fontSize: 7,
      cellPadding: 2,
      halign: "center",
      valign: "middle",
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      Naam: { halign: "left", cellWidth: 60 },
    },
    didParseCell(data) {
      const colKey = data.column.dataKey;
      const rawText = typeof data.cell.raw === "string" ? data.cell.raw : "";
      const val = rawText.toLowerCase().trim();

      const kleuren = {
        "bereider": [30, 58, 138],
        "bereider(s)": [96, 165, 250],
        "bereider(l)": [167, 139, 250],
        "prep": [191, 219, 254],
        "prep(s)": [219, 234, 254],
        "prep(l)": [196, 181, 253],
        "schep": [250, 204, 21],
        "schep(s)": [254, 240, 138],
        "schep(l)": [243, 244, 246],
        "✓": [144, 238, 144],
      };

      if (kleuren[val]) {
        data.cell.styles.fillColor = kleuren[val];
        const donkereWaarden = ["bereider", "bereider(l)"];
        if (donkereWaarden.includes(val)) {
          data.cell.styles.textColor = [255, 255, 255];
        } else if (val === "✓") {
          data.cell.styles.textColor = kleuren[val];
        } else {
          data.cell.styles.textColor = [0, 0, 0];
        }
      }

      if (colKey === "Naam") {
        const match = rawText.match(/\((\d+)[\/](\d+)\)/);
        if (match) {
          const count = parseInt(match[1]);
          const max = parseInt(match[2]);
          if (count > max) {
            data.cell.styles.fillColor = [254, 202, 202];
          } else if (count < max) {
            data.cell.styles.fillColor = [254, 243, 199];
          }
        }
      }
    }
  });

  const totaalLoonkosten = medewerkers.reduce((totaal, m) => {
    const uurloon = loonkostenPerUur[m.leeftijd] ?? 15;
    return totaal + dagen.reduce((dagTotaal, dag) => {
      return dagTotaal + shifts.reduce((shiftTotaal, shift) => {
        const entry = planning[m.naam]?.[dag]?.[shift];
        if (!entry) return shiftTotaal;
        let uren = 6;
        if (entry.soort === "standby" || entry.soort === "laat") uren = 4;
        return shiftTotaal + uren * uurloon;
      }, 0);
    }, 0);
  }, 0);

  const loonkostenTekst = `Totale loonkosten deze week: €${totaalLoonkosten.toFixed(2)}`;
  const yNaHoofdtabel = (doc.lastAutoTable?.finalY ?? 30) + 10;
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.setFont(undefined, "bold");
  doc.text(loonkostenTekst, 14, yNaHoofdtabel);

  addLoonkostenTabel(doc, medewerkers, planning, loonkostenPerUur);
  let laatsteY = addOpmerkingenOnderLegenda(doc, medewerkers, beschikbaarheid, doc.lastAutoTable.finalY + 10);

function getWeekNumber(date) {
  const temp = new Date(date.getTime());
  temp.setHours(0, 0, 0, 0);
  temp.setDate(temp.getDate() + 3 - ((temp.getDay() + 6) % 7));
  const week1 = new Date(temp.getFullYear(), 0, 4);
  return 1 + Math.round(((temp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

  if (laatsteY > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    laatsteY = 20;
  }

  const safeDatum = datumStr.replace(/-/g, '_');
  doc.save(`planning_week_${weekNr}_${safeDatum}.pdf`);
};
