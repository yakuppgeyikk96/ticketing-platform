import type { ReactNode } from "react";
import { cx } from "../lib/cx.ts";
import styles from "./Table.module.css";

interface ColumnBase {
  title: string;
  // Keep the title for assistive tech but do not show it (action columns).
  hideTitle?: boolean;
  align?: "start" | "end";
}

type FieldColumn<T> = {
  [K in keyof T & string]: ColumnBase & {
    key: K;
    render?: (value: T[K], row: T) => ReactNode;
  };
}[keyof T & string];

interface ComputedColumn<T> extends ColumnBase {
  id: string;
  render: (row: T) => ReactNode;
}

export type TableColumn<T> = FieldColumn<T> | ComputedColumn<T>;

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: keyof T | ((row: T) => string | number);
  emptyMessage?: string;
  // A line under the table: counts, pagination.
  footer?: ReactNode;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  emptyMessage = "Kayıt yok.",
  footer,
}: TableProps<T>) {
  return (
    <div className={styles.root}>
      <div className={styles.wrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={columnId(column)}
                  scope="col"
                  className={cx(column.align === "end" && styles.end)}
                >
                  {column.hideTitle ? (
                    <span className={styles.srOnly}>{column.title}</span>
                  ) : (
                    column.title
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={styles.empty}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const resolvedKey =
                  typeof rowKey === "function"
                    ? rowKey(row)
                    : String(row[rowKey] ?? rowIndex);

                return (
                  <tr key={resolvedKey}>
                    {columns.map((column) => (
                      <td
                        key={columnId(column)}
                        className={cx(column.align === "end" && styles.end)}
                      >
                        {renderCell(column, row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {footer && <p className={styles.footer}>{footer}</p>}
    </div>
  );
}

function columnId<T>(column: TableColumn<T>): string {
  return "key" in column ? column.key : column.id;
}

function renderCell<T extends Record<string, unknown>>(
  column: TableColumn<T>,
  row: T,
): ReactNode {
  if (!("key" in column)) return column.render(row);
  const value = row[column.key];
  return column.render ? column.render(value, row) : String(value ?? "");
}
