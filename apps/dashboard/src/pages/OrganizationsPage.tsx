import { CreateOrganizationForm } from "../features/organizations/CreateOrganizationForm.tsx";
import { OrganizationList } from "../features/organizations/OrganizationList.tsx";

export function OrganizationsPage() {
  return (
    <>
      <h1>Organizasyonlarım</h1>
      <CreateOrganizationForm />
      <OrganizationList />
    </>
  );
}
