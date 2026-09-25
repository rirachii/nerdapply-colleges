// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { EXAMPLES } from '../src/lib/options';
const download = vi.fn().mockResolvedValue(undefined);
const createPdf = vi.fn().mockResolvedValue(new Blob(['test PDF'], { type: 'application/pdf' }));
const BaseURL = URL;
vi.mock('../src/lib/download', () => ({
  downloadStudentPdf: (...args: unknown[]) => download(...args),
  createStudentPdf: (...args: unknown[]) => createPdf(...args),
}));
let intersect: (() => void) | undefined;
function scrollToMore() {
  expect(intersect).toBeDefined();
  act(() => intersect!());
}
beforeEach(() => {
  intersect = undefined;
  vi.stubGlobal(
    'URL',
    class extends BaseURL {
      static createObjectURL = vi.fn(() => 'blob:test-pdf');
      static revokeObjectURL = vi.fn();
    },
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }
      observe(target: Element) {
        if (target.getAttribute('aria-label') !== 'College browsing progress') return;
        intersect = () =>
          this.callback(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
      }
      unobserve() {}
      disconnect() {
        intersect = undefined;
      }
    },
  );
  location.hash = '';
  download.mockClear();
  window.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function generate(index = 0) {
  const user = userEvent.setup();
  render(<App />);
  // Native popover interaction is checked in Comet; jsdom does not open popovers.
  await user.click(screen.getByLabelText('Student description'));
  await user.paste(EXAMPLES[index].text);
  await user.click(screen.getByRole('button', { name: 'Find colleges' }));
  return user;
}
describe('counselor workflow', () => {
  it('carries a 25-school brief into the starting list and editable preferences', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByLabelText('Student description'));
    await user.paste('Give me 25 schools');
    await user.click(screen.getByRole('button', { name: 'Find colleges' }));
    expect(screen.getAllByRole('article')).toHaveLength(25);
    expect(
      within(screen.getByRole('complementary', { name: 'Student preferences' })).getByText(
        '25 colleges',
      ),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('checkbox', { name: /Include .+ in student handout/ })
        .filter((input) => (input as HTMLInputElement).checked),
    ).toHaveLength(25);
    await user.click(screen.getByRole('button', { name: 'Edit preferences' }));
    expect(screen.getByLabelText('Shortlist length')).toHaveValue('25');
  });
  it('defaults to All and filters Safety, Target, and Reach without changing selection', async () => {
    const user = await generate();
    const all = screen.getByRole('button', { name: /^All / });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: /^Not enough data / })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Broader access / })).not.toBeInTheDocument();
    const selection = screen.getByRole('complementary', { name: 'Selected colleges' });
    const originalSelection = selection.textContent;
    for (const band of ['Safety', 'Target', 'Reach']) {
      const tab = screen.getByRole('button', { name: new RegExp(`^${band} `) });
      await user.click(tab);
      expect(tab).toHaveAttribute('aria-pressed', 'true');
      expect(all).toHaveAttribute('aria-pressed', 'false');
      for (const card of screen.getAllByRole('article')) {
        expect(card.querySelector('.band')).toHaveTextContent(band);
      }
      expect(selection.textContent).toBe(originalSelection);
    }
    await user.click(all);
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(selection.textContent).toBe(originalSelection);
    await user.click(screen.getByRole('button', { name: /^Reach / }));
    await user.click(screen.getByRole('button', { name: 'Prepare handout' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('button', { name: /^All / })).toHaveAttribute('aria-pressed', 'true');
  });
  it('opens school details from the card or keyboard without changing selection', async () => {
    const user = await generate();
    const card = screen.getByRole('article', { name: 'West Chester University of Pennsylvania' });
    const details = card.querySelector('details')!;
    const title = within(card).getByRole('button', {
      name: 'West Chester University of Pennsylvania',
    });
    const selection = within(card).getByRole('checkbox');
    expect(details).not.toHaveAttribute('open');
    await user.click(within(card).getByRole('img'));
    expect(details).toHaveAttribute('open');
    expect(title).toHaveAttribute('aria-expanded', 'true');
    expect(selection).toBeChecked();
    await user.click(
      within(card).getByText(
        'Institution-wide averages. Net price is not a personal cost estimate.',
      ),
    );
    expect(details).toHaveAttribute('open');
    await user.click(selection);
    expect(selection).not.toBeChecked();
    expect(details).toHaveAttribute('open');
    await user.click(within(card).getByText('Why this school & what to check'));
    expect(details).not.toHaveAttribute('open');
    title.focus();
    await user.keyboard('{Enter}');
    expect(details).toHaveAttribute('open');
    await user.keyboard(' ');
    expect(details).not.toHaveAttribute('open');
    await user.click(card.querySelector('.location')!);
    expect(details).toHaveAttribute('open');
    const context = screen.getByText('About this shortlist').closest('details')!;
    expect(context).not.toHaveAttribute('open');
    expect(card.compareDocumentPosition(context) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('keeps the selected-colleges panel in sync across filtering, removal, and expansion', async () => {
    const user = await generate();
    const selected = () => screen.getByRole('complementary', { name: 'Selected colleges' });
    expect(within(selected()).getAllByRole('listitem')).toHaveLength(10);
    await user.click(
      within(selected()).getByRole('button', {
        name: 'Remove Drexel University from selected colleges',
      }),
    );
    expect(within(selected()).getAllByRole('listitem')).toHaveLength(9);
    expect(
      screen.getByRole('checkbox', { name: 'Include Drexel University in student handout' }),
    ).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: /^Reach / }));
    expect(within(selected()).getAllByRole('listitem')).toHaveLength(9);
    scrollToMore();
    expect(within(selected()).getAllByRole('listitem')).toHaveLength(9);
    await user.click(screen.getByRole('button', { name: 'Prepare handout' }));
    await user.click(screen.getByRole('button', { name: 'Download student PDF' }));
    expect(download.mock.calls[0][1]).toHaveLength(9);
    expect(
      download.mock.calls[0][1].some(
        (item: { college: { name: string } }) => item.college.name === 'Drexel University',
      ),
    ).toBe(false);
  });

  it('shows applied preferences beside results and updates them through review', async () => {
    const user = await generate();
    const summary = () => screen.getByRole('complementary', { name: 'Student preferences' });
    expect(
      screen.getByRole('heading', { name: 'John Smith’s college shortlist' }),
    ).toBeInTheDocument();
    expect(summary()).toHaveTextContent('Pennsylvania');
    expect(summary()).toHaveTextContent('1230');
    await user.click(within(summary()).getByRole('button', { name: 'Edit preferences' }));
    await user.clear(screen.getByLabelText(/Student name/));
    await user.type(screen.getByLabelText(/Student name/), 'Casey Morgan');
    await user.selectOptions(screen.getByLabelText('College type'), 'public');
    await user.click(screen.getByRole('button', { name: 'Update shortlist' }));
    expect(
      screen.getByRole('heading', { name: 'Casey Morgan’s college shortlist' }),
    ).toBeInTheDocument();
    expect(summary()).toHaveTextContent('Public only');
    expect(
      screen.queryByRole('heading', { name: 'John Smith’s college shortlist' }),
    ).not.toBeInTheDocument();
  });
  it('searches beyond the first batch and includes a new result without losing the existing selection', async () => {
    const user = await generate();
    await user.type(
      screen.getByRole('searchbox', { name: 'Search matching colleges' }),
      'Carnegie Mellon',
    );
    expect(screen.getAllByRole('article')).toHaveLength(1);
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Include Carnegie Mellon University in student handout',
      }),
    );
    const selected = screen.getByRole('complementary', { name: 'Selected colleges' });
    expect(within(selected).getAllByRole('listitem')).toHaveLength(11);
    await user.clear(screen.getByRole('searchbox'));
    expect(screen.getAllByRole('article')).toHaveLength(10);
    expect(selected).toHaveTextContent('Carnegie Mellon University');
    await user.type(screen.getByRole('searchbox'), 'no-such-school-xyz');
    expect(screen.getByRole('heading', { name: 'No matching colleges' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getAllByRole('article')).toHaveLength(10);
  });
  it('filters by full state name or abbreviation without changing the PDF selection', async () => {
    const user = await generate();
    const search = screen.getByRole('searchbox', { name: 'Search matching colleges' });
    const selected = screen.getByRole('complementary', { name: 'Selected colleges' });
    const originalSelection = selected.textContent;
    await user.type(search, '  new YORK  ');
    const stateResults = screen
      .getAllByRole('article')
      .map((card) => card.getAttribute('aria-label'));
    for (const card of screen.getAllByRole('article')) {
      expect(card.querySelector('.location')).toHaveTextContent(/, NY/);
    }
    await user.clear(search);
    await user.type(search, 'ny');
    expect(screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'))).toEqual(
      stateResults,
    );
    expect(selected.textContent).toBe(originalSelection);
    await user.clear(search);
    await user.type(search, 'California');
    expect(screen.getByRole('heading', { name: 'No matching colleges' })).toBeInTheDocument();
    expect(selected.textContent).toBe(originalSelection);
  });
  it('keeps a college selectable if its campus image fails to load', async () => {
    const user = await generate();
    const card = screen.getByRole('article', { name: 'West Chester University of Pennsylvania' });
    fireEvent.error(within(card).getByRole('img'));
    expect(within(card).getByRole('img', { name: /Image placeholder/ })).toBeInTheDocument();
    const icon = card.querySelector('.campus-logo img')!;
    expect(icon).toHaveAttribute('referrerpolicy', 'no-referrer');
    fireEvent.load(icon);
    expect(within(card).getByRole('img', { name: /website icon/ })).toBeInTheDocument();
    fireEvent.error(icon);
    expect(within(card).getByRole('img', { name: /Image placeholder/ })).toBeInTheDocument();
    await user.click(
      within(card).getByRole('checkbox', {
        name: 'Include West Chester University of Pennsylvania in student handout',
      }),
    );
    expect(
      within(card).getByRole('checkbox', {
        name: 'Include West Chester University of Pennsylvania in student handout',
      }),
    ).not.toBeChecked();
  });
  it('shows useful validation for an empty description', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Find colleges' }));
    expect(screen.getByRole('alert')).toHaveTextContent('more detail');
  });
  it('automatically fills editable preference fields from a messy brief', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByLabelText('Student description'));
    await user.paste(
      'Name: Maya Chen; home state: ca; interested in CS; SAT 1,420; GPA: 3.8; wants 8 colleges, medium-sized campus, public only, west coast, needs financial help, prefers warmer weather and project-based learning.',
    );
    await user.click(screen.getByRole('button', { name: 'Find colleges' }));
    await user.click(screen.getByRole('button', { name: 'Edit preferences' }));
    expect(screen.getByLabelText(/Student name/)).toHaveValue('Maya Chen');
    expect(screen.getByLabelText('Home state')).toHaveValue('CA');
    expect(screen.getByLabelText('Primary interest')).toHaveValue('computing');
    expect(screen.getByRole('spinbutton', { name: 'SAT' })).toHaveValue(1420);
    expect(screen.getByRole('spinbutton', { name: 'GPA' })).toHaveValue(3.8);
    expect(screen.getByRole('spinbutton', { name: 'ACT' })).toHaveValue(null);
    expect(screen.getByLabelText('Campus size')).toHaveValue('medium');
    expect(screen.getByLabelText('College type')).toHaveValue('public');
    expect(screen.getByLabelText('Shortlist length')).toHaveValue('8');
    expect(screen.getByLabelText('Prioritize affordability')).toBeChecked();
    expect(screen.getByLabelText('Hands-on learning')).toBeChecked();
    expect(screen.getByLabelText('Warmer weather')).toBeChecked();
  });
  it('validates preferences through the footer and focuses the error', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByLabelText('Student description'));
    await user.paste(EXAMPLES[0].text);
    await user.click(screen.getByRole('button', { name: 'Find colleges' }));
    await user.click(screen.getByRole('button', { name: 'Edit preferences' }));
    await user.selectOptions(screen.getByLabelText('Home state'), '');
    await user.click(screen.getByRole('button', { name: 'Update shortlist' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a home state');
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: /^Back$/ }));
    expect(screen.getByLabelText('Student description')).toHaveValue(EXAMPLES[0].text);
  });
  it('builds the example and removes a school from the actual PDF payload', async () => {
    const user = await generate();
    expect(
      screen.getByRole('heading', { name: 'John Smith’s college shortlist' }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('checkbox', { name: 'Include Drexel University in student handout' }),
    );
    await user.click(screen.getAllByRole('button', { name: 'Prepare handout' })[0]);
    await user.type(screen.getByLabelText('Student-facing counselor note'), 'Let’s discuss costs.');
    await user.click(screen.getByRole('button', { name: 'Download student PDF' }));
    expect(download).toHaveBeenCalledOnce();
    const [profile, items, note] = download.mock.calls[0];
    expect(profile.name).toBe('John Smith');
    expect(items).toHaveLength(9);
    expect(
      items.some((r: { college: { name: string } }) => r.college.name === 'Drexel University'),
    ).toBe(false);
    expect(note).toBe('Let’s discuss costs.');
    expect(JSON.stringify(download.mock.calls[0])).not.toContain('Congressional App Challenge');
  });
  it('applies edited preferences and restores removed schools on update', async () => {
    const user = await generate();
    await user.click(
      screen.getByRole('checkbox', { name: 'Include Drexel University in student handout' }),
    );
    await user.click(screen.getByRole('button', { name: 'Edit preferences' }));
    await user.selectOptions(screen.getByLabelText('College type'), 'public');
    await user.click(screen.getByRole('button', { name: 'Update shortlist' }));
    expect(screen.queryByRole('heading', { name: 'Drexel University' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Restore all' })).not.toBeInTheDocument();
  });
  it('disables PDF export when every college has been removed', async () => {
    const user = await generate();
    for (const button of screen.getAllByRole('checkbox', { name: /^Include / }))
      await user.click(button);
    expect(screen.getAllByRole('button', { name: 'Prepare handout' })[0]).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Restore all' }));
    expect(screen.getAllByRole('button', { name: 'Prepare handout' })[0]).toBeEnabled();
  });
  it('browses beyond twenty without reordering, duplicating, or changing PDF selection', async () => {
    const user = await generate();
    const original = screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'));
    await user.click(
      screen.getByRole('checkbox', { name: 'Include Drexel University in student handout' }),
    );
    scrollToMore();
    const expanded = screen.getAllByRole('article');
    expect(expanded).toHaveLength(20);
    expect(expanded.slice(0, 10).map((card) => card.getAttribute('aria-label'))).toEqual(original);
    expect(within(expanded[10]).getByRole('checkbox', { name: /^Include / })).not.toBeChecked();
    scrollToMore();
    const all = screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'));
    expect(all).toHaveLength(30);
    expect(new Set(all).size).toBe(30);
    expect(screen.queryByRole('button', { name: 'Show more colleges' })).not.toBeInTheDocument();
    expect(intersect).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Prepare handout' }));
    await user.click(screen.getByRole('button', { name: 'Download student PDF' }));
    expect(download.mock.calls[0][1]).toHaveLength(9);
    expect(
      download.mock.calls[0][1].some(
        (item: { college: { name: string } }) => item.college.name === 'Drexel University',
      ),
    ).toBe(false);
  });
  it('resets automatic browsing after search changes and stops at the end of results', async () => {
    const user = await generate();
    scrollToMore();
    expect(screen.getAllByRole('article')).toHaveLength(20);
    await user.type(screen.getByRole('searchbox'), 'Carnegie Mellon');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('You’ve seen all matching colleges.')).toBeInTheDocument();
    expect(intersect).toBeUndefined();
    await user.clear(screen.getByRole('searchbox'));
    expect(screen.getAllByRole('article')).toHaveLength(10);
    expect(intersect).toBeDefined();
    expect(
      within(screen.getByRole('complementary', { name: 'Selected colleges' })).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(10);
  });
  it('supports keyboard selection through the corner checkbox', async () => {
    const user = await generate();
    const checkbox = screen.getByRole('checkbox', {
      name: 'Include Drexel University in student handout',
    });
    checkbox.focus();
    await user.keyboard('[Space]');
    expect(checkbox).not.toBeChecked();
    expect(screen.getByRole('complementary', { name: 'Selected colleges' })).not.toHaveTextContent(
      'Drexel University',
    );
    await user.keyboard('[Space]');
    expect(checkbox).toBeChecked();
    expect(screen.getByRole('complementary', { name: 'Selected colleges' })).toHaveTextContent(
      'Drexel University',
    );
  });
  it('keeps sparse academic scores blank and all marine results exploratory', async () => {
    const user = await generate(1);
    expect(screen.getByRole('button', { name: 'All 6' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: /^Not enough data / })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more colleges' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reach 0' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Edit preferences' }));
    expect(screen.getByRole('spinbutton', { name: 'SAT' })).toHaveValue(null);
  });
  it('filters the visible cards without silently changing PDF selection', async () => {
    const user = await generate();
    await user.click(screen.getByRole('button', { name: /^Reach / }));
    expect(screen.getAllByRole('article').length).toBeGreaterThanOrEqual(2);
    await user.click(screen.getAllByRole('button', { name: 'Prepare handout' })[0]);
    await user.click(screen.getByRole('button', { name: 'Download student PDF' }));
    expect(download.mock.calls[0][1]).toHaveLength(10);
  });
  it('shows a recoverable PDF failure without losing the list', async () => {
    download.mockRejectedValueOnce(new Error('Test PDF failure'));
    const user = await generate();
    await user.click(screen.getAllByRole('button', { name: 'Prepare handout' })[0]);
    await user.click(screen.getByRole('button', { name: 'Download student PDF' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be created');
    expect(screen.getByRole('button', { name: 'Download student PDF' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('article', { name: 'Drexel University' })).toBeInTheDocument();
  });
  it('preserves the story when returning to edit', async () => {
    const user = await generate();
    await user.click(screen.getByRole('button', { name: /Student brief/ }));
    expect(screen.getByLabelText('Student description')).toHaveValue(EXAMPLES[0].text);
  });
  it('blocks stale export until preference changes are applied', async () => {
    const user = await generate();
    await user.click(screen.getByRole('button', { name: 'Edit preferences' }));
    await user.clear(screen.getByRole('spinbutton', { name: 'SAT' }));
    await user.type(screen.getByRole('spinbutton', { name: 'SAT' }), '1500');
    expect(screen.getByRole('button', { name: 'Handout' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Update shortlist' }));
    await user.click(screen.getAllByRole('button', { name: 'Prepare handout' })[0]);
    expect(screen.getByRole('button', { name: 'Download student PDF' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Download student PDF' }));
    expect(download.mock.calls[0][0].sat).toBe(1500);
  });
  it('preserves exclusions and the student note when navigating back through steps', async () => {
    const user = await generate();
    await user.click(
      screen.getByRole('checkbox', { name: 'Include Drexel University in student handout' }),
    );
    await user.click(screen.getAllByRole('button', { name: 'Prepare handout' })[0]);
    await user.type(screen.getByLabelText('Student-facing counselor note'), 'Visit together.');
    await user.click(screen.getByRole('button', { name: /Student brief/ }));
    await user.click(screen.getByRole('button', { name: 'Find colleges' }));
    expect(
      screen.getByRole('checkbox', { name: 'Include Drexel University in student handout' }),
    ).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Prepare handout' })[0]);
    expect(screen.getByLabelText('Student-facing counselor note')).toHaveValue('Visit together.');
  });
  it('goes directly from brief to colleges with optional preference editing', async () => {
    const user = await generate();
    expect(
      screen.getByRole('heading', { name: 'John Smith’s college shortlist' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(10);
    expect(
      within(screen.getByRole('navigation', { name: 'Student workspace' })).getAllByRole('button'),
    ).toHaveLength(3);
    expect(screen.getByText('Inferred from your brief — please confirm.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit preferences' }));
    expect(screen.getByRole('heading', { name: 'Edit student preferences' })).toBeInTheDocument();
  });
  it('keeps nearby constraints when the brief has no home state', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByLabelText('Student description'));
    await user.paste('A student who loves programming wants colleges close to home.');
    await user.click(screen.getByRole('button', { name: 'Find colleges' }));
    expect(screen.getByRole('heading', { name: 'Your college shortlist' })).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Search guidance' })).getByText(
        'Choose a home state to search nearby, or select Anywhere in the US.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Prepare handout' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Adjust preferences' }));
    await user.selectOptions(screen.getByLabelText('Home state'), 'PA');
    await user.click(screen.getByRole('button', { name: 'Update shortlist' }));
    expect(screen.getAllByRole('article').length).toBeGreaterThan(0);
  });
  it('cancels optional edits without losing selections', async () => {
    const user = await generate();
    await user.click(
      screen.getByRole('checkbox', { name: 'Include Drexel University in student handout' }),
    );
    await user.click(screen.getByRole('button', { name: 'Edit preferences' }));
    await user.selectOptions(screen.getByLabelText('College type'), 'public');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      screen.getByRole('checkbox', { name: 'Include Drexel University in student handout' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit preferences' }));
    expect(screen.getByLabelText('College type')).toHaveValue('any');
  });
  it('discards preference edits without losing the current selection', async () => {
    const user = await generate();
    await user.click(
      screen.getByRole('checkbox', { name: 'Include Drexel University in student handout' }),
    );
    await user.click(screen.getByRole('button', { name: 'Edit preferences' }));
    await user.clear(screen.getByRole('spinbutton', { name: 'SAT' }));
    await user.type(screen.getByRole('spinbutton', { name: 'SAT' }), '1500');
    await user.click(
      screen.getByRole('button', { name: 'Discard edits and return to current list' }),
    );
    expect(
      screen.getByRole('checkbox', { name: 'Include Drexel University in student handout' }),
    ).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Prepare handout' })[0]);
    await user.click(screen.getByRole('button', { name: 'Download student PDF' }));
    expect(download.mock.calls[0][0].sat).toBe(1230);
    expect(download.mock.calls[0][1]).toHaveLength(9);
  });
  it('blocks the old shortlist when the student brief changes', async () => {
    const user = await generate();
    await user.click(screen.getByRole('button', { name: 'Student brief' }));
    await user.type(screen.getByLabelText('Student description'), ' Needs financial aid.');
    expect(screen.getByRole('button', { name: 'College list' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Handout' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Find colleges' }));
    expect(screen.getByRole('complementary', { name: 'Student preferences' })).toHaveTextContent(
      'Financial aid matters',
    );
  });
});
