import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SearchView from "./SearchView";

describe("SearchView", () => {
	beforeEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it("debounces search requests", async () => {
		const searchMock = vi.spyOn(window.ncea, "search").mockResolvedValueOnce([]);

		render(<SearchView onSelectStandard={vi.fn()} />);

		fireEvent.change(screen.getByRole("textbox"), {
			target: { value: "91524" },
		});

		expect(searchMock).not.toHaveBeenCalled();

		await waitFor(
			() => {
				expect(searchMock).toHaveBeenCalledWith("91524");
			},
			{
				timeout: 1500,
			}
		);
	});

});
