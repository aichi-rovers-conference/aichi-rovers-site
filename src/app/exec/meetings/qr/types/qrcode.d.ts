// types/qrcode.d.ts
declare module "qrcode" {
  export type QRCodeErrorCorrectionLevel = "L" | "M" | "Q" | "H";
  export interface QRCodeToDataURLOptions {
    type?: "image/png" | "image/webp" | "image/jpeg";
    rendererOpts?: { quality?: number };
    errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
    margin?: number;
    scale?: number;
    width?: number;
    color?: { dark?: string; light?: string };
  }
  export function toDataURL(text: string, opts?: QRCodeToDataURLOptions): Promise<string>;
  const _default: { toDataURL: typeof toDataURL };
  export default _default;
}
