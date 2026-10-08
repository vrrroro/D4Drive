import type { Metadata } from 'next';
import { StackPanel } from '@/components/motion/StackPanel';
import { CarPhoto } from '@/components/ui/CarPhoto';
import { PHOTO_CREDITS, licenseUrl } from '@/lib/photo-credits';

export const metadata: Metadata = { title: 'Photo credits' };

/**
 * Attribution for every third-party asset on the site.
 *
 * The fleet photographs are Creative Commons works from Wikimedia Commons.
 * Their licences ask for the author, the licence, the source, and a note of
 * what was changed. The cutouts are adaptations, and the ShareAlike ones are
 * offered under the same licence as their source.
 */
export default function CreditsPage() {
  return (
    <StackPanel tone="studio" className="panel min-h-[100dvh] pt-[calc(var(--header-h)+clamp(3rem,6vw,6rem))]" aria-labelledby="credits-title">
      <h1 id="credits-title" className="t-mega">
        Photo credits.
      </h1>
      <p className="t-body mt-10 max-w-[60ch] text-[var(--muted)]">
        Every car photograph on this site is a freely licensed image from Wikimedia Commons. Each one was cut out of its
        background, colour-balanced and set on the same studio backdrop as our film, with any readable number plate blurred. Those
        edited versions are shared under the same licence as the original.
      </p>

      <ol className="mt-16 grid grid-cols-1 gap-x-10 gap-y-14 md:grid-cols-2 xl:grid-cols-3">
        {PHOTO_CREDITS.map((credit) => {
          const license = licenseUrl(credit.license);
          return (
            <li key={credit.image}>
              <CarPhoto src={credit.image} name={credit.model} aspect="aspect-[3/2]" />
              <p className="t-sub mt-5 text-[clamp(1.4rem,1.8vw,1.8rem)]">{credit.model}</p>
              <p className="mt-3 font-body text-sm font-light leading-relaxed text-[var(--muted)]">
                <a href={credit.source} className="underline decoration-1 underline-offset-2 hover:text-[var(--accent-text)]" rel="noreferrer">
                  {credit.title}
                </a>{' '}
                by {credit.author},{' '}
                {license ? (
                  <a href={license} className="underline decoration-1 underline-offset-2 hover:text-[var(--accent-text)]" rel="noreferrer license">
                    {credit.license}
                  </a>
                ) : (
                  credit.license
                )}
                . Background replaced{credit.mirrored ? ', mirrored' : ''}{credit.plateBlurred ? ', number plate blurred' : ''}.
              </p>
            </li>
          );
        })}
      </ol>

      <p className="t-body mt-20 max-w-[60ch] text-[var(--muted)]">
        Type: Fraunces, Six Caps, Inter and Shadows Into Light Two, all under the SIL Open Font License.
      </p>
    </StackPanel>
  );
}
