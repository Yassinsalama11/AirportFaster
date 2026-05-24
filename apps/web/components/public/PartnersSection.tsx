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
    <section className="py-16 lg:py-20 bg-surface-2 border-y border-line">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-12">
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-brand-gold mb-3">
            {eyebrow}
          </p>
          <h2 className="text-2xl lg:text-[28px] font-bold text-ink tracking-tight mb-3 leading-tight">
            {title}
          </h2>
          <p className="text-ink-2 text-sm lg:text-base">{description}</p>
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-4 lg:gap-6 overflow-x-auto -mx-2 px-2">
          {PARTNERS.map((partner) => (
            <div
              key={partner.name}
              className="flex-shrink-0 flex items-center justify-center w-20 h-10 sm:w-24 sm:h-12 lg:w-28 lg:h-14 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
              title={partner.name}
            >
              <Image
                src={partner.logo}
                alt={partner.name}
                width={partner.width}
                height={partner.height}
                className="max-h-full max-w-full object-contain"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
