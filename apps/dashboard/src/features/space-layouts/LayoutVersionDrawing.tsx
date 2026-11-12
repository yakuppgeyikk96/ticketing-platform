import { useRef, useState } from "react";
import type { SpaceLayoutVersion } from "@ticketing/contracts";
import type { LayoutDocument } from "@ticketing/layout-editor";
import {
  LayoutEditor,
  LayoutPreview,
  type LayoutEditorHandle,
} from "@ticketing/layout-editor/react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button.tsx";
import styles from "./LayoutVersionDrawing.module.css";

interface Props {
  version: SpaceLayoutVersion;
  label: string;
  canEdit: boolean;
}

/** The API has no drawing data yet; each version starts with an empty document. */
export function LayoutVersionDrawing({ version, label, canEdit }: Props) {
  const { t } = useTranslation();
  const editor = useRef<LayoutEditorHandle>(null);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [document] = useState<LayoutDocument>(() => ({
    formatVersion: 1,
    width: version.width,
    height: version.height,
    elements: [],
  }));
  const editable = canEdit && version.status === "draft";
  return (
    <div className={styles.drawing}>
      <p className={styles.notice}>
        {t(editable ? "layouts.editor.localOnly" : "layouts.editor.readOnly")}
      </p>
      {editable && (
        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            disabled={!history.canUndo}
            onClick={() => editor.current?.undo()}
          >
            {t("layouts.editor.undo")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!history.canRedo}
            onClick={() => editor.current?.redo()}
          >
            {t("layouts.editor.redo")}
          </Button>
          <span className={styles.hint}>
            {t("layouts.editor.modifierHint")}
          </span>
        </div>
      )}
      <div className={styles.workspace}>
        {editable ? (
          <LayoutEditor
            ref={editor}
            initialDocument={document}
            label={label}
            onHistoryChange={setHistory}
            gridLabel={t("layouts.editor.grid")}
            fitToScreenLabel={t("layouts.editor.fitToScreen")}
            zoomLabel={t("layouts.editor.zoom")}
            cursorLabel={t("layouts.editor.cursor")}
            addRectangleLabel={t("layouts.editor.addRectangle")}
            newRectangleLabel={t("layouts.editor.newRectangle")}
            deleteLabel={t("layouts.editor.delete")}
            selectToolLabel={t("layouts.editor.select")}
            drawRectangleLabel={t("layouts.editor.drawRectangle")}
            positionMessages={{
              title: t("layouts.editor.properties"),
              hint: t("layouts.editor.propertiesHint"),
              invalidNumber: t("layouts.editor.invalidNumber"),
              invalidSize: t("layouts.editor.invalidSize"),
              emptySelection: t("layouts.editor.emptySelection"),
              width: t("layouts.editor.width"),
              height: t("layouts.editor.height"),
              rotation: t("layouts.editor.rotation"),
              label: t("layouts.editor.label"),
              fill: t("layouts.editor.fill"),
              stroke: t("layouts.editor.stroke"),
              textColor: t("layouts.editor.textColor"),
              invalidColor: t("layouts.editor.invalidColor"),
              colorPicker: t("layouts.editor.colorPicker"),
              geometry: t("layouts.editor.geometry"),
              appearance: t("layouts.editor.appearance"),
              layers: t("layouts.editor.layerOrder"),
              layerList: t("layouts.editor.layers"),
              emptyLayers: t("layouts.editor.emptyLayers"),
              unnamedElement: t("layouts.editor.newRectangle"),
              bringForward: t("layouts.editor.bringForward"),
              sendBackward: t("layouts.editor.sendBackward"),
              bringToFront: t("layouts.editor.bringToFront"),
              sendToBack: t("layouts.editor.sendToBack"),
              duplicate: t("layouts.editor.duplicate"),
            }}
          />
        ) : (
          <LayoutPreview document={document} label={label} />
        )}
      </div>
    </div>
  );
}
