import { Metadata } from 'next';
import InPersonGuide from '@/components/InPersonGuide';

export const metadata: Metadata = {
  title: 'In-Person Book Fair Guide | Ignatius Book Fairs',
  description: 'Your complete step-by-step guide to running a successful Catholic in-person book fair.',
};

export default function GuidePage() {
  return <InPersonGuide />;
}
