import React, { useState, useMemo } from "react";
import {
  Plus, Pencil, Trash2, X, Search, AlertCircle, CheckCircle2, Loader2,
  User, FolderKanban, CalendarClock, Layers, Briefcase, Users2,
  Percent, Clock, LayoutGrid, CalendarRange, ChevronRight, BadgeCheck,
} from "lucide-react";

/* ============================================================
   DESIGN TOKENS — duplicated from App.jsx to keep this file
   standalone (no circular import back into App.jsx).
   ============================================================ */
const COLORS = {
  navy: "#161D34", accent: "#3B6FE0", accentSoft: "#EAF0FE",
  bg: "#F3F5F9", card: "#FFFFFF", text: "#1B2338", textMuted: "#6B7280",
  border: "#E4E7EE", success: "#1B9C6E", successSoft: "#E6F6EF",
  danger: "#D6483E", dangerSoft: "#FBE9E7",
};
const CHART_PALETTE = ["#3B6FE0", "#8B5CF6", "#0EA5A4", "#F59E0B", "#22A06B", "#E11D48"];

const cardStyle = { background: COLORS.card, borderRadius: 14, padding: 18, border: `1px solid ${COLORS.border}` };
const cardTitle = { display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 700, color: COLORS.text, marginBottom: 12 };
const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 9, border: `1px solid ${COLORS.border}`,
  fontSize: 13.5, outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif", color: COLORS.text,
};
const labelStyle = { display: "block", fontSize: 12.5, fontWeight: 700, color: COLORS.text, marginBottom: 6 };

function StatusBadge({ active, onLabel = "Active", offLabel = "Inactive" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999,
      fontSize: 12.5, fontWeight: 600, background: active ? COLORS.successSoft : COLORS.dangerSoft,
      color: active ? COLORS.success : COLORS.danger,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? COLORS.success : COLORS.danger }} />
      {active ? onLabel : offLabel}
    </span>
  );
}

function ConfirmModal({ title, message, confirmLabel, busy, onCancel, onConfirm }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,20,40,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 380, background: COLORS.card, borderRadius: 14, padding: 22, boxShadow: "0 30px 70px rgba(0,0,0,0.35)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <span style={{ width: 36, height: 36, borderRadius: 9, background: COLORS.dangerSoft, color: COLORS.danger, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertCircle size={18} />
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text, marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>{message}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>Cancel</button>
          <button onClick={onConfirm} disabled={busy} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.danger, color: "#fff", fontSize: 13, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.75 : 1, display: "flex", alignItems: "center", gap: 7 }}>
            {busy && <Loader2 size={13} className="spin" />}
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SAMPLE DATA
   Shaped to match the real entities so this is a drop-in swap
   for callMasterDataFlow("ProjectCategory"/"Role", "LIST") and
   callUserFlow("LIST") once the backend is wired.
   TODO(backend): replace these consts with LIST calls + a new
   entity="Project" branch (fields below) on the shared flow.
   ============================================================ */
const SAMPLE_CATEGORIES = [
  { id: 1, code: "PC1", name: "Application Development" },
  { id: 2, code: "PC2", name: "Data Analytics" },
  { id: 3, code: "PC3", name: "Support & Maintenance" },
];
const SAMPLE_USERS = [
  { id: 1, empId: "EMP1001", firstName: "Arun", lastName: "Kumar", jobTitle: "Software Engineer" },
  { id: 2, empId: "EMP1002", firstName: "Divya", lastName: "Menon", jobTitle: "Business Analyst" },
  { id: 3, empId: "EMP1003", firstName: "Rahul", lastName: "Singh", jobTitle: "Project Lead" },
  { id: 4, empId: "EMP1004", firstName: "Sneha", lastName: "Iyer", jobTitle: "QA Engineer" },
];
const SAMPLE_ROLES = [
  { id: 1, code: "DEV", name: "Developer" },
  { id: 2, code: "LEAD", name: "Project Lead" },
  { id: 3, code: "QA", name: "QA Engineer" },
  { id: 4, code: "BA", name: "Business Analyst" },
];
const SAMPLE_CLIENTS = [
  { id: 1, code: "CL01", name: "Devoir Technologies" },
  { id: 2, code: "CL02", name: "Nova Retail Group" },
  { id: 3, code: "CL03", name: "BlueWave Logistics" },
];
const SAMPLE_BILLING_TYPES = [
  { id: 1, code: "FP", name: "Fixed Price" },
  { id: 2, code: "TM", name: "Time & Material" },
  { id: 3, code: "RET", name: "Retainer" },
];
const SAMPLE_PROJECTS = [
  {
    id: 1, guid: 1, projectCode: "PRJ1001", projectName: "Customer Portal Revamp",
    categoryId: 1, clientId: 2, billingTypeId: 2, active: true,
    startDate: "2026-07-01", endDate: "2026-10-31",
    resources: [
      { id: 1, userId: 3, roleId: 2, allocationPct: 50, weeklyHours: 20, billable: true, startDate: "2026-07-01", endDate: "2026-10-31" },
      { id: 2, userId: 1, roleId: 1, allocationPct: 100, weeklyHours: 40, billable: true, startDate: "2026-07-01", endDate: "2026-09-15" },
      { id: 3, userId: 4, roleId: 3, allocationPct: 60, weeklyHours: 24, billable: true, startDate: "2026-08-01", endDate: "2026-10-31" },
    ],
  },
  {
    id: 2, guid: 2, projectCode: "PRJ1002", projectName: "Internal Analytics Dashboard",
    categoryId: 2, clientId: 1, billingTypeId: 3, active: true,
    startDate: "2026-06-15", endDate: "2026-12-15",
    resources: [
      { id: 4, userId: 2, roleId: 4, allocationPct: 40, weeklyHours: 16, billable: false, startDate: "2026-06-15", endDate: "2026-12-15" },
      { id: 5, userId: 1, roleId: 1, allocationPct: 30, weeklyHours: 12, billable: true, startDate: "2026-09-01", endDate: "2026-12-15" },
    ],
  },
  {
    id: 3, guid: 3, projectCode: "PRJ1003", projectName: "Warehouse Support Contract",
    categoryId: 3, clientId: 3, billingTypeId: 1, active: false,
    startDate: "2026-08-01", endDate: "2026-11-30",
    resources: [
      { id: 6, userId: 4, roleId: 3, allocationPct: 20, weeklyHours: 8, billable: true, startDate: "2026-08-01", endDate: "2026-11-30" },
    ],
  },
];

/* ============================================================
   LOOKUP HELPERS
   ============================================================ */
const findName = (list, id) => list.find((x) => x.id === Number(id))?.name || "—";
const userLabel = (id) => {
  const u = SAMPLE_USERS.find((x) => x.id === Number(id));
  return u ? `${u.firstName} ${u.lastName}` : "—";
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

let nextProjectId = 100;
let nextResourceId = 1000;

/* ============================================================
   RESOURCE SUB-FORM ROW (used inside the Project add/edit panel)
   ============================================================ */
function ResourceRow({ res, onChange, onRemove }) {
  return (
    <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12, marginBottom: 10, position: "relative" }}>
      <button
        onClick={onRemove}
        style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}
        title="Remove resource"
      >
        <X size={14} />
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>Resource (User)*</label>
          <select value={res.userId} onChange={(e) => onChange({ ...res, userId: e.target.value })} style={inputStyle}>
            <option value="">Select user</option>
            {SAMPLE_USERS.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
          </select>
        </div>
        <div>
          <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>Role*</label>
          <select value={res.roleId} onChange={(e) => onChange({ ...res, roleId: e.target.value })} style={inputStyle}>
            <option value="">Select role</option>
            {SAMPLE_ROLES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        <div>
          <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>Allocation %</label>
          <input type="number" min={0} max={100} value={res.allocationPct}
            onChange={(e) => onChange({ ...res, allocationPct: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>Weekly Hours</label>
          <input type="number" min={0} max={168} value={res.weeklyHours}
            onChange={(e) => onChange({ ...res, weeklyHours: e.target.value })} style={inputStyle} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        <div>
          <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>Start Date</label>
          <input type="date" value={res.startDate} onChange={(e) => onChange({ ...res, startDate: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>End Date</label>
          <input type="date" value={res.endDate} onChange={(e) => onChange({ ...res, endDate: e.target.value })} style={inputStyle} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text }}>Billable</span>
        <div onClick={() => onChange({ ...res, billable: !res.billable })} style={{
          width: 36, height: 20, borderRadius: 999, background: res.billable ? COLORS.accent : "#D7DCE6", position: "relative", cursor: "pointer",
        }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: res.billable ? 18 : 2, transition: "left 0.15s" }} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PROJECT ADD/EDIT PANEL
   ============================================================ */
function ProjectPanel({ mode, data, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);

  const addResource = () => {
    setForm({
      ...form,
      resources: [...form.resources, {
        id: nextResourceId++, userId: "", roleId: "", allocationPct: 100, weeklyHours: 40,
        billable: true, startDate: form.startDate, endDate: form.endDate,
      }],
    });
  };
  const updateResource = (idx, next) => {
    const list = [...form.resources];
    list[idx] = next;
    setForm({ ...form, resources: list });
  };
  const removeResource = (idx) => setForm({ ...form, resources: form.resources.filter((_, i) => i !== idx) });

  return (
    <div style={{ width: 420, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0, display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)" }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{mode === "add" ? "Add New Project" : "Edit Project"}</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Fill project details and assign resources</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <label style={labelStyle}>Project Code*</label>
        <input value={form.projectCode} onChange={(e) => setForm({ ...form, projectCode: e.target.value })} placeholder="e.g. PRJ1004" style={inputStyle} />

        <label style={{ ...labelStyle, marginTop: 14 }}>Project Name*</label>
        <input value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} placeholder="e.g. Mobile App Revamp" style={inputStyle} />

        <label style={{ ...labelStyle, marginTop: 14 }}>Project Category*</label>
        <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} style={inputStyle}>
          <option value="">Select category</option>
          {SAMPLE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label style={{ ...labelStyle, marginTop: 14 }}>Client*</label>
        <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} style={inputStyle}>
          <option value="">Select client</option>
          {SAMPLE_CLIENTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label style={{ ...labelStyle, marginTop: 14 }}>Billing Type*</label>
        <select value={form.billingTypeId} onChange={(e) => setForm({ ...form, billingTypeId: e.target.value })} style={inputStyle}>
          <option value="">Select billing type</option>
          {SAMPLE_BILLING_TYPES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
          <div>
            <label style={labelStyle}>Start Date*</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Est. End Date*</label>
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, padding: "12px 14px", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>Active</span>
          <div onClick={() => setForm({ ...form, active: !form.active })} style={{ width: 40, height: 22, borderRadius: 999, background: form.active ? COLORS.accent : "#D7DCE6", position: "relative", cursor: "pointer" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: form.active ? 20 : 2, transition: "left 0.15s" }} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 22, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: COLORS.text, display: "flex", alignItems: "center", gap: 6 }}>
            <Users2 size={14} /> Resources ({form.resources.length})
          </div>
          <button onClick={addResource} style={{ display: "flex", alignItems: "center", gap: 5, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            <Plus size={12} /> Add Resource
          </button>
        </div>

        {form.resources.length === 0 ? (
          <div style={{ fontSize: 12.5, color: COLORS.textMuted, textAlign: "center", padding: "14px 0" }}>No resources assigned yet.</div>
        ) : form.resources.map((res, idx) => (
          <ResourceRow key={res.id} res={res} onChange={(next) => updateResource(idx, next)} onRemove={() => removeResource(idx)} />
        ))}

        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 12 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>Cancel</button>
        <button onClick={() => onSubmit(form)} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1, display: "flex", alignItems: "center", gap: 7 }}>
          {saving && <Loader2 size={13} className="spin" />}
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   PROJECT DETAIL DRAWER (read-only view + resource table)
   ============================================================ */
function ProjectDetailPanel({ project, onClose, onEdit }) {
  return (
    <div style={{ width: 420, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0, display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)" }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.text }}>{project.projectName}</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{project.projectCode}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <StatusBadge active={project.active} />
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.accent, background: COLORS.accentSoft, padding: "3px 10px", borderRadius: 999 }}>
            {findName(SAMPLE_CATEGORIES, project.categoryId)}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Client</div>
            <div style={{ fontSize: 13.5, color: COLORS.text, marginTop: 3 }}>{findName(SAMPLE_CLIENTS, project.clientId)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Billing Type</div>
            <div style={{ fontSize: 13.5, color: COLORS.text, marginTop: 3 }}>{findName(SAMPLE_BILLING_TYPES, project.billingTypeId)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Start Date</div>
            <div style={{ fontSize: 13.5, color: COLORS.text, marginTop: 3 }}>{fmtDate(project.startDate)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Est. End Date</div>
            <div style={{ fontSize: 13.5, color: COLORS.text, marginTop: 3 }}>{fmtDate(project.endDate)}</div>
          </div>
        </div>

        <div style={{ fontWeight: 700, fontSize: 13.5, color: COLORS.text, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <Users2 size={14} /> Resources ({project.resources.length})
        </div>

        {project.resources.length === 0 ? (
          <div style={{ fontSize: 12.5, color: COLORS.textMuted, textAlign: "center", padding: "14px 0" }}>No resources assigned.</div>
        ) : project.resources.map((r) => (
          <div key={r.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.text }}>{userLabel(r.userId)}</div>
              {r.billable ? (
                <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.success, display: "flex", alignItems: "center", gap: 4 }}>
                  <BadgeCheck size={12} /> Billable
                </span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted }}>Non-billable</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{findName(SAMPLE_ROLES, r.roleId)}</div>
            <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 12, color: COLORS.text }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Percent size={12} color={COLORS.textMuted} /> {r.allocationPct}%</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} color={COLORS.textMuted} /> {r.weeklyHours} hrs/wk</span>
            </div>
            <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 6 }}>{fmtDate(r.startDate)} → {fmtDate(r.endDate)}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>Close</button>
        <button onClick={onEdit} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          <Pencil size={13} /> Edit Project
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   PROJECT DASHBOARD PAGE
   ============================================================ */
export function ProjectDashboardPage() {
  const [projects, setProjects] = useState(SAMPLE_PROJECTS);
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState(null); // { mode: 'add'|'edit', data }
  const [detail, setDetail] = useState(null); // selected project for drawer
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = projects.filter((p) =>
    p.projectName.toLowerCase().includes(search.toLowerCase()) || p.projectCode.toLowerCase().includes(search.toLowerCase())
  );

  const totalResources = projects.reduce((sum, p) => sum + p.resources.length, 0);
  const activeCount = projects.filter((p) => p.active).length;
  const totalWeeklyHours = projects.reduce((sum, p) => sum + p.resources.reduce((s, r) => s + Number(r.weeklyHours || 0), 0), 0);

  const kpis = [
    { label: "Total Projects", value: String(projects.length), icon: FolderKanban, color: COLORS.accent },
    { label: "Active Projects", value: String(activeCount), icon: CheckCircle2, color: COLORS.success },
    { label: "Resources Allocated", value: String(totalResources), icon: Users2, color: "#8B5CF6" },
    { label: "Weekly Billable Hrs", value: String(totalWeeklyHours), icon: Clock, color: "#F59E0B" },
  ];

  const openAdd = () => setPanel({
    mode: "add",
    data: { id: null, guid: "", projectCode: "", projectName: "", categoryId: "", clientId: "", billingTypeId: "", startDate: "", endDate: "", active: true, resources: [] },
  });
  const openEdit = (p) => setPanel({ mode: "edit", data: JSON.parse(JSON.stringify(p)) });

  const submitPanel = (form) => {
    if (!form.projectCode?.trim() || !form.projectName?.trim() || !form.categoryId || !form.startDate || !form.endDate) {
      setErr("Project Code, Name, Category and Dates are required.");
      return;
    }
    setSaving(true);
    setErr("");
    setTimeout(() => { // TODO(backend): replace with callMasterDataFlow("Project", action, form)
      if (form.id) {
        setProjects((prev) => prev.map((p) => (p.id === form.id ? form : p)));
        setToast("Project updated.");
      } else {
        const newProject = { ...form, id: nextProjectId, guid: nextProjectId };
        nextProjectId++;
        setProjects((prev) => [newProject, ...prev]);
        setToast("Project added.");
      }
      setSaving(false);
      setPanel(null);
    }, 400);
  };

  const confirmDeleteRow = () => {
    setProjects((prev) => prev.filter((p) => p.id !== confirmDelete.id));
    setToast("Project deleted.");
    setConfirmDelete(null);
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Project Dashboard</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Overview of all projects and their resource allocation</div>
          </div>
          <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 7, background: COLORS.accent, color: "#fff", border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            <Plus size={15} /> Add Project
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 12.5, fontWeight: 600 }}>{k.label}</span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: `${k.color}1F`, color: k.color, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={15} /></span>
                </div>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: COLORS.text, marginTop: 10 }}>{k.value}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "9px 12px", width: 300, marginBottom: 16, background: COLORS.card }}>
          <Search size={14} color={COLORS.textMuted} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by project code or name" style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {filtered.length === 0 ? (
            <div style={{ ...cardStyle, gridColumn: "1/-1", textAlign: "center", color: COLORS.textMuted, padding: 40 }}>No projects match your search.</div>
          ) : filtered.map((p) => (
            <div key={p.id} style={{ ...cardStyle, cursor: "pointer", display: "flex", flexDirection: "column", gap: 10 }} onClick={() => setDetail(p)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: COLORS.text }}>{p.projectName}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>{p.projectCode}</div>
                </div>
                <StatusBadge active={p.active} />
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.accent, background: COLORS.accentSoft, padding: "3px 9px", borderRadius: 999 }}>
                  {findName(SAMPLE_CATEGORIES, p.categoryId)}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.textMuted, background: COLORS.bg, padding: "3px 9px", borderRadius: 999 }}>
                  {findName(SAMPLE_CLIENTS, p.clientId)}
                </span>
              </div>

              <div style={{ fontSize: 12, color: COLORS.textMuted, display: "flex", alignItems: "center", gap: 5 }}>
                <CalendarClock size={12} /> {fmtDate(p.startDate)} → {fmtDate(p.endDate)}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, paddingTop: 10, borderTop: `1px solid ${COLORS.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: -6 }}>
                  {p.resources.slice(0, 4).map((r, i) => (
                    <span key={r.id} title={userLabel(r.userId)} style={{
                      width: 26, height: 26, borderRadius: "50%", background: CHART_PALETTE[i % CHART_PALETTE.length],
                      color: "#fff", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                      border: "2px solid #fff", marginLeft: i === 0 ? 0 : -8,
                    }}>
                      {userLabel(r.userId).split(" ").map((w) => w[0]).join("")}
                    </span>
                  ))}
                  {p.resources.length === 0 && <span style={{ fontSize: 11.5, color: COLORS.textMuted }}>No resources</span>}
                </div>
                <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(p)} style={{ background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}><Pencil size={12} /></button>
                  <button onClick={() => setConfirmDelete(p)} style={{ background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {panel && (
        <ProjectPanel mode={panel.mode} data={panel.data} saving={saving} error={err} onCancel={() => { setPanel(null); setErr(""); }} onSubmit={submitPanel} />
      )}

      {detail && !panel && (
        <ProjectDetailPanel project={detail} onClose={() => setDetail(null)} onEdit={() => { openEdit(detail); setDetail(null); }} />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this project?"
          message={`"${confirmDelete.projectName}" (${confirmDelete.projectCode}) and its ${confirmDelete.resources.length} resource allocation(s) will be removed. This can't be undone.`}
          confirmLabel="Delete" busy={false}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={confirmDeleteRow}
        />
      )}

      {toast && (
        <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)" }}
          onAnimationEnd={() => {}}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   RESOURCE ALLOCATION PAGE — flat grid + Gantt-style timeline
   ============================================================ */
function AllocationPanel({ data, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  return (
    <div style={{ width: 380, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0, display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)" }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>Add Resource Allocation</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Assign a user to a project</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>
      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <label style={labelStyle}>Project*</label>
        <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} style={inputStyle}>
          <option value="">Select project</option>
          {SAMPLE_PROJECTS.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
        </select>

        <label style={{ ...labelStyle, marginTop: 14 }}>Resource (User)*</label>
        <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} style={inputStyle}>
          <option value="">Select user</option>
          {SAMPLE_USERS.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
        </select>

        <label style={{ ...labelStyle, marginTop: 14 }}>Role*</label>
        <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} style={inputStyle}>
          <option value="">Select role</option>
          {SAMPLE_ROLES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
          <div>
            <label style={labelStyle}>Allocation %</label>
            <input type="number" min={0} max={100} value={form.allocationPct} onChange={(e) => setForm({ ...form, allocationPct: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Weekly Hours</label>
            <input type="number" min={0} max={168} value={form.weeklyHours} onChange={(e) => setForm({ ...form, weeklyHours: e.target.value })} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
          <div>
            <label style={labelStyle}>Start Date*</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>End Date*</label>
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, padding: "12px 14px", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>Billable</span>
          <div onClick={() => setForm({ ...form, billable: !form.billable })} style={{ width: 40, height: 22, borderRadius: 999, background: form.billable ? COLORS.accent : "#D7DCE6", position: "relative", cursor: "pointer" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: form.billable ? 20 : 2, transition: "left 0.15s" }} />
          </div>
        </div>

        {error && <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 16 }}><AlertCircle size={14} /> {error}</div>}
      </div>
      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>Cancel</button>
        <button onClick={() => onSubmit(form)} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1, display: "flex", alignItems: "center", gap: 7 }}>
          {saving && <Loader2 size={13} className="spin" />}
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

function TimelineView({ allocations }) {
  const { rangeStart, totalDays, months } = useMemo(() => {
    if (allocations.length === 0) return { rangeStart: new Date(), totalDays: 1, months: [] };
    const starts = allocations.map((a) => new Date(a.startDate));
    const ends = allocations.map((a) => new Date(a.endDate));
    const min = new Date(Math.min(...starts));
    const max = new Date(Math.max(...ends));
    const days = Math.max(1, Math.round((max - min) / 86400000));
    const monthList = [];
    let cursor = new Date(min.getFullYear(), min.getMonth(), 1);
    while (cursor <= max) {
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const segStart = cursor < min ? min : cursor;
      const segEnd = nextMonth < max ? nextMonth : max;
      const widthPct = (Math.max(1, (segEnd - segStart) / 86400000) / days) * 100;
      monthList.push({ label: cursor.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), widthPct });
      cursor = nextMonth;
    }
    return { rangeStart: min, totalDays: days, months: monthList };
  }, [allocations]);

  const barStyle = (a) => {
    const s = new Date(a.startDate), e = new Date(a.endDate);
    const left = ((s - rangeStart) / 86400000 / totalDays) * 100;
    const width = Math.max(1.5, ((e - s) / 86400000 / totalDays) * 100);
    return { left: `${left}%`, width: `${width}%` };
  };

  if (allocations.length === 0) {
    return <div style={{ ...cardStyle, textAlign: "center", color: COLORS.textMuted, padding: 40 }}>No allocations to plot.</div>;
  }

  return (
    <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ width: 260, flexShrink: 0, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase" }}>Resource / Project</div>
        <div style={{ flex: 1, display: "flex" }}>
          {months.map((m, i) => (
            <div key={i} style={{ width: `${m.widthPct}%`, padding: "10px 6px", fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textAlign: "center", borderLeft: i === 0 ? "none" : `1px solid ${COLORS.border}` }}>
              {m.label}
            </div>
          ))}
        </div>
      </div>
      {allocations.map((a, i) => (
        <div key={a.id} style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
          <div style={{ width: 260, flexShrink: 0, padding: "10px 16px" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text }}>{userLabel(a.userId)}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>{a.projectCode} • {findName(SAMPLE_ROLES, a.roleId)}</div>
          </div>
          <div style={{ flex: 1, position: "relative", height: 40 }}>
            <div title={`${a.projectName}: ${fmtDate(a.startDate)} → ${fmtDate(a.endDate)}`} style={{
              position: "absolute", top: 8, height: 24, borderRadius: 6, background: CHART_PALETTE[a.projectId % CHART_PALETTE.length],
              color: "#fff", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", whiteSpace: "nowrap", ...barStyle(a),
            }}>
              {a.allocationPct}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ResourceAllocationPage() {
  const [projects, setProjects] = useState(SAMPLE_PROJECTS);
  const [view, setView] = useState("grid"); // 'grid' | 'timeline'
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const allocations = useMemo(() => (
    projects.flatMap((p) => p.resources.map((r) => ({ ...r, projectId: p.id, projectName: p.projectName, projectCode: p.projectCode })))
  ), [projects]);

  const filtered = allocations.filter((a) => {
    const q = search.toLowerCase();
    return userLabel(a.userId).toLowerCase().includes(q) || a.projectName.toLowerCase().includes(q) || a.projectCode.toLowerCase().includes(q);
  });

  const openAdd = () => setPanel({
    projectId: "", userId: "", roleId: "", allocationPct: 50, weeklyHours: 20, billable: true, startDate: "", endDate: "",
  });

  const submitPanel = (form) => {
    if (!form.projectId || !form.userId || !form.roleId || !form.startDate || !form.endDate) {
      setErr("Project, User, Role and Dates are required.");
      return;
    }
    setSaving(true);
    setErr("");
    setTimeout(() => { // TODO(backend): replace with a callProjectResourceFlow("CREATE", form) style call
      setProjects((prev) => prev.map((p) => (
        p.id === Number(form.projectId)
          ? { ...p, resources: [...p.resources, { ...form, id: nextResourceId++ }] }
          : p
      )));
      setSaving(false);
      setPanel(null);
      setToast("Resource allocated.");
    }, 400);
  };

  const confirmDeleteRow = () => {
    setProjects((prev) => prev.map((p) => (
      p.id === confirmDelete.projectId ? { ...p, resources: p.resources.filter((r) => r.id !== confirmDelete.id) } : p
    )));
    setToast("Allocation removed.");
    setConfirmDelete(null);
  };

  const totalHours = filtered.reduce((s, a) => s + Number(a.weeklyHours || 0), 0);
  const billableCount = filtered.filter((a) => a.billable).length;

  const kpis = [
    { label: "Total Allocations", value: String(allocations.length), icon: Users2, color: COLORS.accent },
    { label: "Billable Assignments", value: String(billableCount), icon: BadgeCheck, color: COLORS.success },
    { label: "Weekly Hours (filtered)", value: String(totalHours), icon: Clock, color: "#F59E0B" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Resource Allocation</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Assign users to projects and plan capacity</div>
          </div>
          <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 7, background: COLORS.accent, color: "#fff", border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            <Plus size={15} /> Add Allocation
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 16 }}>
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 12.5, fontWeight: 600 }}>{k.label}</span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: `${k.color}1F`, color: k.color, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={15} /></span>
                </div>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: COLORS.text, marginTop: 10 }}>{k.value}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "9px 12px", width: 300, background: COLORS.card }}>
            <Search size={14} color={COLORS.textMuted} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user or project" style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }} />
          </div>
          <div style={{ display: "flex", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
            <button onClick={() => setView("grid")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "none", background: view === "grid" ? COLORS.accent : "#fff", color: view === "grid" ? "#fff" : COLORS.text, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              <LayoutGrid size={13} /> Grid
            </button>
            <button onClick={() => setView("timeline")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "none", background: view === "timeline" ? COLORS.accent : "#fff", color: view === "timeline" ? "#fff" : COLORS.text, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              <CalendarRange size={13} /> Timeline
            </button>
          </div>
        </div>

        {view === "grid" ? (
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: COLORS.bg }}>
                  {["User", "Project", "Role", "Allocation", "Weekly Hrs", "Billable", "Duration", ""].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No allocations match your search.</td></tr>
                ) : filtered.map((a, i) => (
                  <tr key={a.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                    <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{userLabel(a.userId)}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{a.projectName} <span style={{ color: COLORS.textMuted }}>({a.projectCode})</span></td>
                    <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{findName(SAMPLE_ROLES, a.roleId)}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{a.allocationPct}%</td>
                    <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{a.weeklyHours} hrs</td>
                    <td style={{ padding: "11px 16px" }}><StatusBadge active={a.billable} onLabel="Billable" offLabel="Non-billable" /></td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: COLORS.textMuted }}>{fmtDate(a.startDate)} → {fmtDate(a.endDate)}</td>
                    <td style={{ padding: "11px 16px", textAlign: "right" }}>
                      <button onClick={() => setConfirmDelete(a)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                        <Trash2 size={12} /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <TimelineView allocations={filtered} />
        )}
      </div>

      {panel && <AllocationPanel data={panel} saving={saving} error={err} onCancel={() => { setPanel(null); setErr(""); }} onSubmit={submitPanel} />}

      {confirmDelete && (
        <ConfirmModal
          title="Remove this allocation?"
          message={`${userLabel(confirmDelete.userId)} will be unassigned from ${confirmDelete.projectName}.`}
          confirmLabel="Remove" busy={false}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={confirmDeleteRow}
        />
      )}

      {toast && (
        <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)" }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}
