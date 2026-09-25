// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HandoutPreview } from '../src/components/HandoutPreview';
import { parseStudent } from '../src/lib/parse';
import { recommend } from '../src/lib/recommend';
import { EXAMPLES } from '../src/lib/options';

const createPdf = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/download', () => ({ createStudentPdf: createPdf }));
const profile = parseStudent(EXAMPLES[0].text).profile;
const items = recommend(profile).items;
const BaseURL = URL;
const createUrl = vi.fn();
const revokeUrl = vi.fn();

beforeEach(() => {
  createPdf.mockReset().mockResolvedValue(new Blob(['PDF'], { type: 'application/pdf' }));
  createUrl.mockReset().mockImplementation(() => `blob:preview-${createUrl.mock.calls.length}`);
  revokeUrl.mockReset();
  vi.stubGlobal(
    'URL',
    class extends BaseURL {
      static createObjectURL = createUrl;
      static revokeObjectURL = revokeUrl;
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('embedded handout preview', () => {
  it('automatically embeds the real generated blob and updates the note', async () => {
    const view = render(<HandoutPreview profile={profile} items={items} note="First note" />);
    const frame = await screen.findByTitle('Student handout PDF');
    expect(frame).toHaveAttribute('src', 'blob:preview-1#view=FitH');
    expect(createPdf).toHaveBeenLastCalledWith(profile, items, 'First note');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.rerender(<HandoutPreview profile={profile} items={items} note="Updated note" />);
    expect(screen.queryByTitle('Student handout PDF')).not.toBeInTheDocument();
    expect(revokeUrl).toHaveBeenCalledWith('blob:preview-1');
    expect(await screen.findByTitle('Student handout PDF')).toHaveAttribute(
      'src',
      'blob:preview-2#view=FitH',
    );
    expect(createPdf).toHaveBeenLastCalledWith(profile, items, 'Updated note');
    view.unmount();
    expect(revokeUrl).toHaveBeenCalledWith('blob:preview-2');
  });

  it('ignores an older generation that finishes after the updated preview', async () => {
    let resolveOld!: (blob: Blob) => void;
    createPdf.mockImplementationOnce(
      () =>
        new Promise<Blob>((resolve) => {
          resolveOld = resolve;
        }),
    );
    const view = render(<HandoutPreview profile={profile} items={items} note="Old note" />);
    await waitFor(() => expect(createPdf).toHaveBeenCalledTimes(1));
    view.rerender(<HandoutPreview profile={profile} items={items} note="New note" />);
    expect(await screen.findByTitle('Student handout PDF')).toHaveAttribute(
      'src',
      'blob:preview-1#view=FitH',
    );
    await act(async () => resolveOld(new Blob(['old'])));
    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(screen.getByTitle('Student handout PDF')).toHaveAttribute(
      'src',
      'blob:preview-1#view=FitH',
    );
  });

  it('offers retry after generation fails', async () => {
    createPdf.mockRejectedValueOnce(new Error('Generation failed'));
    render(<HandoutPreview profile={profile} items={items} note="" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Your work is still here');
    fireEvent.click(screen.getByRole('button', { name: 'Retry preview' }));
    expect(await screen.findByTitle('Student handout PDF')).toHaveAttribute(
      'src',
      'blob:preview-1#view=FitH',
    );
  });
});
