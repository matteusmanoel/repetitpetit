import { ProductCardSkeletonGrid } from "@/features/catalog/components/ProductCardSkeleton";

export default function CatalogoLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <ProductCardSkeletonGrid count={9} />
    </div>
  );
}
