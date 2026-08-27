import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard, ChevronDown, LogOut, Search, Plus, Pencil, Trash2,
  X, Building2, Layers, Globe2, User, Handshake, CheckCircle2,
  CalendarClock, Briefcase, Contact, Shield, Receipt, UserCog, Flag,
  Loader2, RefreshCw, AlertCircle, TrendingUp, Users2, FolderKanban,
  ClipboardList, MapPin
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";

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
const MODULES = [
  { key: "department", label: "Department", icon: Building2, color: "#3B6FE0", implemented: true },
  { key: "project-category", label: "Project Category", icon: Layers, color: "#8B5CF6" },
  { key: "country", label: "Country", icon: Globe2, color: "#0EA5A4", implemented: true },
  { key: "user", label: "User", icon: User, color: "#3B6FE0" },
  { key: "project-deal-status", label: "Project Deal Status", icon: Handshake, color: "#22A06B" },
  { key: "approval-status", label: "Approval Status", icon: CheckCircle2, color: "#F59E0B" },
  { key: "billing-period", label: "Billing Period", icon: CalendarClock, color: "#8B5CF6" },
  { key: "client", label: "Client", icon: Briefcase, color: "#EAB308" },
  { key: "client-contact", label: "Client Contact", icon: Contact, color: "#3B6FE0" },
  { key: "roles", label: "Roles", icon: Shield, color: "#8B5CF6" },
  { key: "invoice-status", label: "Invoice Status", icon: Receipt, color: "#3B6FE0" },
  { key: "user-roles", label: "User Roles", icon: UserCog, color: "#0EA5A4" },
  { key: "project-status", label: "Project Status", icon: Flag, color: "#E11D48" },
];

/* ============================================================
   POWER AUTOMATE FLOW INTEGRATION
   Real HTTP-triggered flow. In dev, calls go through the Vite
   proxy path "/flow" (see vite.config.js) to avoid CORS; in
   production point this at your own proxy/Azure Function that
   forwards to the URL below.

   Schema: every call now sends a body matching this exact JSON
   schema (paste into the flow trigger's "Request Body JSON Schema"
   so Power Automate generates typed dynamic content for each field):

   {
     "type": "object",
     "properties": {
       "guid":   { "type": "string" },
       "action": { "type": "string" },
       "code":   { "type": "string" },
       "name":   { "type": "string" },
       "active": { "type": "boolean" }
     }
   }

     - "guid"   -> the Dataverse record's unique identifier (the GUID
                   column, shown as "Department" in your table view —
                   e.g. b24161a3-f5a1-f111-b8de-6045bdce3fdc). Empty
                   string on CREATE/LIST since Dataverse generates it;
                   required on EDIT/DELETE so the flow's Update a
                   row / Delete a row steps know exactly which record
                   to target (use "Row ID" = triggerBody()?['guid']).
     - "action" -> "LIST" | "CREATE" | "EDIT" | "DELETE". Switch on
                   triggerBody()?['action'] to branch into the right
                   Dataverse step:
                     LIST   -> skip Create/Update/Delete, just return rows
                     CREATE -> Add a new row, then return the refreshed list
                     EDIT   -> Update a row (by guid), then return the list
                     DELETE -> Delete a row (by guid), then return the list
     - "code" / "name" / "active" -> the Department Code, Department
                   Name and Status field values for Create/Edit.
   ============================================================ */
const FLOW_URL_DIRECT =
  "https://93cd50265ecdea7aa4fd295cb67b42.d4.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/22/workflows/fa6a24a2ca4b4db498b9eb939349553a/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=YBkFBfYF1FPY_DHWRI0JSpXmHw0ST46XX93XUHeXvwc";

// The app always calls the relative "/flow" path. In dev, Vite's
// proxy (vite.config.js) forwards it. In production on Netlify,
// a redirect rule in netlify.toml does the same job — so no code
// branching is needed between environments.
const FLOW_URL = "/flow";

function callDepartmentFlow(action, department = {}) {
  // action: "LIST" | "CREATE" | "EDIT" | "DELETE"
  // Body always matches the fixed schema — guid/code/name/active are
  // sent every time (empty string / false when not relevant to this
  // action) so the flow's trigger schema never has to guess a shape.
  const body = {
    guid: department.guid || "",
    action,
    code: department.code || "",
    name: department.name || "",
    active: !!department.active,
  };

  return fetch(FLOW_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Flow returned ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
    }
    const json = await res.json();
    console.log("Flow raw response:", json); // TEMP: check DevTools console to confirm shape
    // Your flow's Select step returns fields named "Department Code",
    // "Department Name", "Status" — normalize those into the grid's shape.
    const list = Array.isArray(json) ? json : (json.body || json.data || json.value || []);
    const normalized = list.map((d, i) => {
      // "Department" is the column header Dataverse shows for the
      // record's GUID in your table view — fall back through a few
      // likely names in case your flow's Select step labels it
      // differently (guid / DepartmentId / id).
      const guid = d.guid ?? d["Department"] ?? d["DepartmentId"] ?? d.id ?? "";
      return {
        id: guid || d["Department Code"] || String(i),
        guid,
        code: d["Department Code"] ?? d.code ?? "",
        name: d["Department Name"] ?? d.name ?? "",
        active: !!(d["Status"] ?? d.active ?? false),
      };
    });
    return { success: true, data: normalized };
  });
}

/* ============================================================
   SAMPLE DASHBOARD DATA
   ============================================================ */
const deptHeadcount = [
  { name: "IT", value: 42 }, { name: "HR", value: 18 }, { name: "ERP", value: 24 },
  { name: "Data Analytics", value: 31 }, { name: "Power BI", value: 15 }, { name: "PAD", value: 9 },
];
const monthlyTransactions = [
  { month: "Mar", value: 120 }, { month: "Apr", value: 148 }, { month: "May", value: 132 },
  { month: "Jun", value: 176 }, { month: "Jul", value: 190 }, { month: "Aug", value: 210 },
];
const approvalSplit = [
  { name: "Approved", value: 62, color: COLORS.success },
  { name: "Pending", value: 23, color: "#F59E0B" },
  { name: "Rejected", value: 15, color: COLORS.danger },
];

/* Sample data for the Country module (static — not wired to a flow yet) */
const countryRows = [
  { id: "IN", code: "IN", name: "India", region: "APAC", projects: 54, active: true },
  { id: "US", code: "US", name: "United States", region: "AMER", projects: 38, active: true },
  { id: "GB", code: "GB", name: "United Kingdom", region: "EMEA", projects: 21, active: true },
  { id: "DE", code: "DE", name: "Germany", region: "EMEA", projects: 14, active: true },
  { id: "SG", code: "SG", name: "Singapore", region: "APAC", projects: 9, active: true },
  { id: "AU", code: "AU", name: "Australia", region: "APAC", projects: 7, active: false },
  { id: "CA", code: "CA", name: "Canada", region: "AMER", projects: 5, active: true },
];
const projectsByRegion = [
  { name: "APAC", value: 70 },
  { name: "EMEA", value: 35 },
  { name: "AMER", value: 43 },
];
const regionSplitColors = [COLORS.accent, "#8B5CF6", "#0EA5A4"];

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
   TOP NAV (with Master Data Transaction mega-dropdown)
   ============================================================ */
function TopNav({ user, current, onNavigateHome, onOpenModule, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div style={{
      height: 60, background: COLORS.navy, display: "flex", alignItems: "center",
      justifyContent: "space-between", padding: "0 22px", flexShrink: 0, position: "relative", zIndex: 30,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
        <div style={{ cursor: "pointer" }} onClick={onNavigateHome}><Logo /></div>
        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <NavItem label="Dashboard" icon={LayoutDashboard} active={current === "dashboard"} onClick={onNavigateHome} />
          <div ref={ref} style={{ position: "relative" }}>
            <NavItem label="Master Data Transaction" icon={ChevronDown} iconRight active={open || MODULES.some(m => m.key === current)} onClick={() => setOpen((o) => !o)} />
            {open && (
              <div style={{
                position: "absolute", top: 48, left: 0, width: 300, background: COLORS.card,
                borderRadius: 12, boxShadow: "0 20px 45px rgba(10,15,35,0.28)", border: `1px solid ${COLORS.border}`,
                padding: 8, maxHeight: 420, overflowY: "auto",
              }}>
                <div style={{ padding: "8px 10px 4px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: COLORS.textMuted, textTransform: "uppercase" }}>
                  Admin Modules
                </div>
                {MODULES.map((m) => {
                  const Icon = m.icon;
                  return (
                    <div
                      key={m.key}
                      onClick={() => { onOpenModule(m.key); setOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8,
                        cursor: "pointer", fontSize: 13.5, color: COLORS.text, fontWeight: 500,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{
                        width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
                        background: `${m.color}1F`, color: m.color, flexShrink: 0,
                      }}>
                        <Icon size={14} />
                      </span>
                      {m.label}
                      {!m.implemented && (
                        <span style={{ marginLeft: "auto", fontSize: 10, color: COLORS.textMuted, background: COLORS.bg, padding: "2px 6px", borderRadius: 6 }}>soon</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
   MODULE SIDEBAR (shown once inside Master Data Transaction)
   ============================================================ */
function ModuleSidebar({ current, onSelect }) {
  return (
    <div style={{
      width: 236, background: COLORS.navy, flexShrink: 0, padding: "18px 10px",
      display: "flex", flexDirection: "column", gap: 2, overflowY: "auto",
    }}>
      <div style={{ padding: "6px 12px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "#7783AA", textTransform: "uppercase" }}>
        Admin Modules
      </div>
      {MODULES.map((m) => {
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
  const kpis = [
    { label: "Active Departments", value: "9", icon: Building2, color: "#3B6FE0" },
    { label: "Open Projects", value: "128", icon: FolderKanban, color: "#22A06B" },
    { label: "Active Users", value: "342", icon: Users2, color: "#8B5CF6" },
    { label: "Pending Approvals", value: "23", icon: ClipboardList, color: "#F59E0B" },
  ];
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
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: COLORS.text, marginTop: 10 }}>{k.value}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={cardStyle}>
          <div style={cardTitle}><TrendingUp size={14} /> Transactions — last 6 months</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyTransactions}>
              <CartesianGrid stroke={COLORS.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: COLORS.textMuted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: COLORS.textMuted }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={COLORS.accent} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={cardStyle}>
          <div style={cardTitle}><ClipboardList size={14} /> Approval Status Split</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={approvalSplit} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3}>
                {approvalSplit.map((s) => <Cell key={s.name} fill={s.color} />)}
              </Pie>
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={cardTitle}><Building2 size={14} /> Headcount by Department</div>
          <button onClick={() => onOpenModule("department")} style={linkBtn}>Manage departments →</button>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={deptHeadcount}>
            <CartesianGrid stroke={COLORS.border} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: COLORS.textMuted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: COLORS.textMuted }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Bar dataKey="value" fill={COLORS.accent} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
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

  const refresh = useCallback(() => {
    setLoading(true);
    callDepartmentFlow("LIST").then((res) => {
      setRows(res.data);
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
   COUNTRY SCREEN — mini dashboard built on sample data
   (not wired to a Power Automate flow yet — static rows/charts,
   ready to swap in a callCountryFlow() the same way Departments
   works once that flow exists)
   ============================================================ */
function CountryPage() {
  // Dummy/local CRUD only — no Power Automate flow wired up for
  // Country yet. New countries live in this component's state for
  // the current session; refreshing the page resets to the sample
  // rows. Swap in a callCountryFlow() the same way Departments works
  // once that flow exists, and this becomes a real LIST/CREATE call.
  const [rows, setRows] = useState(countryRows);
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState(null); // null | { data }
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = rows.filter((r) =>
    (r.code || "").toLowerCase().includes(search.toLowerCase()) || (r.name || "").toLowerCase().includes(search.toLowerCase())
  );
  const totalProjects = rows.reduce((sum, r) => sum + (Number(r.projects) || 0), 0);
  const activeCount = rows.filter((r) => r.active).length;
  const regionCount = new Set(rows.map((r) => r.region)).size;

  const kpis = [
    { label: "Countries", value: String(rows.length), icon: Globe2, color: "#0EA5A4" },
    { label: "Active Countries", value: String(activeCount), icon: CheckCircle2, color: COLORS.success },
    { label: "Total Projects", value: String(totalProjects), icon: FolderKanban, color: COLORS.accent },
    { label: "Regions Covered", value: String(regionCount), icon: MapPin, color: "#8B5CF6" },
  ];

  const submitCountry = (form) => {
    if (!form.code?.trim() || !form.name?.trim()) return;
    const code = form.code.trim().toUpperCase();
    if (rows.some((r) => r.code === code)) {
      setToast(`A country with code "${code}" already exists.`);
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        id: code,
        code,
        name: form.name.trim(),
        region: form.region?.trim() || "Other",
        projects: Number(form.projects) || 0,
        active: !!form.active,
      },
    ]);
    setPanel(null);
    setToast("Country added (dummy — session only, not saved to Dataverse yet).");
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Country Master</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Snapshot of countries and project distribution (sample data)</div>
          </div>
          <button
            onClick={() => setPanel({ data: { code: "", name: "", region: "", projects: "", active: true } })}
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

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14, marginBottom: 16 }}>
          <div style={cardStyle}>
            <div style={cardTitle}><Globe2 size={14} /> Projects by Country</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rows}>
                <CartesianGrid stroke={COLORS.border} vertical={false} />
                <XAxis dataKey="code" tick={{ fontSize: 12, fill: COLORS.textMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: COLORS.textMuted }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="projects" fill="#0EA5A4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={cardStyle}>
            <div style={cardTitle}><MapPin size={14} /> Project Split by Region</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={projectsByRegion} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3}>
                  {projectsByRegion.map((s, i) => <Cell key={s.name} fill={regionSplitColors[i % regionSplitColors.length]} />)}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Countries <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 260 }}>
              <Search size={14} color={COLORS.textMuted} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by code or name"
                style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }}
              />
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {["Code", "Country", "Region", "Projects", "Status"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No countries match your search.</td></tr>
              ) : filtered.map((c, i) => (
                <tr key={c.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{c.code}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{c.name}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.textMuted }}>{c.region}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{c.projects}</td>
                  <td style={{ padding: "11px 16px" }}><StatusBadge active={c.active} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {panel && (
        <CountryPanel
          data={panel.data}
          onCancel={() => setPanel(null)}
          onSubmit={submitCountry}
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

function CountryPanel({ data, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  const [error, setError] = useState("");

  const submit = () => {
    if (!form.code?.trim() || !form.name?.trim()) {
      setError("Country Code and Name are required.");
      return;
    }
    setError("");
    onSubmit(form);
  };

  return (
    <div style={{
      width: 340, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0,
      display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)",
    }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>Add New Country</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Dummy entry — kept in this session only</div>
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
        <label style={{ ...labelStyle, marginTop: 16 }}>Region</label>
        <input
          value={form.region}
          onChange={(e) => setForm({ ...form, region: e.target.value })}
          placeholder="e.g. EMEA"
          style={inputStyle}
        />
        <label style={{ ...labelStyle, marginTop: 16 }}>Projects</label>
        <input
          type="number"
          min="0"
          value={form.projects}
          onChange={(e) => setForm({ ...form, projects: e.target.value })}
          placeholder="0"
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
          onClick={submit}
          style={{
            padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          Add Country
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
        {inModuleShell && page !== "department" && page !== "country" && <ModuleStub moduleKey={page} />}
      </div>
      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>
    </div>
  );
}

export default function ProjectPulseAppRoot() {
  return (
    <ErrorBoundary>
      <ProjectPulseApp />
    </ErrorBoundary>
  );
}
