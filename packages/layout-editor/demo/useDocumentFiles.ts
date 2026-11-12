import { useEffect, useRef, useState, useMemo } from "react";
import {
  parseDocument,
  serializeDocument,
  type LayoutDocument,
} from "../src/index.ts";

/** Browser file handling belongs to the host, not to the editor package. */
export function useDocumentFiles(initial: LayoutDocument, onOpen: () => void) {
  const [document, setDocument] = useState(initial);
  const [opened, setOpened] = useState({
    document: initial,
    key: 0,
    name: "tiyatro-duzeni.json",
  });
  const [saved, setSaved] = useState(() => serializeDocument(initial));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const latest = useRef(initial);
  const baseline = useRef(saved);
  const request = useRef(0);
  const serialized = useMemo(() => serializeDocument(document), [document]);
  const dirty = serialized !== saved;

  function change(next: LayoutDocument) {
    latest.current = next;
    setDocument(next);
  }
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );

  async function open(file: File) {
    const token = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      if (token !== request.current) return;
      // Validate before asking to discard: malformed files never replace the drawing.
      const next = parseDocument(text.replace(/^\uFEFF/, ""));
      if (
        serializeDocument(latest.current) !== baseline.current &&
        !window.confirm(
          "Dışa aktarılmamış değişiklikler var. Mevcut çizim değiştirilerek dosya açılsın mı?",
        )
      )
        return;
      const snapshot = serializeDocument(next);
      latest.current = next;
      baseline.current = snapshot;
      setDocument(next);
      setSaved(snapshot);
      setOpened((previous) => ({
        document: next,
        key: previous.key + 1,
        name: file.name,
      }));
      onOpen();
    } catch (cause) {
      if (token === request.current)
        setError(
          `Dosya açılamadı: ${cause instanceof Error ? cause.message : String(cause)}`,
        );
    } finally {
      if (token === request.current) setLoading(false);
    }
  }

  function download() {
    setError(null);
    let url: string | null = null;
    try {
      const snapshot = serializeDocument(latest.current);
      url = URL.createObjectURL(
        new Blob([snapshot], { type: "application/json" }),
      );
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = opened.name.replace(/\.json$/i, "") + ".json";
      window.document.body.append(anchor);
      try {
        anchor.click();
      } finally {
        anchor.remove();
      }
      // The browser owns completion of the download; this marks the exported snapshot.
      baseline.current = snapshot;
      setSaved(snapshot);
    } catch (cause) {
      setError(
        `Dışa aktarılamadı: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    } finally {
      if (url) {
        const exportedUrl = url;
        window.setTimeout(() => URL.revokeObjectURL(exportedUrl), 1000);
      }
    }
  }
  return {
    document,
    opened,
    dirty,
    loading,
    error,
    change,
    open,
    download,
    serialized,
  };
}
