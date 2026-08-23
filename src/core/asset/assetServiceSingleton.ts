/**
 * AssetService singleton — one per editor instance.
 *
 * The store in `state/assetStore.ts` subscribes to this instance and
 * mirrors its manifest; commands / dialogs / boot wiring all import
 * the singleton directly to avoid threading it through props.
 */

import { AssetService } from './AssetService';

export const assetService = new AssetService();