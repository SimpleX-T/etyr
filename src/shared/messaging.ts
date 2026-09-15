import type { MessageRequest, MessageResponse } from './types';
import { getBrowserAPI, isExtensionContext } from '../browser/types';

export async function sendMessage<T = unknown>(
  request: MessageRequest
): Promise<MessageResponse<T> | null> {
  if (!isExtensionContext()) return null;

  try {
    const response = await getBrowserAPI().runtime.sendMessage(request);
    if (response && typeof response === 'object' && 'ok' in response) {
      return response as MessageResponse<T>;
    }
    return null;
  } catch {
    return null;
  }
}