import { render, screen } from "@testing-library/react";
import LiveViewer from "../components/LiveViewer";

jest.mock("../api/socket", () => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
}));

describe("LiveViewer", () => {
    test("renders LIVE status", () => {
        render(<LiveViewer roomId="test-room" />);
        expect(screen.getByText(/LIVE/i)).toBeInTheDocument();
    });
});
