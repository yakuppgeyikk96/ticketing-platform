import type { ReactNode } from "react";
import styles from "./Table.module.css";

type FieldColumn<T> = {
  [K in keyof T & string]: {
    key: K;
    title: string;
    render?: (value: T[K], row: T) => ReactNode;
  };
}[keyof T & string];

interface ComputedColumn<T> {
  id: string;
  title: string;
  render: (row: T) => ReactNode;
}

export type TableColumn<T> = FieldColumn<T> | ComputedColumn<T>;

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: keyof T | ((row: T) => string | number);
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
}: TableProps<T>) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={"key" in column ? column.key : column.id} scope="col">
                {column.title}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>
                Veri bulunamadı.
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
                  {columns.map((column) => {
                    if (!("key" in column)) {
                      return <td key={column.id}>{column.render(row)}</td>;
                    }
                    const value = row[column.key];
                    return (
                      <td key={column.key}>
                        {column.render
                          ? column.render(value, row)
                          : String(value ?? "")}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
