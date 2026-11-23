# 01 · Database and Emulators

[Localhost index](README.md) · Next: [Backend and access](02-backend-authentication-and-permissions.md)

## Start when

The stack alignment is complete and the owner approves the local database foundation. Read the [database guide](../../../development/database.md) before designing the first schema.

## Tools and steps

1. Use the Firebase CLI and [SQL Connect Emulator](https://firebase.google.com/docs/sql-connect/data-connect-emulator-suite) with its integrated PGlite database. Configure local SQL Connect, Auth, and Storage emulators under the same demo project ID. Use an explicit emulator configuration that cannot fall back to a shared Firebase project.
2. Add a versioned schema and connectors for staff identity and roles, customer, contract, receipt, and audit records. Keep internal database keys separate from official customer, contract, VIP, IGP, and receipt identifiers.
3. Declare required relationships and unique constraints. For money, choose an exact representation compatible with PostgreSQL, the connector, and the API, and test its round trip. Use Manila business dates for business-day decisions and preserve separately the actual timestamps of actions.
4. Generate typed **server** connector bindings from the reviewed schema. Seed known fake staff, customer, contract, and receipt relationships with a repeatable seed procedure. Keep seed and reset operations scoped to the disposable test environment.

## Verify

Start clean, deploy the local schema, run the seed twice, and check the same expected record count. Verify that a receipt can't point to a missing contract, duplicate official receipts are rejected under the approved uniqueness rules, and exact money and date values survive a write/read cycle. Rehearse the same schema changes in staging before any production use.
