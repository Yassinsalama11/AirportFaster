import { Link } from '@/i18n/routing';
import { SupplierForm } from '@/components/admin/suppliers/SupplierForm';

export const metadata = { title: 'New Supplier' };

export default function NewSupplierPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/suppliers"
          className="text-gray-400 hover:text-brand-white text-sm transition-colors"
        >
          Suppliers
        </Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-2xl font-bold text-brand-white">New Supplier</h1>
      </div>

      <div className="bg-brand-navy border border-white/5 rounded-xl p-6 max-w-2xl">
        <SupplierForm isNew={true} />
      </div>
    </div>
  );
}
