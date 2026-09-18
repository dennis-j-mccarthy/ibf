import { redirect } from 'next/navigation';

// Superseded by the combined Reviews page (store reviews + Our Take).
export default function OurTakeRedirect() {
  redirect('/admin/reviews');
}
