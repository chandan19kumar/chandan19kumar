import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { FONT } from './theme.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fonts');
const fontFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.ttf')).map((f) => path.join(dir, f));

export function svgToPng(svg, { width = 1080 } = {}) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: FONT.sans },
    background: 'white',
  });
  return r.render().asPng();
}
