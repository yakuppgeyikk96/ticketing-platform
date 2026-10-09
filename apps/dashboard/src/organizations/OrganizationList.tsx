import { myOrganizationsQuery } from "../api/organizations.ts";
import { describeError } from "../api/errors.ts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";

import styles from "./OrganizationList.module.css";

export function OrganizationList() {
  const query = useQuery(myOrganizationsQuery);

  if (query.isPending) {
    return <p>Yükleniyor...</p>;
  }

  if (query.isError) {
    return <p role="alert">{describeError(query.error)}</p>;
  }

  if (query.data.length === 0) {
    return <p>Henüz bir organizasyonun yok.</p>;
  }

  return (
    <ul role="list">
      {query.data.map((org) => (
        <li key={org.id} className={styles.row}>
          <Link to={`/organizations/${org.id}`}>{org.name}</Link>{" "}
          <small>{org.role}</small>
        </li>
      ))}
    </ul>
  );
}
