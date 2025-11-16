import { render, screen } from "@testing-library/react";
import ProfilePage from "../components/ProfilePage";
import axios from "axios";

jest.mock("axios");

describe("ProfilePage", () => {
    test("renders user profile", async () => {
        axios.get
            .mockResolvedValueOnce({ data: { username: "Sandro" } }) // profile
            .mockResolvedValueOnce({ data: [] }) // streams
            .mockResolvedValueOnce({ data: [] }); // gifts

        render(<ProfilePage userId="123" token="abc" />);

        expect(await screen.findByText(/Sandro/i)).toBeInTheDocument();
    });
});
