# NickPharma — Ejecución Local

## Requisitos
- Node.js 18+ o Bun

## Pasos
1. `npm install` (o `bun install`)
2. `npx prisma generate`
3. `npx prisma db push`
4. `npx prisma db seed`
5. `npm run dev`
6. Abrir http://localhost:3000

## Cuentas Demo
| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@nickpharma.com | admin123 |
| Supervisor | supervisor@nickpharma.com | super123 |
| Cajero | cajero@nickpharma.com | cajero123 |
| Farmacéutico | farmaceutico@nickpharma.com | farma123 |

## Notas
- La DB SQLite está incluida en `db/custom.db`
- El `.env` usa path relativo `file:./db/custom.db`
- Para producción, cambiar NEXTAUTH_SECRET
