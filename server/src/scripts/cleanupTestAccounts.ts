import { prisma } from '../config/prisma.js'

// Nettoyage des comptes techniques créés par les tests automatisés (server/test/*.test.ts)
// qui tournent contre la base réelle (DATABASE_URL). Ces comptes utilisent toujours
// le domaine @example.test, jamais utilisé par une inscription réelle.
// Usage :
//   npx tsx src/scripts/cleanupTestAccounts.ts            (dry-run, liste seulement)
//   npx tsx src/scripts/cleanupTestAccounts.ts --confirm  (supprime réellement)

const confirm = process.argv.includes('--confirm')
const where = { email: { endsWith: '@example.test' } }

const accounts = await prisma.user.findMany({ where, select: { id: true, email: true, displayName: true, createdAt: true } })

if (accounts.length === 0) {
  console.log('Aucun compte technique @example.test trouvé.')
  process.exit(0)
}

console.log(`${accounts.length} compte(s) technique(s) trouvé(s) :`)
for (const account of accounts) console.log(`  #${account.id} ${account.displayName} <${account.email}> créé le ${account.createdAt.toISOString()}`)

if (!confirm) {
  console.log('\nDry-run : aucune suppression effectuée. Relancez avec --confirm pour supprimer.')
  process.exit(0)
}

const result = await prisma.user.deleteMany({ where })
console.log(`\n${result.count} compte(s) technique(s) supprimé(s) (les lobbies/invitations liés sont supprimés en cascade).`)
await prisma.$disconnect()
