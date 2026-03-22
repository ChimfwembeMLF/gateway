import { ZambiaNetwork } from "../enums/zambia-network.enum";

/**
 * Normalizes a network string (e.g. 'mtn', 'airtel', 'zamtel') to the ZambiaNetwork enum value.
 * Defaults to ZambiaNetwork.MTN if not recognized.
 */
export function normalizeZambiaNetwork(network: string | ZambiaNetwork | undefined | null): ZambiaNetwork {
  switch ((network || '').toString().toLowerCase()) {
    case 'mtn':
      return ZambiaNetwork.MTN;
    case 'airtel':
      return ZambiaNetwork.AIRTEL;
    case 'zamtel':
      return ZambiaNetwork.ZAMTEL;
    case ZambiaNetwork.MTN.toLowerCase():
      return ZambiaNetwork.MTN;
    case ZambiaNetwork.AIRTEL.toLowerCase():
      return ZambiaNetwork.AIRTEL;
    case ZambiaNetwork.ZAMTEL.toLowerCase():
      return ZambiaNetwork.ZAMTEL;
    default:
      return ZambiaNetwork.MTN;
  }
}
