import { ImagePlus } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ProductImage({ src, name }: { src: string | undefined; name: string }) {
  const { t } = useTranslation("shop");
  return src ? (
    <img src={src} alt={name} loading="lazy" width="640" height="480" />
  ) : (
    <div className="product-placeholder" role="img" aria-label={t("noImage")}>
      <ImagePlus aria-hidden="true" size={36} />
      <span>{t("noImage")}</span>
    </div>
  );
}
