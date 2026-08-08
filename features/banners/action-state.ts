export type BannerActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Partial<
    Record<
      | "title"
      | "subtitle"
      | "image_url"
      | "cta_label"
      | "cta_href"
      | "is_active"
      | "sort_order",
      string
    >
  >;
};

export const initialBannerActionState: BannerActionState = {};
