# Commercialization and asset compliance

This document records engineering-side checks required before adding sponsorships, advertising, subscriptions, or commercial licensing. It is not legal advice and does not imply endorsement by NASA, JPL, ESA, or any other source organization.

## Current assessment

The project can be operated commercially, but a file-level asset inventory and replacement of uncertain sources should precede programmatic advertising. Code, scientific data, textures, models, and institutional marks have different rights and must not be covered indiscriminately by one project license.

## Principal risks

| Area | Current state | Commercial requirement |
| --- | --- | --- |
| Project code | No repository `LICENSE` / `NOTICE` yet | Choose a license for original code without relicensing third-party assets |
| NASA 3D models and media | Generally usable in informational, educational, and simulation contexts | Credit the source; never imply NASA endorsement; separately review logos, seals, employee likenesses, and third-party credits |
| JPL data and media | Horizons and approximate planetary-position data support the model; media may carry Caltech or third-party rights | Preserve provenance; images commonly require `Courtesy NASA/JPL-Caltech`; inspect third-party exceptions |
| NASA PDS scientific meshes | 67P, Apophis, and Arrokoth derive from scientific archives | Preserve dataset DOI, product-level `CITATION_DESC`, and modification notes |
| Solar System Scope textures | CC BY 4.0 | Credit the source, link the license, and disclose compression or adaptation |
| ESO Milky Way panorama | CC BY 4.0 | Preserve the `ESO / S. Brunier` credit, license link, and adaptation notice |
| Planet Pixel Emporium derivatives | Permitted as rendering resources in a real-time simulator, but direct redistribution as an asset pack is restricted | Obtain written confirmation before monetization or replace them with NASA/PDS/explicitly CC-licensed textures |
| three.js example Moon texture | The complete source chain is not recorded in the repository | Prefer a documented NASA SVS CGI Moon Kit replacement |
| Tiangong models | Project-authored from public dimensions and imagery | State that they are not official engineering CAD and avoid institutional branding that implies cooperation |

Primary references:

- [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
- [NASA Advertising Guidelines](https://www.nasa.gov/nasa-brand-center/advertising-guidelines/)
- [JPL Image Use Policy](https://www.jpl.nasa.gov/jpl-image-use-policy/)
- [Solar System Scope Textures — CC BY 4.0](https://www.solarsystemscope.com/textures/)
- [ESA Multimedia Terms](https://www.esa.int/ESA_Multimedia/Terms_and_conditions_of_use_of_images_and_videos_available_on_the_esa_website)

## Gates before advertising

1. Create `THIRD_PARTY_ASSETS.md` with each model, texture, image, and font's local path, source URL, author, license, modifications, and retrieval date.
2. Replace or obtain permission for Planet Pixel Emporium derivatives and example assets with incomplete provenance.
3. Separate the original-code license from third-party asset notices; do not claim copyright over NASA/PDS/CC material.
4. Publish source credits, privacy policy, terms of use, contact information, and non-endorsement language.
5. Begin with contextual or non-personalized ads; use a Google-certified CMP for EEA, UK, and Swiss traffic.
6. Never cover canvas targets, labels, time controls, or the bottom toolbar with ads. Never incentivize, reward, or suggest ad clicks.
7. Load ad scripts only after the first screen and the required consent so they do not degrade WebGL memory, LCP, or interaction frame rate.

## Hash deep links versus real paths

Existing links such as:

```text
/#target=earth&date=2028-04-15
/#target=newhorizons&date=2028-04-15
```

already provide flexible simulation-state sharing for target, date, language, and scale without an SPA fallback. They are not distinct server resources: URL fragments are never sent to the server, so search engines, social previews, and advertising reviews usually see one `/` document without target-specific canonical URLs, titles, descriptions, or structured data.

The project now uses a compatible hybrid:

```text
/objects/earth#date=2028-04-15
/missions/newhorizons#date=2028-04-15
```

- the build emits real HTML for all 65 targets, while the path supplies indexable archive content, canonical metadata, Open Graph, and JSON-LD;
- the fragment retains date, scale, language, and other live simulation state;
- legacy `#target=...` links remain compatible;
- Cloudflare Pages emits real HTML for known paths instead of a global catch-all that could return HTML for missing GLB assets.

The optional build variable `PUBLIC_SITE_URL=https://your-domain.example` produces absolute canonical URLs. Without it, pages use root-relative canonicals that browsers and crawlers resolve against the deployment origin.

## Deferred commercial features

Education and professional tiers are intentionally deferred. Candidates include an ad-free mode, classroom presentation, saved and shared scenes, high-resolution export, guided curricula, embeds, and school or museum licensing. Anonymous usage data should validate audience, geography, and willingness to pay before implementation.
