'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Brand "Training" — one editable profile (statements/angles per audience, colors,
// fonts, social + article prefs) plus a tagged image library. Both feed the blog
// and social generators. Admin-only (middleware-guarded).

type Audience = { audience: string; persona: string; painPoints: string[]; statements: string[]; angles: string[] };
type Color = { name: string; hex: string };
type Font = { name: string; usage: string };
type Profile = { audiences: Audience[]; colors: Color[]; fonts: Font[]; socialPrefs: string; articlePrefs: string };
type Img = { id: number; url: string; alt: string; category: string; audience: string; tags: string[]; source: string };
type Doc = { id: number; title: string; url: string; kind: string; contentType: string; size: number; source: string };

const DOC_KINDS = ['design-language', 'angles', 'other'];
const DOC_KIND_LABEL: Record<string, string> = { 'design-language': 'Design language', angles: 'Angles', other: 'Other' };
const prettySize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : b > 0 ? `${Math.round(b / 1024)} KB` : '');

const CATEGORIES = ['kids', 'bookfairs', 'parents', 'teachers', 'admins', 'logos', 'doodads', 'other'];
const CAT_LABEL: Record<string, string> = {
  kids: 'Kids', bookfairs: 'Book fairs', parents: 'Parents', teachers: 'Teachers', admins: 'Admins', logos: 'Logos', doodads: 'Doodads', other: 'Other',
};

const input = 'w-full px-3 py-2 border border-[#dddddd] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066ff] text-sm';
const label = 'block text-sm font-medium text-[#02176f] mb-1';
const lines = (a: string[]) => a.join('\n');
const toLines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

// Downscale an image in the browser (max 2000px longest side, JPEG) so uploads
// stay well under the serverless request-body limit and the library holds
// web-optimized assets. Falls back to the original file if anything fails.
async function downscale(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bmp = await createImageBitmap(file);
    const max = 2000;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export default function TrainingAdmin() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [images, setImages] = useState<Img[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [filter, setFilter] = useState('all');

  // Add-image form
  const [url, setUrl] = useState('');
  const [cat, setCat] = useState('kids');
  const [alt, setAlt] = useState('');
  const [aud, setAud] = useState('');
  const [tags, setTags] = useState('');
  const [addMsg, setAddMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // AI helper popup (crafts statements, or persona + pain points)
  const [aiFor, setAiFor] = useState<number | null>(null); // audience index
  const [aiKind, setAiKind] = useState<'statements' | 'persona' | 'angles'>('statements');
  const [aiBullets, setAiBullets] = useState('');
  const [aiResults, setAiResults] = useState<string[]>([]); // statements, angles, OR pain points
  const [aiPersona, setAiPersona] = useState('');
  const [aiCount, setAiCount] = useState(8);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState('');

  const openAi = (i: number, kind: 'statements' | 'persona' | 'angles') => {
    setAiFor(i); setAiKind(kind); setAiBullets(''); setAiResults([]); setAiPersona(''); setAiErr('');
    setAiCount(kind === 'angles' ? 7 : 8);
  };

  const runAi = async () => {
    if (aiFor === null || !profile) return;
    const a = profile.audiences[aiFor];
    setAiBusy(true);
    setAiErr('');
    setAiResults([]);
    setAiPersona('');
    try {
      const r = await fetch('/api/admin/training/craft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: aiKind, audience: a.audience, persona: a.persona, painPoints: a.painPoints, bullets: toLines(aiBullets), count: aiKind === 'persona' ? undefined : aiCount }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Generation failed.');
      if (aiKind === 'persona') {
        setAiPersona(d.persona ?? '');
        setAiResults(d.painPoints ?? []);
      } else if (aiKind === 'angles') {
        setAiResults(d.angles ?? []);
      } else {
        setAiResults(d.statements ?? []);
      }
    } catch (e) {
      setAiErr(e instanceof Error ? e.message : 'Generation failed.');
    } finally {
      setAiBusy(false);
    }
  };

  const aiHasResults = aiResults.length > 0 || aiPersona.trim().length > 0;

  // Click-to-prefill: focusing an empty Statements/Angles box crafts 5+ entries
  // from that audience's persona + pain points.
  const [prefilling, setPrefilling] = useState<{ i: number; field: 'statements' | 'angles' } | null>(null);

  const prefillField = async (i: number, field: 'statements' | 'angles') => {
    if (!profile || prefilling) return;
    const a = profile.audiences[i];
    if ((field === 'statements' ? a.statements : a.angles).length) return; // only fill empty boxes
    if (!a.persona.trim() && !a.painPoints.length) return; // nothing to craft from
    setPrefilling({ i, field });
    try {
      const r = await fetch('/api/admin/training/craft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: field === 'angles' ? 'angles' : 'statements', audience: a.audience, persona: a.persona, painPoints: a.painPoints, bullets: [] }),
      });
      const d = await r.json();
      if (r.ok) {
        const items: string[] = (field === 'angles' ? d.angles : d.statements) ?? [];
        if (items.length) {
          patch({ audiences: profile.audiences.map((x, idx) => (idx === i ? { ...x, [field]: items } : x)) });
        }
      }
    } finally {
      setPrefilling(null);
    }
  };

  const acceptAi = () => {
    if (aiFor === null || !profile || !aiHasResults) return;
    patch({
      audiences: profile.audiences.map((x, idx) => {
        if (idx !== aiFor) return x;
        if (aiKind === 'persona') {
          return { ...x, persona: aiPersona.trim() || x.persona, painPoints: [...x.painPoints, ...aiResults] };
        }
        if (aiKind === 'angles') {
          return { ...x, angles: [...x.angles, ...aiResults] };
        }
        return { ...x, statements: [...x.statements, ...aiResults] };
      }),
    });
    setAiFor(null);
  };

  // Document library
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docKind, setDocKind] = useState('design-language');
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docMsg, setDocMsg] = useState('');
  const [docUploading, setDocUploading] = useState(false);
  const docFileRef = useRef<HTMLInputElement>(null);

  const loadImages = useCallback(async () => {
    const r = await fetch('/api/admin/training/images');
    if (r.ok) setImages(await r.json());
  }, []);

  const loadDocs = useCallback(async () => {
    const r = await fetch('/api/admin/training/documents');
    if (r.ok) setDocs(await r.json());
  }, []);

  useEffect(() => {
    fetch('/api/admin/training/profile').then((r) => r.json()).then(setProfile);
    loadImages();
    loadDocs();
  }, [loadImages, loadDocs]);

  const addDocByUrl = async () => {
    setDocMsg('');
    const r = await fetch('/api/admin/training/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: docUrl, title: docTitle, kind: docKind, source: 'url' }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setDocMsg(d.error || 'Could not add document.');
      return;
    }
    setDocUrl(''); setDocTitle('');
    loadDocs();
  };

  const onPickDoc = async (file: File) => {
    setDocMsg('');
    setDocUploading(true);
    try {
      const form = new FormData();
      form.append('file', file, file.name);
      form.append('mode', 'document');
      const up = await fetch('/api/admin/training/upload', { method: 'POST', body: form });
      const upJson = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(upJson.error || `Upload failed (${up.status})`);
      await fetch('/api/admin/training/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: upJson.url, title: docTitle || file.name.replace(/\.[^.]+$/, ''), kind: docKind, contentType: file.type, size: file.size, source: 'blob' }),
      });
      setDocTitle('');
      loadDocs();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      setDocMsg(/not configured|Blob storage/i.test(msg) ? msg : `Upload failed: ${msg}. You can add by URL instead.`);
    } finally {
      setDocUploading(false);
      if (docFileRef.current) docFileRef.current.value = '';
    }
  };

  const updateDoc = async (id: number, data: Partial<Doc>) => {
    setDocs((cur) => cur.map((d) => (d.id === id ? { ...d, ...data } : d)));
    await fetch('/api/admin/training/documents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
  };

  const removeDoc = async (id: number) => {
    if (!confirm('Remove this document from the library?')) return;
    await fetch(`/api/admin/training/documents?id=${id}`, { method: 'DELETE' });
    loadDocs();
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    setProfileMsg('');
    const r = await fetch('/api/admin/training/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    setSavingProfile(false);
    setProfileMsg(r.ok ? 'Saved — the blog & social tools now use this.' : 'Save failed.');
  };

  const patch = (p: Partial<Profile>) => setProfile((cur) => (cur ? { ...cur, ...p } : cur));

  const addByUrl = async () => {
    setAddMsg('');
    const r = await fetch('/api/admin/training/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, category: cat, alt, audience: aud, tags: toLines(tags.replace(/,/g, '\n')), source: 'url' }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setAddMsg(d.error || 'Could not add image.');
      return;
    }
    setUrl(''); setAlt(''); setTags('');
    loadImages();
  };

  const onPickFile = async (file: File) => {
    setAddMsg('');
    setUploading(true);
    try {
      const optimized = await downscale(file);
      const form = new FormData();
      const name = file.name.replace(/\.[^.]+$/, '') + (optimized.type === 'image/jpeg' ? '.jpg' : '');
      form.append('file', optimized, name || file.name);
      const up = await fetch('/api/admin/training/upload', { method: 'POST', body: form });
      const upJson = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(upJson.error || `Upload failed (${up.status})`);
      await fetch('/api/admin/training/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: upJson.url, category: cat, alt, audience: aud, tags: toLines(tags.replace(/,/g, '\n')), source: 'blob' }),
      });
      setAlt(''); setTags('');
      loadImages();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      setAddMsg(/not configured|Blob storage/i.test(msg) ? msg : `Upload failed: ${msg}. You can add by URL instead.`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onPickFiles = async (files: File[]) => {
    for (const f of files) await onPickFile(f);
  };

  const onPickDocs = async (files: File[]) => {
    for (const f of files) await onPickDoc(f);
  };

  const updateImage = async (id: number, data: Partial<Img>) => {
    setImages((cur) => cur.map((i) => (i.id === id ? { ...i, ...data } : i)));
    await fetch('/api/admin/training/images', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
  };

  const removeImage = async (id: number) => {
    if (!confirm('Remove this image from the library?')) return;
    await fetch(`/api/admin/training/images?id=${id}`, { method: 'DELETE' });
    loadImages();
  };

  const shown = filter === 'all' ? images : images.filter((i) => i.category === filter);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <h1 className="font-brother text-lg sm:text-xl font-semibold">Training</h1>
          <a href="/admin" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">Back to admin</a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        <p className="text-sm text-gray-600 -mt-2">
          Everything here informs the <strong>Blog</strong> and <strong>Social</strong> generators — statements, angles, and preferences shape the copy; the image library supplies photo backgrounds and thumbnails.
        </p>

        {/* Brand profile */}
        {!profile ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-gray-500">Loading…</div>
        ) : (
          <section className="bg-white rounded-xl shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-brother text-[#02176f] text-lg font-semibold">Brand voice &amp; preferences</h2>
              <div className="flex items-center gap-3">
                {profileMsg && <span className="text-xs text-gray-500">{profileMsg}</span>}
                <button onClick={saveProfile} disabled={savingProfile} className="bg-[#02176f] hover:bg-[#021a85] text-white font-semibold text-sm px-5 py-2 rounded-md disabled:opacity-60">
                  {savingProfile ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            {/* Audiences */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[#02176f]">Audiences — persona, pain points, statements &amp; angles</h3>
                <button
                  onClick={() => patch({ audiences: [...profile.audiences, { audience: '', persona: '', painPoints: [], statements: [], angles: [] }] })}
                  className="text-sm text-[#0066ff] hover:underline"
                >
                  + Add audience
                </button>
              </div>
              <div className="space-y-4">
                {profile.audiences.map((a, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        className={`${input} max-w-xs font-medium`}
                        value={a.audience}
                        placeholder="Audience (e.g. Parents)"
                        onChange={(e) => patch({ audiences: profile.audiences.map((x, idx) => (idx === i ? { ...x, audience: e.target.value } : x)) })}
                      />
                      <button
                        onClick={() => patch({ audiences: profile.audiences.filter((_, idx) => idx !== i) })}
                        className="ml-auto text-gray-400 hover:text-red-600 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <label className={label}>Persona (who they are)</label>
                          <button onClick={() => openAi(i, 'persona')} className="text-xs text-[#7c3aed] hover:underline mb-1">✨ Generate with AI</button>
                        </div>
                        <textarea
                          className={input}
                          rows={3}
                          value={a.persona}
                          placeholder={'Busy mom of three who wants books she can hand her kids without pre-reading every page.'}
                          onChange={(e) => patch({ audiences: profile.audiences.map((x, idx) => (idx === i ? { ...x, persona: e.target.value } : x)) })}
                        />
                      </div>
                      <div>
                        <label className={label}>Pain points (one per line)</label>
                        <textarea
                          className={input}
                          rows={3}
                          value={lines(a.painPoints)}
                          placeholder={'No time to vet every book\nBurned by junky fair titles before'}
                          onChange={(e) => patch({ audiences: profile.audiences.map((x, idx) => (idx === i ? { ...x, painPoints: toLines(e.target.value) } : x)) })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <label className={label}>Approved statements (one per line)</label>
                          <button onClick={() => openAi(i, 'statements')} className="text-xs text-[#7c3aed] hover:underline mb-1">✨ Generate with AI</button>
                        </div>
                        <textarea
                          className={input}
                          rows={4}
                          value={lines(a.statements)}
                          placeholder={prefilling?.i === i && prefilling.field === 'statements' ? 'Crafting from persona & pain points…' : 'We start with no.\nEvery title earns its place.'}
                          onFocus={() => prefillField(i, 'statements')}
                          onChange={(e) => patch({ audiences: profile.audiences.map((x, idx) => (idx === i ? { ...x, statements: toLines(e.target.value) } : x)) })}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <label className={label}>Angles to pursue (one per line)</label>
                          <button onClick={() => openAi(i, 'angles')} className="text-xs text-[#7c3aed] hover:underline mb-1">✨ Generate with AI</button>
                        </div>
                        <textarea
                          className={input}
                          rows={4}
                          value={lines(a.angles)}
                          placeholder={prefilling?.i === i && prefilling.field === 'angles' ? 'Crafting from persona & pain points…' : 'Trust & curation over volume\nFaith-friendly without preachy'}
                          onFocus={() => prefillField(i, 'angles')}
                          onChange={(e) => patch({ audiences: profile.audiences.map((x, idx) => (idx === i ? { ...x, angles: toLines(e.target.value) } : x)) })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Colors + Fonts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[#02176f]">Colors</h3>
                  <button onClick={() => patch({ colors: [...profile.colors, { name: '', hex: '#02176f' }] })} className="text-sm text-[#0066ff] hover:underline">+ Add</button>
                </div>
                <div className="space-y-2">
                  {profile.colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="color" value={/^#/.test(c.hex) ? c.hex : '#02176f'} onChange={(e) => patch({ colors: profile.colors.map((x, idx) => (idx === i ? { ...x, hex: e.target.value } : x)) })} className="w-9 h-9 rounded border border-gray-200 shrink-0" />
                      <input className={input} value={c.name} placeholder="Name" onChange={(e) => patch({ colors: profile.colors.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)) })} />
                      <input className={`${input} w-28`} value={c.hex} onChange={(e) => patch({ colors: profile.colors.map((x, idx) => (idx === i ? { ...x, hex: e.target.value } : x)) })} />
                      <button onClick={() => patch({ colors: profile.colors.filter((_, idx) => idx !== i) })} className="text-gray-400 hover:text-red-600 px-1">✕</button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[#02176f]">Fonts</h3>
                  <button onClick={() => patch({ fonts: [...profile.fonts, { name: '', usage: '' }] })} className="text-sm text-[#0066ff] hover:underline">+ Add</button>
                </div>
                <div className="space-y-2">
                  {profile.fonts.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input className={input} value={f.name} placeholder="Font name" onChange={(e) => patch({ fonts: profile.fonts.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)) })} />
                      <input className={input} value={f.usage} placeholder="Usage (e.g. Headlines)" onChange={(e) => patch({ fonts: profile.fonts.map((x, idx) => (idx === i ? { ...x, usage: e.target.value } : x)) })} />
                      <button onClick={() => patch({ fonts: profile.fonts.filter((_, idx) => idx !== i) })} className="text-gray-400 hover:text-red-600 px-1">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Prefs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={label}>Social media preferences</label>
                <textarea className={input} rows={5} value={profile.socialPrefs} onChange={(e) => patch({ socialPrefs: e.target.value })} placeholder="Tone, do/don't, emoji policy, CTA style, hashtag habits…" />
              </div>
              <div>
                <label className={label}>Article preferences</label>
                <textarea className={input} rows={5} value={profile.articlePrefs} onChange={(e) => patch({ articlePrefs: e.target.value })} placeholder="Length, structure, reading level, what to avoid, sign-off style…" />
              </div>
            </div>
          </section>
        )}

        {/* Image library */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-brother text-[#02176f] text-lg font-semibold mb-1">Image library</h2>
          <p className="text-sm text-gray-500 mb-4">Photos of kids, book fairs, parents, teachers, admins + doodads. Tagged photos become photo-hero backgrounds in social posts.</p>

          {/* Add controls */}
          <div className="border border-gray-200 rounded-lg p-4 mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className={label}>Category</label>
                <select className={input} value={cat} onChange={(e) => setCat(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Audience (optional)</label>
                <input className={input} value={aud} onChange={(e) => setAud(e.target.value)} placeholder="Parents, Teachers…" />
              </div>
              <div>
                <label className={label}>Alt / description</label>
                <input className={input} value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Girl reading at a book fair" />
              </div>
              <div>
                <label className={label}>Tags (comma or newline)</label>
                <input className={input} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="joy, classroom, autumn" />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[240px]">
                <label className={label}>Add by URL</label>
                <div className="flex gap-2">
                  <input className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
                  <button onClick={addByUrl} disabled={!url.trim()} className="bg-[#02176f] hover:bg-[#021a85] text-white font-semibold text-sm px-4 py-2 rounded-md disabled:opacity-50 whitespace-nowrap">Add</button>
                </div>
              </div>
              <span className="text-sm text-gray-400 pb-2">or</span>
              <div>
                <label className={label}>Upload files</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  onChange={(e) => { const fs = Array.from(e.target.files ?? []); if (fs.length) onPickFiles(fs); }}
                  className="block text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-[#7c3aed] file:text-white file:font-semibold file:cursor-pointer disabled:opacity-50"
                />
              </div>
            </div>
            {uploading && <p className="text-xs text-gray-500 mt-2">Uploading…</p>}
            {addMsg && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">{addMsg}</p>}
          </div>

          {/* Filter */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {['all', ...CATEGORIES].map((c) => (
              <button key={c} onClick={() => setFilter(c)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter === c ? 'bg-[#02176f] text-white border-[#02176f]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {c === 'all' ? `All (${images.length})` : CAT_LABEL[c]}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="text-sm text-gray-400">No images yet{filter !== 'all' ? ' in this category' : ''}.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {shown.map((im) => (
                <div key={im.id} className="border border-gray-100 rounded-lg overflow-hidden bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt={im.alt} className="w-full h-32 object-cover" />
                  <div className="p-2 space-y-2">
                    <select value={im.category} onChange={(e) => updateImage(im.id, { category: e.target.value })} className="w-full text-xs border border-gray-200 rounded px-1.5 py-1">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                    </select>
                    <input value={im.alt} onChange={(e) => updateImage(im.id, { alt: e.target.value })} placeholder="alt…" className="w-full text-xs border border-gray-200 rounded px-1.5 py-1" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wide text-gray-400">{im.source}</span>
                      <button onClick={() => removeImage(im.id)} className="text-[11px] text-gray-400 hover:text-red-600">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Document library */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-brother text-[#02176f] text-lg font-semibold mb-1">Document library</h2>
          <p className="text-sm text-gray-500 mb-4">Documents that capture our design language and angles — brand guides, style references, angle decks.</p>

          {/* Add controls */}
          <div className="border border-gray-200 rounded-lg p-4 mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className={label}>Kind</label>
                <select className={input} value={docKind} onChange={(e) => setDocKind(e.target.value)}>
                  {DOC_KINDS.map((k) => <option key={k} value={k}>{DOC_KIND_LABEL[k]}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Title</label>
                <input className={input} value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="IBF Brand Guide 2026" />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[240px]">
                <label className={label}>Add by URL</label>
                <div className="flex gap-2">
                  <input className={input} value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://…" />
                  <button onClick={addDocByUrl} disabled={!docUrl.trim()} className="bg-[#02176f] hover:bg-[#021a85] text-white font-semibold text-sm px-4 py-2 rounded-md disabled:opacity-50 whitespace-nowrap">Add</button>
                </div>
              </div>
              <span className="text-sm text-gray-400 pb-2">or</span>
              <div>
                <label className={label}>Upload file</label>
                <input
                  ref={docFileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,image/*"
                  multiple
                  disabled={docUploading}
                  onChange={(e) => { const fs = Array.from(e.target.files ?? []); if (fs.length) onPickDocs(fs); }}
                  className="block text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-[#7c3aed] file:text-white file:font-semibold file:cursor-pointer disabled:opacity-50"
                />
              </div>
            </div>
            {docUploading && <p className="text-xs text-gray-500 mt-2">Uploading…</p>}
            {docMsg && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">{docMsg}</p>}
          </div>

          {docs.length === 0 ? (
            <p className="text-sm text-gray-400">No documents yet.</p>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <svg className="w-8 h-8 text-[#02176f] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <input
                      value={d.title}
                      onChange={(e) => setDocs((cur) => cur.map((x) => (x.id === d.id ? { ...x, title: e.target.value } : x)))}
                      onBlur={(e) => updateDoc(d.id, { title: e.target.value })}
                      className="w-full text-sm font-medium text-[#02176f] bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-[#0066ff] rounded px-1 -mx-1"
                    />
                    <p className="text-[11px] text-gray-400 truncate">{prettySize(d.size)}{d.size ? ' · ' : ''}{d.url}</p>
                  </div>
                  <select value={d.kind} onChange={(e) => updateDoc(d.id, { kind: e.target.value })} className="text-xs border border-gray-200 rounded px-1.5 py-1">
                    {DOC_KINDS.map((k) => <option key={k} value={k}>{DOC_KIND_LABEL[k]}</option>)}
                  </select>
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0066ff] hover:underline whitespace-nowrap">Open</a>
                  <button onClick={() => removeDoc(d.id)} className="text-[11px] text-gray-400 hover:text-red-600">Delete</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* AI statement helper popup */}
      {aiFor !== null && profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !aiBusy && setAiFor(null)}>
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-brother text-[#02176f] text-lg font-semibold">
                ✨ {aiKind === 'persona' ? 'Define persona & pain points' : aiKind === 'angles' ? 'Generate angles' : 'Generate statements'}{profile.audiences[aiFor]?.audience ? ` — ${profile.audiences[aiFor].audience}` : ''}
              </h3>
              <button onClick={() => setAiFor(null)} disabled={aiBusy} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              {aiKind === 'persona'
                ? 'Give it a couple of bullet points about who this audience is — it crafts the persona and pain points.'
                : aiKind === 'angles'
                  ? 'Optional bullet points to steer it — otherwise it works from this audience’s persona and pain points.'
                  : 'Optional bullet points to steer it — otherwise it crafts on-brand statements from this audience’s persona and pain points.'}
            </p>
            <textarea
              className={input}
              rows={4}
              autoFocus
              value={aiBullets}
              placeholder={aiKind === 'persona'
                ? 'homeschool mom, 4 kids\nshops at the parish fair\nworries about screen time'
                : aiKind === 'angles'
                  ? 'seasonal tie-ins\nteacher word-of-mouth\nwhy curation beats volume'
                  : 'every book is hand-picked\nparents can trust the table\nno junk toys'}
              onChange={(e) => setAiBullets(e.target.value)}
              disabled={aiBusy}
            />
            {aiKind !== 'persona' && (
              <div className="flex items-center gap-3 mt-3">
                <label className="text-sm font-medium text-[#02176f] whitespace-nowrap">How many?</label>
                <input
                  type="range"
                  min={5}
                  max={50}
                  value={aiCount}
                  onChange={(e) => setAiCount(Number(e.target.value))}
                  disabled={aiBusy}
                  className="flex-1 accent-[#7c3aed]"
                />
                <span className="text-sm font-semibold text-[#7c3aed] w-8 text-right">{aiCount}</span>
              </div>
            )}
            {aiErr && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-2">{aiErr}</p>}
            {aiPersona.trim() && (
              <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Persona</p>
                <p className="text-sm text-[#02176f]">{aiPersona}</p>
              </div>
            )}
            {aiResults.length > 0 && (
              <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-1">
                {aiKind === 'persona' && <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Pain points</p>}
                {aiResults.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-[#02176f]">
                    <span className="flex-1">{s}</span>
                    <button onClick={() => setAiResults((cur) => cur.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500 text-xs mt-0.5">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={runAi}
                disabled={aiBusy || (aiKind === 'persona' ? !aiBullets.trim() : !aiBullets.trim() && !profile.audiences[aiFor]?.persona.trim() && !profile.audiences[aiFor]?.painPoints.length)}
                className="text-sm text-[#7c3aed] font-semibold hover:underline disabled:opacity-50"
              >
                {aiBusy ? 'Crafting…' : aiHasResults ? 'Regenerate' : 'Generate'}
              </button>
              {aiHasResults && (
                <button onClick={acceptAi} className="bg-[#02176f] hover:bg-[#021a85] text-white font-semibold text-sm px-5 py-2 rounded-md">
                  {aiKind === 'persona' ? 'Use persona & pain points' : aiKind === 'angles' ? 'Add to angles' : 'Add to statements'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
