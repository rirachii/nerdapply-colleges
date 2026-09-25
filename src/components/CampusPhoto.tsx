import { useState } from 'react';
import photosData from '../data/campus-photos.json';
import officialPhotos from '../data/official-campus-photos.json';
import type { College } from '../lib/types';

type CampusImage = {
  src: string;
  alt: string;
  title: string;
  author: string;
  source: string;
  license: string;
  licenseUrl: string;
};
export const campusPhotos: Record<string, CampusImage> = { ...officialPhotos, ...photosData };

function websiteIcon(website: string | null) {
  if (!website) return null;
  try {
    const url = new URL('/favicon.ico', website);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.protocol = 'https:';
    return url.href;
  } catch {
    return null;
  }
}

export function CampusPhoto({ college }: { college: Pick<College, 'id' | 'name' | 'website'> }) {
  const [failed, setFailed] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);
  const [iconLoaded, setIconLoaded] = useState(false);
  const photo = campusPhotos[college.id];
  if (!photo || failed) {
    const icon = websiteIcon(college.website);
    const initials = college.name
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word && !['of', 'the', 'at', 'and'].includes(word.toLowerCase()))
      .slice(0, 3)
      .map((word) => word[0])
      .join('');
    return (
      <figure className="campus-photo campus-logo">
        {(!iconLoaded || iconFailed) && (
          <span
            className="college-monogram"
            role="img"
            aria-label={`Image placeholder for ${college.name}`}
          >
            {initials}
          </span>
        )}
        {icon && !iconFailed && (
          <img
            src={icon}
            alt={`${college.name} website icon`}
            className={iconLoaded ? 'is-loaded' : ''}
            aria-hidden={!iconLoaded}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setIconLoaded(true)}
            onError={() => setIconFailed(true)}
          />
        )}
      </figure>
    );
  }
  return (
    <figure className="campus-photo">
      <img
        src={photo.src}
        alt={photo.alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </figure>
  );
}

export function CampusPhotoCredits({ collegeIds }: { collegeIds: number[] }) {
  const photos = collegeIds.map((id) => campusPhotos[id]).filter(Boolean);
  return (
    <details className="photo-credits">
      <summary>Image credits</summary>
      <p>
        Images are cropped for display. Official-site images remain the property of their respective
        owners; they are not Creative Commons assets.
      </p>
      <p>
        When a campus photo is unavailable, the icon from the college’s linked official website is
        used. These icons remain the property of their respective schools. Initials are a temporary
        placeholder when an icon is unavailable, not an official logo.
      </p>
      <ul>
        {photos.map((photo) => (
          <li key={photo.src}>
            <a
              href={photo.source}
              target="_blank"
              rel="noreferrer"
              aria-label={`Photo credit: ${photo.title} by ${photo.author}`}
            >
              {photo.title} — {photo.author}
            </a>
            <span> · </span>
            <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
              {photo.license}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
