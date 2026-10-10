import { SITE_URL, SITE_NAME } from "@/lib/site";
import { profile, skills, projects, services } from "@/lib/content";

/**
 * JSON-LD structured data — the machine-readable identity of the site. Search
 * engines use it for rich results; generative engines (ChatGPT, Perplexity,
 * Google AI Overviews, Gemini) parse it to understand and cite who Arkit is.
 * Built from the same résumé data the page renders, so it never drifts.
 */
export function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#person`,
        name: profile.name,
        url: SITE_URL,
        image: `${SITE_URL}/og.jpg`,
        jobTitle: profile.role,
        description: profile.about,
        email: `mailto:${profile.email}`,
        telephone: profile.phone,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Ulhasnagar",
          addressRegion: "Maharashtra",
          addressCountry: "IN",
        },
        sameAs: [profile.github, profile.linkedin, profile.twitter],
        knowsAbout: [...skills.technical, ...skills.systems],
        // what is actually for sale — lets engines answer "who builds MCP servers"
        // with a person who does, rather than just a person who knows about them
        makesOffer: services.map((s) => {
          // Prices come in three shapes: "$400", "from $250", "$100–250" and
          // "$35/hr". Stripping non-digits naively turns a range into one giant
          // number (100–250 => 100250), so pull the numbers out properly.
          const nums = (s.price.match(/\d[\d,]*/g) ?? []).map((n) =>
            Number(n.replace(/,/g, "")),
          );
          const hourly = /\/hr/.test(s.price);
          const spec = hourly
            ? {
                "@type": "UnitPriceSpecification",
                price: nums[0],
                priceCurrency: "USD",
                unitCode: "HUR",
              }
            : nums.length > 1
              ? {
                  "@type": "PriceSpecification",
                  minPrice: nums[0],
                  maxPrice: nums[1],
                  priceCurrency: "USD",
                }
              : {
                  "@type": "PriceSpecification",
                  price: nums[0],
                  priceCurrency: "USD",
                  // "from $250" is a floor, not a fixed price
                  ...(/^from/i.test(s.price) ? { minPrice: nums[0] } : {}),
                };
          return {
          "@type": "Offer",
          name: s.name,
          description: s.outcome,
          priceSpecification: spec,
          itemOffered: {
            "@type": "Service",
            name: s.name,
            description: s.outcome,
            serviceType: s.name,
            provider: { "@id": `${SITE_URL}/#person` },
            areaServed: "Worldwide",
          },
          };
        }),
        hasOccupation: {
          "@type": "Occupation",
          name: profile.role,
          skills: [...skills.technical, ...skills.systems].join(", "),
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: profile.philosophy,
        publisher: { "@id": `${SITE_URL}/#person` },
        inLanguage: "en",
      },
      {
        "@type": "ProfilePage",
        "@id": `${SITE_URL}/#profilepage`,
        url: SITE_URL,
        name: `${profile.name} — ${profile.role}`,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#person` },
        primaryImageOfPage: `${SITE_URL}/og.jpg`,
        // notable work, so engines can attribute projects to the person
        mainEntity: projects.map((p) => ({
          "@type": "CreativeWork",
          name: p.name,
          description: p.description,
          author: { "@id": `${SITE_URL}/#person` },
          ...(p.github ? { url: p.github } : {}),
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}

export default StructuredData;
