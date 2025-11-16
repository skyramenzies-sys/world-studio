import { render, screen, fireEvent } from "@testing-library/react";
import UploadPage from "../components/UploadPage";

describe("UploadPage", () => {
    test("renders upload form", () => {
        render(<UploadPage onUpload={jest.fn()} />);

        expect(screen.getByText(/Upload Content/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument();
    });

    test("shows error if file missing", () => {
        render(<UploadPage onUpload={jest.fn()} />);
        fireEvent.click(screen.getByRole("button", { name: /publish/i }));
        expect(screen.getByText(/please select a file/i)).toBeInTheDocument();
    });
});
