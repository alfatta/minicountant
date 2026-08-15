import Dexie, { type Table } from 'dexie'
import type { User, Mail, Member, Notification } from '~/types'

export type CustomerRow = User
export type MailRow = Mail
export type MemberRow = Member
export type NotificationRow = Notification

export class AppDB extends Dexie {
  customers!: Table<CustomerRow, number>
  mails!: Table<MailRow, number>
  members!: Table<MemberRow, string>
  notifications!: Table<NotificationRow, number>

  constructor() {
    super('mini-countant')

    this.version(1).stores({
      customers: 'id, name, email, status, location',
      mails: 'id, unread, date, *from.id',
      members: 'username, name, role',
      notifications: 'id, unread, date, sender.name'
    })
  }
}

let _db: AppDB | null = null

export function useDb(): AppDB {
  if (!_db) {
    _db = new AppDB()
  }
  return _db
}
