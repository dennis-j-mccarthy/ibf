import Image from 'next/image';

const HowItWorks = () => {
  const steps = [
    {
      image: '/images/iamge1.png',
      caption: 'Submit a request form',
    },
    {
      image: '/images/image3.png',
      caption: 'Consult a book fair pro',
    },
    {
      image: '/images/image2.png',
      caption: 'Let the fair begin!',
    },
  ];

  return (
    <section className="relative">
      {/* White top portion */}
      <div className="bg-white pt-8 pb-0">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-10">
            {steps.map((step, index) => (
              <div key={index} className="text-center relative z-10">
                <div className="flex justify-center">
                  <Image
                    src={step.image}
                    alt={step.caption}
                    width={303}
                    height={303}
                    className="w-[200px] sm:w-[250px] md:w-[303px] h-auto"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Blue bottom portion with captions */}
      <div className="bg-[#0088ff] pt-4 pb-12 -mt-24 sm:-mt-32 md:-mt-40">
        <div className="max-w-6xl mx-auto px-4 pt-24 sm:pt-32 md:pt-40">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-10">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <p 
                  className="text-white text-lg md:text-xl font-medium underline decoration-2 underline-offset-4"
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  {step.caption}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
