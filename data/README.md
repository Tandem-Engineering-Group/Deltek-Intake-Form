# Intake Lookup Workbook

Edit `intake-lookups.xlsx` in Excel, then run:

```bash
npm run sync-lookups
```

The sync writes `src/_data/intake-lookups.json`, which the Eleventy site uses during `npm run build`.

## Sheets

Keep these sheet names exactly:

- `Employees`
- `Organizations`
- `Clients`
- `Vendors`

## Columns

`Employees`

```text
Employee ID | Display Name | Email | Active | Project Manager | Managing Principal
```

Use `TRUE` or `FALSE` for `Active`, `Project Manager`, and `Managing Principal`.

`Organizations`

```text
Organization | Active
```

`Clients`

```text
Primary Client | Acnpm tive
```

`Vendors`

```text
Vendor ID | Vendor Name | Category | Contact | Terms | Status | Active
```

Rows with `Active` set to `FALSE` are excluded from the webpage. If `Active` is blank, rows are included unless `Status` is `Inactive`, `Disabled`, `Archived`, or `Closed`.
