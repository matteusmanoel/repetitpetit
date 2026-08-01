export type CategoryActionState = {
  error?: string;
  fieldErrors?: Partial<
    Record<
      "name" | "slug" | "description" | "image_url" | "is_active" | "sort_order",
      string
    >
  >;
};

export const initialCategoryActionState: CategoryActionState = {};
