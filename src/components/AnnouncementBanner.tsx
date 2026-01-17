'use client';

const AnnouncementBanner = () => {
  return (
    <section className="bg-[#2e4057] py-3">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-4">
        <h5 className="text-white text-sm md:text-base font-semibold">
          The Ignatius Book Fairs store is open!
        </h5>
        <a
          href="https://shop.ignatiusbookfairs.com"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[var(--secondary)] text-[#2e4057] px-6 py-2 rounded-full text-sm font-bold hover:bg-yellow-400 transition-colors uppercase"
        >
          Shop Now
        </a>
      </div>
    </section>
  );
};

export default AnnouncementBanner;
