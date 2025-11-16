import { render, screen } from "@testing-library/react";
import NotificationsPage from "../components/NotificationsCenter";
import axios from "axios";

jest.mock("axios");
jest.mock("../api/socket", () => ({
    on: jest.fn(),
    off: jest.fn(),
}));

describe("NotificationsPage", () => {
    test("renders notification header", () => {
        axios.get.mockResolvedValue({
            data: { notifications: [], totalPages: 1 }
        });

        render(<NotificationsPage token="abc" />);
        expect(screen.getByText(/Notifications Center/i)).toBeInTheDocument();
    });
});
