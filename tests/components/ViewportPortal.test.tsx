import { waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import ViewportPortal from "@/components/shared/ViewportPortal";

describe("ViewportPortal", () => {
  it("keeps server and initial client markup empty, then portals after mount", async () => {
    const container = document.createElement("div");
    const bodyMarkup = renderToString(
      <ViewportPortal>
        <div>Portal content</div>
      </ViewportPortal>,
    );

    expect(bodyMarkup).toBe("");
    container.innerHTML = bodyMarkup;
    document.body.appendChild(container);

    expect(document.body).not.toHaveTextContent("Portal content");

    hydrateRoot(
      container,
      <ViewportPortal>
        <div>Portal content</div>
      </ViewportPortal>,
    );

    expect(container).toBeEmptyDOMElement();
    expect(document.body).not.toHaveTextContent("Portal content");

    await waitFor(() => {
      expect(document.body).toHaveTextContent("Portal content");
    });

    container.remove();
  });
});
