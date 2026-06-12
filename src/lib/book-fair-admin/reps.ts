// Rep name/email comes live from the HubSpot owners API (getOwner). This map
// supplies the extras the API doesn't carry — a meeting/booking link and a
// photo — keyed by owner id. Add new reps' photo + bookingUrl here as we get
// them; unmapped reps still render with name/email + initials.
export interface Rep {
  firstName: string;
  lastName: string;
  email: string;
  bookingUrl: string;
  photo?: string;
}

interface RepExtras {
  bookingUrl?: string;
  photo?: string;
}

interface OwnerInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
}

const REP_EXTRAS: Record<string, RepExtras> = {
  '681153152': { bookingUrl: 'https://meetings.hubspot.com/alma-cue', photo: '/images/rep-alma.webp' },
  '1438738471': {
    bookingUrl: 'https://meetings.hubspot.com/jeanette-pohl1/ignatius-book-fair',
    photo: '/images/rep-jeanette.webp',
  },
  '87125142': { photo: '/images/rep-julie.webp' }, // Julie DeGregoria
};

// Build a rep from the live owner record, enriched with any mapped extras.
export function buildRep(
  ownerId: string | null | undefined,
  owner: OwnerInfo | null | undefined
): Rep | null {
  if (!ownerId) return null;
  const extras = REP_EXTRAS[ownerId] ?? {};
  const firstName = owner?.firstName ?? '';
  const lastName = owner?.lastName ?? '';
  const email = owner?.email ?? '';
  if (!firstName && !email) return null; // nothing useful to show
  return {
    firstName,
    lastName,
    email,
    bookingUrl: extras.bookingUrl ?? (email ? `mailto:${email}` : '#'),
    photo: extras.photo,
  };
}
