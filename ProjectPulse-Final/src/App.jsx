import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard, ChevronDown, LogOut, Search, Plus, Pencil, Trash2,
  X, Building2, Layers, Globe2, User, Handshake, CheckCircle2,
  CalendarClock, Briefcase, Contact, Shield, Receipt, UserCog, Flag,
  Loader2, RefreshCw, AlertCircle, Users2, FolderKanban,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { ProjectDashboardPage, ResourceAllocationPage } from "./ProjectAllocation";

/* ============================================================
   DESIGN TOKENS
   Navy sidebar / clean enterprise console, matching the source
   Power Apps admin UI. Signature: colored module icon chips.
   ============================================================ */
const COLORS = {
  navy: "#161D34",
  navySoft: "#1E2748",
  navyBorder: "#2A3358",
  accent: "#3B6FE0",
  accentSoft: "#EAF0FE",
  bg: "#F3F5F9",
  card: "#FFFFFF",
  text: "#1B2338",
  textMuted: "#6B7280",
  border: "#E4E7EE",
  success: "#1B9C6E",
  successSoft: "#E6F6EF",
  danger: "#D6483E",
  dangerSoft: "#FBE9E7",
};

/* ============================================================
   HARD-CODED DEMO CREDENTIALS
   ============================================================ */
const DEMO_USERNAME = "ProjectPulse";
const DEMO_PASSWORD = "Devoir@123";

/* ============================================================
   MODULE REGISTRY — mirrors the Power Apps left nav exactly
   ============================================================ */
const ADMIN_MODULES = [
  { key: "department", label: "Department", icon: Building2, color: "#3B6FE0", implemented: true },
  { key: "project-category", label: "Project Category", icon: Layers, color: "#8B5CF6", implemented: true },
  { key: "country", label: "Country", icon: Globe2, color: "#0EA5A4", implemented: true },
  { key: "user", label: "User", icon: User, color: "#3B6FE0", implemented: true },
  { key: "project-deal-status", label: "Project Deal Status", icon: Handshake, color: "#22A06B", implemented: true },
  { key: "approval-status", label: "Approval Status", icon: CheckCircle2, color: "#F59E0B" },
  { key: "billing-type", label: "Billing Type", icon: CalendarClock, color: "#8B5CF6", implemented: true },
  { key: "client", label: "Client", icon: Briefcase, color: "#EAB308", implemented: true },
  { key: "roles", label: "Roles", icon: Shield, color: "#8B5CF6", implemented: true },
  { key: "invoice-status", label: "Invoice Status", icon: Receipt, color: "#3B6FE0" },
  { key: "user-roles", label: "User Roles", icon: UserCog, color: "#0EA5A4" },
  { key: "project-status", label: "Project Status", icon: Flag, color: "#E11D48" },
];

const PROJECT_MODULES = [
  { key: "project-dashboard", label: "Project Dashboard", icon: FolderKanban, color: "#22A06B", implemented: true },
  { key: "resource-allocation", label: "Resource Allocation", icon: Users2, color: "#F59E0B", implemented: true },
];

// Combined list — used for lookups (ModuleStub, sidebar shell check) that
// don't care which nav group a module belongs to.
const MODULES = [...ADMIN_MODULES, ...PROJECT_MODULES];


/* ============================================================
   POWER AUTOMATE FLOW CALLS — moved to flows.js (shared with
   ProjectAllocation.jsx to avoid a circular import between the
   two files). See flows.js for the entity switch documentation.
   ============================================================ */
import {
  callDepartmentFlow, callCountryFlow, callProjectCategoryFlow,
  callRoleFlow, callClientFlow, callBillingTypeFlow, callUserFlow,
  callDealStatusFlow, callClientContactFlow, callProjectFlow,
} from "./flows";

// Cycling palette for charts that color each bar/slice individually.
const CHART_PALETTE = [
  "#3B6FE0", "#8B5CF6", "#0EA5A4", "#F59E0B", "#22A06B",
  "#E11D48", "#EAB308", "#06B6D4", "#A855F7", "#F43F5E",
];

/* ============================================================
   SHARED UI BITS
   ============================================================ */
function Logo({ compact }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: "linear-gradient(135deg,#3B6FE0,#7C6BF2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, color: "#fff", fontSize: 15, fontFamily: "Sora, sans-serif"
      }}>
        PP
      </div>
      {!compact && (
        <div>
          <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", lineHeight: 1.1 }}>
            Project Pulse
          </div>
          <div style={{ fontSize: 11, color: "#8994B8", lineHeight: 1.1 }}>Master Data Console</div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px",
      borderRadius: 999, fontSize: 12.5, fontWeight: 600,
      background: active ? COLORS.successSoft : "#FBE9E7",
      color: active ? COLORS.success : COLORS.danger,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? COLORS.success : COLORS.danger }} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/* ============================================================
   LOGIN SCREEN
   ============================================================ */
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (!username.trim() || !password.trim()) {
      setError("Enter both username and password to continue.");
      return;
    }
    if (username.trim() !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
      setError("Invalid username or password.");
      return;
    }
    setError("");
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      onLogin(username.trim());
    }, 500);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      background: `radial-gradient(1100px 600px at 15% 10%, #1E2748 0%, ${COLORS.navy} 55%, #0E1326 100%)`,
      fontFamily: "Inter, sans-serif", padding: 20,
    }}>
      <div style={{ display: "flex", width: "100%", maxWidth: 880, borderRadius: 20, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.45)" }}>
        {/* Left brand panel */}
        <div style={{
          flex: "0 0 340px", background: "linear-gradient(160deg,#1E2748,#12172C)",
          padding: "40px 32px", display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}>
          <Logo />
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", color: "#fff", fontSize: 22, fontWeight: 700, lineHeight: 1.3, marginBottom: 10 }}>
              One console for every master record.
            </div>
            <div style={{ color: "#9AA5CC", fontSize: 13.5, lineHeight: 1.6 }}>
              Departments, clients, roles and statuses — kept in sync with Dataverse through your Power Automate flows.
            </div>
          </div>
          <div style={{ color: "#5C6690", fontSize: 12 }}>© {new Date().getFullYear()} Project Pulse</div>
        </div>

        {/* Right form panel */}
        <div style={{ flex: 1, background: COLORS.card, padding: "48px 44px" }}>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 24, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>
            Sign in
          </div>
          <div style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 28 }}>
            Use your admin credentials to open the console.
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. ProjectPulse"
              style={inputStyle}
            />
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.text, margin: "16px 0 6px" }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              style={inputStyle}
            />

            {error && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 13, marginTop: 14 }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={busy}
              style={{
                marginTop: 24, width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
                background: COLORS.accent, color: "#fff", fontWeight: 700, fontSize: 14.5,
                cursor: busy ? "default" : "pointer", opacity: busy ? 0.75 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {busy && <Loader2 size={16} className="spin" />}
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <div style={{ marginTop: 14, fontSize: 12, color: COLORS.textMuted, textAlign: "center" }}>
              Demo build — sign in with <b>ProjectPulse</b> / <b>Devoir@123</b>.
            </div>
          </div>
        </div>
      </div>
      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "11px 13px", borderRadius: 9, border: `1px solid ${COLORS.border}`,
  fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif",
  color: COLORS.text,
};

/* ============================================================
   TOP NAV — Admin and Project Management are direct links now
   (no dropdown); clicking either jumps straight to its first
   implemented screen. The left ModuleSidebar (shown once inside
   either shell) lists the rest of that group's screens.
   ============================================================ */
function TopNav({ user, current, onNavigateHome, onOpenModule, onLogout }) {
  const inAdmin = ADMIN_MODULES.some((m) => m.key === current);
  const inProject = PROJECT_MODULES.some((m) => m.key === current);

  return (
    <div style={{
      height: 60, background: COLORS.navy, display: "flex", alignItems: "center",
      justifyContent: "space-between", padding: "0 22px", flexShrink: 0, position: "relative", zIndex: 30,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
        <div style={{ cursor: "pointer" }} onClick={onNavigateHome}><Logo /></div>
        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <NavItem label="Dashboard" icon={LayoutDashboard} active={current === "dashboard"} onClick={onNavigateHome} />
          <NavItem
            label="Admin"
            icon={Building2}
            active={inAdmin}
            onClick={() => onOpenModule(ADMIN_MODULES.find((m) => m.implemented)?.key || ADMIN_MODULES[0].key)}
          />
          <NavItem
            label="Project Management"
            icon={FolderKanban}
            active={inProject}
            onClick={() => onOpenModule(PROJECT_MODULES.find((m) => m.implemented)?.key || PROJECT_MODULES[0].key)}
          />
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: COLORS.navySoft, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700,
        }}>
          {user?.[0]?.toUpperCase() || "A"}
        </div>
        <div style={{ color: "#fff", fontSize: 13.5, fontWeight: 600 }}>{user || "Administrator"}</div>
        <button onClick={onLogout} style={{
          display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${COLORS.navyBorder}`,
          color: "#C6CCE6", borderRadius: 8, padding: "6px 11px", fontSize: 12.5, cursor: "pointer",
        }}>
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </div>
  );
}

function NavItem({ label, icon: Icon, iconRight, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "9px 13px", borderRadius: 8, cursor: "pointer",
        fontSize: 13.5, fontWeight: 600, color: active ? "#fff" : "#AEB6D6",
        background: active ? COLORS.navySoft : "transparent",
      }}
    >
      {!iconRight && Icon && <Icon size={15} />}
      {label}
      {iconRight && Icon && <Icon size={14} />}
    </div>
  );
}

/* ============================================================
   MODULE SIDEBAR — shows only the modules belonging to whichever
   group (Admin / Project Management) the current page is in.
   ============================================================ */
function ModuleSidebar({ current, onSelect }) {
  const inProject = PROJECT_MODULES.some((m) => m.key === current);
  const groupModules = inProject ? PROJECT_MODULES : ADMIN_MODULES;
  const groupLabel = inProject ? "Project Management" : "Admin";

  return (
    <div style={{
      width: 236, background: COLORS.navy, flexShrink: 0, padding: "18px 10px",
      display: "flex", flexDirection: "column", gap: 2, overflowY: "auto",
    }}>
      <div style={{ padding: "6px 12px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "#7783AA", textTransform: "uppercase" }}>
        {groupLabel}
      </div>
      {groupModules.map((m) => {
        const Icon = m.icon;
        const active = current === m.key;
        return (
          <div
            key={m.key}
            onClick={() => onSelect(m.key)}
            style={{
              display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 9,
              cursor: "pointer", fontSize: 13.5, fontWeight: 500,
              background: active ? COLORS.accent : "transparent",
              color: active ? "#fff" : "#C6CCE6",
            }}
          >
            <span style={{
              width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
              background: active ? "rgba(255,255,255,0.18)" : `${m.color}26`, color: active ? "#fff" : m.color, flexShrink: 0,
            }}>
              <Icon size={13} />
            </span>
            {m.label}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   DASHBOARD HOME
   ============================================================ */
function DashboardHome({ onOpenModule }) {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([callDepartmentFlow("LIST"), callUserFlow("LIST"), callClientFlow("LIST"), callProjectFlow("LIST")])
      .then(([dept, usr, cli, proj]) => {
        if (cancelled) return;
        setDepartments(dept.data);
        setUsers(usr.data);
        setClients(cli.data);
        setProjects(proj.data);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const activeDepartments = departments.filter((d) => d.active).length;
  const activeProjects = projects.filter((p) => p.active).length;
  const activeUsers = users.filter((u) => u.active).length;
  const activeClients = clients.filter((c) => c.active).length;

  const kpis = [
    { label: "Active Departments", value: String(activeDepartments), icon: Building2, color: "#3B6FE0" },
    { label: "Open Projects", value: String(activeProjects), icon: FolderKanban, color: "#22A06B" },
    { label: "Active Users", value: String(activeUsers), icon: Users2, color: "#8B5CF6" },
    { label: "Active Clients", value: String(activeClients), icon: Briefcase, color: "#EAB308" },
  ];

  // Headcount by Department — derived from real Users grouped by DepartmentID.
  const deptHeadcount = departments.map((d) => ({
    name: d.name,
    value: users.filter((u) => String(u.departmentId) === String(d.guid)).length,
  })).filter((d) => d.value > 0);

  // Users by Gender — derived from real Users.
  const genderCounts = {};
  users.forEach((u) => {
    const g = u.gender || "Unspecified";
    genderCounts[g] = (genderCounts[g] || 0) + 1;
  });
  const genderSplit = Object.entries(genderCounts).map(([name, value], i) => ({
    name, value, color: CHART_PALETTE[i % CHART_PALETTE.length],
  }));

  return (
    <div style={{ padding: 26, overflowY: "auto", flex: 1 }}>
      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 21, fontWeight: 700, color: COLORS.text }}>Welcome back 👋</div>
      <div style={{ color: COLORS.textMuted, fontSize: 13.5, marginBottom: 22 }}>Here's what's happening across your master data today.</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 22 }}>
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: COLORS.textMuted, fontSize: 12.5, fontWeight: 600 }}>{k.label}</span>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: `${k.color}1F`, color: k.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={15} />
                </span>
              </div>
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: COLORS.text, marginTop: 10 }}>
                {loading ? <Loader2 size={20} className="spin" /> : k.value}
              </div>
            </div>
          );
        })}
      </div>

      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14, marginBottom: 14 }}>
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={cardTitle}><Building2 size={14} /> Headcount by Department</div>
              <button onClick={() => onOpenModule("department")} style={linkBtn}>Manage departments →</button>
            </div>
            {deptHeadcount.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>No users assigned to departments yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptHeadcount}>
                  <CartesianGrid stroke={COLORS.border} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: COLORS.textMuted }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: COLORS.textMuted }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS.accent} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={cardStyle}>
            <div style={cardTitle}><Users2 size={14} /> Users by Gender</div>
            {genderSplit.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>No users yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={genderSplit} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3}>
                    {genderSplit.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle = { background: COLORS.card, borderRadius: 14, padding: 18, border: `1px solid ${COLORS.border}` };
const cardTitle = { display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 700, color: COLORS.text, marginBottom: 12 };
const linkBtn = { background: "none", border: "none", color: COLORS.accent, fontSize: 12.5, fontWeight: 600, cursor: "pointer" };

/* ============================================================
   CONFIRM MODAL (used for Delete)
   ============================================================ */
function ConfirmModal({ title, message, confirmLabel, busy, onCancel, onConfirm }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,20,40,0.45)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
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
          <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.danger, color: "#fff",
              fontSize: 13, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.75 : 1,
              display: "flex", alignItems: "center", gap: 7,
            }}
          >
            {busy && <Loader2 size={13} className="spin" />}
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DEPARTMENTS SCREEN (full CRUD wired to the mock flow)
   ============================================================ */
function DepartmentsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState(null); // null | { mode: 'add'|'edit', data }
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // null | department row
  const [deleting, setDeleting] = useState(false);

  const [listError, setListError] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    setListError("");
    callDepartmentFlow("LIST").then((res) => {
      setRows(res.data);
      setLoading(false);
    }).catch((e) => {
      setListError(e.message);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = rows.filter((r) =>
    (r.code || "").toLowerCase().includes(search.toLowerCase()) || (r.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const submitPanel = (form) => {
    if (!form.code?.trim() || !form.name?.trim()) {
      setErr("Department Code and Name are required.");
      return;
    }
    setSaving(true);
    setErr("");
    const action = form.guid ? "EDIT" : "CREATE";
    callDepartmentFlow(action, form)
      .then((res) => {
        setRows(res.data); // flow returns the refreshed list — reflect it immediately
        setSaving(false);
        setPanel(null);
        setToast(form.guid ? "Department updated." : "Department added.");
      })
      .catch((e) => {
        setSaving(false);
        setErr(e.message);
      });
  };

  const confirmDeleteRow = () => {
    if (!confirmDelete) return;
    setDeleting(true);
    callDepartmentFlow("DELETE", confirmDelete)
      .then((res) => {
        setRows(res.data);
        setDeleting(false);
        setConfirmDelete(null);
        setToast("Department deleted.");
      })
      .catch((e) => {
        setDeleting(false);
        setToast(`Delete failed: ${e.message}`);
      });
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Department Master</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Add, edit and manage Departments</div>
          </div>
          <button
            onClick={() => setPanel({ mode: "add", data: { guid: "", code: "", name: "", active: true } })}
            style={{
              display: "flex", alignItems: "center", gap: 7, background: COLORS.accent, color: "#fff", border: "none",
              borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            <Plus size={15} /> Add Department
          </button>
        </div>

        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Departments <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 260 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by code or name"
                  style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }}
                />
              </div>
              <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "0 12px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {["Department Code", "Department Name", "Status", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>
                  <Loader2 size={18} className="spin" style={{ verticalAlign: "middle", marginRight: 8 }} /> Loading departments…
                </td></tr>
              ) : listError ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.danger, fontSize: 13 }}>
                      <AlertCircle size={16} /> Couldn't load departments: {listError}
                    </div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No departments match your search.</td></tr>
              ) : filtered.map((d, i) => (
                <tr key={d.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{d.code}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{d.name}</td>
                  <td style={{ padding: "11px 16px" }}><StatusBadge active={d.active} /></td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button
                        onClick={() => setPanel({ mode: "edit", data: { ...d } })}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(d)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {panel && (
        <DepartmentPanel
          mode={panel.mode}
          data={panel.data}
          saving={saving}
          error={err}
          onCancel={() => { setPanel(null); setErr(""); }}
          onSubmit={submitPanel}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this department?"
          message={`"${confirmDelete.name}" (${confirmDelete.code}) will be permanently removed from Dataverse. This can't be undone.`}
          confirmLabel="Delete"
          busy={deleting}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={confirmDeleteRow}
        />
      )}

      {toast && (
        <div style={{
          position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)",
          background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
        }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

function DepartmentPanel({ mode, data, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);

  return (
    <div style={{
      width: 340, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0,
      display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)",
    }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{mode === "add" ? "Add New Department" : "Edit Department"}</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Fill all required fields below</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <label style={labelStyle}>Department Code*</label>
        <input
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          placeholder="Enter department code"
          style={inputStyle}
        />
        <label style={{ ...labelStyle, marginTop: 16 }}>Department Name*</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Enter department name"
          style={inputStyle}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, padding: "12px 14px", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>Active</span>
          <div
            onClick={() => setForm({ ...form, active: !form.active })}
            style={{
              width: 40, height: 22, borderRadius: 999, background: form.active ? COLORS.accent : "#D7DCE6",
              position: "relative", cursor: "pointer", transition: "background 0.15s",
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2,
              left: form.active ? 20 : 2, transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            }} />
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 16 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>
          Cancel
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={saving}
          style={{
            padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1,
            display: "flex", alignItems: "center", gap: 7,
          }}
        >
          {saving && <Loader2 size={13} className="spin" />}
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 12.5, fontWeight: 700, color: COLORS.text, marginBottom: 6 };

/* ============================================================
   COUNTRY SCREEN (full CRUD wired to the shared flow, entity="Country")
   Mirrors DepartmentsPage exactly — same shape (code/name/active)
   since the real Country table (CountryId/CountryCode/CountryName/
   IsActive) matches Department's structure.
   ============================================================ */
function CountryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState(null); // null | { mode: 'add'|'edit', data }
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // null | country row
  const [deleting, setDeleting] = useState(false);

  const [listError, setListError] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    setListError("");
    callCountryFlow("LIST").then((res) => {
      setRows(res.data);
      setLoading(false);
    }).catch((e) => {
      setListError(e.message);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = rows.filter((r) =>
    (r.code || "").toLowerCase().includes(search.toLowerCase()) || (r.name || "").toLowerCase().includes(search.toLowerCase())
  );
  const activeCount = rows.filter((r) => r.active).length;

  const kpis = [
    { label: "Countries", value: String(rows.length), icon: Globe2, color: "#0EA5A4" },
    { label: "Active Countries", value: String(activeCount), icon: CheckCircle2, color: COLORS.success },
    { label: "Inactive Countries", value: String(rows.length - activeCount), icon: AlertCircle, color: COLORS.danger },
  ];

  // Real analytics from the actual rows — the Country table has no
  // region/projects columns, so (unlike the old dummy dashboard) this
  // is limited to what's genuinely in the data: active/inactive split,
  // plus a colorful distribution of countries by starting letter.
  const activeSplit = [
    { name: "Active", value: activeCount, color: COLORS.success },
    { name: "Inactive", value: rows.length - activeCount, color: COLORS.danger },
  ];

  const letterCounts = {};
  rows.forEach((r) => {
    const letter = (r.name || "").trim().charAt(0).toUpperCase() || "#";
    letterCounts[letter] = (letterCounts[letter] || 0) + 1;
  });
  const letterData = Object.entries(letterCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([letter, count]) => ({ letter, count }));

  const submitPanel = (form) => {
    if (!form.code?.trim() || !form.name?.trim()) {
      setErr("Country Code and Name are required.");
      return;
    }
    setSaving(true);
    setErr("");
    const action = form.guid ? "EDIT" : "CREATE";
    callCountryFlow(action, form)
      .then((res) => {
        setRows(res.data); // flow returns the refreshed list — reflect it immediately
        setSaving(false);
        setPanel(null);
        setToast(form.guid ? "Country updated." : "Country added.");
      })
      .catch((e) => {
        setSaving(false);
        setErr(e.message);
      });
  };

  const confirmDeleteRow = () => {
    if (!confirmDelete) return;
    setDeleting(true);
    callCountryFlow("DELETE", confirmDelete)
      .then((res) => {
        setRows(res.data);
        setDeleting(false);
        setConfirmDelete(null);
        setToast("Country deleted.");
      })
      .catch((e) => {
        setDeleting(false);
        setToast(`Delete failed: ${e.message}`);
      });
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Country Master</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Add, edit and manage Countries</div>
          </div>
          <button
            onClick={() => setPanel({ mode: "add", data: { guid: "", code: "", name: "", active: true } })}
            style={{
              display: "flex", alignItems: "center", gap: 7, background: COLORS.accent, color: "#fff", border: "none",
              borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            <Plus size={15} /> Add Country
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 16 }}>
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 12.5, fontWeight: 600 }}>{k.label}</span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: `${k.color}1F`, color: k.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={15} />
                  </span>
                </div>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: COLORS.text, marginTop: 10 }}>{k.value}</div>
              </div>
            );
          })}
        </div>

        {!loading && rows.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14, marginBottom: 16 }}>
            <div style={cardStyle}>
              <div style={cardTitle}><Globe2 size={14} /> Countries by Starting Letter</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={letterData}>
                  <CartesianGrid stroke={COLORS.border} vertical={false} />
                  <XAxis dataKey="letter" tick={{ fontSize: 12, fill: COLORS.textMuted }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: COLORS.textMuted }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {letterData.map((entry, i) => (
                      <Cell key={entry.letter} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={cardStyle}>
              <div style={cardTitle}><CheckCircle2 size={14} /> Active vs Inactive</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={activeSplit} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3}>
                    {activeSplit.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Countries <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 260 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by code or name"
                  style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }}
                />
              </div>
              <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "0 12px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {["Country Code", "Country Name", "Status", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>
                  <Loader2 size={18} className="spin" style={{ verticalAlign: "middle", marginRight: 8 }} /> Loading countries…
                </td></tr>
              ) : listError ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.danger, fontSize: 13 }}>
                      <AlertCircle size={16} /> Couldn't load countries: {listError}
                    </div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No countries match your search.</td></tr>
              ) : filtered.map((c, i) => (
                <tr key={c.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{c.code}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{c.name}</td>
                  <td style={{ padding: "11px 16px" }}><StatusBadge active={c.active} /></td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button
                        onClick={() => setPanel({ mode: "edit", data: { ...c } })}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(c)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {panel && (
        <CountryPanel
          mode={panel.mode}
          data={panel.data}
          saving={saving}
          error={err}
          onCancel={() => { setPanel(null); setErr(""); }}
          onSubmit={submitPanel}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this country?"
          message={`"${confirmDelete.name}" (${confirmDelete.code}) will be permanently removed. This can't be undone.`}
          confirmLabel="Delete"
          busy={deleting}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={confirmDeleteRow}
        />
      )}

      {toast && (
        <div style={{
          position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)",
          background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
        }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

function CountryPanel({ mode, data, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);

  return (
    <div style={{
      width: 340, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0,
      display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)",
    }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{mode === "add" ? "Add New Country" : "Edit Country"}</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Fill all required fields below</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <label style={labelStyle}>Country Code*</label>
        <input
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          placeholder="e.g. FR"
          style={inputStyle}
        />
        <label style={{ ...labelStyle, marginTop: 16 }}>Country Name*</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. France"
          style={inputStyle}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, padding: "12px 14px", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>Active</span>
          <div
            onClick={() => setForm({ ...form, active: !form.active })}
            style={{
              width: 40, height: 22, borderRadius: 999, background: form.active ? COLORS.accent : "#D7DCE6",
              position: "relative", cursor: "pointer", transition: "background 0.15s",
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2,
              left: form.active ? 20 : 2, transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            }} />
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 16 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>
          Cancel
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={saving}
          style={{
            padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1,
            display: "flex", alignItems: "center", gap: 7,
          }}
        >
          {saving && <Loader2 size={13} className="spin" />}
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   PROJECT CATEGORY SCREEN (full CRUD, entity="ProjectCategory")
   Mirrors CountryPage exactly — same code/name/active shape.
   ============================================================ */
function ProjectCategoryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState(null); // null | { mode: 'add'|'edit', data }
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // null | category row
  const [deleting, setDeleting] = useState(false);

  const [listError, setListError] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    setListError("");
    callProjectCategoryFlow("LIST").then((res) => {
      setRows(res.data);
      setLoading(false);
    }).catch((e) => {
      setListError(e.message);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = rows.filter((r) =>
    (r.code || "").toLowerCase().includes(search.toLowerCase()) || (r.name || "").toLowerCase().includes(search.toLowerCase())
  );
  const activeCount = rows.filter((r) => r.active).length;

  const kpis = [
    { label: "Categories", value: String(rows.length), icon: Layers, color: "#8B5CF6" },
    { label: "Active Categories", value: String(activeCount), icon: CheckCircle2, color: COLORS.success },
    { label: "Inactive Categories", value: String(rows.length - activeCount), icon: AlertCircle, color: COLORS.danger },
  ];

  const submitPanel = (form) => {
    if (!form.code?.trim() || !form.name?.trim()) {
      setErr("Category Code and Name are required.");
      return;
    }
    setSaving(true);
    setErr("");
    const action = form.guid ? "EDIT" : "CREATE";
    callProjectCategoryFlow(action, form)
      .then((res) => {
        setRows(res.data); // flow returns the refreshed list — reflect it immediately
        setSaving(false);
        setPanel(null);
        setToast(form.guid ? "Category updated." : "Category added.");
      })
      .catch((e) => {
        setSaving(false);
        setErr(e.message);
      });
  };

  const confirmDeleteRow = () => {
    if (!confirmDelete) return;
    setDeleting(true);
    callProjectCategoryFlow("DELETE", confirmDelete)
      .then((res) => {
        setRows(res.data);
        setDeleting(false);
        setConfirmDelete(null);
        setToast("Category deleted.");
      })
      .catch((e) => {
        setDeleting(false);
        setToast(`Delete failed: ${e.message}`);
      });
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Project Category Master</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Add, edit and manage Project Categories</div>
          </div>
          <button
            onClick={() => setPanel({ mode: "add", data: { guid: "", code: "", name: "", active: true } })}
            style={{
              display: "flex", alignItems: "center", gap: 7, background: COLORS.accent, color: "#fff", border: "none",
              borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            <Plus size={15} /> Add Category
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 16 }}>
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 12.5, fontWeight: 600 }}>{k.label}</span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: `${k.color}1F`, color: k.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={15} />
                  </span>
                </div>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: COLORS.text, marginTop: 10 }}>{k.value}</div>
              </div>
            );
          })}
        </div>

        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Categories <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 260 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by code or name"
                  style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }}
                />
              </div>
              <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "0 12px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {["Category Code", "Category Name", "Status", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>
                  <Loader2 size={18} className="spin" style={{ verticalAlign: "middle", marginRight: 8 }} /> Loading categories…
                </td></tr>
              ) : listError ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.danger, fontSize: 13 }}>
                      <AlertCircle size={16} /> Couldn't load categories: {listError}
                    </div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No categories match your search.</td></tr>
              ) : filtered.map((c, i) => (
                <tr key={c.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{c.code}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{c.name}</td>
                  <td style={{ padding: "11px 16px" }}><StatusBadge active={c.active} /></td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button
                        onClick={() => setPanel({ mode: "edit", data: { ...c } })}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(c)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {panel && (
        <ProjectCategoryPanel
          mode={panel.mode}
          data={panel.data}
          saving={saving}
          error={err}
          onCancel={() => { setPanel(null); setErr(""); }}
          onSubmit={submitPanel}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this category?"
          message={`"${confirmDelete.name}" (${confirmDelete.code}) will be permanently removed. This can't be undone.`}
          confirmLabel="Delete"
          busy={deleting}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={confirmDeleteRow}
        />
      )}

      {toast && (
        <div style={{
          position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)",
          background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
        }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

function ProjectCategoryPanel({ mode, data, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);

  return (
    <div style={{
      width: 340, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0,
      display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)",
    }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{mode === "add" ? "Add New Category" : "Edit Category"}</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Fill all required fields below</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <label style={labelStyle}>Category Code*</label>
        <input
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          placeholder="e.g. DEV"
          style={inputStyle}
        />
        <label style={{ ...labelStyle, marginTop: 16 }}>Category Name*</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Development"
          style={inputStyle}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, padding: "12px 14px", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>Active</span>
          <div
            onClick={() => setForm({ ...form, active: !form.active })}
            style={{
              width: 40, height: 22, borderRadius: 999, background: form.active ? COLORS.accent : "#D7DCE6",
              position: "relative", cursor: "pointer", transition: "background 0.15s",
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2,
              left: form.active ? 20 : 2, transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            }} />
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 16 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>
          Cancel
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={saving}
          style={{
            padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1,
            display: "flex", alignItems: "center", gap: 7,
          }}
        >
          {saving && <Loader2 size={13} className="spin" />}
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   ROLES SCREEN (full CRUD, entity="Role")
   Mirrors ProjectCategoryPage exactly — same code/name/active shape.
   ============================================================ */
function RolesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState(null); // null | { mode: 'add'|'edit', data }
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // null | role row
  const [deleting, setDeleting] = useState(false);

  const [listError, setListError] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    setListError("");
    callRoleFlow("LIST").then((res) => {
      setRows(res.data);
      setLoading(false);
    }).catch((e) => {
      setListError(e.message);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = rows.filter((r) =>
    (r.code || "").toLowerCase().includes(search.toLowerCase()) || (r.name || "").toLowerCase().includes(search.toLowerCase())
  );
  const activeCount = rows.filter((r) => r.active).length;

  const kpis = [
    { label: "Roles", value: String(rows.length), icon: Shield, color: "#8B5CF6" },
    { label: "Active Roles", value: String(activeCount), icon: CheckCircle2, color: COLORS.success },
    { label: "Inactive Roles", value: String(rows.length - activeCount), icon: AlertCircle, color: COLORS.danger },
  ];

  const submitPanel = (form) => {
    if (!form.code?.trim() || !form.name?.trim()) {
      setErr("Role Code and Name are required.");
      return;
    }
    setSaving(true);
    setErr("");
    const action = form.guid ? "EDIT" : "CREATE";
    callRoleFlow(action, form)
      .then((res) => {
        setRows(res.data); // flow returns the refreshed list — reflect it immediately
        setSaving(false);
        setPanel(null);
        setToast(form.guid ? "Role updated." : "Role added.");
      })
      .catch((e) => {
        setSaving(false);
        setErr(e.message);
      });
  };

  const confirmDeleteRow = () => {
    if (!confirmDelete) return;
    setDeleting(true);
    callRoleFlow("DELETE", confirmDelete)
      .then((res) => {
        setRows(res.data);
        setDeleting(false);
        setConfirmDelete(null);
        setToast("Role deleted.");
      })
      .catch((e) => {
        setDeleting(false);
        setToast(`Delete failed: ${e.message}`);
      });
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Role Master</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Add, edit and manage Roles</div>
          </div>
          <button
            onClick={() => setPanel({ mode: "add", data: { guid: "", code: "", name: "", active: true } })}
            style={{
              display: "flex", alignItems: "center", gap: 7, background: COLORS.accent, color: "#fff", border: "none",
              borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            <Plus size={15} /> Add Role
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 16 }}>
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 12.5, fontWeight: 600 }}>{k.label}</span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: `${k.color}1F`, color: k.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={15} />
                  </span>
                </div>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: COLORS.text, marginTop: 10 }}>{k.value}</div>
              </div>
            );
          })}
        </div>

        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Roles <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 260 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by code or name"
                  style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }}
                />
              </div>
              <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "0 12px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {["Role Code", "Role Name", "Status", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>
                  <Loader2 size={18} className="spin" style={{ verticalAlign: "middle", marginRight: 8 }} /> Loading roles…
                </td></tr>
              ) : listError ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.danger, fontSize: 13 }}>
                      <AlertCircle size={16} /> Couldn't load roles: {listError}
                    </div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No roles match your search.</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{r.code}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.name}</td>
                  <td style={{ padding: "11px 16px" }}><StatusBadge active={r.active} /></td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button
                        onClick={() => setPanel({ mode: "edit", data: { ...r } })}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(r)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {panel && (
        <RolePanel
          mode={panel.mode}
          data={panel.data}
          saving={saving}
          error={err}
          onCancel={() => { setPanel(null); setErr(""); }}
          onSubmit={submitPanel}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this role?"
          message={`"${confirmDelete.name}" (${confirmDelete.code}) will be permanently removed. This can't be undone.`}
          confirmLabel="Delete"
          busy={deleting}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={confirmDeleteRow}
        />
      )}

      {toast && (
        <div style={{
          position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)",
          background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
        }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

function RolePanel({ mode, data, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);

  return (
    <div style={{
      width: 340, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0,
      display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)",
    }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{mode === "add" ? "Add New Role" : "Edit Role"}</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Fill all required fields below</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <label style={labelStyle}>Role Code*</label>
        <input
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          placeholder="e.g. ADMIN"
          style={inputStyle}
        />
        <label style={{ ...labelStyle, marginTop: 16 }}>Role Name*</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Administrator"
          style={inputStyle}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, padding: "12px 14px", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>Active</span>
          <div
            onClick={() => setForm({ ...form, active: !form.active })}
            style={{
              width: 40, height: 22, borderRadius: 999, background: form.active ? COLORS.accent : "#D7DCE6",
              position: "relative", cursor: "pointer", transition: "background 0.15s",
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2,
              left: form.active ? 20 : 2, transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            }} />
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 16 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>
          Cancel
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={saving}
          style={{
            padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1,
            display: "flex", alignItems: "center", gap: 7,
          }}
        >
          {saving && <Loader2 size={13} className="spin" />}
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

function BillingTypePage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState(null); // null | { mode: 'add'|'edit', data }
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // null | role row
  const [deleting, setDeleting] = useState(false);

  const [listError, setListError] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    setListError("");
    callBillingTypeFlow("LIST").then((res) => {
      setRows(res.data);
      setLoading(false);
    }).catch((e) => {
      setListError(e.message);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = rows.filter((r) =>
    (r.code || "").toLowerCase().includes(search.toLowerCase()) || (r.name || "").toLowerCase().includes(search.toLowerCase())
  );
  const activeCount = rows.filter((r) => r.active).length;

  const kpis = [
    { label: "Billing Types", value: String(rows.length), icon: CalendarClock, color: "#8B5CF6" },
    { label: "Active Billing Types", value: String(activeCount), icon: CheckCircle2, color: COLORS.success },
    { label: "Inactive Billing Types", value: String(rows.length - activeCount), icon: AlertCircle, color: COLORS.danger },
  ];

  const submitPanel = (form) => {
    if (!form.code?.trim() || !form.name?.trim()) {
      setErr("Billing Type Code and Name are required.");
      return;
    }
    setSaving(true);
    setErr("");
    const action = form.guid ? "EDIT" : "CREATE";
    callBillingTypeFlow(action, form)
      .then((res) => {
        setRows(res.data); // flow returns the refreshed list — reflect it immediately
        setSaving(false);
        setPanel(null);
        setToast(form.guid ? "Billing type updated." : "Billing type added.");
      })
      .catch((e) => {
        setSaving(false);
        setErr(e.message);
      });
  };

  const confirmDeleteRow = () => {
    if (!confirmDelete) return;
    setDeleting(true);
    callBillingTypeFlow("DELETE", confirmDelete)
      .then((res) => {
        setRows(res.data);
        setDeleting(false);
        setConfirmDelete(null);
        setToast("Billing type deleted.");
      })
      .catch((e) => {
        setDeleting(false);
        setToast(`Delete failed: ${e.message}`);
      });
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Billing Type Master</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Add, edit and manage Billing Types</div>
          </div>
          <button
            onClick={() => setPanel({ mode: "add", data: { guid: "", code: "", name: "", active: true } })}
            style={{
              display: "flex", alignItems: "center", gap: 7, background: COLORS.accent, color: "#fff", border: "none",
              borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            <Plus size={15} /> Add Billing Type
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 16 }}>
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 12.5, fontWeight: 600 }}>{k.label}</span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: `${k.color}1F`, color: k.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={15} />
                  </span>
                </div>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: COLORS.text, marginTop: 10 }}>{k.value}</div>
              </div>
            );
          })}
        </div>

        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Billing Types <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 260 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by code or name"
                  style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }}
                />
              </div>
              <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "0 12px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {["Billing Type Code", "Billing Type Name", "Status", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>
                  <Loader2 size={18} className="spin" style={{ verticalAlign: "middle", marginRight: 8 }} /> Loading billing types…
                </td></tr>
              ) : listError ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.danger, fontSize: 13 }}>
                      <AlertCircle size={16} /> Couldn't load billing types: {listError}
                    </div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No billing types match your search.</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{r.code}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.name}</td>
                  <td style={{ padding: "11px 16px" }}><StatusBadge active={r.active} /></td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button
                        onClick={() => setPanel({ mode: "edit", data: { ...r } })}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(r)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {panel && (
        <BillingTypePanel
          mode={panel.mode}
          data={panel.data}
          saving={saving}
          error={err}
          onCancel={() => { setPanel(null); setErr(""); }}
          onSubmit={submitPanel}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this billing type?"
          message={`"${confirmDelete.name}" (${confirmDelete.code}) will be permanently removed. This can't be undone.`}
          confirmLabel="Delete"
          busy={deleting}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={confirmDeleteRow}
        />
      )}

      {toast && (
        <div style={{
          position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)",
          background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
        }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

function BillingTypePanel({ mode, data, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);

  return (
    <div style={{
      width: 340, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0,
      display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)",
    }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{mode === "add" ? "Add New Billing Type" : "Edit Billing Type"}</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Fill all required fields below</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <label style={labelStyle}>Billing Type Code*</label>
        <input
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          placeholder="e.g. TM"
          style={inputStyle}
        />
        <label style={{ ...labelStyle, marginTop: 16 }}>Billing Type Name*</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Time & Material"
          style={inputStyle}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, padding: "12px 14px", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>Active</span>
          <div
            onClick={() => setForm({ ...form, active: !form.active })}
            style={{
              width: 40, height: 22, borderRadius: 999, background: form.active ? COLORS.accent : "#D7DCE6",
              position: "relative", cursor: "pointer", transition: "background 0.15s",
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2,
              left: form.active ? 20 : 2, transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            }} />
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 16 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>
          Cancel
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={saving}
          style={{
            padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1,
            display: "flex", alignItems: "center", gap: 7,
          }}
        >
          {saving && <Loader2 size={13} className="spin" />}
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   PROJECT DEAL STATUS SCREEN (full CRUD, entity="DealStatus")
   No code field — per PowerApps pattern, uniqueness is enforced
   by checking for a duplicate name client-side instead.
   ============================================================ */
function DealStatusPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState(null); // null | { mode: 'add'|'edit', data }
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [listError, setListError] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    setListError("");
    callDealStatusFlow("LIST").then((res) => {
      setRows(res.data);
      setLoading(false);
    }).catch((e) => {
      setListError(e.message);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = rows.filter((r) => (r.name || "").toLowerCase().includes(search.toLowerCase()));
  const activeCount = rows.filter((r) => r.active).length;

  const kpis = [
    { label: "Deal Statuses", value: String(rows.length), icon: Handshake, color: "#22A06B" },
    { label: "Active", value: String(activeCount), icon: CheckCircle2, color: COLORS.success },
    { label: "Inactive", value: String(rows.length - activeCount), icon: AlertCircle, color: COLORS.danger },
  ];

  const submitPanel = (form) => {
    if (!form.name?.trim()) {
      setErr("Deal Status Name is required.");
      return;
    }
    const dup = rows.some((r) => r.name.trim().toLowerCase() === form.name.trim().toLowerCase() && String(r.guid) !== String(form.guid));
    if (dup) {
      setErr("A deal status with this name already exists.");
      return;
    }
    setSaving(true);
    setErr("");
    const action = form.guid ? "EDIT" : "CREATE";
    callDealStatusFlow(action, form)
      .then((res) => {
        setRows(res.data);
        setSaving(false);
        setPanel(null);
        setToast(form.guid ? "Deal status updated." : "Deal status added.");
      })
      .catch((e) => {
        setSaving(false);
        setErr(e.message);
      });
  };

  const confirmDeleteRow = () => {
    if (!confirmDelete) return;
    setDeleting(true);
    callDealStatusFlow("DELETE", confirmDelete)
      .then((res) => {
        setRows(res.data);
        setDeleting(false);
        setConfirmDelete(null);
        setToast("Deal status deleted.");
      })
      .catch((e) => {
        setDeleting(false);
        setToast(`Delete failed: ${e.message}`);
      });
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Project Deal Status Master</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Add, edit and manage deal statuses</div>
          </div>
          <button
            onClick={() => setPanel({ mode: "add", data: { guid: "", name: "", active: true } })}
            style={{
              display: "flex", alignItems: "center", gap: 7, background: COLORS.accent, color: "#fff", border: "none",
              borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            <Plus size={15} /> Add Deal Status
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 16 }}>
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 12.5, fontWeight: 600 }}>{k.label}</span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: `${k.color}1F`, color: k.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={15} />
                  </span>
                </div>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: COLORS.text, marginTop: 10 }}>{k.value}</div>
              </div>
            );
          })}
        </div>

        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Deal Statuses <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 260 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name"
                  style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }}
                />
              </div>
              <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "0 12px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {["Deal Status Name", "Status", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>
                  <Loader2 size={18} className="spin" style={{ verticalAlign: "middle", marginRight: 8 }} /> Loading deal statuses…
                </td></tr>
              ) : listError ? (
                <tr><td colSpan={3} style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.danger, fontSize: 13 }}>
                      <AlertCircle size={16} /> Couldn't load deal statuses: {listError}
                    </div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No deal statuses match your search.</td></tr>
              ) : filtered.map((d, i) => (
                <tr key={d.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{d.name}</td>
                  <td style={{ padding: "11px 16px" }}><StatusBadge active={d.active} /></td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button
                        onClick={() => setPanel({ mode: "edit", data: { ...d } })}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(d)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {panel && (
        <DealStatusPanel
          mode={panel.mode}
          data={panel.data}
          saving={saving}
          error={err}
          onCancel={() => { setPanel(null); setErr(""); }}
          onSubmit={submitPanel}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this deal status?"
          message={`"${confirmDelete.name}" will be permanently removed. This can't be undone.`}
          confirmLabel="Delete"
          busy={deleting}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={confirmDeleteRow}
        />
      )}

      {toast && (
        <div style={{
          position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)",
          background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
        }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

function DealStatusPanel({ mode, data, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);

  return (
    <div style={{
      width: 340, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0,
      display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)",
    }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{mode === "add" ? "Add New Deal Status" : "Edit Deal Status"}</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Name must be unique</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <label style={labelStyle}>Deal Status Name*</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Negotiation"
          style={inputStyle}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, padding: "12px 14px", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>Active</span>
          <div
            onClick={() => setForm({ ...form, active: !form.active })}
            style={{
              width: 40, height: 22, borderRadius: 999, background: form.active ? COLORS.accent : "#D7DCE6",
              position: "relative", cursor: "pointer", transition: "background 0.15s",
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2,
              left: form.active ? 20 : 2, transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            }} />
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 16 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>
          Cancel
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={saving}
          style={{
            padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1,
            display: "flex", alignItems: "center", gap: 7,
          }}
        >
          {saving && <Loader2 size={13} className="spin" />}
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   CLIENT SCREEN — combined Client + Client Contact, one grid
   row and one panel per client, backed by 2 SQL tables. Save
   does sequential Patch calls: Client first, then Contact using
   the resulting ClientId. Mirrors the PowerApps ScrClientMaster_1
   pattern.
   ============================================================ */
function ClientPage() {
  const [rows, setRows] = useState([]); // each row = { ...client, contact: {...} | null }
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [listError, setListError] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    setListError("");
    Promise.all([callClientFlow("LIST"), callClientContactFlow("LIST")])
      .then(([clientsRes, contactsRes]) => {
        const merged = clientsRes.data.map((c) => ({
          ...c,
          contact: contactsRes.data.find((ct) => String(ct.clientId) === String(c.guid)) || null,
        }));
        setRows(merged);
        setLoading(false);
      })
      .catch((e) => {
        setListError(e.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { callCountryFlow("LIST").then((res) => setCountries(res.data)); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const countryName = (id) => countries.find((c) => String(c.id) === String(id))?.name || "—";

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (r.code || "").toLowerCase().includes(q) || (r.name || "").toLowerCase().includes(q) || (r.contact?.contactName || "").toLowerCase().includes(q);
  });
  const activeCount = rows.filter((r) => r.active).length;

  const kpis = [
    { label: "Clients", value: String(rows.length), icon: Briefcase, color: "#EAB308" },
    { label: "Active Clients", value: String(activeCount), icon: CheckCircle2, color: COLORS.success },
    { label: "Inactive Clients", value: String(rows.length - activeCount), icon: AlertCircle, color: COLORS.danger },
  ];

  const openAdd = () => setPanel({
    mode: "add",
    data: { guid: "", code: "", name: "", countryId: "", active: true, contactGuid: "", contactName: "", email: "", phone: "" },
  });
  const openEdit = (r) => setPanel({
    mode: "edit",
    data: {
      guid: r.guid, code: r.code, name: r.name, countryId: r.countryId || "", active: r.active,
      contactGuid: r.contact?.guid || "", contactName: r.contact?.contactName || "", email: r.contact?.email || "", phone: r.contact?.phone || "",
    },
  });

  const submitPanel = (form) => {
    if (!form.code?.trim() || !form.name?.trim() || !form.contactName?.trim()) {
      setErr("Client Code, Client Name and Contact Name are required.");
      return;
    }
    setSaving(true);
    setErr("");
    const clientAction = form.guid ? "EDIT" : "CREATE";
    // Sequential Patch: save the Client first, then the Contact
    // using the resulting ClientId (same pattern as ScrClientMaster_1).
    callClientFlow(clientAction, { guid: form.guid, code: form.code, name: form.name, countryId: form.countryId, active: form.active })
      .then((clientRes) => {
        let clientGuid = form.guid;
        if (!clientGuid) {
          const match = clientRes.data.find((c) => c.code === form.code.trim());
          clientGuid = match ? match.guid : "";
        }
        const contactAction = form.contactGuid ? "EDIT" : "CREATE";
        return callClientContactFlow(contactAction, {
          guid: form.contactGuid, clientId: clientGuid,
          contactName: form.contactName, email: form.email, phone: form.phone, active: form.active,
        });
      })
      .then(() => refresh())
      .then(() => {
        setSaving(false);
        setPanel(null);
        setToast(form.guid ? "Client updated." : "Client added.");
      })
      .catch((e) => {
        setSaving(false);
        setErr(e.message);
      });
  };

  const confirmDeleteRow = () => {
    if (!confirmDelete) return;
    setDeleting(true);
    // Contact carries the FK to Client, so it must be deleted first.
    // If the contact is already gone (stale guid, deleted out-of-band, etc.)
    // the flow's Delete action fails the whole run — swallow that specific
    // case so it doesn't block deleting the Client itself.
    const contactGuid = confirmDelete.contact?.guid;
    const deleteContact = contactGuid
      ? callClientContactFlow("DELETE", { guid: contactGuid }).catch((e) => {
          console.warn("Contact delete failed (continuing to delete client):", e.message);
        })
      : Promise.resolve();
    deleteContact
      .then(() => callClientFlow("DELETE", { guid: confirmDelete.guid }))
      .then(() => refresh())
      .then(() => {
        setDeleting(false);
        setConfirmDelete(null);
        setToast("Client deleted.");
      })
      .catch((e) => {
        setDeleting(false);
        setToast(`Delete failed: ${e.message}`);
      });
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Client Master</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Client and primary contact, managed together</div>
          </div>
          <button
            onClick={openAdd}
            style={{
              display: "flex", alignItems: "center", gap: 7, background: COLORS.accent, color: "#fff", border: "none",
              borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            <Plus size={15} /> Add Client
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 16 }}>
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 12.5, fontWeight: 600 }}>{k.label}</span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: `${k.color}1F`, color: k.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={15} />
                  </span>
                </div>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: COLORS.text, marginTop: 10 }}>{k.value}</div>
              </div>
            );
          })}
        </div>

        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Clients <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 260 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by client, code or contact"
                  style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }}
                />
              </div>
              <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "0 12px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {["Client Code", "Client Name", "Contact Name", "Email", "Phone", "Status", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>
                  <Loader2 size={18} className="spin" style={{ verticalAlign: "middle", marginRight: 8 }} /> Loading clients…
                </td></tr>
              ) : listError ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.danger, fontSize: 13 }}>
                      <AlertCircle size={16} /> Couldn't load clients: {listError}
                    </div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No clients match your search.</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{r.code}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.name}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.contact?.contactName || "—"}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: COLORS.textMuted }}>{r.contact?.email || "—"}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: COLORS.textMuted }}>{r.contact?.phone || "—"}</td>
                  <td style={{ padding: "11px 16px" }}><StatusBadge active={r.active} /></td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button
                        onClick={() => openEdit(r)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(r)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {panel && (
        <ClientPanel
          mode={panel.mode}
          data={panel.data}
          countries={countries}
          saving={saving}
          error={err}
          onCancel={() => { setPanel(null); setErr(""); }}
          onSubmit={submitPanel}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this client?"
          message={`"${confirmDelete.name}" (${confirmDelete.code}) and its contact will be permanently removed. This can't be undone.`}
          confirmLabel="Delete"
          busy={deleting}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={confirmDeleteRow}
        />
      )}

      {toast && (
        <div style={{
          position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)",
          background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
        }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

function ClientPanel({ mode, data, countries, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);

  return (
    <div style={{
      width: 380, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0,
      display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)",
    }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{mode === "add" ? "Add New Client" : "Edit Client"}</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Client and contact details</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <div style={{ fontWeight: 700, fontSize: 12.5, color: COLORS.textMuted, textTransform: "uppercase", marginBottom: 10 }}>Client</div>

        <label style={labelStyle}>Client Code*</label>
        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. CL04" style={inputStyle} />

        <label style={{ ...labelStyle, marginTop: 14 }}>Client Name*</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Acme Corp" style={inputStyle} />

        <label style={{ ...labelStyle, marginTop: 14 }}>Country</label>
        <select value={form.countryId} onChange={(e) => setForm({ ...form, countryId: e.target.value })} style={inputStyle}>
          <option value="">Select country</option>
          {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div style={{ fontWeight: 700, fontSize: 12.5, color: COLORS.textMuted, textTransform: "uppercase", margin: "20px 0 10px" }}>Contact</div>

        <label style={labelStyle}>Contact Name*</label>
        <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="e.g. Priya Sharma" style={inputStyle} />

        <label style={{ ...labelStyle, marginTop: 14 }}>Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. priya@acme.com" style={inputStyle} />

        <label style={{ ...labelStyle, marginTop: 14 }}>Phone</label>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +91 98765 43210" style={inputStyle} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, padding: "12px 14px", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>Active</span>
          <div
            onClick={() => setForm({ ...form, active: !form.active })}
            style={{
              width: 40, height: 22, borderRadius: 999, background: form.active ? COLORS.accent : "#D7DCE6",
              position: "relative", cursor: "pointer", transition: "background 0.15s",
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2,
              left: form.active ? 20 : 2, transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            }} />
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 16 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>
          Cancel
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={saving}
          style={{
            padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1,
            display: "flex", alignItems: "center", gap: 7,
          }}
        >
          {saving && <Loader2 size={13} className="spin" />}
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   USER SCREEN (full CRUD, entity="User")
   Mirrors CountryPage's structure; extra fields + a Department
   dropdown (FK) sourced from callDepartmentFlow("LIST").
   ============================================================ */
function UsersPage() {
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState(null); // null | { mode: 'add'|'edit', data }
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [listError, setListError] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    setListError("");
    callUserFlow("LIST").then((res) => {
      setRows(res.data);
      setLoading(false);
    }).catch((e) => {
      setListError(e.message);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { callDepartmentFlow("LIST").then((res) => setDepartments(res.data)); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const deptName = (id) => departments.find((d) => String(d.id) === String(id))?.name || "—";

  const filtered = rows
    .filter((r) => {
      const q = search.toLowerCase();
      return (r.empId || "").toLowerCase().includes(q)
        || (r.firstName || "").toLowerCase().includes(q)
        || (r.lastName || "").toLowerCase().includes(q)
        || (r.jobTitle || "").toLowerCase().includes(q);
    })
    .sort((a, b) => Number(b.id) - Number(a.id)); // newest (highest UserID) first
  const activeCount = rows.filter((r) => r.active).length;

  const kpis = [
    { label: "Users", value: String(rows.length), icon: User, color: "#3B6FE0" },
    { label: "Active Users", value: String(activeCount), icon: CheckCircle2, color: COLORS.success },
    { label: "Inactive Users", value: String(rows.length - activeCount), icon: AlertCircle, color: COLORS.danger },
  ];

  const submitPanel = (form) => {
    if (!form.empId?.trim() || !form.firstName?.trim() || !form.lastName?.trim()) {
      setErr("Emp ID, First Name and Last Name are required.");
      return;
    }
    setSaving(true);
    setErr("");
    const action = form.guid ? "EDIT" : "CREATE";
    callUserFlow(action, form)
      .then((res) => {
        setRows(res.data);
        setSaving(false);
        setPanel(null);
        setToast(form.guid ? "User updated." : "User added.");
      })
      .catch((e) => {
        setSaving(false);
        setErr(e.message);
      });
  };

  const confirmDeleteRow = () => {
    if (!confirmDelete) return;
    setDeleting(true);
    callUserFlow("DELETE", confirmDelete)
      .then((res) => {
        setRows(res.data);
        setDeleting(false);
        setConfirmDelete(null);
        setToast("User deleted.");
      })
      .catch((e) => {
        setDeleting(false);
        setToast(`Delete failed: ${e.message}`);
      });
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>User Master</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Add, edit and manage Users</div>
          </div>
          <button
            onClick={() => setPanel({ mode: "add", data: { guid: "", empId: "", firstName: "", lastName: "", gender: "", jobTitle: "", departmentId: "", active: true } })}
            style={{
              display: "flex", alignItems: "center", gap: 7, background: COLORS.accent, color: "#fff", border: "none",
              borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            <Plus size={15} /> Add User
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 16 }}>
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 12.5, fontWeight: 600 }}>{k.label}</span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: `${k.color}1F`, color: k.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={15} />
                  </span>
                </div>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: COLORS.text, marginTop: 10 }}>{k.value}</div>
              </div>
            );
          })}
        </div>

        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Users <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 260 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by emp id, name or job title"
                  style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }}
                />
              </div>
              <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "0 12px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {["Emp ID", "Name", "Job Title", "Department", "Gender", "Status", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>
                  <Loader2 size={18} className="spin" style={{ verticalAlign: "middle", marginRight: 8 }} /> Loading users…
                </td></tr>
              ) : listError ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.danger, fontSize: 13 }}>
                      <AlertCircle size={16} /> Couldn't load users: {listError}
                    </div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No users match your search.</td></tr>
              ) : filtered.map((u, i) => (
                <tr key={u.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{u.empId}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{u.firstName} {u.lastName}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{u.jobTitle || "—"}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{deptName(u.departmentId)}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{u.gender || "—"}</td>
                  <td style={{ padding: "11px 16px" }}><StatusBadge active={u.active} /></td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button
                        onClick={() => setPanel({ mode: "edit", data: { ...u } })}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(u)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {panel && (
        <UserPanel
          mode={panel.mode}
          data={panel.data}
          departments={departments}
          saving={saving}
          error={err}
          onCancel={() => { setPanel(null); setErr(""); }}
          onSubmit={submitPanel}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this user?"
          message={`"${confirmDelete.firstName} ${confirmDelete.lastName}" (${confirmDelete.empId}) will be permanently removed. This can't be undone.`}
          confirmLabel="Delete"
          busy={deleting}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={confirmDeleteRow}
        />
      )}

      {toast && (
        <div style={{
          position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)",
          background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
        }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

function UserPanel({ mode, data, departments, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);

  return (
    <div style={{
      width: 340, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0,
      display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)",
    }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{mode === "add" ? "Add New User" : "Edit User"}</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Fill all required fields below</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <label style={labelStyle}>Emp ID*</label>
        <input value={form.empId} onChange={(e) => setForm({ ...form, empId: e.target.value })} placeholder="e.g. EMP1001" style={inputStyle} />

        <label style={{ ...labelStyle, marginTop: 16 }}>First Name*</label>
        <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="e.g. John" style={inputStyle} />

        <label style={{ ...labelStyle, marginTop: 16 }}>Last Name*</label>
        <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="e.g. Doe" style={inputStyle} />

        <label style={{ ...labelStyle, marginTop: 16 }}>Gender</label>
        <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} style={inputStyle}>
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>

        <label style={{ ...labelStyle, marginTop: 16 }}>Job Title</label>
        <input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="e.g. Software Engineer" style={inputStyle} />

        <label style={{ ...labelStyle, marginTop: 16 }}>Department</label>
        <select value={form.departmentId || ""} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} style={inputStyle}>
          <option value="">Select department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, padding: "12px 14px", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>Active</span>
          <div
            onClick={() => setForm({ ...form, active: !form.active })}
            style={{
              width: 40, height: 22, borderRadius: 999, background: form.active ? COLORS.accent : "#D7DCE6",
              position: "relative", cursor: "pointer", transition: "background 0.15s",
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2,
              left: form.active ? 20 : 2, transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            }} />
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 16 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>
          Cancel
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={saving}
          style={{
            padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1,
            display: "flex", alignItems: "center", gap: 7,
          }}
        >
          {saving && <Loader2 size={13} className="spin" />}
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   GENERIC STUB PAGE for not-yet-built modules
   ============================================================ */
function ModuleStub({ moduleKey }) {
  const mod = MODULES.find((m) => m.key === moduleKey);
  const Icon = mod?.icon || Layers;
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, color: COLORS.textMuted }}>
      <span style={{ width: 52, height: 52, borderRadius: 14, background: `${mod?.color}1F`, color: mod?.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={24} />
      </span>
      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 17, fontWeight: 700, color: COLORS.text }}>{mod?.label}</div>
      <div style={{ fontSize: 13.5, maxWidth: 320, textAlign: "center" }}>
        This module follows the same pattern as Department — grid, search, and a slide-over form wired to its own Power Automate flow. Not built yet in this preview.
      </div>
    </div>
  );
}

/* ============================================================
   ERROR BOUNDARY — shows the real error instead of a blank screen
   ============================================================ */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Project Pulse crashed:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", background: "#1B1030", color: "#fff", fontFamily: "monospace",
          padding: 30, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6,
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, color: "#FF8A80" }}>
            ⚠ Something crashed while rendering. Copy this and send it back:
          </div>
          <div style={{ background: "#2A1B45", padding: 16, borderRadius: 8 }}>
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ============================================================
   ROOT APP
   ============================================================ */
function ProjectPulseApp() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard"); // 'dashboard' | a module key

  if (!user) return <LoginScreen onLogin={setUser} />;

  const inModuleShell = MODULES.some((m) => m.key === page);

  return (
    <div style={{ height: "100vh", width: "100%", display: "flex", flexDirection: "column", background: COLORS.bg, fontFamily: "Inter, sans-serif" }}>
      <TopNav
        user={user}
        current={page}
        onNavigateHome={() => setPage("dashboard")}
        onOpenModule={(key) => setPage(key)}
        onLogout={() => setUser(null)}
      />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {inModuleShell && <ModuleSidebar current={page} onSelect={setPage} />}
        {page === "dashboard" && <DashboardHome onOpenModule={setPage} />}
        {page === "department" && <DepartmentsPage />}
        {page === "country" && <CountryPage />}
        {page === "user" && <UsersPage />}
        {page === "project-category" && <ProjectCategoryPage />}
        {page === "roles" && <RolesPage />}
        {page === "billing-type" && <BillingTypePage />}
        {page === "project-deal-status" && <DealStatusPage />}
        {page === "client" && <ClientPage />}
        {page === "project-dashboard" && <ProjectDashboardPage />}
        {page === "resource-allocation" && <ResourceAllocationPage />}
        {inModuleShell && !["department", "country", "user", "project-category", "roles", "billing-type", "project-deal-status", "client", "project-dashboard", "resource-allocation"].includes(page) && <ModuleStub moduleKey={page} />}
      </div>
      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ProjectPulseApp />
    </ErrorBoundary>
  );
}
