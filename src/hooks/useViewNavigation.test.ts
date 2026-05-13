import { act, fireEvent, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useViewNavigation } from "./useViewNavigation";

describe("useViewNavigation", () => {
  it("opens and exits years view with Backspace", () => {
    const { result } = renderHook(() => useViewNavigation());

    act(() => {
      result.current.openYearsView({ standardId: "91524" });
    });

    expect(result.current.view).toBe("years");
    expect(result.current.selectedStandard).toEqual({ standardId: "91524" });

    act(() => {
      fireEvent.keyDown(window, { key: "Backspace" });
    });

    expect(result.current.view).toBe("search");
    expect(result.current.selectedStandard).toBeNull();
  });

  it("restores previous view when toggling settings/downloads", () => {
    const { result } = renderHook(() => useViewNavigation());

    act(() => {
      result.current.openYearsView({ standardId: "91524" });
    });

    act(() => {
      result.current.toggleSettings();
    });

    expect(result.current.view).toBe("settings");

    act(() => {
      result.current.toggleSettings();
    });

    expect(result.current.view).toBe("years");

    act(() => {
      result.current.toggleDownloads();
    });

    expect(result.current.view).toBe("downloads");

    act(() => {
      result.current.toggleDownloads();
    });

    expect(result.current.view).toBe("years");
  });
});
