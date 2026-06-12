// Ignatius rep info keyed by the deal's HubSpot owner id. Mirrors OWNER_INFO in
// /api/hubspot/lookup — the HubSpot owners API needs a scope our token doesn't
// have (crm.objects.owners.read → 403), so this hardcoded map is the source for
// rep name/email/booking link. Add `photo` here later if rep images are provided.
export interface Rep {
  firstName: string;
  lastName: string;
  email: string;
  bookingUrl: string;
  photo?: string;
}

export const REPS: Record<string, Rep> = {
  '681153152': {
    firstName: 'Alma',
    lastName: 'Cue',
    email: 'Alma.Cue@avemaria.edu',
    bookingUrl: 'https://meetings.hubspot.com/alma-cue',
    photo: '/images/rep-alma.webp',
  },
  '1438738471': {
    firstName: 'Jeanette',
    lastName: 'Pohl',
    email: 'Jeanette.Pohl@avemaria.edu',
    bookingUrl: 'https://meetings.hubspot.com/jeanette-pohl1/ignatius-book-fair',
    photo: '/images/rep-jeanette.webp',
  },
};

export function getRep(ownerId: string | null | undefined): Rep | null {
  return ownerId ? (REPS[ownerId] ?? null) : null;
}
