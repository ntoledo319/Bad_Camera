// Entry: install minimal runtime polyfills before the router loads.
import { Buffer } from 'buffer';
import * as ExpoCrypto from 'expo-crypto';

if (typeof globalThis.Buffer === 'undefined') globalThis.Buffer = Buffer;
// Hermes may lack WebCrypto getRandomValues; expo-crypto provides a CSPRNG-backed one.
if (!globalThis.crypto) globalThis.crypto = {};
if (typeof globalThis.crypto.getRandomValues !== 'function') {
  globalThis.crypto.getRandomValues = (a) => ExpoCrypto.getRandomValues(a);
}

// require (not import) so it runs after the polyfills above; imports are hoisted.
require('expo-router/entry');
