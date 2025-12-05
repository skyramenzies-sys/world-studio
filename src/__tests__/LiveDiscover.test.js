import { render, screen } from "@testing-library/react";
import LiveDiscover from "../components/LiveDiscover";
import axios from "axios";

jest.mock("axios");
jest.mock("../api/socket", () => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
}));

describe("LiveDiscover", () => {
    test("renders discover heading", () => {
        axios.get.mockResolvedValue({ data: [] });
        render(<LiveDiscover />);
        expect(screen.getByText(/LIVE\+ Discovery/i)).toBeInTheDocument();
    });
});
