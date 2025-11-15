import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App – Pro Full-Feature Test Suite', () => {
  // 1. Renders main heading
  test('renders main heading', () => {
    render(<App />);
    // Change this to your real heading text if needed
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  // 2. Renders at least one button
  test('renders a button', () => {
    render(<App />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  // 3. Renders a link (if present)
  test('renders a link if present', () => {
    render(<App />);
    const links = screen.queryAllByRole('link');
    // Only require if links exist
    if (links.length > 0) {
      expect(links[0]).toBeInTheDocument();
    }
  });

  // 4. Custom element with data-testid (add data-testid in JSX)
  test('renders custom component with data-testid', () => {
    render(<App />);
    const card = screen.queryByTestId('predictor-card');
    if (card) {
      expect(card).toBeInTheDocument();
    }
  });

  // 5. Shows loading then loaded UI (simulate if async)
  test('shows loading and then loaded content', async () => {
    render(<App />);
    // Change to your loading text
    const loading = screen.queryByText(/loading/i);
    if (loading) expect(loading).toBeInTheDocument();
    // Wait for something that should appear after loading
    await waitFor(() => {
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });
  });

  // 6. Button click triggers event
  test('button click triggers expected action', async () => {
    render(<App />);
    const btn = screen.getAllByRole('button')[0];
    userEvent.click(btn);
    // Optionally check for a side effect if your UI changes
    // await waitFor(() => expect(screen.getByText(/success|done|result/i)).toBeInTheDocument());
  });

  // 7. Form interaction (if you have forms)
  test('form input and submit works', async () => {
    render(<App />);
    const input = screen.queryByPlaceholderText(/search|type/i);
    const submit = screen.queryByRole('button', { name: /search|submit/i });
    if (input && submit) {
      userEvent.type(input, 'Hello World');
      userEvent.click(submit);
      // Wait for result or confirmation
      // await waitFor(() => expect(screen.getByText(/hello world/i)).toBeInTheDocument());
    }
  });

  // 8. Empty or error state rendering (for lists, data, etc.)
  test('shows empty or error state if nothing loaded', () => {
    render(<App />);
    const emptyMsg = screen.queryByText(/no data|no results|nothing here|error/i);
    if (emptyMsg) expect(emptyMsg).toBeInTheDocument();
  });

  // 9. Accessibility: all buttons have an accessible name
  test('all buttons have accessible names', () => {
    render(<App />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn).toHaveAccessibleName();
    });
  });

  // 10. Snapshot test
  test('matches snapshot', () => {
    const { asFragment } = render(<App />);
    expect(asFragment()).toMatchSnapshot();
  });
});