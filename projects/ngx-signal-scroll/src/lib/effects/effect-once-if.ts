/**
 * Adapted from ngxtension 7.3.1 (MIT).
 * Source: https://github.com/ngxtension/ngxtension-platform/blob/ac24352d2b2a4502faf2ff1fc54c241316093c65/libs/ngxtension/effect-once-if/src/effect-once-if.ts
 * Local changes: Narrowed to a boolean predicate, a parameterless action and an explicit injector; removed generic options and injector assertion.
 * See THIRD_PARTY_NOTICES.txt for provenance and the original license.
 */
import { effect, EffectRef, Injector, untracked } from '@angular/core';

/** Runs the action once at the first truthy predicate evaluation, then destroys the effect. */
/*!
 * @license
 * MIT License
 *
 * Copyright (c) 2023 Chau Tran
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
export function effectOnceIf(
  predicate: () => boolean,
  action: () => void,
  options: { injector: Injector },
): EffectRef {
  const ref = effect(() => {
    if (predicate()) {
      untracked(action);
      ref.destroy();
    }
  }, options);
  return ref;
}
