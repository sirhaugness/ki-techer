import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import Home from "@/app/page";
it("viser en ærlig norsk startside uten å tilby uferdig øving", () => {
  render(<Home />);
  expect(
    screen.getByRole("heading", { name: "Matte, ett steg om gangen." }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Start øving" })).toBeDisabled();
});
