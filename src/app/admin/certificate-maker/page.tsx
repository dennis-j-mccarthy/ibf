import MakerTool from '@/components/admin/MakerTool';

export const metadata = { title: 'Certificate Maker | IBF Admin' };

export default function CertificateMakerPage() {
  return <MakerTool kind="cert" />;
}
