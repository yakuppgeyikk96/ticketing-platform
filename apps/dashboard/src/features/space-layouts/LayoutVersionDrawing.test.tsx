import { expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { SpaceLayoutVersion } from "@ticketing/contracts";
import { LayoutVersionDrawing } from "./LayoutVersionDrawing.tsx";
import "../../i18n/index.ts";

function version(status: SpaceLayoutVersion["status"]): SpaceLayoutVersion {
  return {
    id: "version",
    organizationId: "organization",
    layoutId: "layout",
    version: 1,
    status,
    width: 1600,
    height: 900,
  };
}

test("editable drafts open the real editor with version dimensions and a persistence notice", () => {
  const html = renderToStaticMarkup(
    <LayoutVersionDrawing
      version={version("draft")}
      label="Salon planı"
      canEdit
    />,
  );
  expect(html).toContain('class="le-editor');
  expect(html).toContain('aria-label="Salon planı"');
  expect(html).toContain('width="1600" height="900"');
  expect(html).toContain("Çizimler henüz kaydedilmiyor");
  expect(html).toContain("Dikdörtgen çiz");
  expect(html).toContain("Henüz öğe yok.");
  expect(html).not.toContain("Sahne");
});

test("published and archived versions have no editor or editing controls", () => {
  for (const status of ["published", "archived"] as const) {
    const html = renderToStaticMarkup(
      <LayoutVersionDrawing
        version={version(status)}
        label="Salt okunur plan"
        canEdit
      />,
    );
    expect(html).toContain('viewBox="0 0 1600 900"');
    expect(html).toContain("salt okunur");
    expect(html).not.toContain('class="le-editor');
    expect(html).not.toContain("<button");
  }
});

test("users without edit permission see only a preview even for a draft", () => {
  const html = renderToStaticMarkup(
    <LayoutVersionDrawing
      version={version("draft")}
      label="Plan"
      canEdit={false}
    />,
  );
  expect(html).toContain('role="img"');
  expect(html).not.toContain('class="le-editor');
  expect(html).not.toContain("<button");
});
