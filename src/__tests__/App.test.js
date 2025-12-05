/**
 * World-Studio – Stable Full Test Suite
 * Ensures App renders, links work, routing works,
 * components mount without crash, buttons are accessible.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

// Mock socket.io to avoid live WebRTC/socket issues
jest.mock("./api/socket", () => ({
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
}));

// Mock localStorage
beforeEach(() => {
  Storage.prototype.getItem = jest.fn(() => null);
  Storage.prototype.setItem = jest.fn();
  Storage.prototype.removeItem = jest.fn();
});

describe("World-Studio App – Stable Test Suite", () => {

  test("renders invisible <h1> heading for tests", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  test("renders navigation bar", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/world-studio live/i)).toBeInTheDocument();
  });

  test("renders at least one button", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  test("all buttons have accessible names", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn).toHaveAccessibleName();
    });
  });

  test("can navigate: clicking '📈 Stocks' loads StockPredictor", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    const stocksLink = screen.getByText("📈 Stocks");
    fireEvent.click(stocksLink);

    // Predictor renders data-testid="predictor-card"
    const predictorCard = screen.getByTestId("predictor-card");
    expect(predictorCard).toBeInTheDocument();
  });

  test("home route loads without crash", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/feed/i)).toBeInTheDocument();
  });

  test("discover route loads without crash", () => {
    render(
      <MemoryRouter initialEntries={["/discover"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/live\+ discovery/i)).toBeInTheDocument();
  });

  test("upload requires auth but renders wrapper", () => {
    render(
      <MemoryRouter initialEntries={["/upload"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/please log in first/i)).toBeInTheDocument();
  });

  test("snapshot – stable rendering", () => {
    const { asFragment } = render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
