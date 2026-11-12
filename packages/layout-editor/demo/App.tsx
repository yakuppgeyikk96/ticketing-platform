import { useRef, useState } from "react";
import { LayoutEditor, type LayoutEditorHandle } from "../src/react/index.ts";
import { exampleDocument } from "./example.ts";
import { useDocumentFiles } from "./useDocumentFiles.ts";
import { DemoIcon } from "./DemoIcon.tsx";

export function App() {
  const editor = useRef<LayoutEditorHandle>(null);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const files = useDocumentFiles(exampleDocument, () => {
    setHistory({ canUndo: false, canRedo: false });
    setSelectedId(null);
  });
  const selected = files.document.elements.find(
    (element) => element.id === selectedId,
  );
  return (
    <main className="demo-app">
      <header className="app-header">
        <div className="app-brand">
          <span className="brand-mark">
            <DemoIcon name="layout" />
          </span>
          <div>
            <p className="eyebrow">Layout Editor</p>
            <h1>Salon planı</h1>
          </div>
        </div>
        <div className="file-meta">
          <span className="file-name" title={files.opened.name}>
            {files.opened.name}
          </span>
          <span className="save-status" data-dirty={files.dirty} role="status">
            <span className="status-dot" aria-hidden="true" />
            {files.dirty ? "Dışa aktarılmamış değişiklikler" : "Değişiklik yok"}
          </span>
        </div>
        {files.error && (
          <p className="file-error" role="alert">
            {files.error}
          </p>
        )}
      </header>
      <div className="history-actions">
        <button
          disabled={files.loading}
          onClick={() => fileInput.current?.click()}
        >
          <DemoIcon name="open" />
          {files.loading ? "Dosya okunuyor…" : "Dosya aç"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          aria-label="Çizim JSON dosyası"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void files.open(file);
          }}
        />
        <button
          className="export-button"
          disabled={files.loading}
          onClick={files.download}
        >
          <DemoIcon name="export" />
          JSON dışa aktar
        </button>
        <span className="action-divider" aria-hidden="true" />
        <button
          disabled={!history.canUndo}
          onClick={() => editor.current?.undo()}
        >
          <DemoIcon name="undo" />
          Geri al
        </button>
        <button
          disabled={!history.canRedo}
          onClick={() => editor.current?.redo()}
        >
          <DemoIcon name="redo" />
          Yinele
        </button>
      </div>
      <section className="workspace" aria-label="Plan önizlemesi">
        <LayoutEditor
          key={files.opened.key}
          initialDocument={files.opened.document}
          ref={editor}
          onDocumentChange={files.change}
          onHistoryChange={setHistory}
          onSelectionChange={setSelectedId}
          positionMessages={{
            title: "Özellikler",
            hint: "Enter veya alandan çıkış uygular; Escape iptal eder.",
            invalidNumber: "Geçerli, sonlu bir sayı girin.",
            invalidSize: "Sıfırdan büyük bir sayı girin.",
            emptySelection: "Özelliklerini düzenlemek için bir öğe seçin.",
            width: "Genişlik",
            height: "Yükseklik",
            rotation: "Dönüş (°)",
            label: "Etiket",
            fill: "Dolgu",
            stroke: "Kenarlık",
            textColor: "Yazı rengi",
            colorPicker: "Renk seçici",
            invalidColor: "#2563eb gibi altı haneli bir hex renk girin.",
            geometry: "Konum ve boyut",
            appearance: "Görünüm",
            duplicate: "Çoğalt",
            layers: "Katman sırası",
            layerList: "Katmanlar",
            emptyLayers: "Henüz öğe yok.",
            unnamedElement: "Dikdörtgen",
            bringForward: "Bir öne getir",
            sendBackward: "Bir arkaya gönder",
            bringToFront: "En öne getir",
            sendToBack: "En arkaya gönder",
          }}
          cursorLabel="İmlecin plan üzerindeki konumu"
          addRectangleLabel="Dikdörtgen ekle"
          newRectangleLabel="Yeni dikdörtgen"
          deleteLabel="Sil"
          selectToolLabel="Seç"
          fitToScreenLabel="Ekrana sığdır"
          zoomLabel="Yakınlaştırma"
          gridLabel="Izgara"
          drawRectangleLabel="Dikdörtgen çiz"
          label="Sahne, perde, üç alan ve döndürülmüş giriş içeren örnek salon planı"
        />
      </section>
      <footer className="demo-footer">
        <span className="selection-summary" role="status" title={selected?.id}>
          {selected ? selected.label || selected.id : "Seçim yok"}
        </span>
        <span>{files.document.elements.length} öğe</span>
        <span className="footer-hint">Boş alanı sürükleyerek kaydırın</span>
        <details className="shortcut-help">
          <summary>Kısayollar</summary>
          <div>
            <p>
              <kbd>Tab</kbd> Öğeye git · <kbd>Enter</kbd> Seç
            </p>
            <p>
              <kbd>Esc</kbd> İptal et / seçimi kaldır
            </p>
            <p>
              <kbd>Ctrl / ⌘ Z</kbd> Geri al
            </p>
            <p>
              <kbd>Shift Ctrl / ⌘ Z</kbd> Yinele
            </p>
            <p>
              <kbd>Ctrl / ⌘ D</kbd> Seçili öğeyi çoğalt
            </p>
            <p>
              <kbd>Alt / ⌥</kbd> Çizim, taşıma ve boyutlandırmada ızgaraya
              yapıştır
            </p>
            <p>
              <kbd>Delete</kbd> Seçili öğeyi sil
            </p>
          </div>
        </details>
      </footer>
      <details className="json-panel">
        <summary>
          Belge verisi <span>JSON</span>
        </summary>
        <pre>{JSON.stringify(JSON.parse(files.serialized), null, 2)}</pre>
      </details>
    </main>
  );
}
