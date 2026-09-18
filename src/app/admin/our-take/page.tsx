import type { Metadata } from 'next';
import OurTakeBrowser from '@/components/admin/OurTakeBrowser';

export const metadata: Metadata = {
  title: 'Our Take Reviews | IBF Admin',
  robots: { index: false, follow: false },
};

export default function OurTakePage() {
  return <OurTakeBrowser />;
}
