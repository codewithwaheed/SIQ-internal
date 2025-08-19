interface Logo {
  name: string;
  alt: string;
  logo?: string;
}
const logos: Logo[] = [
  {
    name: 'AWS',
    alt: 'Amazon Web Services',
    logo: '/img/logos/aws.svg',
  },
  {
    name: 'Raytheon',
    alt: 'Raytheon Technologies',
    logo: '/lovable-uploads/dcefe78e-eada-41c9-8454-529b33ea881d.png',
  },
  {
    name: 'Northrop Grumman',
    alt: 'Northrop Grumman Corporation',
    logo: '/lovable-uploads/8111aef9-fe84-4ce2-b0e4-86bc8b2c21d3.png',
  },
  {
    name: 'Boeing',
    alt: 'Boeing Company',
    logo: '/img/logos/boeing.svg',
  },
  {
    name: 'ManTech',
    alt: 'ManTech International',
    logo: '/lovable-uploads/09384bf5-54b3-465e-a945-829a62b86035.png',
  },
  {
    name: 'FEMA',
    alt: 'Federal Emergency Management Agency',
    logo: '/img/logos/fema.svg',
  },
  {
    name: 'DARPA',
    alt: 'Defense Advanced Research Projects Agency',
    logo: '/lovable-uploads/fd8f16c2-f9b9-4491-87af-63a3bba5c49f.png',
  },
  {
    name: 'U.S. Air Force',
    alt: 'United States Air Force',
    logo: '/lovable-uploads/60cba157-e584-4353-b94f-4ff19cb1daa4.png',
  },
  {
    name: 'U.S. Navy',
    alt: 'United States Navy',
    logo: '/lovable-uploads/fa96cc25-9331-42e8-976c-581511598c43.png',
  },
  {
    name: 'U.S. Marine Corps',
    alt: 'United States Marine Corps',
    logo: '/lovable-uploads/a8b944be-2706-4fa1-a903-0238d50a8743.png',
  },
  {
    name: 'U.S. Army',
    alt: 'United States Army',
    logo: '/lovable-uploads/f78707e9-0156-4f58-bc61-1e8fccc0c3dd.png',
  },
  {
    name: 'Defense Intelligence Agency',
    alt: 'Defense Intelligence Agency',
    logo: '/lovable-uploads/4ffb430a-0d1f-4825-a78e-a788962990d2.png',
  },
];
export const TrustedBySection = () => {
  return (
    <section className="w-full border-b border-t border-border bg-muted/20 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="mb-6 text-center text-lg font-semibold text-muted-foreground">
          Built by the same cybersecurity experts who have protected:
        </p>

        <div
          className="logo-marquee overflow-hidden whitespace-nowrap py-4"
          aria-label="Partner logos marquee"
        >
          <div className="animate-marquee inline-flex">
            {/* First set of logos */}
            {logos.map((logo, index) => (
              <div
                key={`first-${index}`}
                className="mx-8 inline-flex min-w-[120px] items-center justify-center"
                role="img"
              >
                {logo.logo ? (
                  <img
                    src={logo.logo}
                    alt={logo.alt}
                    className="h-10 max-w-[120px] object-contain opacity-75 grayscale filter transition-opacity hover:opacity-100 hover:grayscale-0"
                    loading={index < 3 ? 'eager' : 'lazy'}
                  />
                ) : (
                  <span
                    className="whitespace-nowrap text-sm font-medium text-foreground/75 transition-colors hover:text-foreground"
                    aria-label={logo.alt}
                  >
                    {logo.name}
                  </span>
                )}
              </div>
            ))}
            {/* Duplicate set for seamless loop */}
            {logos.map((logo, index) => (
              <div
                key={`second-${index}`}
                className="mx-8 inline-flex min-w-[120px] items-center justify-center"
                role="img"
              >
                {logo.logo ? (
                  <img
                    src={logo.logo}
                    alt={logo.alt}
                    className="h-10 max-w-[120px] object-contain opacity-75 grayscale filter transition-opacity hover:opacity-100 hover:grayscale-0"
                    loading="lazy"
                  />
                ) : (
                  <span
                    className="whitespace-nowrap text-sm font-medium text-foreground/75 transition-colors hover:text-foreground"
                    aria-label={logo.alt}
                  >
                    {logo.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
