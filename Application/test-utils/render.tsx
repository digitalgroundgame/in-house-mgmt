import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { theme } from "../app/lib/theme";

type CustomRenderOptions = Omit<RenderOptions, "wrapper">;

function customRender(ui: ReactElement, options?: CustomRenderOptions) {
  return render(ui, {
    wrapper: ({ children }) => <MantineProvider theme={theme}>{children}</MantineProvider>,
    ...options,
  });
}

export * from "@testing-library/react";
export { customRender as render };
export { default as userEvent } from "@testing-library/user-event";
