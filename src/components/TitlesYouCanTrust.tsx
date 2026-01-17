import Image from 'next/image';

const TitlesYouCanTrust = () => {
  const books = [
    { src: '/images/Book_01-np.jpg', alt: 'Book 1' },
    { src: '/images/Book_02-np.jpg', alt: 'Book 2' },
    { src: '/images/Book_04-np.jpg', alt: 'Book 3' },
    { src: '/images/Book_05-np.jpg', alt: 'Book 4' },
    { src: '/images/Book_03-np.jpg', alt: 'Book 5' },
  ];

  return (
    <section className="relative">
      {/* Middle Blob Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-full max-w-[890px] pointer-events-none z-10">
        <Image
          src="/images/Blob_MiddleOfPage.png"
          alt=""
          width={890}
          height={600}
          className="w-full h-auto"
        />
      </div>

      <div className="bg-[var(--accent)] pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="balbs-white text-3xl md:text-4xl lg:text-5xl">
              Titles You Can Trust
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-6 items-end justify-items-center">
            {books.map((book, index) => (
              <div
                key={index}
                className="transform hover:scale-105 hover:-translate-y-2 transition-all duration-300"
              >
                <Image
                  src={book.src}
                  alt={book.alt}
                  width={180}
                  height={270}
                  className="w-full max-w-[150px] md:max-w-[180px] h-auto shadow-lg rounded"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TitlesYouCanTrust;
