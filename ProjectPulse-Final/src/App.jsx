import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard, ChevronDown, LogOut, Search, Plus, Pencil, Trash2,
  X, Building2, Layers, Globe2, User, Handshake, CheckCircle2,
  CalendarClock, Briefcase, Contact, Shield, Receipt, UserCog, Flag,
  Loader2, RefreshCw, AlertCircle, Users2, FolderKanban,
  Inbox, DollarSign, ClipboardCheck, FileCheck, ScrollText, ArrowUpDown, Filter,
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
  { key: "approval-status", label: "Approval Status", icon: CheckCircle2, color: "#F59E0B", implemented: true },
  { key: "billing-type", label: "Billing Type", icon: CalendarClock, color: "#8B5CF6", implemented: true },
  { key: "client", label: "Client", icon: Briefcase, color: "#EAB308", implemented: true },
  { key: "roles", label: "Roles", icon: Shield, color: "#8B5CF6", implemented: true },
  // Frontend + flow + normalization are ready. Requires [dbo].[InvoiceStatus] to
  // exist in SQL and its Switch case pasted into the flow (same shape as
  // ApprovalStatus/ProjectStatus) — run the CREATE TABLE script first if you
  // haven't already, then paste in the flow branch before relying on this live.
  { key: "invoice-status", label: "Invoice Status", icon: Receipt, color: "#3B6FE0", implemented: true },
  { key: "user-roles", label: "User Roles", icon: UserCog, color: "#0EA5A4", implemented: true },
  { key: "project-status", label: "Project Status", icon: Flag, color: "#E11D48", implemented: true },
];

const PROJECT_MODULES = [
  { key: "project-dashboard", label: "Project Dashboard", icon: FolderKanban, color: "#22A06B", implemented: true },
  { key: "resource-allocation", label: "Resource Allocation", icon: Users2, color: "#F59E0B", implemented: true },
  { key: "pipeline-project", label: "Pipeline Project", icon: Handshake, color: "#8B5CF6", implemented: true },
  { key: "project-resources-txn", label: "Project Resources", icon: Users2, color: "#22A06B", implemented: true },
  { key: "project-document", label: "Project Document", icon: FileCheck, color: "#3B6FE0", implemented: true },
];

// Finance and Audits are not backed by SQL/Power Automate — both run
// entirely on browser localStorage (see logAudit / STORAGE_KEYS below).
const FINANCE_MODULES = [
  { key: "timesheet-approval", label: "Timesheet Approval", icon: ClipboardCheck, color: "#0EA5A4", implemented: true },
  { key: "project-approval", label: "Project Approval", icon: FileCheck, color: "#3B6FE0", implemented: true },
  { key: "link-invoice", label: "Link Invoice", icon: Receipt, color: "#EAB308", implemented: true },
];

const AUDIT_MODULES = [
  { key: "audit-log", label: "Audit Log", icon: ScrollText, color: "#6B7280", implemented: true },
];

// Combined list — used for lookups (ModuleStub, sidebar shell check) that
// don't care which nav group a module belongs to.
const MODULES = [...ADMIN_MODULES, ...PROJECT_MODULES, ...FINANCE_MODULES, ...AUDIT_MODULES];
/* ============================================================
   POWER AUTOMATE FLOW CALLS — moved to flows.js (shared with
   ProjectAllocation.jsx to avoid a circular import between the
   two files). See flows.js for the entity switch documentation.
   ============================================================ */
import {
  callDepartmentFlow, callCountryFlow, callProjectCategoryFlow, callRoleFlow,
  callClientFlow, callBillingTypeFlow, callUserFlow, callDealStatusFlow,
  callClientContactFlow, callProjectFlow, callApprovalStatusFlow,
  callProjectStatusFlow, callUserRolesFlow, callAuditEmailFlow,
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

/* ============================================================
   LOCAL-ONLY DATA — Finance and Audits have no SQL/Power Automate
   backing yet, so they persist to the browser via localStorage.
   Every other screen in this app stays on the SQL flows above.
   ============================================================ */
const LS_AUDIT_LOG = "pp_audit_log";
const LS_TIMESHEETS = "pp_timesheets";
const LS_PROJECT_APPROVALS = "pp_project_approvals";
const LS_CURRENT_USER = "pp_current_user";
const LS_INVOICE_STATUSES = "pp_invoice_statuses";
const LS_LINK_INVOICES = "pp_link_invoices";
const LS_PIPELINE_PROJECTS = "pp_pipeline_projects";
const LS_PROJECT_RESOURCES_TXN = "pp_project_resources_txn";
const LS_PROJECT_DOCUMENTS = "pp_project_documents";
const AUDIT_EMAIL_FLOW_URL = "https://93cd50265ecdea7aa4fd295cb67b42.d4.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/18/workflows/c7212c437f6d41948d051538730ea7d2/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=R9u4HkZeRsU2g0mvWkuc3POFQHqzMAa3uEnRbgDzT6E";

function sendAuditEmail(entry) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  fetch(AUDIT_EMAIL_FLOW_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entity: entry.screen,
      action: entry.action,   // 🔹 added
      data: entry.record,
      by: entry.user,
      dateTime: entry.timestamp,
    }),
    signal: controller.signal,
  })
    .catch((e) => console.warn("Audit email failed:", e.message))
    .finally(() => clearTimeout(timer));
}

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { /* storage unavailable — fail silently, non-critical */ }
}

// Records one CRUD/approval action to the local Audit Log. Screen is the
// entity/module name, action is Create/Update/Delete/Approve/Reject.
function logAudit(screen, action, record) {
  const session = lsGet(LS_CURRENT_USER, null);
  const currentUsername = typeof session === "string" ? session : session?.username || "Administrator";

  const entry = {
    guid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    screen, action,
    record: record || "—",
    user: currentUsername,
    timestamp: new Date().toISOString(),
  };

  const existing = lsGet(LS_AUDIT_LOG, []);
  existing.unshift(entry);
  lsSet(LS_AUDIT_LOG, existing.slice(0, 3000));

callAuditEmailFlow(entry); // fire-and-forget, non-blocking
}

// Friendly empty state — used everywhere instead of surfacing raw
// fetch/technical errors to the user.
function EmptyState({ icon: Icon = Inbox, message = "No data available." }) {
  return (
    <div style={{ padding: 46, textAlign: "center", color: COLORS.textMuted }}>
      <Icon size={26} style={{ opacity: 0.45, marginBottom: 8 }} />
      <div style={{ fontSize: 13.5 }}>{message}</div>
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
  const inFinance = FINANCE_MODULES.some((m) => m.key === current);
  const inAudit = AUDIT_MODULES.some((m) => m.key === current);

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
          <NavItem
            label="Finance"
            icon={DollarSign}
            active={inFinance}
            onClick={() => onOpenModule(FINANCE_MODULES.find((m) => m.implemented)?.key || FINANCE_MODULES[0].key)}
          />
          <NavItem
            label="Audits"
            icon={ScrollText}
            active={inAudit}
            onClick={() => onOpenModule(AUDIT_MODULES.find((m) => m.implemented)?.key || AUDIT_MODULES[0].key)}
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
  const inFinance = FINANCE_MODULES.some((m) => m.key === current);
  const inAudit = AUDIT_MODULES.some((m) => m.key === current);
const groupModules = inFinance ? FINANCE_MODULES : inAudit ? AUDIT_MODULES : inProject ? PROJECT_MODULES : ADMIN_MODULES;
const groupLabel = inFinance ? "Finance" : inAudit ? "Audits" : inProject ? "Project Management" : "Admin";
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
/* ============================================================
   CURRENCY HELPERS — used across Dashboard for pipeline/invoice
   value roll-ups. Strips formatting chars and re-formats en-IN.
   ============================================================ */
function parseCurrency(str) {
  return Number((str || "").replace(/[^0-9]/g, "")) || 0;
}
function formatINR(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

/* ============================================================
   DASHBOARD HOME — enhanced command-center view combining SQL
   master data with every local (Finance/Transaction/Audit) module.
   ============================================================ */
function DashboardHome({ onOpenModule }) {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [auditLog, setAuditLog] = useState([]);

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

    // Local-only modules — read straight from storage (instant, no spinner needed)
    setPipeline(lsGet(LS_PIPELINE_PROJECTS, null) || seedPipelineProjects());
    setTimesheets(lsGet(LS_TIMESHEETS, null) || seedTimesheets());
    setApprovals(lsGet(LS_PROJECT_APPROVALS, null) || seedProjectApprovals());
    setInvoices(lsGet(LS_LINK_INVOICES, null) || seedLinkInvoices());
    setDocuments(lsGet(LS_PROJECT_DOCUMENTS, null) || seedProjectDocuments());
    setAuditLog(lsGet(LS_AUDIT_LOG, []));

    return () => { cancelled = true; };
  }, []);

  // --- SQL-backed metrics ---
  const activeDepartments = departments.filter((d) => d.active).length;
  const activeProjects = projects.filter((p) => p.active).length;
  const activeUsers = users.filter((u) => u.active).length;
  const activeClients = clients.filter((c) => c.active).length;

  // --- Local-module metrics ---
  const openPipeline = pipeline.filter((p) => p.stage !== "Won" && p.stage !== "Lost");
  const pipelineValue = openPipeline.reduce((s, p) => s + parseCurrency(p.dealValue), 0);
  const wonValue = pipeline.filter((p) => p.stage === "Won").reduce((s, p) => s + parseCurrency(p.dealValue), 0);

  const pendingTimesheets = timesheets.filter((t) => t.status === "Pending").length;
  const pendingProjectApprovals = approvals.filter((a) => a.status === "Pending").length;
  const totalPendingApprovals = pendingTimesheets + pendingProjectApprovals;

  const unlinkedInvoices = invoices.filter((i) => i.status === "Unlinked");
  const totalInvoiceValue = invoices.reduce((s, i) => s + parseCurrency(i.amount), 0);

  const kpisRow1 = [
    { label: "Active Departments", value: String(activeDepartments), icon: Building2, color: "#3B6FE0" },
    { label: "Open Projects", value: String(activeProjects), icon: FolderKanban, color: "#22A06B" },
    { label: "Active Users", value: String(activeUsers), icon: Users2, color: "#8B5CF6" },
    { label: "Active Clients", value: String(activeClients), icon: Briefcase, color: "#EAB308" },
  ];

  const kpisRow2 = [
    { label: "Open Pipeline Value", value: formatINR(pipelineValue), icon: Handshake, color: "#8B5CF6", sub: `${openPipeline.length} active deals` },
    { label: "Pending Approvals", value: String(totalPendingApprovals), icon: ClipboardCheck, color: "#F59E0B", sub: `${pendingTimesheets} timesheets · ${pendingProjectApprovals} projects` },
    { label: "Unlinked Invoices", value: String(unlinkedInvoices.length), icon: Receipt, color: "#D6483E", sub: `${formatINR(totalInvoiceValue)} total tracked` },
    { label: "Documents on File", value: String(documents.length), icon: FileCheck, color: "#0EA5A4", sub: `${projects.length || pipeline.length} projects covered` },
  ];

  // --- Chart data ---
  const deptHeadcount = departments.map((d) => ({
    name: d.name,
    value: users.filter((u) => String(u.departmentId) === String(d.guid)).length,
  })).filter((d) => d.value > 0);

  const genderCounts = {};
  users.forEach((u) => {
    const g = u.gender || "Unspecified";
    genderCounts[g] = (genderCounts[g] || 0) + 1;
  });
  const genderSplit = Object.entries(genderCounts).map(([name, value], i) => ({
    name, value, color: CHART_PALETTE[i % CHART_PALETTE.length],
  }));

  const stageCounts = {};
  pipeline.forEach((p) => { stageCounts[p.stage] = (stageCounts[p.stage] || 0) + 1; });
  const pipelineByStage = ["Prospecting", "Proposal", "Negotiation", "Won", "Lost"]
    .map((stage) => ({ name: stage, value: stageCounts[stage] || 0 }))
    .filter((s) => s.value > 0);

  // --- Recent activity (audit log) ---
  const recentActivity = [...auditLog]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 7);

  const actionColor = (action) => {
    if (action === "Delete" || action === "Reject") return COLORS.danger;
    if (action === "Create" || action === "Approve") return COLORS.success;
    return COLORS.accent;
  };

  const timeAgo = (ts) => {
    const diffMs = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div style={{ padding: 26, overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text }}>Welcome back 👋</div>
          <div style={{ color: COLORS.textMuted, fontSize: 13.5, marginTop: 2 }}>Here's the pulse of your projects, pipeline and people today.</div>
        </div>
        <div style={{ fontSize: 12.5, color: COLORS.textMuted, textAlign: "right" }}>
          {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* KPI ROW 1 — SQL master data */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 14 }}>
        {kpisRow1.map((k) => {
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

      {/* KPI ROW 2 — Finance / Transaction rollups */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 22 }}>
        {kpisRow2.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: COLORS.textMuted, fontSize: 12.5, fontWeight: 600 }}>{k.label}</span>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: `${k.color}1F`, color: k.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={15} />
                </span>
              </div>
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, marginTop: 10 }}>{k.value}</div>
              <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 3 }}>{k.sub}</div>
            </div>
          );
        })}
      </div>

      {/* CHARTS ROW */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={cardTitle}><Building2 size={14} /> Headcount by Department</div>
              <button onClick={() => onOpenModule("department")} style={linkBtn}>Manage →</button>
            </div>
            {deptHeadcount.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>No users assigned yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptHeadcount}>
                  <CartesianGrid stroke={COLORS.border} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: COLORS.textMuted }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: COLORS.textMuted }} axisLine={false} tickLine={false} />
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
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={genderSplit} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={3}>
                    {genderSplit.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={cardTitle}><Handshake size={14} /> Pipeline by Stage</div>
              <button onClick={() => onOpenModule("pipeline-project")} style={linkBtn}>View →</button>
            </div>
            {pipelineByStage.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>No pipeline deals yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pipelineByStage} layout="vertical">
                  <CartesianGrid stroke={COLORS.border} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: COLORS.textMuted }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: COLORS.textMuted }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* LOWER ROW — Recent Activity + Action Center */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={cardTitle}><ScrollText size={14} /> Recent Activity</div>
            <button onClick={() => onOpenModule("audit-log")} style={linkBtn}>View full log →</button>
          </div>
          {recentActivity.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>No activity recorded yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {recentActivity.map((r) => (
                <div key={r.guid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 4px", borderBottom: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: actionColor(r.action), width: 60, flexShrink: 0 }}>{r.action}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320 }}>{r.record}</div>
                      <div style={{ fontSize: 11.5, color: COLORS.textMuted }}>{r.screen} · {r.user}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: COLORS.textMuted, flexShrink: 0 }}>{timeAgo(r.timestamp)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={cardTitle}><ClipboardCheck size={14} /> Needs Your Attention</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                onClick={() => onOpenModule("timesheet-approval")}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: COLORS.bg, borderRadius: 9, cursor: "pointer" }}
              >
                <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>Timesheets pending</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B" }}>{pendingTimesheets}</span>
              </div>
              <div
                onClick={() => onOpenModule("project-approval")}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: COLORS.bg, borderRadius: 9, cursor: "pointer" }}
              >
                <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>Project approvals pending</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B" }}>{pendingProjectApprovals}</span>
              </div>
              <div
                onClick={() => onOpenModule("link-invoice")}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: COLORS.bg, borderRadius: 9, cursor: "pointer" }}
              >
                <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>Invoices to link</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.danger }}>{unlinkedInvoices.length}</span>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={cardTitle}><Handshake size={14} /> Pipeline Summary</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, color: COLORS.textMuted }}>Open value</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.text }}>{formatINR(pipelineValue)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12.5, color: COLORS.textMuted }}>Won value</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.success }}>{formatINR(wonValue)}</span>
            </div>
          </div>
        </div>
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
   DUPLICATE-CODE GUARD — shared by every master screen that has
   a unique "code" column (Department, BillingType, Role,
   ProjectCategory, Client, InvoiceStatus, ProjectStatus, ...).
   Client-side pre-check so duplicates never reach the flow —
   avoids the raw 502/404 upstream errors that were leaking
   through, and gives a proper validation message instead.
   ============================================================ */
function findDuplicateCode(rows, code, currentGuid) {
  const c = (code || "").trim().toLowerCase();
  if (!c) return null;
  return rows.find((r) => (r.guid || "") !== (currentGuid || "") && (r.code || "").trim().toLowerCase() === c) || null;
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
  const activeCount = rows.filter((r) => r.active).length;

  const kpis = [
    { label: "Total Departments", value: String(rows.length), icon: Building2, color: "#6366F1" },
    { label: "Active Departments", value: String(activeCount), icon: CheckCircle2, color: COLORS.success },
    { label: "Inactive Departments", value: String(rows.length - activeCount), icon: AlertCircle, color: COLORS.danger },
  ];

  const submitPanel = (form) => {
    if (!form.code?.trim() || !form.name?.trim()) {
      setErr("Department Code and Name are required.");
      return;
    }
    if (findDuplicateCode(rows, form.code, form.guid)) {
      setErr("Department Code already exists.");
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
        logAudit("Department", form.guid ? "Update" : "Create", form.name || form.code || form.empId || form.contactName || "record");
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
        logAudit("Department", "Delete", confirmDelete.name || confirmDelete.code || confirmDelete.empId || confirmDelete.contactName || "record");
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
                {["Department Code", "Department Name", "Status","Actions"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
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
                    <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>No data available.</div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No data available.</td></tr>
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
        <button onClick={() => setForm(data)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>
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
        logAudit("Country", form.guid ? "Update" : "Create", form.name || form.code || form.empId || form.contactName || "record");
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
        logAudit("Country", "Delete", confirmDelete.name || confirmDelete.code || confirmDelete.empId || confirmDelete.contactName || "record");
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
                {["Country Code", "Country Name", "Status","Actions"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
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
                    <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>No data available.</div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No data available.</td></tr>
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
        <button onClick={() => setForm(data)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>
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
    if (findDuplicateCode(rows, form.code, form.guid)) {
      setErr("Category Code already exists.");
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
        logAudit("Category", form.guid ? "Update" : "Create", form.name || form.code || form.empId || form.contactName || "record");
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
        logAudit("Category", "Delete", confirmDelete.name || confirmDelete.code || confirmDelete.empId || confirmDelete.contactName || "record");
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
                {["Category Code", "Category Name", "Status","Actions"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
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
                    <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>No data available.</div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No data available.</td></tr>
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
        <button onClick={() => setForm(data)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>
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
    if (findDuplicateCode(rows, form.code, form.guid)) {
      setErr("Role Code already exists. Please enter a unique Role Code.");
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
        logAudit("Role", form.guid ? "Update" : "Create", form.name || form.code || form.empId || form.contactName || "record");
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
        logAudit("Role", "Delete", confirmDelete.name || confirmDelete.code || confirmDelete.empId || confirmDelete.contactName || "record");
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
                {["Role Code", "Role Name", "Status","Actions"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
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
                    <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>No data available.</div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No data available.</td></tr>
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
        <button onClick={() => setForm(data)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>
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
   APPROVAL STATUS SCREEN — same generic code/name/active shape
   as Roles/Department/Country, wired to entity="ApprovalStatus".
   ============================================================ */
function ApprovalStatusPage() {
  const [rows, setRows] = useState([]);
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
    callApprovalStatusFlow("LIST").then((res) => {
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
    { label: "Approval Statuses", value: String(rows.length), icon: CheckCircle2, color: "#F59E0B" },
    { label: "Active", value: String(activeCount), icon: CheckCircle2, color: COLORS.success },
    { label: "Inactive", value: String(rows.length - activeCount), icon: AlertCircle, color: COLORS.danger },
  ];

  const submitPanel = (form) => {
    if (!form.code?.trim() || !form.name?.trim()) {
      setErr("Code and Name are required.");
      return;
    }
    setSaving(true);
    setErr("");
    const action = form.guid ? "EDIT" : "CREATE";
    callApprovalStatusFlow(action, form)
      .then((res) => {
        setRows(res.data);
        setSaving(false);
        setPanel(null);
        logAudit("Approval status", form.guid ? "Update" : "Create", form.name || form.code || form.empId || form.contactName || "record");
        setToast(form.guid ? "Approval status updated." : "Approval status added.");
      })
      .catch((e) => {
        setSaving(false);
        setErr(e.message);
      });
  };

  const confirmDeleteRow = () => {
    if (!confirmDelete) return;
    setDeleting(true);
    callApprovalStatusFlow("DELETE", confirmDelete)
      .then((res) => {
        setRows(res.data);
        setDeleting(false);
        setConfirmDelete(null);
        logAudit("Approval status", "Delete", confirmDelete.name || confirmDelete.code || confirmDelete.empId || confirmDelete.contactName || "record");
        setToast("Approval status deleted.");
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
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Approval Status Master</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Add, edit and manage Approval Statuses</div>
          </div>
          <button
            onClick={() => setPanel({ mode: "add", data: { guid: "", code: "", name: "", active: true } })}
            style={{ display: "flex", alignItems: "center", gap: 7, background: COLORS.accent, color: "#fff", border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
          >
            <Plus size={15} /> Add Approval Status
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
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Approval Statuses <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 260 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by code or name" style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }} />
              </div>
              <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "0 12px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {["Code", "Name", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>
                  <Loader2 size={18} className="spin" style={{ verticalAlign: "middle", marginRight: 8 }} /> Loading approval statuses…
                </td></tr>
              ) : listError ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>No data available.</div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No data available.</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{r.code}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.name}</td>
                  <td style={{ padding: "11px 16px" }}><StatusBadge active={r.active} /></td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button onClick={() => setPanel({ mode: "edit", data: { ...r } })} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => setConfirmDelete(r)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
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
        <ApprovalStatusPanel mode={panel.mode} data={panel.data} saving={saving} error={err} onCancel={() => { setPanel(null); setErr(""); }} onSubmit={submitPanel} />
      )}

      {confirmDelete && (
        <ConfirmModal title="Delete this approval status?" message={`"${confirmDelete.name}" (${confirmDelete.code}) will be permanently removed. This can't be undone.`} confirmLabel="Delete" busy={deleting} onCancel={() => setConfirmDelete(null)} onConfirm={confirmDeleteRow} />
      )}

      {toast && (
        <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)" }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

function ApprovalStatusPanel({ mode, data, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);

  return (
    <div style={{ width: 340, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0, display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)" }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{mode === "add" ? "Add Approval Status" : "Edit Approval Status"}</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Fill all required fields below</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <label style={labelStyle}>Code*</label>
        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. PENDING" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Name*</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Pending Approval" style={inputStyle} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, padding: "12px 14px", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>Active</span>
          <div onClick={() => setForm({ ...form, active: !form.active })} style={{ width: 40, height: 22, borderRadius: 999, background: form.active ? COLORS.accent : "#D7DCE6", position: "relative", cursor: "pointer", transition: "background 0.15s" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: form.active ? 20 : 2, transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} />
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 16 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={() => setForm(data)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>Cancel</button>
        <button onClick={() => onSubmit(form)} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1, display: "flex", alignItems: "center", gap: 7 }}>
          {saving && <Loader2 size={13} className="spin" />}
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   PROJECT STATUS SCREEN — identical generic shape, entity="ProjectStatus".
   ============================================================ */
function ProjectStatusPage() {
  const [rows, setRows] = useState([]);
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
    callProjectStatusFlow("LIST").then((res) => {
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
    { label: "Project Statuses", value: String(rows.length), icon: Flag, color: "#E11D48" },
    { label: "Active Project Statuses", value: String(activeCount), icon: CheckCircle2, color: COLORS.success },
    { label: "Inactive Project Statuses", value: String(rows.length - activeCount), icon: AlertCircle, color: COLORS.danger },
  ];

  const submitPanel = (form) => {
    if (!form.code?.trim() || !form.name?.trim()) {
      setErr("Code and Name are required.");
      return;
    }
    if (findDuplicateCode(rows, form.code, form.guid)) {
      setErr("Project Status Code already exists. Please enter a unique Code.");
      return;
    }
    setSaving(true);
    setErr("");
    const action = form.guid ? "EDIT" : "CREATE";
    callProjectStatusFlow(action, form)
      .then((res) => {
        setRows(res.data);
        setSaving(false);
        setPanel(null);
        logAudit("Project status", form.guid ? "Update" : "Create", form.name || form.code || form.empId || form.contactName || "record");
        setToast(form.guid ? "Project status updated." : "Project status added.");
      })
      .catch((e) => {
        setSaving(false);
        setErr(e.message);
      });
  };

  const confirmDeleteRow = () => {
    if (!confirmDelete) return;
    setDeleting(true);
    callProjectStatusFlow("DELETE", confirmDelete)
      .then((res) => {
        setRows(res.data);
        setDeleting(false);
        setConfirmDelete(null);
        logAudit("Project status", "Delete", confirmDelete.name || confirmDelete.code || confirmDelete.empId || confirmDelete.contactName || "record");
        setToast("Project status deleted.");
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
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Project Status Master</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Add, edit and manage Project Statuses</div>
          </div>
          <button
            onClick={() => setPanel({ mode: "add", data: { guid: "", code: "", name: "", active: true } })}
            style={{ display: "flex", alignItems: "center", gap: 7, background: COLORS.accent, color: "#fff", border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
          >
            <Plus size={15} /> Add Project Status
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
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Project Statuses <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 260 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by code or name" style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }} />
              </div>
              <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "0 12px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {["Code", "Name", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>
                  <Loader2 size={18} className="spin" style={{ verticalAlign: "middle", marginRight: 8 }} /> Loading project statuses…
                </td></tr>
              ) : listError ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>No data available.</div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No data available.</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{r.code}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.name}</td>
                  <td style={{ padding: "11px 16px" }}><StatusBadge active={r.active} /></td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button onClick={() => setPanel({ mode: "edit", data: { ...r } })} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => setConfirmDelete(r)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
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
        <ProjectStatusPanel mode={panel.mode} data={panel.data} saving={saving} error={err} onCancel={() => { setPanel(null); setErr(""); }} onSubmit={submitPanel} />
      )}

      {confirmDelete && (
        <ConfirmModal title="Delete this project status?" message={`"${confirmDelete.name}" (${confirmDelete.code}) will be permanently removed. This can't be undone.`} confirmLabel="Delete" busy={deleting} onCancel={() => setConfirmDelete(null)} onConfirm={confirmDeleteRow} />
      )}

      {toast && (
        <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)" }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

function ProjectStatusPanel({ mode, data, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);

  return (
    <div style={{ width: 340, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0, display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)" }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{mode === "add" ? "Add Project Status" : "Edit Project Status"}</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Fill all required fields below</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <label style={labelStyle}>Code*</label>
        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. ONTRACK" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Name*</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. On Track" style={inputStyle} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, padding: "12px 14px", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>Active</span>
          <div onClick={() => setForm({ ...form, active: !form.active })} style={{ width: 40, height: 22, borderRadius: 999, background: form.active ? COLORS.accent : "#D7DCE6", position: "relative", cursor: "pointer", transition: "background 0.15s" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: form.active ? 20 : 2, transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} />
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 16 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={() => setForm(data)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>Cancel</button>
        <button onClick={() => onSubmit(form)} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1, display: "flex", alignItems: "center", gap: 7 }}>
          {saving && <Loader2 size={13} className="spin" />}
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   INVOICE STATUS SCREEN — identical generic shape, entity=
   "InvoiceStatus". Requires [dbo].[InvoiceStatus] + its flow
   branch to exist — see flows.js header note.
   ============================================================ */
function seedInvoiceStatuses() {
  const names = [
    "Draft", "Submitted", "Pending Review", "Approved", "Rejected",
    "Partially Paid", "Paid", "Overdue", "Cancelled", "On Hold",
    "Disputed", "Refunded", "Written Off", "Under Query", "Escalated",
    "Awaiting Approval", "Reissued", "Voided", "Closed", "Archived",
  ];
  return names.map((name, i) => ({
    guid: `inv-${i + 1}`,
    code: name.toUpperCase().replace(/\s+/g, "_"),
    name,
    active: i % 5 !== 4,
  }));
}
function seedLinkInvoices() {
  const clients = ["Acme Corp", "Globex Ltd", "Initech", "Umbrella Inc", "Wayne Enterprises", "Stark Industries", "Northwind", "Contoso", "Fabrikam", "Cyberdyne Systems"];
  const projects = ["Devoir Portal Revamp", "Client Onboarding Tool", "HR Self-Service Portal", "Retail Analytics Suite", "Inventory Sync Engine", "Mobile Banking App", "E-Commerce Migration", "Data Warehouse Build"];
  return Array.from({ length: 20 }, (_, i) => ({
    guid: `li-${i + 1}`,
    invoiceNumber: `INV-${1001 + i}`,
    clientName: clients[i % clients.length],
    projectName: projects[i % projects.length],
    amount: `₹${(1 + (i % 9)) * 50000}`.replace(/(\d)(?=(\d{2})+\d$)/g, "$1,"),
    dueDate: `2026-${String(9 + (i % 3)).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
    status: i % 3 === 0 ? "Unlinked" : "Linked",
  }));
}
function seedPipelineProjects() {
  const projects = ["Retail Analytics Suite", "HR Self-Service Portal", "Mobile Banking App", "E-Commerce Migration", "Data Warehouse Build", "Fleet Tracking System", "Customer Loyalty Platform", "Field Service App", "Supply Chain Dashboard", "Smart Inventory Tool"];
  const clients = ["Northwind", "Contoso", "Fabrikam", "Acme Corp", "Globex Ltd", "Initech", "Umbrella Inc", "Wayne Enterprises", "Stark Industries", "Cyberdyne Systems"];
  const owners = ["Karan Mehta", "Sara Iyer", "Aditi Rao", "Priya Sharma", "Rahul Nair"];
  const stages = ["Prospecting", "Proposal", "Negotiation", "Won", "Lost"];
  return Array.from({ length: 20 }, (_, i) => ({
    guid: `pp-${i + 1}`,
    projectName: projects[i % projects.length],
    client: clients[i % clients.length],
    dealValue: `₹${(5 + (i % 8) * 3)},00,000`,
    stage: stages[i % stages.length],
    expectedCloseDate: `2026-${String(9 + (i % 4)).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
    owner: owners[i % owners.length],
  }));
}
function seedProjectResourcesTxn() {
  const names = ["Aditi Rao", "Karan Mehta", "Sara Iyer", "Priya Sharma", "Rahul Nair", "Vikram Singh", "Neha Gupta", "Arjun Patel", "Divya Menon", "Sanjay Kumar"];
  const projects = ["Devoir Portal Revamp", "Client Onboarding Tool", "HR Self-Service Portal", "Retail Analytics Suite", "Mobile Banking App", "E-Commerce Migration"];
  const roles = ["Developer", "QA Engineer", "Business Analyst", "Project Manager", "UI/UX Designer", "DevOps Engineer"];
  return Array.from({ length: 20 }, (_, i) => ({
    guid: `prt-${i + 1}`,
    resourceName: names[i % names.length],
    project: projects[i % projects.length],
    role: roles[i % roles.length],
    startDate: `2026-0${(i % 6) + 1}-01`,
    endDate: "2026-12-31",
    allocationPct: [50, 60, 70, 80, 100][i % 5],
  }));
}
function seedProjectDocuments() {
  const projects = ["Devoir Portal Revamp", "Client Onboarding Tool", "HR Self-Service Portal", "Retail Analytics Suite", "Mobile Banking App", "E-Commerce Migration"];
  const types = ["Contract", "SOW", "Invoice", "NDA", "Other"];
  const uploaders = ["ProjectPulse", "Karan Mehta", "Sara Iyer", "Priya Sharma"];
  return Array.from({ length: 20 }, (_, i) => ({
    guid: `pd-${i + 1}`,
    docName: `${types[i % types.length]}_${projects[i % projects.length].split(" ")[0]}_${i + 1}.pdf`,
    project: projects[i % projects.length],
    docType: types[i % types.length],
    uploadedBy: uploaders[i % uploaders.length],
    uploadDate: `2026-0${(i % 8) + 1}-${String((i % 27) + 1).padStart(2, "0")}`,
    fileName: "",
    fileData: "",
  }));
}

function InvoiceStatusPage() {
  const [rows, setRows] = useState(() => {
    const existing = lsGet(LS_INVOICE_STATUSES, null);

    if (existing) return existing;

    const seeded = seedInvoiceStatuses();
    lsSet(LS_INVOICE_STATUSES, seeded);
    return seeded;
  });

  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!toast) return;

    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = rows.filter((r) =>
    (r.code || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = rows.filter((r) => r.active).length;

  const kpis = [
    {
      label: "Invoice Statuses",
      value: String(rows.length),
      icon: Receipt,
      color: COLORS.accent,
    },
    {
      label: "Active Invoice Statuses",
      value: String(activeCount),
      icon: CheckCircle2,
      color: COLORS.success,
    },
    {
      label: "Inactive Invoice Statuses",
      value: String(rows.length - activeCount),
      icon: AlertCircle,
      color: COLORS.danger,
    },
  ];

  const refresh = () => {
    setRows(lsGet(LS_INVOICE_STATUSES, []));
  };

  const submitPanel = (form) => {
    if (!form.code?.trim() || !form.name?.trim()) {
      setErr("Invoice Status Code and Name are required.");
      return;
    }
    if (findDuplicateCode(rows, form.code, form.guid)) {
      setErr("Invoice Status Code already exists. Please enter a unique Invoice Status Code.");
      return;
    }

    setSaving(true);
    setErr("");

    const updated = form.guid
      ? rows.map((r) =>
          r.guid === form.guid
            ? {
                ...r,
                code: form.code.trim(),
                name: form.name.trim(),
                active: !!form.active,
              }
            : r
        )
      : [
          ...rows,
          {
            guid: `inv-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,
            code: form.code.trim(),
            name: form.name.trim(),
            active: !!form.active,
          },
        ];

    lsSet(LS_INVOICE_STATUSES, updated);
    setRows(updated);

    setSaving(false);
    setPanel(null);

    logAudit(
      "Invoice Status",
      form.guid ? "Update" : "Create",
      form.name || form.code || "record"
    );

    setToast(form.guid ? "Invoice Status updated." : "Invoice Status added.");
  };

  const confirmDeleteRow = () => {
    if (!confirmDelete) return;

    setDeleting(true);

    const updated = rows.filter((r) => r.guid !== confirmDelete.guid);

    lsSet(LS_INVOICE_STATUSES, updated);
    setRows(updated);

    setDeleting(false);
    setConfirmDelete(null);

    logAudit(
      "Invoice Status",
      "Delete",
      confirmDelete.name || confirmDelete.code || "record"
    );

    setToast("Invoice Status deleted.");
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Sora, sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              Invoice Status Master
            </div>

            <div
              style={{
                color: COLORS.textMuted,
                fontSize: 13.5,
              }}
            >
              Add, edit and manage Invoice Statuses
            </div>
          </div>

          <button
            onClick={() =>
              setPanel({
                mode: "add",
                data: {
                  guid: "",
                  code: "",
                  name: "",
                  active: true,
                },
              })
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: COLORS.accent,
              color: "#fff",
              border: "none",
              borderRadius: 9,
              padding: "10px 16px",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Plus size={15} />
            Add Invoice Status
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
            marginBottom: 16,
          }}
        >
          {kpis.map((k) => {
            const Icon = k.icon;

            return (
              <div key={k.label} style={cardStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      color: COLORS.textMuted,
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    {k.label}
                  </span>

                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: `${k.color}1F`,
                      color: k.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={15} />
                  </span>
                </div>

                <div
                  style={{
                    fontFamily: "Sora, sans-serif",
                    fontSize: 26,
                    fontWeight: 700,
                    color: COLORS.text,
                    marginTop: 10,
                  }}
                >
                  {k.value}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            ...cardStyle,
            padding: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: COLORS.text,
              }}
            >
              Invoice Statuses{" "}
              <span
                style={{
                  color: COLORS.textMuted,
                  fontWeight: 500,
                }}
              >
                ({filtered.length})
              </span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  padding: "7px 11px",
                  width: 260,
                }}
              >
                <Search size={14} color={COLORS.textMuted} />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by code or name"
                  style={{
                    border: "none",
                    outline: "none",
                    fontSize: 13,
                    width: "100%",
                    fontFamily: "Inter, sans-serif",
                  }}
                />
              </div>

              <button
                onClick={refresh}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  border: `1px solid ${COLORS.border}`,
                  background: "#fff",
                  borderRadius: 8,
                  padding: "0 12px",
                  fontSize: 12.5,
                  cursor: "pointer",
                  color: COLORS.text,
                }}
              >
                <RefreshCw size={13} />
                Refresh
              </button>
            </div>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {[
                  "Invoice Status Code",
                  "Invoice Status Name",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 16px",
                      fontSize: 12,
                      color: COLORS.textMuted,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.3,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState
                      icon={Receipt}
                      message="No invoice statuses available."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => (
                  <tr
                    key={r.guid}
                    style={{
                      borderTop: `1px solid ${COLORS.border}`,
                      background: i % 2 ? "#FAFBFD" : "#fff",
                    }}
                  >
                    <td
                      style={{
                        padding: "11px 16px",
                        fontSize: 13.5,
                        color: COLORS.text,
                        fontWeight: 600,
                      }}
                    >
                      {r.code}
                    </td>

                    <td
                      style={{
                        padding: "11px 16px",
                        fontSize: 13.5,
                        color: COLORS.text,
                      }}
                    >
                      {r.name}
                    </td>

                    <td style={{ padding: "11px 16px" }}>
                      <StatusBadge active={r.active} />
                    </td>

                    <td
                      style={{
                        padding: "11px 16px",
                        textAlign: "right",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          gap: 8,
                        }}
                      >
                        <button
                          onClick={() =>
                            setPanel({
                              mode: "edit",
                              data: { ...r },
                            })
                          }
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            background: COLORS.accentSoft,
                            color: COLORS.accent,
                            border: "none",
                            borderRadius: 7,
                            padding: "6px 11px",
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <Pencil size={12} />
                          Edit
                        </button>

                        <button
                          onClick={() => setConfirmDelete(r)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            background: COLORS.dangerSoft,
                            color: COLORS.danger,
                            border: "none",
                            borderRadius: 7,
                            padding: "6px 11px",
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {panel && (
        <InvoiceStatusPanel
          mode={panel.mode}
          data={panel.data}
          saving={saving}
          error={err}
          onCancel={() => {
            setPanel(null);
            setErr("");
          }}
          onSubmit={submitPanel}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this invoice status?"
          message={`"${confirmDelete.name}" (${confirmDelete.code}) will be permanently removed from local storage. This can't be undone.`}
          confirmLabel="Delete"
          busy={deleting}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={confirmDeleteRow}
        />
      )}

      {toast && (
        <div
          style={{
            position: "absolute",
            bottom: 22,
            left: "50%",
            transform: "translateX(-50%)",
            background: COLORS.text,
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
          }}
        >
          <CheckCircle2 size={15} color={COLORS.success} />
          {toast}
        </div>
      )}
    </div>
  );
}

function LinkInvoicePage() {
  const [rows, setRows] = useState(() => {
    const existing = lsGet(LS_LINK_INVOICES, null);
    if (existing) return existing;
    const seeded = seedLinkInvoices();
    lsSet(LS_LINK_INVOICES, seeded);
    return seeded;
  });
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2600); return () => clearTimeout(t); }, [toast]);

  const filtered = rows.filter((r) =>
    (r.invoiceNumber || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.clientName || "").toLowerCase().includes(search.toLowerCase())
  );
  const linkedCount = rows.filter((r) => r.status === "Linked").length;

  const kpis = [
    { label: "Total Invoices", value: String(rows.length), icon: Receipt, color: COLORS.accent },
    { label: "Linked", value: String(linkedCount), icon: CheckCircle2, color: COLORS.success },
    { label: "Unlinked", value: String(rows.length - linkedCount), icon: AlertCircle, color: COLORS.danger },
  ];

  const refresh = () => setRows(lsGet(LS_LINK_INVOICES, []));

  const submitPanel = (form) => {
    if (!form.invoiceNumber?.trim() || !form.clientName?.trim()) {
      setErr("Invoice Number and Client Name are required.");
      return;
    }
    setSaving(true); setErr("");
    const updated = form.guid
      ? rows.map((r) => r.guid === form.guid ? { ...r, ...form } : r)
      : [...rows, { ...form, guid: `li-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }];
    lsSet(LS_LINK_INVOICES, updated);
    setRows(updated); setSaving(false); setPanel(null);
    logAudit("Link Invoice", form.guid ? "Update" : "Create", form.invoiceNumber);
    setToast(form.guid ? "Invoice updated." : "Invoice added.");
  };

  const confirmDeleteRow = () => {
    if (!confirmDelete) return;
    setDeleting(true);
    const updated = rows.filter((r) => r.guid !== confirmDelete.guid);
    lsSet(LS_LINK_INVOICES, updated);
    setRows(updated); setDeleting(false); setConfirmDelete(null);
    logAudit("Link Invoice", "Delete", confirmDelete.invoiceNumber);
    setToast("Invoice deleted.");
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Link Invoice</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Link invoices to projects and clients (stored locally — not yet on SQL)</div>
          </div>
          <button
            onClick={() => setPanel({ mode: "add", data: { guid: "", invoiceNumber: "", clientName: "", projectName: "", amount: "", dueDate: "", status: "Unlinked" } })}
            style={{ display: "flex", alignItems: "center", gap: 7, background: COLORS.accent, color: "#fff", border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
          >
            <Plus size={15} /> Add Invoice
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

        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Invoices <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 260 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by invoice # or client" style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }} />
              </div>
              <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "0 12px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {["Invoice #", "Client", "Project", "Amount", "Due Date", "Status","Actions"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={Receipt} message="No invoices available." /></td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.guid} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{r.invoiceNumber}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.clientName}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.projectName}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.amount}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.dueDate}</td>
                  <td style={{ padding: "11px 16px" }}><StatusBadge active={r.status === "Linked"} /></td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button onClick={() => setPanel({ mode: "edit", data: { ...r } })} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => setConfirmDelete(r)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
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
        <LinkInvoicePanel mode={panel.mode} data={panel.data} saving={saving} error={err} onCancel={() => { setPanel(null); setErr(""); }} onSubmit={submitPanel} />
      )}

      {confirmDelete && (
        <ConfirmModal title="Delete this invoice link?" message={`"${confirmDelete.invoiceNumber}" will be permanently removed from local storage. This can't be undone.`} confirmLabel="Delete" busy={deleting} onCancel={() => setConfirmDelete(null)} onConfirm={confirmDeleteRow} />
      )}

      {toast && (
        <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)" }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

function LinkInvoicePanel({ mode, data, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);

  return (
    <div style={{ width: 340, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0, display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)" }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{mode === "add" ? "Add Invoice Link" : "Edit Invoice Link"}</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Fill all required fields below</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>
      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <label style={labelStyle}>Invoice Number*</label>
        <input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="e.g. INV-1003" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Client Name*</label>
        <input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="e.g. Acme Corp" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Project Name</label>
        <input value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} placeholder="e.g. Devoir Portal Revamp" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Amount</label>
        <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. ₹4,50,000" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Due Date</label>
        <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Status</label>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
          <option value="Linked">Linked</option>
          <option value="Unlinked">Unlinked</option>
        </select>
        {error && <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 16 }}><AlertCircle size={14} /> {error}</div>}
      </div>
      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={() => setForm(data)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>Cancel</button>
        <button onClick={() => onSubmit(form)} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1, display: "flex", alignItems: "center", gap: 7 }}>
          {saving && <Loader2 size={13} className="spin" />}
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   PIPELINE PROJECT (Transaction) — localStorage only
   ============================================================ */
function PipelineProjectPage() {
  const [rows, setRows] = useState(() => {
    const existing = lsGet(LS_PIPELINE_PROJECTS, null);
    if (existing) return existing;
    const seeded = seedPipelineProjects();
    lsSet(LS_PIPELINE_PROJECTS, seeded);
    return seeded;
  });
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2600); return () => clearTimeout(t); }, [toast]);

  const filtered = rows.filter((r) =>
    (r.projectName || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.client || "").toLowerCase().includes(search.toLowerCase())
  );

  const kpis = [
    { label: "Pipeline Projects", value: String(rows.length), icon: Handshake, color: "#8B5CF6" },
    { label: "Negotiation", value: String(rows.filter((r) => r.stage === "Negotiation").length), icon: CheckCircle2, color: COLORS.success },
    { label: "Proposal", value: String(rows.filter((r) => r.stage === "Proposal").length), icon: AlertCircle, color: "#F59E0B" },
  ];

  const refresh = () => setRows(lsGet(LS_PIPELINE_PROJECTS, []));

  const submitPanel = (form) => {
    if (!form.projectName?.trim() || !form.client?.trim()) {
      setErr("Project Name and Client are required.");
      return;
    }
    setSaving(true); setErr("");
    const updated = form.guid
      ? rows.map((r) => r.guid === form.guid ? { ...r, ...form } : r)
      : [...rows, { ...form, guid: `pp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }];
    lsSet(LS_PIPELINE_PROJECTS, updated);
    setRows(updated); setSaving(false); setPanel(null);
    logAudit("Pipeline Project", form.guid ? "Update" : "Create", form.projectName);
    setToast(form.guid ? "Pipeline project updated." : "Pipeline project added.");
  };

  const confirmDeleteRow = () => {
    if (!confirmDelete) return;
    setDeleting(true);
    const updated = rows.filter((r) => r.guid !== confirmDelete.guid);
    lsSet(LS_PIPELINE_PROJECTS, updated);
    setRows(updated); setDeleting(false); setConfirmDelete(null);
    logAudit("Pipeline Project", "Delete", confirmDelete.projectName);
    setToast("Pipeline project deleted.");
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Pipeline Project</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Track deals in the sales pipeline (stored locally — not yet on SQL)</div>
          </div>
          <button
            onClick={() => setPanel({ mode: "add", data: { guid: "", projectName: "", client: "", dealValue: "", stage: "Proposal", expectedCloseDate: "", owner: "" } })}
            style={{ display: "flex", alignItems: "center", gap: 7, background: COLORS.accent, color: "#fff", border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
          >
            <Plus size={15} /> Add Pipeline Project
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

        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Pipeline <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 260 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by project or client" style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }} />
              </div>
              <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "0 12px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {["Project", "Client", "Deal Value", "Stage", "Expected Close", "Owner","Actions"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={Handshake} message="No pipeline projects available." /></td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.guid} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{r.projectName}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.client}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.dealValue}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.stage}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.expectedCloseDate}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.owner}</td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button onClick={() => setPanel({ mode: "edit", data: { ...r } })} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => setConfirmDelete(r)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
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
        <PipelineProjectPanel mode={panel.mode} data={panel.data} saving={saving} error={err} onCancel={() => { setPanel(null); setErr(""); }} onSubmit={submitPanel} />
      )}

      {confirmDelete && (
        <ConfirmModal title="Delete this pipeline project?" message={`"${confirmDelete.projectName}" will be permanently removed from local storage. This can't be undone.`} confirmLabel="Delete" busy={deleting} onCancel={() => setConfirmDelete(null)} onConfirm={confirmDeleteRow} />
      )}

      {toast && (
        <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)" }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

function PipelineProjectPanel({ mode, data, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);

  return (
    <div style={{ width: 340, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0, display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)" }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{mode === "add" ? "Add Pipeline Project" : "Edit Pipeline Project"}</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Fill all required fields below</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>
      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <label style={labelStyle}>Project Name*</label>
        <input value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} placeholder="e.g. Retail Analytics Suite" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Client*</label>
        <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="e.g. Northwind" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Deal Value</label>
        <input value={form.dealValue} onChange={(e) => setForm({ ...form, dealValue: e.target.value })} placeholder="e.g. ₹32,00,000" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Stage</label>
        <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} style={inputStyle}>
          <option value="Prospecting">Prospecting</option>
          <option value="Proposal">Proposal</option>
          <option value="Negotiation">Negotiation</option>
          <option value="Won">Won</option>
          <option value="Lost">Lost</option>
        </select>
        <label style={{ ...labelStyle, marginTop: 16 }}>Expected Close Date</label>
        <input type="date" value={form.expectedCloseDate} onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })} style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Owner</label>
        <input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="e.g. Karan Mehta" style={inputStyle} />
        {error && <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 16 }}><AlertCircle size={14} /> {error}</div>}
      </div>
      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={() => setForm(data)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>Cancel</button>
        <button onClick={() => onSubmit(form)} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1, display: "flex", alignItems: "center", gap: 7 }}>
          {saving && <Loader2 size={13} className="spin" />}
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   PROJECT RESOURCES (Transaction) — localStorage only
   ============================================================ */
function ProjectResourcesTxnPage() {
  const [rows, setRows] = useState(() => {
    const existing = lsGet(LS_PROJECT_RESOURCES_TXN, null);
    if (existing) return existing;
    const seeded = seedProjectResourcesTxn();
    lsSet(LS_PROJECT_RESOURCES_TXN, seeded);
    return seeded;
  });
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2600); return () => clearTimeout(t); }, [toast]);

  const filtered = rows.filter((r) =>
    (r.resourceName || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.project || "").toLowerCase().includes(search.toLowerCase())
  );

  const kpis = [
    { label: "Total Assignments", value: String(rows.length), icon: Users2, color: "#22A06B" },
    { label: "Avg Allocation %", value: rows.length ? String(Math.round(rows.reduce((s, r) => s + Number(r.allocationPct || 0), 0) / rows.length)) : "0", icon: CheckCircle2, color: COLORS.success },
  ];

  const refresh = () => setRows(lsGet(LS_PROJECT_RESOURCES_TXN, []));

  const submitPanel = (form) => {
    if (!form.resourceName?.trim() || !form.project?.trim()) {
      setErr("Resource Name and Project are required.");
      return;
    }
    setSaving(true); setErr("");
    const updated = form.guid
      ? rows.map((r) => r.guid === form.guid ? { ...r, ...form } : r)
      : [...rows, { ...form, guid: `prt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }];
    lsSet(LS_PROJECT_RESOURCES_TXN, updated);
    setRows(updated); setSaving(false); setPanel(null);
    logAudit("Project Resources", form.guid ? "Update" : "Create", `${form.resourceName} — ${form.project}`);
    setToast(form.guid ? "Resource assignment updated." : "Resource assignment added.");
  };

  const confirmDeleteRow = () => {
    if (!confirmDelete) return;
    setDeleting(true);
    const updated = rows.filter((r) => r.guid !== confirmDelete.guid);
    lsSet(LS_PROJECT_RESOURCES_TXN, updated);
    setRows(updated); setDeleting(false); setConfirmDelete(null);
    logAudit("Project Resources", "Delete", `${confirmDelete.resourceName} — ${confirmDelete.project}`);
    setToast("Resource assignment deleted.");
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Project Resources</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Resource-to-project assignment transactions (stored locally — not yet on SQL)</div>
          </div>
          <button
            onClick={() => setPanel({ mode: "add", data: { guid: "", resourceName: "", project: "", role: "", startDate: "", endDate: "", allocationPct: 100 } })}
            style={{ display: "flex", alignItems: "center", gap: 7, background: COLORS.accent, color: "#fff", border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
          >
            <Plus size={15} /> Add Assignment
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

        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Assignments <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 260 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by resource or project" style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }} />
              </div>
              <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "0 12px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {["Resource", "Project", "Role", "Start Date", "End Date", "Allocation %","Actions"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={Users2} message="No resource assignments available." /></td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.guid} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{r.resourceName}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.project}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.role}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.startDate}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.endDate}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.allocationPct}%</td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button onClick={() => setPanel({ mode: "edit", data: { ...r } })} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => setConfirmDelete(r)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
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
        <ProjectResourcesTxnPanel mode={panel.mode} data={panel.data} saving={saving} error={err} onCancel={() => { setPanel(null); setErr(""); }} onSubmit={submitPanel} />
      )}

      {confirmDelete && (
        <ConfirmModal title="Delete this assignment?" message={`"${confirmDelete.resourceName}" on "${confirmDelete.project}" will be permanently removed. This can't be undone.`} confirmLabel="Delete" busy={deleting} onCancel={() => setConfirmDelete(null)} onConfirm={confirmDeleteRow} />
      )}

      {toast && (
        <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)" }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

function ProjectResourcesTxnPanel({ mode, data, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);

  return (
    <div style={{ width: 340, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0, display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)" }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{mode === "add" ? "Add Resource Assignment" : "Edit Resource Assignment"}</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Fill all required fields below</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>
      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <label style={labelStyle}>Resource Name*</label>
        <input value={form.resourceName} onChange={(e) => setForm({ ...form, resourceName: e.target.value })} placeholder="e.g. Aditi Rao" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Project*</label>
        <input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="e.g. Devoir Portal Revamp" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Role</label>
        <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Developer" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Start Date</label>
        <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>End Date</label>
        <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Allocation %</label>
        <input type="number" min="0" max="100" value={form.allocationPct} onChange={(e) => setForm({ ...form, allocationPct: e.target.value })} placeholder="e.g. 80" style={inputStyle} />
        {error && <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 16 }}><AlertCircle size={14} /> {error}</div>}
      </div>
      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={() => setForm(data)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>Cancel</button>
        <button onClick={() => onSubmit(form)} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1, display: "flex", alignItems: "center", gap: 7 }}>
          {saving && <Loader2 size={13} className="spin" />}
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   PROJECT DOCUMENT (Transaction) — localStorage only
   ============================================================ */
function ProjectDocumentPage() {
  const [rows, setRows] = useState(() => {
    const existing = lsGet(LS_PROJECT_DOCUMENTS, null);
    if (existing) return existing;
    const seeded = seedProjectDocuments();
    lsSet(LS_PROJECT_DOCUMENTS, seeded);
    return seeded;
  });
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2600); return () => clearTimeout(t); }, [toast]);

  const filtered = rows.filter((r) =>
    (r.docName || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.project || "").toLowerCase().includes(search.toLowerCase())
  );

  const kpis = [
    { label: "Total Documents", value: String(rows.length), icon: FileCheck, color: COLORS.accent },
    { label: "Contracts", value: String(rows.filter((r) => r.docType === "Contract").length), icon: CheckCircle2, color: COLORS.success },
  ];

  const refresh = () => setRows(lsGet(LS_PROJECT_DOCUMENTS, []));

  const submitPanel = (form) => {
    if (!form.docName?.trim() || !form.project?.trim()) {
      setErr("Document Name and Project are required.");
      return;
    }
    setSaving(true); setErr("");
    const updated = form.guid
      ? rows.map((r) => r.guid === form.guid ? { ...r, ...form } : r)
      : [...rows, { ...form, guid: `pd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }];
    lsSet(LS_PROJECT_DOCUMENTS, updated);
    setRows(updated); setSaving(false); setPanel(null);
    logAudit("Project Document", form.guid ? "Update" : "Create", form.docName);
    setToast(form.guid ? "Document updated." : "Document added.");
  };

  const confirmDeleteRow = () => {
    if (!confirmDelete) return;
    setDeleting(true);
    const updated = rows.filter((r) => r.guid !== confirmDelete.guid);
    lsSet(LS_PROJECT_DOCUMENTS, updated);
    setRows(updated); setDeleting(false); setConfirmDelete(null);
    logAudit("Project Document", "Delete", confirmDelete.docName);
    setToast("Document deleted.");
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Project Document</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Track project-related document metadata (stored locally — not yet on SQL)</div>
          </div>
          <button
onClick={() => setPanel({ mode: "add", data: { guid: "", docName: "", project: "", docType: "Contract", uploadedBy: "", uploadDate: "", fileName: "", fileData: "" } })}
            style={{ display: "flex", alignItems: "center", gap: 7, background: COLORS.accent, color: "#fff", border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
          >
            <Plus size={15} /> Add Document
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

        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Documents <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 260 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by document or project" style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }} />
              </div>
              <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "0 12px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
               {["Document", "Project", "Type", "Uploaded By", "Upload Date", "File","Actions"].map((h) => (
  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon={FileCheck} message="No documents available." /></td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.guid} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{r.docName}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.project}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.docType}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.uploadedBy}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.uploadDate}</td>
                  <td style={{ padding: "11px 16px" }}>
  {r.fileData ? (<a href={r.fileData}
      download={r.fileName || r.docName}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: COLORS.accent, textDecoration: "none" }}
    >
      <FileCheck size={12} /> {r.fileName || "Download"}</a>
  ) : (
    <span style={{ fontSize: 12.5, color: COLORS.textMuted }}>No file</span>
  )}
</td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button onClick={() => setPanel({ mode: "edit", data: { ...r } })} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => setConfirmDelete(r)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
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
        <ProjectDocumentPanel mode={panel.mode} data={panel.data} saving={saving} error={err} onCancel={() => { setPanel(null); setErr(""); }} onSubmit={submitPanel} />
      )}

      {confirmDelete && (
        <ConfirmModal title="Delete this document?" message={`"${confirmDelete.docName}" will be permanently removed from local storage. This can't be undone.`} confirmLabel="Delete" busy={deleting} onCancel={() => setConfirmDelete(null)} onConfirm={confirmDeleteRow} />
      )}

      {toast && (
        <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)" }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

function ProjectDocumentPanel({ mode, data, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);

  return (
    <div style={{ width: 340, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0, display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)" }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{mode === "add" ? "Add Document" : "Edit Document"}</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Fill all required fields below</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>
      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <label style={labelStyle}>Document Name*</label>
        <input value={form.docName} onChange={(e) => setForm({ ...form, docName: e.target.value })} placeholder="e.g. SOW_Client.pdf" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Project*</label>
        <input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="e.g. Devoir Portal Revamp" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Document Type</label>
        <select value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })} style={inputStyle}>
          <option value="Contract">Contract</option>
          <option value="SOW">SOW</option>
          <option value="Invoice">Invoice</option>
          <option value="NDA">NDA</option>
          <option value="Other">Other</option>
        </select>
        <label style={{ ...labelStyle, marginTop: 16 }}>Uploaded By</label>
        <input value={form.uploadedBy} onChange={(e) => setForm({ ...form, uploadedBy: e.target.value })} placeholder="e.g. ProjectPulse" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Upload Date</label>
        
        <input type="date" value={form.uploadDate} onChange={(e) => setForm({ ...form, uploadDate: e.target.value })} style={inputStyle} />
        {error && <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 16 }}><AlertCircle size={14} /> {error}</div>}
      <label style={{ ...labelStyle, marginTop: 16 }}>Upload File</label>
<input
  type="file"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("File too large for local storage (max 4MB). Choose a smaller file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, fileName: file.name, fileData: reader.result }));
    };
    reader.readAsDataURL(file);
  }}
  style={{ ...inputStyle, padding: "8px 13px" }}
/>
{form.fileName && (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, padding: "8px 12px", background: COLORS.accentSoft, borderRadius: 8, fontSize: 12.5 }}>
    <span style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.accent, fontWeight: 600 }}>
      <FileCheck size={13} /> {form.fileName}
    </span>
    <button
      type="button"
      onClick={() => setForm((f) => ({ ...f, fileName: "", fileData: "" }))}
      style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}
    >
      <X size={13} />
    </button>
  </div>
)}
      </div>
      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={() => setForm(data)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>Cancel</button>
        <button onClick={() => onSubmit(form)} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1, display: "flex", alignItems: "center", gap: 7 }}>
          {saving && <Loader2 size={13} className="spin" />}
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

function InvoiceStatusPanel({ mode, data, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);

  return (
    <div style={{ width: 340, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0, display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)" }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{mode === "add" ? "Add Invoice Status" : "Edit Invoice Status"}</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Fill all required fields below</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <label style={labelStyle}>Code*</label>
        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. UNPAID" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Name*</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Unpaid" style={inputStyle} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, padding: "12px 14px", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>Active</span>
          <div onClick={() => setForm({ ...form, active: !form.active })} style={{ width: 40, height: 22, borderRadius: 999, background: form.active ? COLORS.accent : "#D7DCE6", position: "relative", cursor: "pointer", transition: "background 0.15s" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: form.active ? 20 : 2, transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} />
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 16 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={() => setForm(data)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>Cancel</button>
        <button onClick={() => onSubmit(form)} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1, display: "flex", alignItems: "center", gap: 7 }}>
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
    if (findDuplicateCode(rows, form.code, form.guid)) {
      setErr("Billing Type Code already exists. Please enter a unique Billing Type Code.");
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
        logAudit("Billing type", form.guid ? "Update" : "Create", form.name || form.code || form.empId || form.contactName || "record");
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
        logAudit("Billing type", "Delete", confirmDelete.name || confirmDelete.code || confirmDelete.empId || confirmDelete.contactName || "record");
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
                {["Billing Type Code", "Billing Type Name", "Status","Actions"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
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
                    <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>No data available.</div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No data available.</td></tr>
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
        <button onClick={() => setForm(data)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>
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
        logAudit("Deal status", form.guid ? "Update" : "Create", form.name || form.code || form.empId || form.contactName || "record");
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
        logAudit("Deal status", "Delete", confirmDelete.name || confirmDelete.code || confirmDelete.empId || confirmDelete.contactName || "record");
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
                {["Deal Status Name", "Status","Actions"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
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
                    <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>No data available.</div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No data available.</td></tr>
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
        <button onClick={() => setForm(data)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>
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
    if (findDuplicateCode(rows, form.code, form.guid)) {
      setErr("Client Code already exists. Please enter a unique Client Code.");
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
        logAudit("Client", form.guid ? "Update" : "Create", form.name || form.code || form.empId || form.contactName || "record");
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
        logAudit("Client", "Delete", confirmDelete.name || confirmDelete.code || confirmDelete.empId || confirmDelete.contactName || "record");
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
                {["Client Code", "Client Name", "Contact Name", "Email", "Phone", "Status","Actions"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
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
                    <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>No data available.</div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No data available.</td></tr>
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
        <button onClick={() => setForm(data)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>
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
        logAudit("User", form.guid ? "Update" : "Create", form.name || form.code || form.empId || form.contactName || "record");
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
        logAudit("User", "Delete", confirmDelete.name || confirmDelete.code || confirmDelete.empId || confirmDelete.contactName || "record");
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
                {["Emp ID", "Name", "Job Title", "Department", "Gender", "Status","Actions"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
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
                    <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>No data available.</div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No data available.</td></tr>
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
        <button onClick={() => setForm(data)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>
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
   USER ROLES SCREEN — junction table (Users x Roles), entity=
   "UserRoles". Dropdowns instead of code/name text fields, same
   lookup-loading pattern UsersPage uses for Department.
   ============================================================ */
function UserRolesPage() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
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
    callUserRolesFlow("LIST").then((res) => {
      setRows(res.data);
      setLoading(false);
    }).catch((e) => {
      setListError(e.message);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { callUserFlow("LIST").then((res) => setUsers(res.data)); }, []);
  useEffect(() => { callRoleFlow("LIST").then((res) => setRoles(res.data)); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const userName = (id) => {
    const u = users.find((x) => String(x.id) === String(id));
    return u ? `${u.firstName} ${u.lastName}` : "—";
  };
  const roleName = (id) => roles.find((r) => String(r.id) === String(id))?.name || "—";

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return userName(r.userId).toLowerCase().includes(q) || roleName(r.roleId).toLowerCase().includes(q);
  });
  const activeCount = rows.filter((r) => r.active).length;

  const kpis = [
    { label: "User Role Assignments", value: String(rows.length), icon: UserCog, color: "#0EA5A4" },
    { label: "Active Assignments", value: String(activeCount), icon: CheckCircle2, color: COLORS.success },
    { label: "Inactive Assignments", value: String(rows.length - activeCount), icon: AlertCircle, color: COLORS.danger },
  ];

  const submitPanel = (form) => {
    if (!form.userId || !form.roleId) {
      setErr("User and Role are required.");
      return;
    }
    setSaving(true);
    setErr("");
    const action = form.guid ? "EDIT" : "CREATE";
    callUserRolesFlow(action, form)
      .then((res) => {
        setRows(res.data);
        setSaving(false);
        setPanel(null);
        logAudit("User role", form.guid ? "Update" : "Create", form.name || form.code || form.empId || form.contactName || "record");
        setToast(form.guid ? "User role updated." : "User role added.");
      })
      .catch((e) => {
        setSaving(false);
        setErr(e.message);
      });
  };

  const confirmDeleteRow = () => {
    if (!confirmDelete) return;
    setDeleting(true);
    callUserRolesFlow("DELETE", confirmDelete)
      .then((res) => {
        setRows(res.data);
        setDeleting(false);
        setConfirmDelete(null);
        logAudit("User role", "Delete", confirmDelete.name || confirmDelete.code || confirmDelete.empId || confirmDelete.contactName || "record");
        setToast("User role deleted.");
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
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>User Roles</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Assign Roles to Users</div>
          </div>
          <button
            onClick={() => setPanel({ mode: "add", data: { guid: "", userId: "", roleId: "", active: true } })}
            style={{ display: "flex", alignItems: "center", gap: 7, background: COLORS.accent, color: "#fff", border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
          >
            <Plus size={15} /> Assign Role
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
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Assignments <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 260 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user or role" style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }} />
              </div>
              <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "0 12px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {["User", "Role", "Status","Actions"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>
                  <Loader2 size={18} className="spin" style={{ verticalAlign: "middle", marginRight: 8 }} /> Loading user roles…
                </td></tr>
              ) : listError ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>No data available.</div>
                    <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>No data available.</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{userName(r.userId)}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{roleName(r.roleId)}</td>
                  <td style={{ padding: "11px 16px" }}><StatusBadge active={r.active} /></td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button onClick={() => setPanel({ mode: "edit", data: { ...r } })} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => setConfirmDelete(r)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
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
        <UserRolesPanel mode={panel.mode} data={panel.data} users={users} roles={roles} saving={saving} error={err} onCancel={() => { setPanel(null); setErr(""); }} onSubmit={submitPanel} />
      )}

      {confirmDelete && (
        <ConfirmModal title="Remove this role assignment?" message={`"${userName(confirmDelete.userId)}" will lose the "${roleName(confirmDelete.roleId)}" role. This can't be undone.`} confirmLabel="Delete" busy={deleting} onCancel={() => setConfirmDelete(null)} onConfirm={confirmDeleteRow} />
      )}

      {toast && (
        <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)" }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

function UserRolesPanel({ mode, data, users, roles, saving, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);

  return (
    <div style={{ width: 340, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, flexShrink: 0, display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(15,20,40,0.06)" }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{mode === "add" ? "Assign Role" : "Edit Assignment"}</div>
          <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 2 }}>Fill all required fields below</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted }}><X size={18} /></button>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <label style={labelStyle}>User*</label>
        <select value={form.userId || ""} onChange={(e) => setForm({ ...form, userId: e.target.value })} style={inputStyle}>
          <option value="">Select user</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
          ))}
        </select>

        <label style={{ ...labelStyle, marginTop: 16 }}>Role*</label>
        <select value={form.roleId || ""} onChange={(e) => setForm({ ...form, roleId: e.target.value })} style={inputStyle}>
          <option value="">Select role</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, padding: "12px 14px", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>Active</span>
          <div onClick={() => setForm({ ...form, active: !form.active })} style={{ width: 40, height: 22, borderRadius: 999, background: form.active ? COLORS.accent : "#D7DCE6", position: "relative", cursor: "pointer", transition: "background 0.15s" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: form.active ? 20 : 2, transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} />
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.danger, fontSize: 12.5, marginTop: 16 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={() => setForm(data)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: COLORS.text }}>Cancel</button>
        <button onClick={() => onSubmit(form)} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1, display: "flex", alignItems: "center", gap: 7 }}>
          {saving && <Loader2 size={13} className="spin" />}
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   TIMESHEET APPROVAL (Finance) — localStorage only, no SQL flow.
   Employee names are cross-referenced from the real User list for
   convenience, but the timesheet records themselves live locally.
   ============================================================ */
function seedTimesheets() {
  const employees = ["Aditi Rao", "Karan Mehta", "Sara Iyer", "Priya Sharma", "Rahul Nair", "Vikram Singh", "Neha Gupta", "Arjun Patel"];
  const projects = ["Devoir Portal Revamp", "Client Onboarding Tool", "HR Self-Service Portal", "Retail Analytics Suite"];
  const statuses = ["Pending", "Approved", "Rejected"];
  return Array.from({ length: 20 }, (_, i) => ({
    guid: `ts-${i + 1}`,
    employee: employees[i % employees.length],
    project: projects[i % projects.length],
    weekEnding: `2026-0${8 - (i % 3)}-${String(29 - (i % 4) * 7).padStart(2, "0")}`,
    hours: 30 + (i % 15),
    status: statuses[i % statuses.length],
  }));
}

function TimesheetApprovalPage() {
  const [rows, setRows] = useState(() => {
    const existing = lsGet(LS_TIMESHEETS, null);
    if (existing) return existing;
    const seeded = seedTimesheets();
    lsSet(LS_TIMESHEETS, seeded);
    return seeded;
  });
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => { callUserFlow("LIST").then((res) => setUsers(res.data)).catch(() => {}); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const employeeOptions = Array.from(new Set(rows.map((r) => r.employee))).sort();

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch = (r.employee || "").toLowerCase().includes(q) || (r.project || "").toLowerCase().includes(q);
    const matchesEmployee = !employeeFilter || r.employee === employeeFilter;
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesEmployee && matchesStatus;
  });

  const kpis = [
    { label: "Pending", value: String(rows.filter((r) => r.status === "Pending").length), icon: ClipboardCheck, color: "#F59E0B" },
    { label: "Approved", value: String(rows.filter((r) => r.status === "Approved").length), icon: CheckCircle2, color: COLORS.success },
    { label: "Rejected", value: String(rows.filter((r) => r.status === "Rejected").length), icon: AlertCircle, color: COLORS.danger },
  ];

  const decide = (row, decision) => {
    const updated = rows.map((r) => (r.guid === row.guid ? { ...r, status: decision } : r));
    setRows(updated);
    lsSet(LS_TIMESHEETS, updated);
    logAudit("Timesheet Approval", decision === "Approved" ? "Approve" : "Reject", `${row.employee} — week of ${row.weekEnding}`);
    setToast(`Timesheet ${decision.toLowerCase()}.`);
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Timesheet Approval</div>
          <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Review and approve weekly timesheets (stored locally — not yet on SQL)</div>
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Timesheets <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 200 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }} />
              </div>
              <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} style={{ ...inputStyle, width: 170, padding: "7px 11px" }}>
                <option value="">All Employees</option>
                {employeeOptions.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 150, padding: "7px 11px" }}>
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {["Employee", "Project", "Week Ending", "Hours", "Status","Actions"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon={ClipboardCheck} /></td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.guid} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{r.employee}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.project}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.weekEnding}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.hours}</td>
                  <td style={{ padding: "11px 16px" }}><StatusBadge active={r.status === "Approved"} /></td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    {r.status === "Pending" ? (
                      <div style={{ display: "inline-flex", gap: 8 }}>
                        <button onClick={() => decide(r, "Approved")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.successSoft, color: COLORS.success, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                          <CheckCircle2 size={12} /> Approve
                        </button>
                        <button onClick={() => decide(r, "Rejected")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                          <X size={12} /> Reject
                        </button>
                      </div>
                    ) : <span style={{ fontSize: 12.5, color: COLORS.textMuted }}>{r.status}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)" }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PROJECT APPROVAL (Finance) — localStorage only, no SQL flow.
   ============================================================ */
function seedProjectApprovals() {
  const projects = ["Devoir Portal Revamp", "Client Onboarding Tool", "HR Self-Service Portal", "Retail Analytics Suite", "Mobile Banking App", "E-Commerce Migration", "Data Warehouse Build", "Fleet Tracking System", "Customer Loyalty Platform", "Field Service App"];
  const requesters = ["Karan Mehta", "Sara Iyer", "Aditi Rao", "Priya Sharma", "Rahul Nair"];
  const statuses = ["Pending", "Approved", "Rejected"];
  return Array.from({ length: 20 }, (_, i) => ({
    guid: `pa-${i + 1}`,
    projectName: projects[i % projects.length],
    requestedBy: requesters[i % requesters.length],
    dealValue: `₹${(3 + (i % 10) * 2)},00,000`,
    status: statuses[i % statuses.length],
  }));
}
function ProjectApprovalPage() {
  const [rows, setRows] = useState(() => {
    const existing = lsGet(LS_PROJECT_APPROVALS, null);
    if (existing) return existing;
    const seeded = seedProjectApprovals();
    lsSet(LS_PROJECT_APPROVALS, seeded);
    return seeded;
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch = (r.projectName || "").toLowerCase().includes(q) || (r.requestedBy || "").toLowerCase().includes(q);
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const kpis = [
    { label: "Pending", value: String(rows.filter((r) => r.status === "Pending").length), icon: FileCheck, color: "#F59E0B" },
    { label: "Approved", value: String(rows.filter((r) => r.status === "Approved").length), icon: CheckCircle2, color: COLORS.success },
    { label: "Rejected", value: String(rows.filter((r) => r.status === "Rejected").length), icon: AlertCircle, color: COLORS.danger },
  ];

  const decide = (row, decision) => {
    const updated = rows.map((r) => (r.guid === row.guid ? { ...r, status: decision } : r));
    setRows(updated);
    lsSet(LS_PROJECT_APPROVALS, updated);
    logAudit("Project Approval", decision === "Approved" ? "Approve" : "Reject", row.projectName);
    setToast(`Project ${decision.toLowerCase()}.`);
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Project Approval</div>
          <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Approve or reject new project requests (stored locally — not yet on SQL)</div>
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Requests <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span></div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 220 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by project or requester" style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }} />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 150, padding: "7px 11px" }}>
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {["Project", "Requested By", "Deal Value", "Status","Actions"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5}><EmptyState icon={FileCheck} /></td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.guid} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{r.projectName}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.requestedBy}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.dealValue}</td>
                  <td style={{ padding: "11px 16px" }}><StatusBadge active={r.status === "Approved"} /></td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    {r.status === "Pending" ? (
                      <div style={{ display: "inline-flex", gap: 8 }}>
                        <button onClick={() => decide(r, "Approved")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.successSoft, color: COLORS.success, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                          <CheckCircle2 size={12} /> Approve
                        </button>
                        <button onClick={() => decide(r, "Rejected")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.dangerSoft, color: COLORS.danger, border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                          <X size={12} /> Reject
                        </button>
                      </div>
                    ) : <span style={{ fontSize: 12.5, color: COLORS.textMuted }}>{r.status}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", background: COLORS.text, color: "#fff", padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 30px rgba(0,0,0,0.2)" }}>
          <CheckCircle2 size={15} color={COLORS.success} /> {toast}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   AUDIT LOG (Audits) — localStorage only. Captures every Create /
   Update / Delete / Approve / Reject done across the app via
   logAudit(), with filters by employee, screen, action and date.
   ============================================================ */
function AuditLogPage() {
  // Older audit entries may have stored the full session object
  // { username, loginTime } as `user`. Normalize to a string so
  // React never tries to render an object as a child.
  const normalizeAuditRows = (list) =>
    (Array.isArray(list) ? list : []).map((r) => ({
      ...r,
      user:
        typeof r.user === "object" && r.user !== null
          ? r.user.username || r.user.name || "Administrator"
          : r.user || "Administrator",
    }));

  const [rows, setRows] = useState(() => normalizeAuditRows(lsGet(LS_AUDIT_LOG, [])));
  const [search, setSearch] = useState("");
  const [screenFilter, setScreenFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortDir, setSortDir] = useState("desc"); // desc = newest first
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = () => setRows(normalizeAuditRows(lsGet(LS_AUDIT_LOG, [])));

  const screenOptions = Array.from(new Set(rows.map((r) => r.screen))).sort();
  const actionOptions = Array.from(new Set(rows.map((r) => r.action))).sort();
  const userOptions = Array.from(new Set(rows.map((r) => r.user))).sort();

  const filtered = rows
    .filter((r) => {
      const q = search.toLowerCase();
      const matchesSearch = (r.record || "").toLowerCase().includes(q) || (r.screen || "").toLowerCase().includes(q);
      const matchesScreen = !screenFilter || r.screen === screenFilter;
      const matchesAction = !actionFilter || r.action === actionFilter;
      const matchesUser = !userFilter || r.user === userFilter;
      const t = new Date(r.timestamp).getTime();
      const matchesFrom = !dateFrom || t >= new Date(dateFrom).getTime();
      const matchesTo = !dateTo || t <= new Date(dateTo).getTime() + 86399999;
      return matchesSearch && matchesScreen && matchesAction && matchesUser && matchesFrom && matchesTo;
    })
    .sort((a, b) => {
      const diff = new Date(a.timestamp) - new Date(b.timestamp);
      return sortDir === "desc" ? -diff : diff;
    });

  const clearLog = () => {
    lsSet(LS_AUDIT_LOG, []);
    setRows([]);
    setConfirmClear(false);
  };

  const actionColor = (action) => {
    if (action === "Delete" || action === "Reject") return COLORS.danger;
    if (action === "Create" || action === "Approve") return COLORS.success;
    return COLORS.accent;
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, padding: 26, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Audit Log</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13.5 }}>Every Create, Update, Delete and Approval across the app (stored locally on this device)</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={refresh} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.text }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={() => setConfirmClear(true)} style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: COLORS.dangerSoft, color: COLORS.danger, borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              <Trash2 size={13} /> Clear Log
            </button>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 14, color: COLORS.text }}>
              <Filter size={14} color={COLORS.textMuted} /> Entries <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>({filtered.length})</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 11px", width: 180 }}>
                <Search size={14} color={COLORS.textMuted} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search record" style={{ border: "none", outline: "none", fontSize: 13, width: "100%", fontFamily: "Inter, sans-serif" }} />
              </div>
              <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={{ ...inputStyle, width: 150, padding: "7px 11px" }}>
                <option value="">All Employees</option>
                {userOptions.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <select value={screenFilter} onChange={(e) => setScreenFilter(e.target.value)} style={{ ...inputStyle, width: 160, padding: "7px 11px" }}>
                <option value="">All Screens</option>
                {screenOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={{ ...inputStyle, width: 140, padding: "7px 11px" }}>
                <option value="">All Actions</option>
                {actionOptions.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...inputStyle, width: 140, padding: "7px 11px" }} />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...inputStyle, width: 140, padding: "7px 11px" }} />
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                <th
                  onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
                  style={{ textAlign: "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                >
                  Timestamp <ArrowUpDown size={11} />
                </th>
                {["Screen", "Action", "Record", "Employee"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "10px 16px", fontSize: 12, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5}><EmptyState icon={ScrollText} /></td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.guid} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "#FAFBFD" : "#fff" }}>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: COLORS.textMuted, whiteSpace: "nowrap" }}>{new Date(r.timestamp).toLocaleString()}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{r.screen}</td>
                  <td style={{ padding: "11px 16px" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: actionColor(r.action) }}>{r.action}</span>
                  </td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.record}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13.5, color: COLORS.text }}>{r.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmClear && (
        <ConfirmModal
          title="Clear the entire audit log?"
          message="All locally stored audit entries will be permanently removed from this device. This can't be undone."
          confirmLabel="Clear Log"
          busy={false}
          onCancel={() => setConfirmClear(false)}
          onConfirm={clearLog}
        />
      )}
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
  const SESSION_DURATION = 60 * 60 * 1000; // 1 hour

  // React state ALWAYS contains username string only
  const [user, setUser] = useState(() => {
    const session = lsGet(LS_CURRENT_USER, null);

    if (!session) return null;

    // Old format migration:
    // localStorage may previously have contained just "ProjectPulse"
    if (typeof session === "string") {
      const migrated = {
        username: session,
        loginTime: Date.now(),
      };

      lsSet(LS_CURRENT_USER, migrated);

      return session; // IMPORTANT: return STRING
    }

    // New session format
    if (
      typeof session === "object" &&
      session.username &&
      session.loginTime
    ) {
      const elapsed = Date.now() - session.loginTime;

      if (elapsed < SESSION_DURATION) {
        return session.username; // IMPORTANT: return STRING
      }
    }

    // Expired / invalid session
    localStorage.removeItem(LS_CURRENT_USER);
    return null;
  });

  const [page, setPage] = useState("dashboard");

  // Automatically logout when the 1-hour session expires
  useEffect(() => {
    if (!user) return;

    const session = lsGet(LS_CURRENT_USER, null);

    if (
      !session ||
      typeof session !== "object" ||
      !session.loginTime
    ) {
      return;
    }

    const elapsed = Date.now() - session.loginTime;
    const remaining = SESSION_DURATION - elapsed;

    if (remaining <= 0) {
      localStorage.removeItem(LS_CURRENT_USER);
      setUser(null);
      setPage("dashboard");
      return;
    }

    const timer = setTimeout(() => {
      localStorage.removeItem(LS_CURRENT_USER);
      setUser(null);
      setPage("dashboard");
    }, remaining);

    return () => clearTimeout(timer);
  }, [user]);

  const handleLogin = (username) => {
    const session = {
      username: username,
      loginTime: Date.now(),
    };

    // localStorage gets OBJECT
    lsSet(LS_CURRENT_USER, session);

    // React gets STRING
    setUser(username);

    setPage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem(LS_CURRENT_USER);
    setUser(null);
    setPage("dashboard");
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const inModuleShell = MODULES.some((m) => m.key === page);

  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: COLORS.bg,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <TopNav
        user={user}
        current={page}
        onNavigateHome={() => setPage("dashboard")}
        onOpenModule={(key) => setPage(key)}
        onLogout={handleLogout}
      />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {inModuleShell && (
          <ModuleSidebar current={page} onSelect={setPage} />
        )}

        {page === "dashboard" && (
          <DashboardHome onOpenModule={setPage} />
        )}

        {page === "department" && <DepartmentsPage />}
        {page === "country" && <CountryPage />}
        {page === "user" && <UsersPage />}
        {page === "project-category" && <ProjectCategoryPage />}
        {page === "roles" && <RolesPage />}
        {page === "billing-type" && <BillingTypePage />}
        {page === "project-deal-status" && <DealStatusPage />}
        {page === "client" && <ClientPage />}
        {page === "approval-status" && <ApprovalStatusPage />}
        {page === "project-status" && <ProjectStatusPage />}
        {page === "invoice-status" && <InvoiceStatusPage />}
        {page === "user-roles" && <UserRolesPage />}

        {page === "project-dashboard" && (
          <ProjectDashboardPage />
        )}

        {page === "resource-allocation" && (
          <ResourceAllocationPage />
        )}

        {page === "timesheet-approval" && (
          <TimesheetApprovalPage />
        )}

        {page === "project-approval" && (
          <ProjectApprovalPage />
        )}

        {page === "audit-log" && <AuditLogPage />}
{page === "link-invoice" && <LinkInvoicePage />}
{page === "pipeline-project" && <PipelineProjectPage />}
{page === "project-resources-txn" && <ProjectResourcesTxnPage />}
{page === "project-document" && <ProjectDocumentPage />}
{inModuleShell &&
  ![
    "department", "country", "user", "project-category", "roles", "billing-type",
    "project-deal-status", "client", "approval-status", "project-status",
    "invoice-status", "user-roles", "project-dashboard", "resource-allocation",
    "timesheet-approval", "project-approval", "audit-log",
    "link-invoice", "pipeline-project", "project-resources-txn", "project-document",
  ].includes(page) && <ModuleStub moduleKey={page} />}
      </div>

      <style>{`
        .spin {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        * {
          box-sizing: border-box;
        }
      `}</style>
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
