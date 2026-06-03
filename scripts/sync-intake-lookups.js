#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const rootDir = path.resolve(__dirname, "..");
const workbookPath = path.join(rootDir, "data", "intake-lookups.xlsx");
const outputPath = path.join(rootDir, "src", "_data", "intake-lookups.json");

const starterWorkbook = {
  Employees: [
    ["Employee ID", "Display Name", "Email", "Active", "Project Manager", "Managing Principal"],
    ["E-1001", "Jordan Lee", "jordan.lee@example.com", "TRUE", "TRUE", "FALSE"],
    ["E-1002", "Taylor Morgan", "taylor.morgan@example.com", "TRUE", "FALSE", "TRUE"],
    ["E-1003", "Casey Rivera", "casey.rivera@example.com", "TRUE", "TRUE", "FALSE"]
  ],
  Organizations: [
    ["Organization", "Active"],
    ["Tandem DET", "TRUE"],
    ["Tandem CAN", "TRUE"],
    ["Baird AE", "TRUE"],
    ["A3C", "TRUE"]
  ],
  Clients: [
    ["Primary Client", "Active"],
    ["Atlas Manufacturing", "TRUE"],
    ["North Plant Operations", "TRUE"],
    ["River City Packaging", "TRUE"]
  ],
  Vendors: [
    ["Vendor ID", "Vendor Name", "Category", "Contact", "Terms", "Status", "Active"],
    ["V-10014", "Acme Promotional Products", "Promotional", "orders@acmepromo.example", "Net 30", "Active", "TRUE"],
    ["V-10208", "Brightline Print Services", "Print", "accounting@brightline.example", "Net 15", "Active", "TRUE"],
    ["V-10442", "Compass Office Supply", "Office Supply", "support@compass.example", "Net 30", "Active", "TRUE"],
    ["V-10719", "Northstar Technical Staffing", "Professional Services", "deltek@northstar.example", "Net 45", "Active", "TRUE"],
    ["V-11063", "Summit Hardware and Safety", "Materials", "sales@summiths.example", "Net 30", "Active", "TRUE"],
    ["V-11501", "Keystone Logistics", "Freight", "dispatch@keystone.example", "Net 20", "Active", "TRUE"],
    ["V-11877", "Harbor Event Rentals", "Events", "team@harborrentals.example", "Due on receipt", "Active", "TRUE"],
    ["V-12005", "Pinnacle Software Group", "Software", "billing@pinnaclesg.example", "Annual", "Active", "TRUE"]
  ]
};

main();

function main() {
  const args = new Set(process.argv.slice(2));

  if (args.has("--init")) {
    writeStarterWorkbook(args.has("--force"));
  }

  if (!fs.existsSync(workbookPath)) {
    fail([
      `Lookup workbook not found: ${workbookPath}`,
      "Run `npm run init-lookups` to create a starter workbook, then update it in Excel."
    ]);
  }

  const workbook = XLSX.readFile(workbookPath);
  const lookups = buildLookups(workbook);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(lookups, null, 2)}\n`);

  console.log(`Synced lookup workbook to ${path.relative(rootDir, outputPath)}`);
  console.log([
    `${lookups.projectManagers.length} project manager(s)`,
    `${lookups.managingPrincipals.length} managing principal(s)`,
    `${lookups.organizations.length} organization(s)`,
    `${lookups.primaryClients.length} primary client(s)`,
    `${lookups.vendors.length} vendor(s)`
  ].join(", "));
}

function writeStarterWorkbook(force) {
  if (fs.existsSync(workbookPath) && !force) {
    fail([
      `Lookup workbook already exists: ${workbookPath}`,
      "Use `npm run init-lookups -- --force` only if you want to overwrite it."
    ]);
  }

  fs.mkdirSync(path.dirname(workbookPath), { recursive: true });
  const workbook = XLSX.utils.book_new();

  Object.entries(starterWorkbook).forEach(([sheetName, rows]) => {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = rows[0].map((header) => ({ wch: Math.max(14, String(header).length + 4) }));
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  });

  XLSX.writeFile(workbook, workbookPath);
  console.log(`Created starter lookup workbook at ${path.relative(rootDir, workbookPath)}`);
}

function buildLookups(workbook) {
  const employees = activeRows(sheetRows(workbook, "Employees"))
    .map((row) => ({
      name: pick(row, ["displayname", "name", "employee", "employeename"]),
      projectManager: flag(row, ["projectmanager", "canbeprojectmanager"], true),
      managingPrincipal: flag(row, ["managingprincipal", "canbemanagingprincipal"], true)
    }))
    .filter((employee) => employee.name);

  return {
    employees: unique(employees.map((employee) => employee.name)),
    projectManagers: unique(employees.filter((employee) => employee.projectManager).map((employee) => employee.name)),
    managingPrincipals: unique(employees.filter((employee) => employee.managingPrincipal).map((employee) => employee.name)),
    organizations: unique(activeRows(sheetRows(workbook, "Organizations"))
      .map((row) => pick(row, ["organization", "organizationname", "name"]))),
    primaryClients: unique(activeRows(sheetRows(workbook, "Clients"))
      .map((row) => pick(row, ["primaryclient", "client", "clientname", "name"]))),
    vendors: activeRows(sheetRows(workbook, "Vendors"))
      .map((row) => ({
        id: pick(row, ["vendorid", "id"]),
        name: pick(row, ["vendorname", "name"]),
        category: pick(row, ["category", "vendorcategory"]),
        contact: pick(row, ["contact", "email", "vendorcontact"]),
        terms: pick(row, ["terms", "paymentterms"]),
        status: pick(row, ["status"]) || "Active"
      }))
      .filter((vendor) => vendor.id && vendor.name)
  };
}

function sheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false })
    .map(normalizeRow)
    .filter((row) => Object.values(row).some((value) => value !== ""));
}

function normalizeRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    normalizeKey(key),
    typeof value === "string" ? value.trim() : String(value ?? "").trim()
  ]));
}

function activeRows(rows) {
  return rows.filter((row) => {
    const active = pick(row, ["active"]);
    if (active) return truthy(active);

    const status = pick(row, ["status"]);
    return status ? !["inactive", "disabled", "archived", "closed"].includes(status.toLowerCase()) : true;
  });
}

function pick(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== "") return value;
  }

  return "";
}

function flag(row, keys, defaultValue) {
  const value = pick(row, keys);
  return value === "" ? defaultValue : truthy(value);
}

function truthy(value) {
  return ["1", "true", "yes", "y", "active"].includes(String(value).trim().toLowerCase());
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeKey(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fail(lines) {
  console.error(lines.join("\n"));
  process.exit(1);
}
