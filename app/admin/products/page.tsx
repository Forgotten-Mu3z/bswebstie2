import { ProductManager } from '@/components/admin/product-manager';
import { getLookups, listAdminProducts } from '@/server/catalog/admin';
import { PERMISSIONS, requireAdminPage } from '@/server/security/admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Products' };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function AdminProductsPage({ searchParams }: Props) {
  const access = await requireAdminPage('/admin/products');
  const [products, lookups, params] = await Promise.all([
    listAdminProducts(),
    getLookups(),
    searchParams,
  ]);
  return (
    <ProductManager
      initialProducts={products}
      lookups={lookups}
      permissions={PERMISSIONS.filter((permission) => access.can(permission))}
      initialFilters={{
        q: params.q?.slice(0, 100) ?? '',
        status: params.status ?? '',
        lowStock: params.stock === 'low',
      }}
    />
  );
}
