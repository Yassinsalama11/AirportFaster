import Image from 'next/image';

interface Partner {
  name: string;
  logo: string;
  width: number;
  height: number;
}

const PARTNERS: Partner[] = [
  { name: 'Bedouin Moon Hotel', logo: '/partners/bedouin-moon.png', width: 750, height: 634 },
  { name: 'Sinai Taxi', logo: '/partners/sinai-taxi.png', width: 750, height: 236 },
  { name: 'Tu Tours', logo: '/partners/tu-tours.png', width: 750, height: 236 },
  { name: 'ChatOrAi', logo: '/partners/chatorai.png', width: 748, height: 210 },
  { name: 'EGRIDE', logo: '/partners/egride.png', width: 568, height: 200 },
  { name: 'Taxi Mecca', logo: '/partners/taxi-mecca.png', width: 470, height: 200 },
  { name: 'Taxi Qo', logo: '/partners/taxi-qo.png', width: 518, height: 142 },
];

export function PartnersSection({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="py-20 lg:py-24 bg-surface-2 border-y border-line">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-brand-gold mb-3">
            {eyebrow}
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-ink tracking-tight mb-4">
            {title}
          </h2>
          <p className="text-ink-2 text-base lg:text-lg">{description}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10 lg:gap-x-12 lg:gap-y-12 items-center justify-items-center">
          {PARTNERS.map((partner) => (
            <div
              key={partner.name}
              className="flex items-center justify-center w-full h-20 lg:h-24 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            >
              <Image
                src={partner.logo}
                alt={partner.name}
                width={partner.width}
                height={partner.height}
                className="max-h-full w-auto object-contain"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
