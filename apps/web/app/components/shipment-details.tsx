import type { ShipmentDto } from "@arrosticini/contracts";
import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ShipmentDetails({ shipment }: { shipment: ShipmentDto }) {
  const { t } = useTranslation("shop");
  return (
    <>
      <dl className="account-details">
        <div>
          <dt>{t("carrier")}</dt>
          <dd>{shipment.carrier}</dd>
        </div>
        {shipment.trackingNumber && (
          <div>
            <dt>{t("trackingNumber")}</dt>
            <dd>{shipment.trackingNumber}</dd>
          </div>
        )}
      </dl>
      {shipment.trackingUrl && (
        <a
          className="shipment-link"
          href={shipment.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("trackShipment")}
          <ExternalLink size={16} aria-hidden="true" />
        </a>
      )}
    </>
  );
}
