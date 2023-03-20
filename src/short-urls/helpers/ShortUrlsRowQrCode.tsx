import {
  faQrcode as qrIcon
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { FC } from "react";
import { Button } from "reactstrap";
import { useToggle } from "../../utils/helpers/hooks";
import type { ShortUrl, ShortUrlModalProps } from "../data";

interface ShortUrlsRowQrCodeProps {
  shortUrl: ShortUrl;
}
type ShortUrlModal = FC<ShortUrlModalProps>;

export const ShortUrlsRowQrCode =
  (QrCodeModal: ShortUrlModal) =>
  ({ shortUrl }: ShortUrlsRowQrCodeProps) => {
    const [isQrModalOpen, , openQrCodeModal, closeQrCodeModal] = useToggle();

    return (
      <>
        <Button onClick={openQrCodeModal} size="sm" outline>
          <FontAwesomeIcon icon={qrIcon} fixedWidth/>
        </Button>
        <QrCodeModal
          shortUrl={shortUrl}
          isOpen={isQrModalOpen}
          toggle={closeQrCodeModal}
        />
      </>
    );
  };

export type ShortUrlsRowQrCodeType = ReturnType<typeof ShortUrlsRowQrCode>;
