const lookups = require("./intake-lookups.json");

const projectManagers = lookups.projectManagers || lookups.employees || [];
const managingPrincipals = lookups.managingPrincipals || lookups.employees || [];
const deltekClients = lookups.primaryClients || [];
const internalOrganizations = lookups.organizations || [];
const probabilityOptions = ["0%", "10%", "20%", "30%", "40%", "50%", "60%", "70%", "80%", "90%", "100%"];
const supplierMarkupOptions = ["10%", "11%", "12%", "13%", "14%", "15%", "16%", "17%", "18%", "19%", "20%"];
const vendors = lookups.vendors || [];
const supplierOptions = vendors.map((vendor) => `${vendor.name} (${vendor.id})`);

module.exports = {
  types: [
    { key: "Opportunity", short: "OPP" },
    { key: "Project", short: "PRJ" },
    { key: "Supplier PO", short: "PO" }
  ],
  vendors,
  supplierSlots: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  commonFields: [
    { name: "requestTitle", label: "Title of Request", type: "text", required: true, full: true },
    { name: "projectManager", label: "Project Manager", type: "lookup", required: true, options: projectManagers },
    { name: "managingPrincipal", label: "Managing Principal", type: "lookup", required: true, options: managingPrincipals },
    { name: "organization", label: "Organization", type: "select", required: true, options: internalOrganizations },
    { name: "estimatedStartDate", label: "Estimated Start Date", type: "date", required: true, showFor: ["Opportunity", "Project"] },
    { name: "estimatedFinishDate", label: "Estimated finish date", type: "date", required: true, showFor: ["Opportunity", "Project"] }
  ],
  topFields: {
    "Opportunity": [
      { name: "opportunityCreatePromoProject", label: "Create a promo project?", type: "checkbox", checked: true, full: true }
    ],
    "Project": [
      { name: "projectCreatePromoProject", label: "Create a promo project?", type: "checkbox", checked: true, full: true }
    ]
  },
  specificFields: {
    "Opportunity": [
      { name: "opportunityName", label: "Opportunity name", type: "text", required: true },
      { name: "estimatedRevenue", label: "Est Revenue", type: "number", required: true, min: "0", step: "0.01" },
      { name: "probability", label: "Probability", type: "select", required: true, options: probabilityOptions },
      { name: "stage", label: "Stage", type: "select", required: true, options: ["preproposal", "proposal", "bid", "award", "pre-award"] },
      { name: "engineeringCategory", label: "Engineering category", type: "select", required: true, options: ["industrial", "automotive", "electrical", "mechanical", "structural", "conveyor", "controls"] },
      { name: "source", label: "Source", type: "select", required: true, options: ["Tradeshow", "bid", "government", "marketing", "other"] },
      { name: "opportunityNewClient", label: "New client?", type: "checkbox", full: true },
      { name: "primaryClient", label: "Existing client", type: "select", required: true, options: deltekClients, clientMode: "existing" },
      { name: "newClientName", label: "Client name", type: "text", required: true, clientMode: "new" },
      { name: "newClientPhone", label: "Client phone number", type: "tel", required: true, clientMode: "new" },
      { name: "newClientEmail", label: "Client email", type: "email", required: true, clientMode: "new" },
      { name: "mainContactName", label: "Main contact name", type: "text", required: true },
      { name: "mainContactPhone", label: "Main contact phone", type: "tel", required: true }
    ],
    "Project": [
      { name: "projectName", label: "Project name", type: "text", required: true },
      { name: "clientName", label: "Client", type: "text", required: true },
      { name: "contractType", label: "Contract type", type: "select", required: true, options: ["Firm Fixed Price", "Time and Materials", "Cost Plus", "Internal"] },
      { name: "supplierMarkupRate", label: "Supplier markup rate", type: "select", required: true, options: supplierMarkupOptions }
    ],
    "Supplier PO": [
      { name: "supplier", label: "Supplier", type: "select", required: true, options: supplierOptions },
      { name: "poDescription", label: "Description of PO", type: "textarea", required: true, full: true },
      { name: "amount", label: "Amount", type: "number", required: true, min: "0", step: "0.01" },
      { name: "paymentTerms", label: "Payment terms", type: "select", required: true, options: ["Net 30", "Net 45", "Net 90", "Pay when paid"] },
      { name: "mainContact", label: "Main contact", type: "text", required: true },
      { name: "deliveryDate", label: "Delivery date", type: "date", required: true },
      { name: "deliverTo", label: "Deliver to", type: "text", required: true },
      { name: "glOrProjectCode", label: "GL or project code", type: "text", required: true }
    ]
  }
};
