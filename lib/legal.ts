/**
 * Details used by the Terms of Service and Privacy Policy. Change them here and
 * both pages update. Bump `updated` whenever the wording of either page changes.
 */
export const LEGAL = {
  /** The legal name of the business behind Launch & List (e.g. "Launch & List LLC"). */
  company: "Launch & List",
  product: "Launch & List",
  site: "launchandlist.com",
  /** Where account, legal and privacy requests go. This mailbox must exist and be monitored. */
  email: "support@launchandlist.com",
  updated: "November 18, 2026",
  governingState: "California",
  venue: "Contra Costa County, California",
  /** Days after an account is deleted before its data is purged from live systems. */
  deletionDays: 30,
  /** Days backups are kept before they roll off. */
  backupDays: 30,
} as const;
