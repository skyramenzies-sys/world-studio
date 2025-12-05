import { render, screen, fireEvent } from "@testing-library/react";
import StockPredictor from "../components/StockPredictor";

global.fetch = jest.fn();

describe("StockPredictor", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("renders predictor card", () => {
        fetch.mockResolvedValue({
            ok: true,
            json: async () => ([
                { symbol: "AAPL", name: "Apple", type: "stock" }
            ])
        });

        render(<StockPredictor />);
        expect(screen.getByTestId("predictor-card")).toBeInTheDocument();
    });

    test("loads supported stocks", async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ([
                { symbol: "AAPL", name: "Apple", type: "stock" }
            ])
        });

        render(<StockPredictor />);
        expect(await screen.findByText(/Apple/i)).toBeInTheDocument();
    });
});
