import { licenseUrl, photoCredit } from '@/lib/photo-credits';

/** "Photo: author, licence, Wikimedia Commons. Edited." under a fleet photo. */
export function PhotoCreditLine({ image, className = '' }: { image: string | null; className?: string }) {
  const credit = photoCredit(image);
  if (!credit) return null;
  const license = licenseUrl(credit.license);
  return (
    <p className={`font-body text-xs font-light leading-relaxed text-[var(--muted)] ${className}`}>
      Photo:{' '}
      <a href={credit.source} className="underline decoration-1 underline-offset-2 hover:text-[var(--accent-text)]" rel="noreferrer">
        {credit.author}
      </a>
      ,{' '}
      {license ? (
        <a href={license} className="underline decoration-1 underline-offset-2 hover:text-[var(--accent-text)]" rel="noreferrer license">
          {credit.license}
        </a>
      ) : (
        credit.license
      )}
      , via Wikimedia Commons. Cut out and set on our studio backdrop{credit.mirrored ? ', mirrored' : ''}.
    </p>
  );
}
