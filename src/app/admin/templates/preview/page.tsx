import TemplateCenter from '@/components/book-fair-admin/TemplateCenter';
import { getTemplates, resolveTemplate, templatesForAudience } from '@/lib/templates/store';
import { SAMPLE_VALUES } from '@/lib/templates/tokens';

// Staff-side preview of the coordinator experience: the same TemplateCenter
// that renders on /book-fair-admin, merged against the sample school so it can
// be reviewed without signing in as a school.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Coordinator preview | IBF Admin',
  robots: { index: false, follow: false },
};

const AUDIENCES = ['Catholic In Person', 'Parish In Person', 'Public In Person'];

export default async function TemplatePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string }>;
}) {
  const sp = await searchParams;
  const audience = AUDIENCES.includes(sp?.audience ?? '') ? sp!.audience! : AUDIENCES[0];
  const all = await getTemplates();
  const templates = templatesForAudience(all, audience).map((t) => resolveTemplate(t, SAMPLE_VALUES));

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-[1100px] mx-auto px-5 h-16 flex items-center justify-between">
          <h1 className="font-brother text-lg sm:text-xl font-semibold">Coordinator preview</h1>
          <a href="/admin/templates" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">
            Back to studio
          </a>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-5 py-8 space-y-5">
        <p className="text-sm text-gray-600 -mt-2">
          This is the Ready-to-send templates section exactly as a coordinator sees it on their fair dashboard, filled
          in here with a sample school.
        </p>

        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map((a) => (
            <a
              key={a}
              href={`/admin/templates/preview?audience=${encodeURIComponent(a)}`}
              className={`px-3.5 py-2 rounded-full text-sm font-semibold transition-colors ${
                a === audience ? 'bg-[#02176f] text-white' : 'bg-white text-[#7e828f] hover:text-[#02176f] shadow-sm'
              }`}
            >
              {a}
            </a>
          ))}
        </div>

        <TemplateCenter templates={templates} />
      </main>
    </div>
  );
}
