import { subjectLabel } from './options';
import type { StudentProfile } from './types';

/** A brief description from applied preferences, never inferred personality or achievements. */
export function studentSummary(profile: StudentProfile): string {
  const interest =
    profile.subject === 'any'
      ? 'Still exploring academic interests'
      : `Interested in ${subjectLabel(profile.subject).toLowerCase()}`;
  const priorities = [
    profile.handsOn && 'hands-on learning',
    profile.needsAid && 'financial aid',
    profile.warmWeather && 'warmer weather',
  ].filter((value): value is string => Boolean(value));
  const location = {
    any: '',
    'near-home': 'close to home',
    'in-state': 'in their home state',
    northeast: 'in the Northeast',
    south: 'in the South',
    midwest: 'in the Midwest',
    west: 'in the West',
  }[profile.geography];
  const preferences = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(
    priorities,
  );
  const search = preferences || (location ? 'colleges' : '');
  return `${interest}.${search ? ` Looking for ${search}${location ? ` ${location}` : ''}.` : ''}`;
}
