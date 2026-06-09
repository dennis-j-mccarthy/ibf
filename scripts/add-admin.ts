/**
 * Create or update an admin login user.
 *
 * Usage (pass the Neon URL explicitly, same as sync-resources.ts):
 *   DATABASE_URL="<neon-url-from-env-local>" npx ts-node scripts/add-admin.ts <username> <password>
 *
 * Hashing is inlined (node:crypto) so the script has no @/ alias dependency.
 */
import { PrismaClient } from '@prisma/client';
import { scryptSync, randomBytes } from 'crypto';

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error('Usage: npx ts-node scripts/add-admin.ts <username> <password>');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const passwordHash = hashPassword(password);
  await prisma.adminUser.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });
  console.log(`Admin user "${username}" saved.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
