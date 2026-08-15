import { useDb } from './db'
import { seedCustomers, seedMails, seedMembers, seedNotifications } from './seed'

async function ensureSeeded(): Promise<void> {
  const db = useDb()
  const count = await db.customers.count()
  if (count > 0) return

  await db.transaction('rw', [db.customers, db.mails, db.members, db.notifications], async () => {
    await db.customers.bulkPut(seedCustomers())
    await db.mails.bulkPut(seedMails())
    await db.members.bulkPut(seedMembers())
    await db.notifications.bulkPut(seedNotifications())
  })
}

export async function useCustomers() {
  const db = useDb()
  await ensureSeeded()
  return db.customers.orderBy('id').toArray()
}

export async function useMails() {
  const db = useDb()
  await ensureSeeded()
  return db.mails.orderBy('id').toArray()
}

export async function useMembers() {
  const db = useDb()
  await ensureSeeded()
  return db.members.orderBy('name').toArray()
}

export async function useNotifications() {
  const db = useDb()
  await ensureSeeded()
  return db.notifications.orderBy('id').reverse().toArray()
}
