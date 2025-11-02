import React, { useEffect, useMemo, useState } from "react";

// ====== SAFE School Scan – MVP (no backend, localStorage only) ======

export default function App() {
  const [tab, setTab] = useState("assess");
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Header tab={tab} setTab={setTab} />
      <main className="max-w-5xl mx-auto px-4 pb-24">
        {tab === "assess" && <Assess />}
        {tab === "dashboard" && <Dashboard />}
        {tab === "about" && <About />}
      </main>
      <Footer />
    </div>
  );
}

function Header({ tab, setTab }) {
  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">S</div>
          <div>
            <h1 className="text-lg font-bold leading-tight">S.A.F.E. School Scan</h1>
            <p className="text-xs text-slate-500 -mt-1">School Assessment For Early-warning</p>
          </div>
        </div>
        <nav className="flex gap-2">
          {[
            { id: "assess", label: "Assessment" },
            { id: "dashboard", label: "Dashboard" },
            { id: "about", label: "About" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition border ${
                tab === t.id
                  ? "bg-emerald-600 text-white border-emerald-600 shadow"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

// ===== Data & helpers =====
const CHECKS = [
  { key: "wallCracks", label: "Visible wall cracks", help: "Hairline vs large diagonal/through cracks" },
  { key: "columnTilt", label: "Tilted columns / beam deformation" },
  { key: "unevenFloor", label: "Uneven or sunken floor" },
  { key: "roofLeak", label: "Roof leaks / ceiling stains" },
  { key: "looseCeiling", label: "Loose ceiling panels / falling debris risk" },
  { key: "exposedRebar", label: "Exposed rusty reinforcement / spalling" },
  { key: "stuckFrames", label: "Doors/windows stuck / misaligned frames" },
  { key: "waterDamage", label: "Dampness, persistent water damage" },
  { key: "electrical", label: "Exposed electrical cables/sockets" },
  { key: "heavyObjects", label: "Heavy items (cabinets/AC) not secured" },
  { key: "nearTrees", label: "Large tree within ~5m of building" },
  { key: "blockedExit", label: "Blocked emergency exits / pathways" },
  { key: "ventilation", label: "Adequate ventilation?" },
  { key: "overcapacity", label: "Overcapacity (too many occupants)" },
  { key: "foundation", label: "Foundation settlement signs (gaps/tilt)" },
  { key: "creaking", label: "Unusual loud creaking under load" },
  { key: "groundShift", label: "Ground shifting / uneven soil around the building" },
  { key: "floodHistory", label: "Flooding history in last 12 months" },
  { key: "evacArea", label: "Clear evacuation area available?" },
];

function riskPoints(key, value) {
  const negativeWhenYes = new Set([
    "wallCracks","columnTilt","unevenFloor","roofLeak","looseCeiling","exposedRebar","stuckFrames","waterDamage",
    "electrical","heavyObjects","nearTrees","blockedExit","overcapacity","foundation","creaking","groundShift","floodHistory",
  ]);
  const positiveAdequacy = new Set(["ventilation", "evacArea"]);

  if (["None", "Adequate", "No"].includes(value)) {
    if (value === "No" && !negativeWhenYes.has(key)) return 2;
    if (value === "Adequate" && !positiveAdequacy.has(key)) return 2;
    return 0;
  }
  if (value === "Minor") return 1;
  if (value === "Major") return 2;
  if (value === "Yes") return negativeWhenYes.has(key) ? 2 : 0;
  if (value === "Inadequate") return positiveAdequacy.has(key) ? 2 : 0;
  return 0;
}

function getStatus(total) {
  if (total >= 8) return { label: "RED", cls: "bg-red-600", desc: "High risk – immediate action required" };
  if (total >= 4) return { label: "YELLOW", cls: "bg-amber-500", desc: "Moderate risk – fix issues soon" };
  return { label: "GREEN", cls: "bg-emerald-600", desc: "Low risk – maintain & monitor" };
}

function defaultValues() {
  const obj = {};
  CHECKS.forEach((c) => {
    if (["ventilation", "evacArea"].includes(c.key)) obj[c.key] = "Adequate";
    else obj[c.key] = "None";
  });
  return obj;
}

// ===== Assess tab =====
function Assess() {
  const [form, setForm] = useState({
    school: "",
    room: "",
    assessor: "",
    values: defaultValues(),
    photos: [],
    notes: "",
  });

  const totals = useMemo(() => {
    const sum = Object.entries(form.values).reduce((acc, [k, v]) => acc + riskPoints(k, v), 0);
    const status = getStatus(sum);
    return { sum, status };
  }, [form.values]);

  function updateValue(key, value) {
    setForm((f) => ({ ...f, values: { ...f.values, [key]: value } }));
  }

  function onPhotoChange(e) {
    const files = e.target.files;
    if (!files) return;
    const urls = Array.from(files).map((f) => URL.createObjectURL(f));
    setForm((f) => ({ ...f, photos: [...f.photos, ...urls] }));
  }

  function saveAssessment() {
    const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
    const payload = { id, ...form, total: totals.sum, status: totals.status.label, createdAt: new Date().toISOString() };
    const prev = JSON.parse(localStorage.getItem("safe_scan_assessments") || "[]");
    localStorage.setItem("safe_scan_assessments", JSON.stringify([payload, ...prev]));
    alert("Assessment saved to Dashboard");
    setForm((f) => ({ ...f, room: "", values: defaultValues(), photos: [], notes: "" }));
  }

  const recs = useMemo(() => buildRecommendations(form.values), [form.values]);

  return (
    <section className="py-8">
      <h2 className="text-xl font-semibold mb-3">Room Safety Assessment</h2>
      <p className="text-sm text-slate-600 mb-6">
        Fill the checklist below. The system computes a simple risk score and status (Green/Yellow/Red) and suggests next actions.
      </p>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Field label="School">
          <input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })}
                 className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                 placeholder="e.g., SMPN 3 Pangkalan Kerinci" />
        </Field>
        <Field label="Room / Area">
          <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })}
                 className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                 placeholder="e.g., Class 9A / Lab" />
        </Field>
        <Field label="Assessor">
          <input value={form.assessor} onChange={(e) => setForm({ ...form, assessor: e.target.value })}
                 className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                 placeholder="Your name / OSIS" />
        </Field>
      </div>

      <ScoreCard total={totals.sum} status={totals.status} />

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        {CHECKS.map((c) => (
          <div key={c.key} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{c.label}</p>
                {c.help && <p className="text-xs text-slate-500 mt-1">{c.help}</p>}
              </div>
              <Select
                value={form.values[c.key]}
                onChange={(v) => updateValue(c.key, v)}
                optionType={c.key === "ventilation" || c.key === "evacArea" ? "adequacy" : "severity"}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="font-medium mb-2">Upload Photos (optional)</p>
          <input type="file" multiple accept="image/*" onChange={onPhotoChange} />
          {form.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {form.photos.map((url, i) => (
                <img key={i} src={url} className="w-full h-24 object-cover rounded-xl border" />
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="font-medium mb-2">Notes</p>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={6} className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                    placeholder="Write any observation..." />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mt-6">
        <p className="font-medium mb-1">Auto Recommendations</p>
        <p className="text-xs text-slate-500 mb-3">Generated from your checklist selections.</p>
        {recs.length === 0 ? (
          <p className="text-sm">No critical issues detected. Maintain routine monitoring.</p>
        ) : (
          <ul className="list-disc ml-5 text-sm space-y-1">
            {recs.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button onClick={saveAssessment} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium shadow hover:opacity-95">
          Save to Dashboard
        </button>
        <button onClick={() => setForm({ school: "", room: "", assessor: "", values: defaultValues(), photos: [], notes: "" })}
                className="px-4 py-2 rounded-xl border border-slate-300">
          Reset
        </button>
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="text-sm">
      <span className="block text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

function ScoreCard({ total, status }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Risk score</p>
          <p className="text-3xl font-bold">{total}</p>
          <p className="text-xs text-slate-500 mt-1">0–3 Green • 4–7 Yellow • 8+ Red</p>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-white font-semibold ${status.cls}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-white/70" />
            {status.label}
          </div>
          <p className="text-xs text-slate-500 mt-2 max-w-xs">{status.desc}</p>
        </div>
      </div>
    </div>
  );
}

function Select({ value, onChange, optionType }) {
  const options = optionType === "severity" ? ["None", "Minor", "Major"] : ["Adequate", "Inadequate"];
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="px-2 py-1 text-sm rounded-lg border border-slate-300">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function buildRecommendations(v) {
  const recs = [];
  const add = (cond, text) => { if (cond) recs.push(text); };

  add(v.wallCracks === "Major", "Stop using the room; consult a qualified technician/engineer for crack assessment.");
  add(v.columnTilt !== "None", "Check alignment of columns/beams; if tilt is visible, restrict access and report.");
  add(v.roofLeak !== "None" || v.looseCeiling !== "None", "Fix roof leaks and secure ceiling panels to prevent falling objects.");
  add(v.exposedRebar !== "None", "Repair spalling concrete and protect exposed reinforcement from corrosion.");
  add(v.electrical !== "None", "Secure exposed electrical components; isolate power if necessary.");
  add(v.blockedExit !== "None", "Clear emergency exits and keep pathways unobstructed.");
  add(v.overcapacity !== "None", "Reduce classroom occupancy to safe levels.");
  add(v.ventilation === "Inadequate", "Improve ventilation (open windows, install vents/fans as appropriate).");
  add(v.nearTrees !== "None", "Trim or assess large trees near the structure to minimize fall risk.");
  add(v.foundation !== "None", "Investigate signs of settlement; avoid heavy loads; seek expert inspection.");
  add(v.groundShift !== "None", "Check soil settlement; avoid adding load; consider temporary room closure and consult local public works/technician.");
  add(v.floodHistory !== "None", "Store assets higher, protect electrical points; prepare flood SOP.");
  add(v.evacArea === "Inadequate", "Designate a clear evacuation area and mark routes visibly.");

  return recs;
}

// ===== Dashboard =====
function Dashboard() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("safe_scan_assessments") || "[]");
    setItems(data);
  }, []);

  const filtered = useMemo(() => {
    if (filter === "ALL") return items;
    return items.filter((it) => it.status === filter);
  }, [items, filter]);

  function clearAll() {
    if (!confirm("Clear all saved assessments?")) return;
    localStorage.removeItem("safe_scan_assessments");
    setItems([]);
  }

  return (
    <section className="py-8">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <p className="text-sm text-slate-600">Saved assessments (this device).</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 text-sm">
            <option value="ALL">All statuses</option>
            <option value="GREEN">GREEN</option>
            <option value="YELLOW">YELLOW</option>
            <option value="RED">RED</option>
          </select>
          <button onClick={clearAll} className="px-3 py-2 rounded-xl border border-slate-300 text-sm">Clear</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <Th>When</Th><Th>School</Th><Th>Room</Th><Th>Assessor</Th><Th>Score</Th><Th>Status</Th><Th>Photos</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr key={it.id} className="border-t">
                  <Td>{new Date(it.createdAt).toLocaleString()}</Td>
                  <Td>{it.school}</Td>
                  <Td>{it.room}</Td>
                  <Td>{it.assessor}</Td>
                  <Td className="font-semibold">{it.total}</Td>
                  <Td>
                    <span className={`px-2 py-1 rounded-lg text-white text-xs font-semibold ${
                      it.status === "RED" ? "bg-red-600" : it.status === "YELLOW" ? "bg-amber-500" : "bg-emerald-600"
                    }`}>{it.status}</span>
                  </Td>
                  <Td>
                    {it.photos?.length ? (
                      <div className="flex gap-1 flex-wrap max-w-[220px]">
                        {it.photos.map((p, i) => <img key={i} src={p} className="w-12 h-12 object-cover rounded-lg border" />)}
                      </div>
                    ) : <span className="text-slate-400">—</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Th({ children }) { return <th className="text-left font-semibold text-slate-600 px-4 py-3">{children}</th>; }
function Td({ children }) { return <td className="px-4 py-3 align-top">{children}</td>; }

function EmptyState() {
  return (
    <div className="border border-dashed border-slate-300 rounded-2xl p-8 text-center bg-white">
      <p className="font-medium">No assessments yet</p>
      <p className="text-sm text-slate-500">Go to <span className="font-semibold">Assessment</span> tab to create one.</p>
    </div>
  );
}

// ===== About =====
function About() {
  return (
    <section className="py-8 space-y-4">
      <h2 className="text-xl font-semibold">About this Prototype</h2>
      <p className="text-sm text-slate-600">
        MVP web tool for early detection of unsafe signs in school buildings. Single clear function:
        visual checklist with auto-scoring (Green/Yellow/Red) and recommendations. Local-only data.
      </p>
      <ul className="list-disc ml-5 text-sm space-y-1">
        <li>Mobile-friendly single page.</li>
        <li>12–18 checklist items, plain language.</li>
        <li>Photo capture support & simple dashboard.</li>
        <li>No server required for demo.</li>
      </ul>
      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
        <p className="text-sm">
          <span className="font-semibold">How to use:</span> Go to <span className="font-semibold">Assessment</span>,
          fill the checklist, review status, then <span className="font-semibold">Save to Dashboard</span>.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 mt-8">
      <div className="max-w-5xl mx-auto px-4 py-6 text-xs text-slate-500 flex items-center justify-between">
        <span>© {new Date().getFullYear()} SAFE School Scan – Prototype</span>
        <span>Draft for pilot use only</span>
      </div>
    </footer>
  );
}
