  /* ============================================================
    POWER AUTOMATE FLOW INTEGRATION — shared by App.jsx and
    ProjectAllocation.jsx. Pulled into its own file so both can
    import it without a circular import between the two.

    Real HTTP-triggered flow. In dev, calls go through the Vite
    proxy path "/flow" (see vite.config.js) to avoid CORS; in
    production point this at your own proxy/Azure Function.

    ONE flow serves every master-data module via an "entity"
    switch. Paste this into the flow trigger's "Request Body
    JSON Schema":

    {
      "type": "object",
      "properties": {
        "entity": { "type": "string" },
        "guid": { "type": ["integer", "null"] },
        "action": { "type": "string" },
        "code": { "type": "string" },
        "name": { "type": "string" },
        "active": { "type": "boolean" },
        "empId": { "type": "string" },
        "firstName": { "type": "string" },
        "lastName": { "type": "string" },
        "gender": { "type": "string" },
        "jobTitle": { "type": "string" },
        "departmentId": { "type": "integer" },
        "projectCode": { "type": "string" },
        "projectName": { "type": "string" },
        "categoryId": { "type": "integer" },
        "clientId": { "type": "integer" },
        "billingTypeId": { "type": "integer" },
        "dealStatusId": { "type": ["integer", "null"] },
        "startDate": { "type": "string" },
        "endDate": { "type": "string" },
        "projectId": { "type": "integer" },
        "userId": { "type": "integer" },
        "roleId": { "type": "integer" },
        "allocationPct": { "type": "number" },
        "weeklyHours": { "type": "number" },
        "billable": { "type": "boolean" },
        "clientCode": { "type": "string" },
        "clientName": { "type": "string" },
        "countryId": { "type": ["integer", "null"] },
        "contactGuid": { "type": ["integer", "null"] },
        "contactName": { "type": "string" },
        "contactEmail": { "type": ["string", "null"] },
        "contactPhone": { "type": ["string", "null"] }
      }
    }

    ENTITY VALUES (must match exactly — case-sensitive, checked
    against the flow's outer Switch_on_Entity "case" values):
      "Department" | "Country" | "ProjectCategory" | "Role" |
      "DealStatus" | "BillingType" | "Client" | "ClientContacts" |
      "User" | "Project" | "ProjectResource"

    RESPONSE SHAPES (what each entity's Select action actually
    returns — these are NOT uniform, so each wrapper below reads
    the exact keys its own flow branch produces):
      Department      -> "Department Code","Department Name","Status","guid"
      Country         -> "CountryCode","CountryName","IsActive","guid"
      ProjectCategory -> "CategoryCode","CategoryName","IsActive","guid"
      Role            -> "RoleCode","RoleName","IsActive","guid"
      DealStatus      -> "guid","name","active"                 (no code)
      BillingType     -> "guid","code","name","active"
      Client          -> "guid","clientCode","clientName","countryId","active"
      ClientContacts  -> "guid","clientId","contactName","contactEmail","contactPhone","active"
      User            -> "UserID","EmpID","FirstName","LastName","Gender","JobTitle","DepartmentID","IsActive"
      Project         -> "guid","projectCode","projectName","categoryId","clientId","billingTypeId","dealStatusId","startDate","endDate","active"
      ProjectResource -> "guid","projectId","userId","roleId","allocationPct","weeklyHours","billable","startDate","endDate"
    ============================================================ */

  // The app always calls the relative "/flow" path. In dev, Vite's
  // proxy (vite.config.js) forwards it. In production, a redirect
  // rule does the same job — so no code branching is needed.
  export const FLOW_URL = "/flow";

  // If the network/proxy silently hangs (misconfigured proxy, dropped
  // connection, corporate SSL interception, etc.) fetch's promise can sit
  // pending forever — which is why "Loading…" screens never resolve.
  // This timeout guarantees every call either succeeds or rejects.
  const FLOW_TIMEOUT_MS = 20000;

  async function postFlow(body, label) {
    // Several trigger-schema fields (clientId, departmentId, categoryId,
    // billingTypeId, projectId, userId, roleId, ...) are typed as strict
    // "integer" with no "null" option. Sending an explicit null for those
    // fails schema validation with a 400 TriggerInputSchemaMismatch.
    // Omitting the key entirely is safe for every field, nullable or not —
    // triggerBody()?['x'] returns null either way when the key is absent.
    const cleanBody = {};
    for (const [k, v] of Object.entries(body)) {
      if (v !== null) cleanBody[k] = v;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FLOW_TIMEOUT_MS);

    let res;
    try {
      res = await fetch(FLOW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanBody),
        signal: controller.signal,
      });
    } catch (e) {
      if (e.name === "AbortError") {
        throw new Error(`Flow request timed out after ${FLOW_TIMEOUT_MS / 1000}s — check the dev proxy / network connection.`);
      }
      throw new Error(`Network error calling flow: ${e.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Flow returned ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
    }
    const json = await res.json();
    if (import.meta.env?.DEV) console.log(`Flow raw response [${label}]:`, json);
    // Response body is the array produced by the flow's Select action —
    // but stay defensive in case it's ever wrapped.
    return Array.isArray(json) ? json : (json.body || json.data || json.value || []);
  }

  function normGuid(v) {
    return v === "" || v === null || v === undefined ? "" : Number(v);
  }
  function toGuidParam(guid) {
    // "guid" is a plain integer identity column, not a string GUID —
    // 0/null means "no id yet" (CREATE/LIST), a real positive integer for EDIT/DELETE.
    return guid === "" || guid === null || guid === undefined ? null : Number(guid);
  }

  /* ============================================================
    GENERIC code / name / active ENTITIES
    Department, Country, ProjectCategory, Role, DealStatus,
    BillingType. Each Select renames columns differently, so a
    small per-entity field map does the translation into the
    uniform { id, guid, code, name, active } shape the grids use.
    ============================================================ */
  const ENTITY_FIELD_MAP = {
    Department: { codeCol: "Department Code", nameCol: "Department Name", activeCol: "Status" },
    Country: { codeCol: "CountryCode", nameCol: "CountryName", activeCol: "IsActive" },
    ProjectCategory: { codeCol: "CategoryCode", nameCol: "CategoryName", activeCol: "IsActive" },
    Role: { codeCol: "RoleCode", nameCol: "RoleName", activeCol: "IsActive" },
    DealStatus: { codeCol: null, nameCol: "name", activeCol: "active" },
    BillingType: { codeCol: "code", nameCol: "name", activeCol: "active" },
  };

  export function callMasterDataFlow(entity, action, item = {}) {
    const body = {
      entity,
      guid: toGuidParam(item.guid),
      action,
      code: item.code || "",
      name: item.name || "",
      active: !!item.active,
    };

    return postFlow(body, entity).then((list) => {
      const { codeCol, nameCol, activeCol } = ENTITY_FIELD_MAP[entity];
      const normalized = list.map((d, i) => {
        const guid = normGuid(d.guid ?? d.id);
        return {
          id: guid !== "" ? guid : (codeCol ? d[codeCol] : String(i)),
          guid,
          code: (codeCol ? d[codeCol] : "") ?? "",
          name: d[nameCol] ?? "",
          active: !!(d[activeCol] ?? false),
        };
      });
      return { success: true, data: normalized };
    });
  }

  export const callDepartmentFlow = (action, department) => callMasterDataFlow("Department", action, department);
  export const callCountryFlow = (action, country) => callMasterDataFlow("Country", action, country);
  export const callProjectCategoryFlow = (action, category) => callMasterDataFlow("ProjectCategory", action, category);
  export const callRoleFlow = (action, role) => callMasterDataFlow("Role", action, role);
  export const callBillingTypeFlow = (action, billingType) => callMasterDataFlow("BillingType", action, billingType);
  export const callDealStatusFlow = (action, dealStatus) => callMasterDataFlow("DealStatus", action, dealStatus);

  /* ============================================================
    USER FLOW — entity="User". Own field set (EmpID, FirstName,
    LastName, Gender, JobTitle, DepartmentID) instead of the
    generic code/name/active shape. Select keeps original
    PascalCase column names.
    ============================================================ */
  export function callUserFlow(action, item = {}) {
    const body = {
      entity: "User",
      guid: toGuidParam(item.guid),
      action,
      empId: item.empId || "",
      firstName: item.firstName || "",
      lastName: item.lastName || "",
      gender: item.gender || "",
      jobTitle: item.jobTitle || "",
      departmentId: item.departmentId ? Number(item.departmentId) : null,
      active: !!item.active,
    };

    return postFlow(body, "User").then((list) => {
      const normalized = list.map((d, i) => {
        const guid = normGuid(d.UserID);
        return {
          id: guid !== "" ? guid : String(i),
          guid,
          empId: d.EmpID ?? "",
          firstName: d.FirstName ?? "",
          lastName: d.LastName ?? "",
          gender: d.Gender ?? "",
          jobTitle: d.JobTitle ?? "",
          departmentId: d.DepartmentID ?? "",
          active: !!(d.IsActive ?? false),
        };
      });
      return { success: true, data: normalized };
    });
  }

  /* ============================================================
    CLIENT FLOW — entity="Client". Own field set (ClientCode,
    ClientName, CountryId, IsActive) — NOT the generic code/name
    shape, since the Select renames to clientCode/clientName
    (lowercase c) rather than the plain code/name used elsewhere.
    Normalized here to { id, guid, code, name, countryId, active }
    so ClientPage in App.jsx can treat it the same way as the
    other master screens.
    ============================================================ */
  export function callClientFlow(action, item = {}) {
    const body = {
      entity: "Client",
      guid: toGuidParam(item.guid),
      action,
      clientCode: item.code || "",
      clientName: item.name || "",
      countryId: item.countryId ? Number(item.countryId) : null,
      active: !!item.active,
    };

    return postFlow(body, "Client").then((list) => {
      const normalized = list.map((d, i) => {
        const guid = normGuid(d.guid);
        return {
          id: guid !== "" ? guid : String(i),
          guid,
          code: d.clientCode ?? "",
          name: d.clientName ?? "",
          countryId: d.countryId ?? "",
          active: !!(d.active ?? false),
        };
      });
      return { success: true, data: normalized };
    });
  }

  /* ============================================================
    CLIENT CONTACT FLOW — entity="ClientContacts" (plural — must
    match the flow's outer Switch case exactly). Own field set
    (ClientId, ContactName, Email, Phone, IsActive). Used together
    with callClientFlow to build the combined Client + Contact
    screen — save the Client first, then the Contact with the
    resulting ClientId (sequential Patch, same pattern as
    ScrClientMaster_1 in PowerApps).

    Request fields use contactEmail/contactPhone (per the flow's
    trigger schema); the normalized response is translated back
    to email/phone for convenience on the call site.
    ============================================================ */
  export function callClientContactFlow(action, item = {}) {
    const body = {
      entity: "ClientContacts",
      guid: toGuidParam(item.guid),
      action,
      clientId: item.clientId ? Number(item.clientId) : null,
      contactName: item.contactName || "",
      contactEmail: item.email || null,
      contactPhone: item.phone || null,
      active: !!item.active,
    };

    return postFlow(body, "ClientContacts").then((list) => {
      const normalized = list.map((d, i) => {
        const guid = normGuid(d.guid);
        return {
          id: guid !== "" ? guid : String(i),
          guid,
          clientId: d.clientId ?? "",
          contactName: d.contactName ?? "",
          email: d.contactEmail ?? "",
          phone: d.contactPhone ?? "",
          active: !!(d.active ?? false),
        };
      });
      return { success: true, data: normalized };
    });
  }

  /* ============================================================
    PROJECT FLOW — entity="Project". Own field set (ProjectCode,
    ProjectName, CategoryId, ClientId, BillingTypeId, DealStatusId,
    StartDate, EndDate, IsActive). The flow's Select already
    returns camelCase keys (guid, projectCode, projectName, ...),
    so normalization here is a straight pass-through with type
    coercion, not a column-name translation.

    NOTE: this LISTs/CREATEs/EDITs/DELETEs the Project header row
    only. Resources for a project come back separately via
    callProjectResourceFlow("LIST") — merge client-side by
    projectId (see ProjectAllocation.jsx's useProjectsWithResources).
    ============================================================ */
  export function callProjectFlow(action, item = {}) {
    const body = {
      entity: "Project",
      guid: toGuidParam(item.guid),
      action,
      projectCode: item.projectCode || "",
      projectName: item.projectName || "",
      categoryId: item.categoryId ? Number(item.categoryId) : null,
      clientId: item.clientId ? Number(item.clientId) : null,
      billingTypeId: item.billingTypeId ? Number(item.billingTypeId) : null,
      dealStatusId: item.dealStatusId ? Number(item.dealStatusId) : null,
      startDate: item.startDate || "",
      endDate: item.endDate || "",
      active: !!item.active,
    };

    return postFlow(body, "Project").then((list) => {
      const normalized = list.map((d, i) => {
        const guid = normGuid(d.guid);
        return {
          id: guid !== "" ? guid : String(i),
          guid,
          projectCode: d.projectCode ?? "",
          projectName: d.projectName ?? "",
          categoryId: d.categoryId ?? "",
          clientId: d.clientId ?? "",
          billingTypeId: d.billingTypeId ?? "",
          dealStatusId: d.dealStatusId ?? "",
          startDate: d.startDate ?? "",
          endDate: d.endDate ?? "",
          active: !!(d.active ?? false),
          resources: [], // filled in by callProjectResourceFlow, merged client-side
        };
      });
      return { success: true, data: normalized };
    });
  }

  /* ============================================================
    PROJECT RESOURCE FLOW — entity="ProjectResource". The
    allocation/junction table. Select returns camelCase keys
    (guid, projectId, userId, roleId, allocationPct, weeklyHours,
    billable, startDate, endDate) — pass-through normalization,
    same as Project.
    ============================================================ */
  export function callProjectResourceFlow(action, item = {}) {
    const body = {
      entity: "ProjectResource",
      guid: toGuidParam(item.guid),
      action,
      projectId: item.projectId ? Number(item.projectId) : null,
      userId: item.userId ? Number(item.userId) : null,
      roleId: item.roleId ? Number(item.roleId) : null,
      allocationPct: item.allocationPct !== undefined && item.allocationPct !== "" ? Number(item.allocationPct) : 0,
      weeklyHours: item.weeklyHours !== undefined && item.weeklyHours !== "" ? Number(item.weeklyHours) : 0,
      billable: !!item.billable,
      startDate: item.startDate || "",
      endDate: item.endDate || "",
    };

    return postFlow(body, "ProjectResource").then((list) => {
      const normalized = list.map((d, i) => {
        const guid = normGuid(d.guid);
        return {
          id: guid !== "" ? guid : String(i),
          guid,
          projectId: d.projectId ?? "",
          userId: d.userId ?? "",
          roleId: d.roleId ?? "",
          allocationPct: d.allocationPct ?? 0,
          weeklyHours: d.weeklyHours ?? 0,
          billable: !!(d.billable ?? false),
          startDate: d.startDate ?? "",
          endDate: d.endDate ?? "",
        };
      });
      return { success: true, data: normalized };
    });
  }
