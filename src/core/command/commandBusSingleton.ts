/**
 * CommandBus singleton — one bus per editor instance.
 *
 * Wired against the global {@link documentService}. Tools, panels,
 * and shortcuts import this directly; tests can construct their
 * own `new CommandBus(service)` against an isolated service.
 */

import { documentService } from '@core/document/documentServiceSingleton';

import { CommandBus } from './CommandBus';

export const commandBus = new CommandBus(documentService);
