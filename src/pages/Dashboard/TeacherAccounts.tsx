
import PageMeta   from "../../components/common/PageMeta";
import TableTeacher from "../../components/tables/BasicTables/BasicTableTeacher";
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
        <div className="col-span-12 text-xl">
        <ComponentCard title="Teacher Accounts">
          <TableTeacher />
        </ComponentCard>
        </div>
      </div>
    </>
  );
}
