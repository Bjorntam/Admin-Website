
import PageMeta   from "../../components/common/PageMeta";
import BasicTable from "../../components/tables/BasicTables/BasicTableOne";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
export default function Home() {
  return (
    <>
      <PageMeta
        title="Admin Dashboard"
        description="This is React.js Ecommerce Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <PageBreadcrumb pageTitle="Users Accounts" />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-01 xl:col-span-13">
        <ComponentCard title="Parents Accounts">
          <BasicTable />
        </ComponentCard>
        </div>
      </div>
    </>
  );
}
