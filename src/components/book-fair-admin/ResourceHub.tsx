import { RESOURCE_CATEGORIES, RESOURCES } from '@/lib/book-fair-admin/resources';

export default function ResourceHub() {
  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <h3
        className="text-[#02176f] text-xl font-semibold mb-4"
        style={{ fontFamily: 'brother-1816, sans-serif' }}
      >
        Resource hub
      </h3>
      <div className="space-y-6">
        {RESOURCE_CATEGORIES.map((category) => {
          const cards = RESOURCES.filter((r) => r.category === category);
          if (cards.length === 0) return null;
          return (
            <div key={category}>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[#7e828f] mb-2">
                {category}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cards.map((card) => (
                  <a
                    key={card.title}
                    href={card.href}
                    className="block border border-[#dddddd] rounded-lg p-4 hover:border-[#0088ff] hover:shadow-sm transition-all"
                  >
                    <p className="font-semibold text-[#02176f] mb-1">{card.title}</p>
                    <p className="text-sm text-[#7e828f]">{card.description}</p>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
