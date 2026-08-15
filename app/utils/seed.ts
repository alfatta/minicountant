import type { CustomerRow, MailRow, MemberRow, NotificationRow } from './db'

const NAMES = [
  'Alex Smith', 'Jordan Brown', 'Taylor Green', 'Morgan White', 'Casey Gray',
  'Jamie Johnson', 'Riley Davis', 'Kelly Wilson', 'Drew Moore', 'Jordan Taylor',
  'Morgan Anderson', 'Casey Thomas', 'Jamie Jackson', 'Riley White', 'Kelly Harris',
  'Drew Martin', 'Alex Thompson', 'Jordan Garcia', 'Taylor Rodriguez', 'Morgan Lopez'
] as const

const STATUSES = ['subscribed', 'unsubscribed', 'bounced'] as const

const LOCATIONS = [
  'New York, USA', 'London, UK', 'Paris, France', 'Berlin, Germany',
  'Tokyo, Japan', 'Sydney, Australia'
] as const

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!
}

export function seedCustomers(): CustomerRow[] {
  return NAMES.map((name, i) => ({
    id: i + 1,
    name,
    email: name.toLowerCase().replace(/\s+/g, '.') + '@example.com',
    avatar: { src: `https://i.pravatar.cc/128?u=${i + 1}` },
    status: pick(STATUSES, i),
    location: pick(LOCATIONS, i)
  }))
}

const MAIL_SUBJECTS = [
  'Meeting Schedule: Q1 Marketing Strategy Review',
  'RE: Project Phoenix - Sprint 3 Update',
  'Lunch Plans',
  'New Proposal: Project Horizon',
  'Updated: San Francisco Conference Trip Itinerary',
  'Welcome to the team!',
  'Quarterly Performance Report',
  'Holiday Party RSVP',
  'Product Launch Announcement',
  'Customer Feedback Summary'
] as const

const MAIL_BODIES = [
  'Hi team, please find the latest update attached. Let me know if you have any questions. Thanks!',
  'Quick reminder about our upcoming meeting tomorrow at 10 AM. Please come prepared with your updates.',
  'I hope this email finds you well. Just a quick note about the project timeline and deliverables.',
  'Please review the attached document and provide your feedback by end of day Friday.',
  'Thanks for your hard work this quarter. The results have been outstanding across all metrics.'
] as const

export function seedMails(): MailRow[] {
  const now = Date.now()
  return MAIL_SUBJECTS.map((subject, i) => ({
    id: i + 1,
    unread: i % 3 === 0,
    from: {
      id: i + 1,
      name: pick(NAMES, i),
      email: pick(NAMES, i).toLowerCase().replace(/\s+/g, '.') + '@example.com',
      avatar: { src: `https://i.pravatar.cc/128?u=${i + 1}` },
      status: pick(STATUSES, i),
      location: pick(LOCATIONS, i)
    },
    subject,
    body: pick(MAIL_BODIES, i),
    date: new Date(now - (i + 1) * 3600_000).toISOString()
  }))
}

const MEMBER_DATA: Array<Omit<MemberRow, 'avatar'> & { avatarSeed: string }> = [
  { name: 'Anthony Fu', username: 'antfu', role: 'member', avatarSeed: 'antfu' },
  { name: 'Baptiste Leproux', username: 'larbish', role: 'member', avatarSeed: 'larbish' },
  { name: 'Benjamin Canac', username: 'benjamincanac', role: 'owner', avatarSeed: 'benjamincanac' },
  { name: 'Céline Dumerc', username: 'celinedumerc', role: 'member', avatarSeed: 'celinedumerc' },
  { name: 'Daniel Roe', username: 'danielroe', role: 'member', avatarSeed: 'danielroe' },
  { name: 'Farnabaz', username: 'farnabaz', role: 'member', avatarSeed: 'farnabaz' },
  { name: 'Hugo Richard', username: 'hugorcd', role: 'owner', avatarSeed: 'hugorcd' },
  { name: 'Pooya Parsa', username: 'pi0', role: 'member', avatarSeed: 'pi0' },
  { name: 'Sarah Moriceau', username: 'SarahM19', role: 'member', avatarSeed: 'SarahM19' },
  { name: 'Sébastien Chopin', username: 'Atinux', role: 'owner', avatarSeed: 'atinux' }
]

export function seedMembers(): MemberRow[] {
  return MEMBER_DATA.map(({ avatarSeed, ...rest }) => ({
    ...rest,
    avatar: { src: `https://ipx.nuxt.com/f_auto,s_192x192/gh_avatar/${avatarSeed}` }
  }))
}

const NOTIFICATION_BODIES = [
  'sent you a message',
  'subscribed to your email list',
  'added you to a project',
  'purchased your product',
  'abandoned cart',
  'requested a refund'
] as const

export function seedNotifications(): NotificationRow[] {
  const now = Date.now()
  return Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    unread: i % 3 === 0,
    sender: {
      id: i + 1,
      name: pick(NAMES, i),
      email: pick(NAMES, i).toLowerCase().replace(/\s+/g, '.') + '@example.com',
      avatar: { src: `https://i.pravatar.cc/128?u=${i + 1}` },
      status: pick(STATUSES, i),
      location: pick(LOCATIONS, i)
    },
    body: pick(NOTIFICATION_BODIES, i),
    date: new Date(now - (i + 1) * 1800_000).toISOString()
  }))
}
