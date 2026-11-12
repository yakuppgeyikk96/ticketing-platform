import type { LayoutDocument } from "../core/document.ts";
import { assert, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LayoutPreview, LayoutEditor } from "./index.ts";
import { SelectionOutline } from "./SelectionOutline.tsx";
import { resizeCursor } from "./resizePreview.ts";
import { getRectangleCorner } from "../core/geometry.ts";
import { PositionPanel } from "./PositionPanel.tsx";

test("localized drawing tools expose selection mode as the initial active tool", () => {
  const html = renderToStaticMarkup(
    <LayoutEditor
      initialDocument={document()}
      label="Editor"
      selectToolLabel="Seç"
      drawRectangleLabel="Dikdörtgen çiz"
    />,
  );
  assert.match(html, /aria-pressed="true"[\s\S]*?Seç<\/button>/);
  assert.match(html, /aria-pressed="false"[\s\S]*?Dikdörtgen çiz<\/button>/);
});

test("the editor exposes a localized add-rectangle action without creating data on render", () => {
  const input = document();
  const before = structuredClone(input);
  const html = renderToStaticMarkup(
    <LayoutEditor
      initialDocument={input}
      label="Editor"
      addRectangleLabel="Dikdörtgen ekle"
    />,
  );
  assert.match(html, /<button type="button">[\s\S]*?Dikdörtgen ekle<\/button>/);
  assert.deepEqual(input, before);
});

test("the localized delete action starts disabled without a selection", () => {
  const html = renderToStaticMarkup(
    <LayoutEditor
      initialDocument={document()}
      label="Editor"
      deleteLabel="Sil"
    />,
  );
  assert.match(html, /<button type="button" disabled="">[\s\S]*?Sil<\/button>/);
});

test("editor places pointer coordinates below the SVG scene", () => {
  const html = renderToStaticMarkup(
    <LayoutEditor
      initialDocument={document()}
      label="Editor"
      cursorLabel="İmleç konumu"
    />,
  );
  assert.include(html, 'aria-label="İmleç konumu"');
  assert.isAbove(
    html.indexOf('aria-label="İmleç konumu"'),
    html.indexOf("<svg"),
  );
  assert.include(html, "X: — · Y: —");
});

test("the library position panel renders host messages and committed coordinates", () => {
  const element = document().elements[0];
  if (!element) throw new Error("Missing fixture rectangle");
  const html = renderToStaticMarkup(
    <PositionPanel
      element={element}
      messages={{
        title: "Konum",
        hint: "Enter ile uygula",
        invalidNumber: "Geçersiz sayı",
      }}
      onMove={() => {
        throw new Error("Rendering must not edit the document");
      }}
      onResize={() => {
        throw new Error("Rendering must not resize the document");
      }}
      onRotate={() => {
        throw new Error("Rendering must not rotate the document");
      }}
      onLabelChange={() => {
        throw new Error("Rendering must not edit labels");
      }}
      onColorChange={() => {
        throw new Error("Rendering must not edit colors");
      }}
    />,
  );
  assert.include(html, "Konum");
  assert.include(html, "Enter ile uygula");
  assert.include(html, 'value="100"');
  assert.include(html, 'value="50"');
  assert.include(html, 'value="400"');
  assert.include(html, 'value="100"');
  assert.include(html, 'value="45"');
  assert.include(html, "Rotation (°)");
  assert.equal((html.match(/<label /g) || []).length, 9);
  assert.equal((html.match(/type="color"/g) || []).length, 3);
  assert.notMatch(html, /aria-invalid="true"/);
});

test("the inspector reserves space and shows host text before selection", () => {
  const html = renderToStaticMarkup(
    <LayoutEditor
      initialDocument={document()}
      label="Editor"
      positionMessages={{
        title: "Özellikler",
        hint: "Enter ile uygula",
        invalidNumber: "Geçersiz sayı",
        emptySelection: "Bir öğe seçin",
      }}
    />,
  );
  assert.include(html, 'data-has-panel="true"');
  assert.include(html, "<aside");
  assert.include(html, "Bir öğe seçin");
  assert.isAbove(html.indexOf("<aside"), html.indexOf("<svg"));
});

test("editor exposes keyboard-selectable elements without altering document data", () => {
  const input = document();
  const before = structuredClone(input);
  const html = renderToStaticMarkup(
    <LayoutEditor initialDocument={input} label="Editor" />,
  );
  assert.match(html, /role="group" aria-label="Editor"/);
  assert.match(html, /role="button" tabindex="0"/);
  assert.match(html, /aria-pressed="false"/);
  assert.deepEqual(input, before);
  const preview = renderToStaticMarkup(
    <LayoutPreview document={input} label="Preview" />,
  );
  assert.notMatch(preview, /role="button"|tabindex=/);
});

function document(): LayoutDocument {
  return {
    formatVersion: 1,
    width: 1200,
    height: 800,
    elements: [
      {
        id: "stage",
        type: "rectangle",
        x: 100,
        y: 50,
        width: 400,
        height: 100,
        rotation: 45,
        label: "Stage <script>alert(1)</script>",
        style: {
          fill: "#444444",
          stroke: "#222222",
          strokeWidth: 2,
          textColor: "#ffffff",
        },
      },
    ],
  };
}

test("renders document coordinates, center rotation and styles without mutation", () => {
  const input = document();
  const before = structuredClone(input);
  const html = renderToStaticMarkup(
    <LayoutPreview document={input} label="Theatre plan" />,
  );
  assert.match(html, /viewBox="0 0 1200 800"/);
  assert.match(html, /role="img" aria-label="Theatre plan"/);
  assert.match(html, /rotate\(45 300 100\)/);
  assert.match(
    html,
    /<rect x="100" y="50" width="400" height="100" fill="#444444" stroke="#222222" stroke-width="2"/,
  );
  assert.match(html, /<text x="300" y="100"/);
  assert.match(html, /fill="#ffffff"/);
  assert.match(html, /Stage &lt;script&gt;/);
  assert.notMatch(html, /<script>/);
  assert.deepEqual(input, before);
});

test("preserves drawing order and renders an empty document", () => {
  const input = document();
  const first = input.elements[0];
  if (!first) throw new Error("Missing fixture rectangle");
  input.elements.push({ ...first, id: "curtain", label: "" });
  const html = renderToStaticMarkup(
    <LayoutPreview document={input} label="Plan" />,
  );
  assert.ok(
    html.indexOf('data-element-id="stage"') <
      html.indexOf('data-element-id="curtain"'),
  );
  assert.equal((html.match(/<text /g) || []).length, 1);
  const empty = renderToStaticMarkup(
    <LayoutPreview document={{ ...input, elements: [] }} label="Empty plan" />,
  );
  assert.match(empty, /aria-label="Empty plan"/);
  assert.notMatch(empty, /<rect/);
});

test("selection handles follow rotated corners and are omitted without editing handlers", () => {
  const element = document().elements[0]!;
  const html = renderToStaticMarkup(
    <SelectionOutline element={element} onResizeStart={() => {}} />,
  );
  for (const corner of ["nw", "ne", "se", "sw"] as const) {
    const point = getRectangleCorner(element, corner);
    assert.include(
      html,
      `data-resize-corner="${corner}" transform="translate(${point.x} ${point.y})"`,
    );
  }
  assert.notInclude(
    renderToStaticMarkup(<SelectionOutline element={element} />),
    "data-resize-corner",
  );
});

test("resize cursors follow the rotated diagonal including negative angles", () => {
  assert.equal(resizeCursor(0, "nw"), "nwse-resize");
  assert.equal(resizeCursor(0, "ne"), "nesw-resize");
  assert.equal(resizeCursor(45, "nw"), "ns-resize");
  assert.equal(resizeCursor(-45, "nw"), "ew-resize");
  assert.equal(resizeCursor(180, "se"), resizeCursor(0, "se"));
});

test("rotation handle is only rendered when editing is enabled and follows the element center", () => {
  const element = { ...document().elements[0]!, rotation: 90 };
  const html = renderToStaticMarkup(
    <SelectionOutline element={element} onRotateStart={() => {}} />,
  );
  assert.include(html, 'data-rotation-handle="true"');
  assert.include(html, 'transform="rotate(90 300 100) translate(300 50)"');
  assert.notInclude(
    renderToStaticMarkup(<SelectionOutline element={element} />),
    "data-rotation-handle",
  );
});

test("zoom controls have localized labels and initially show 100 percent", () => {
  const html = renderToStaticMarkup(
    <LayoutEditor
      initialDocument={document()}
      label="Editor"
      fitToScreenLabel="Ekrana sığdır"
      zoomLabel="Yakınlaştırma"
    />,
  );
  assert.include(html, ">Ekrana sığdır</button>");
  assert.include(html, 'aria-label="Yakınlaştırma">100%');
});

test("selection handles compensate zoom while their anchors stay in document coordinates", () => {
  const element = { ...document().elements[0]!, rotation: 0 };
  const html = renderToStaticMarkup(
    <SelectionOutline
      element={element}
      controlScale={2}
      onResizeStart={() => {}}
      onRotateStart={() => {}}
    />,
  );
  assert.include(html, 'data-control-scale="2"');
  assert.include(html, "translate(100 50) scale(2)");
  assert.include(html, "rotate(0 300 100) translate(300 50) scale(2)");
});

test("localized layer controls disable only the directions beyond the drawing order", () => {
  function panel(index: number, count: number) {
    return renderToStaticMarkup(
      <PositionPanel
        element={document().elements[0]!}
        messages={{
          title: "Özellikler",
          hint: "",
          invalidNumber: "Invalid",
          layers: "Katman sırası",
          bringForward: "Bir öne getir",
          sendBackward: "Bir arkaya gönder",
          bringToFront: "En öne getir",
          sendToBack: "En arkaya gönder",
        }}
        onMove={() => {}}
        onResize={() => {}}
        onRotate={(_id, degrees) => degrees}
        onLabelChange={() => {}}
        onColorChange={() => {}}
        layerOrder={{ index, count, onReorder: () => {} }}
      />,
    );
  }
  const back = panel(0, 3);
  assert.include(back, 'aria-label="Katman sırası"');
  assert.include(back, '<button type="button">Bir öne getir</button>');
  assert.include(
    back,
    '<button type="button" disabled="">En arkaya gönder</button>',
  );
  const front = panel(2, 3);
  assert.include(
    front,
    '<button type="button" disabled="">En öne getir</button>',
  );
  assert.include(front, '<button type="button">Bir arkaya gönder</button>');
  assert.equal(
    (panel(0, 1).match(/<button type="button" disabled="">/g) ?? []).length,
    4,
  );
});
