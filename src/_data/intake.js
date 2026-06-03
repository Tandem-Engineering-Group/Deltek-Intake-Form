// Populate these lookup lists from Deltek exports when available.
const employeeList = [];
const deltekClients = [];
const internalOrganizations = ["Tandem DET", "Tandem CAN", "Baird AE", "A3C"];
const probabilityOptions = ["0%", "10%", "20%", "30%", "40%", "50%", "60%", "70%", "80%", "90%", "100%"];

module.exports = {
  types: [
    { key: "Opportunity", short: "OPP" },
    { key: "Promo", short: "PRM" },
    { key: "Project", short: "PRJ" },
    { key: "Supplier PO", short: "PO" }
  ],
  vendorTypes: ["Promo", "Supplier PO"],
  vendors: [
    { id: "V-10014", name: "Acme Promotional Products", category: "Promotional", contact: "orders@acmepromo.example", terms: "Net 30", status: "Active" },
    { id: "V-10208", name: "Brightline Print Services", category: "Print", contact: "accounting@brightline.example", terms: "Net 15", status: "Active" },
    { id: "V-10442", name: "Compass Office Supply", category: "Office Supply", contact: "support@compass.example", terms: "Net 30", status: "Active" },
    { id: "V-10719", name: "Northstar Technical Staffing", category: "Professional Services", contact: "deltek@northstar.example", terms: "Net 45", status: "Active" },
    { id: "V-11063", name: "Summit Hardware and Safety", category: "Materials", contact: "sales@summiths.example", terms: "Net 30", status: "Active" },
    { id: "V-11501", name: "Keystone Logistics", category: "Freight", contact: "dispatch@keystone.example", terms: "Net 20", status: "Active" },
    { id: "V-11877", name: "Harbor Event Rentals", category: "Events", contact: "team@harborrentals.example", terms: "Due on receipt", status: "Active" },
    { id: "V-12005", name: "Pinnacle Software Group", category: "Software", contact: "billing@pinnaclesg.example", terms: "Annual", status: "Active" }
  ],
  commonFields: [
    { name: "requestTitle", label: "Title of Request", type: "text", required: true, full: true },
    { name: "projectManager", label: "Project Manager", type: "lookup", required: true, options: employeeList },
    { name: "managingPrincipal", label: "Managing Principal", type: "lookup", required: true, options: employeeList },
    { name: "organization", label: "Organization", type: "select", required: true, options: internalOrganizations },
    { name: "estimatedStartDate", label: "Estimated Start Date", type: "date", required: true },
    { name: "estimatedFinishDate", label: "Estimated finish date", type: "date", required: true }
  ],
  specificFields: {
    "Opportunity": [
      { name: "opportunityName", label: "Opportunity name", type: "text", required: true },
      { name: "estimatedRevenue", label: "Est Revenue", type: "number", required: true, min: "0", step: "0.01" },
      { name: "probability", label: "Probability", type: "select", required: true, options: probabilityOptions },
      { name: "stage", label: "Stage", type: "select", required: true, options: ["preproposal", "proposal", "bid", "award", "pre-award"] },
      { name: "engineeringCategory", label: "Engineering category", type: "select", required: true, options: ["industrial", "automotive", "electrical", "mechanical", "structural", "conveyor", "controls"] },
      { name: "source", label: "Source", type: "select", required: true, options: ["Tradeshow", "bid", "government", "marketing", "other"] },
      { name: "primaryClient", label: "Primary client", type: "lookup", required: true, options: deltekClients }
    ],
    "Promo": [
      { name: "campaignName", label: "Campaign or event", type: "text", required: true },
      { name: "itemDescription", label: "Item description", type: "text", required: true },
      { name: "quantity", label: "Quantity", type: "number", required: true, min: "1", step: "1" },
      { name: "inHandsDate", label: "In-hands date", type: "date", required: true },
      { name: "budget", label: "Budget", type: "number", required: true, min: "0", step: "0.01" },
      { name: "shipTo", label: "Ship to", type: "text", required: true, full: true }
    ],
    "Project": [
      { name: "projectName", label: "Project name", type: "text", required: true },
      { name: "clientName", label: "Client", type: "text", required: true },
      { name: "projectCode", label: "Project or charge code", type: "text", required: true },
      { name: "contractType", label: "Contract type", type: "select", required: true, options: ["Firm Fixed Price", "Time and Materials", "Cost Plus", "Internal"] }
    ],
    "Supplier PO": [
      { name: "poDescription", label: "PO description", type: "text", required: true, full: true },
      { name: "amount", label: "Amount", type: "number", required: true, min: "0", step: "0.01" },
      { name: "buyer", label: "Buyer", type: "text", required: true },
      { name: "deliveryDate", label: "Delivery date", type: "date", required: true },
      { name: "deliverTo", label: "Deliver to", type: "text", required: true },
      { name: "glOrProjectCode", label: "GL or project code", type: "text", required: true }
    ]
  }
};
