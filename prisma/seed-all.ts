import { execSync } from "child_process";

async function main() {
  console.log("🚀 Iniciando siembra completa de base de datos...\n");

  try {
    console.log("--- 1/3: Categorías, Productos, Lotes y Ventas ---");
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });

    console.log("\n--- 2/3: Usuarios y Roles ---");
    execSync("npx tsx prisma/seed-users.ts", { stdio: "inherit" });

    console.log("\n--- 3/3: Proveedores u Órdenes de Compra ---");
    execSync("npx tsx prisma/seed-suppliers.ts", { stdio: "inherit" });

    console.log("\n🎉 ¡Todos los datos de prueba han sido creados correctamente!");
  } catch (error) {
    console.error("❌ Error durante la ejecución del seed:", error);
    process.exit(1);
  }
}

main();
