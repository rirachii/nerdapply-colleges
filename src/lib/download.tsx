import { pdf } from '@react-pdf/renderer';
import { registerPdfFonts, StudentPdf } from '../components/StudentPdf';
import type { Recommendation, StudentProfile } from './types';

export async function createStudentPdf(
  profile: StudentProfile,
  items: Recommendation[],
  note: string,
) {
  registerPdfFonts(location.origin);
  return pdf(
    <StudentPdf
      profile={profile}
      items={items}
      note={note}
      logoSrc={`${location.origin}/brand/nerdapply-logo.png`}
    />,
  ).toBlob();
}

export async function downloadStudentPdf(
  profile: StudentProfile,
  items: Recommendation[],
  note: string,
) {
  const blob = await createStudentPdf(profile, items, note);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const safeName =
    (profile.name || 'student')
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 70) || 'student';
  anchor.download = `${safeName.toLowerCase()}-college-guide.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Keep the URL alive long enough for browsers to finish starting the download.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
