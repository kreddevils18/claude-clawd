// Ordered list of modifiers: context size first (it changes the body), then the hat (it sits on it).

import type { Modifier } from '../core/modifier.ts'
import { contextSize } from './context-size.ts'
import { hat } from './hat.ts'

export const MODIFIERS: readonly Modifier[] = [contextSize, hat]
