import { CreateOrganizationForm } from "./CreateOrganizationForm.tsx";
import { OrganizationList } from "./OrganizationList.tsx";

export function OrganizationsPage() {
  return (
    <>
      <h1>Organizasyonlarım</h1>
      <CreateOrganizationForm />
      <OrganizationList />
    </>
  );
}
