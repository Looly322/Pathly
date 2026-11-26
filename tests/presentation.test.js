import test from 'node:test';
import assert from 'node:assert/strict';
import {safeWebsite} from '../src/services/placePresentation.js';
import {imageCandidates} from '../src/providers/imageProvider.js';
test('restore verified photo plus fallback without accepting unsafe website URLs',()=>{
 assert.equal(safeWebsite('javascript:alert(1)'),null);
 assert.equal(safeWebsite('https://example.org/place'),'https://example.org/place');
 assert.deepEqual(imageCandidates({photo:{url:'https://example.org/photo',fallbackUrl:'https://example.org/backup'}}),['https://example.org/photo','https://example.org/backup']);
});
