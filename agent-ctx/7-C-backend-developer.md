# Task ID: 7-C — Audit log integration in 6 API routes

**Agent**: Backend Developer
**Task**: Add `auditLog` calls to 6 API routes after successful operations

## Work Log

- Read `/home/z/my-project/worklog.md` to understand previous context (VitaliaPOS/NickPharma pharmacy system, tasks 0-6 completed).
- Read `/home/z/my-project/src/lib/audit.ts` to verify `auditLog` signature: `{ userId?, userName, action, entityType, entityId?, description, metadata? }` → writes to `db.auditLog` (catches errors internally, returns void).
- Read all 6 target files and verified their current state (variable names, session destructuring, return statements).

### Files modified

1. **`src/app/api/users/route.ts`** (POST)
   - Added `import { auditLog } from "@/lib/audit";` after `createUserSchema` import.
   - POST handler already destructured `session` from `requirePermission("users:manage")`.
   - Added `auditLog({ action: "user.create", entityType: "user", entityId: user.id, description: \`Usuario creado: ${data.email} (${data.role})\`, metadata: { email, role, name } })` after `db.user.create` and before `NextResponse.json`.
   - **Note**: Spec template referenced `body.email`/`body.role`/`body.name`, but the file uses `data` (from `validateBody(createUserSchema, req)`). Used `data.*` to match the actual variable in scope (avoiding a `no-undef` lint error).

2. **`src/app/api/users/[id]/route.ts`** (PATCH)
   - Added import for `auditLog`.
   - PATCH handler already destructured `session`.
   - Added `auditLog({ action: "user.update", entityId: id, description: \`Usuario actualizado: ${updated.email}\`, metadata: { fields: Object.keys(data) } })` after `db.user.update`.

3. **`src/app/api/customers/route.ts`** (POST)
   - Added import for `auditLog`.
   - POST handler did NOT destructure `session` — changed `const { response } = await requirePermission(...)` to `const { session, response } = await requirePermission(...)` in the POST handler only (GET handler left untouched since it doesn't need session).
   - Added `auditLog({ action: "customer.create", entityType: "customer", entityId: customer.id, description: \`Cliente creado: ${body.fullName}\`, metadata: { fullName: body.fullName, document: body.document } })`. File uses `body` (from `req.json()`), so spec template matched.

4. **`src/app/api/customers/[id]/route.ts`** (PATCH)
   - Added import for `auditLog`.
   - PATCH handler did NOT destructure `session` — added `session` to destructure.
   - Added `auditLog({ action: "customer.update", entityType: "customer", entityId: id, description: \`Cliente actualizado: ${updated.fullName}\`, metadata: { fields: Object.keys(updateData) } })` after `db.customer.update`.

5. **`src/app/api/cash-shifts/route.ts`** (POST — open shift)
   - Added import for `auditLog`.
   - POST handler already destructured `session`.
   - Added `auditLog({ action: "cash.open", entityType: "cash", entityId: shift.id, description: \`Turno abierto · Apertura: ${data.openingAmount}\`, metadata: { openingAmount: data.openingAmount } })`.
   - **Note**: Spec referenced `body.openingAmount`, but the file uses `data` (from `validateBody(openSchema, req)`). Used `data.openingAmount`.

6. **`src/app/api/cash-shifts/[id]/close/route.ts`** (POST — close shift)
   - Added import for `auditLog`.
   - POST handler already destructured `session`.
   - The close handler returns `{ shift: closed, message, expectedAmount, difference }` — there was no `result` variable in scope. Per the spec template, added `const result = { closingAmount: closed.closingAmount, expectedAmount, difference };` immediately after `db.cashShift.update`, then used `result.difference`, `result.closingAmount`, `result.expectedAmount` in the auditLog metadata as specified. The existing `return NextResponse.json(...)` statement was left untouched (no logic change).
   - Added `auditLog({ action: "cash.close", entityType: "cash", entityId: id, description: \`Turno cerrado · Diferencia: ${result.difference ?? 0}\`, metadata: { closingAmount: result.closingAmount, expectedAmount: result.expectedAmount, difference: result.difference } })`.

### Verification

- `bun run lint` → exit code 0 (0 errors, 0 warnings).
- Dev log: only pre-existing `NO_SECRET` next-auth warnings (unrelated to this task).
- No logic modified — only imports, one `session` destructuring in two files, the `result` constant in close-route (new local const, no change to existing return), and the six `auditLog` calls.
- All `auditLog` calls use `userId: (session!.user as any).id` and `userName: session!.user?.name ?? "Usuario"` per spec.

## Stage Summary

- 6 API routes now emit audit log entries on success: `user.create`, `user.update`, `customer.create`, `customer.update`, `cash.open`, `cash.close`.
- 2 files (`customers/route.ts` POST and `customers/[id]/route.ts` PATCH) had their `requirePermission` destructuring extended to include `session`.
- Close-shift route now constructs a local `result` object so the spec's `result.difference` / `result.closingAmount` / `result.expectedAmount` references resolve correctly.
- Lint clean. No changes to existing control flow, validation, or response payloads.
