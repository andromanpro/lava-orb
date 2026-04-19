/**
 * Build script — конкатенирует ES-модули в один IIFE-бандл для copy-paste встройки.
 *
 * Usage:
 *   node build.js           — создать dist/lava-orb.js
 *   node build.js --minify  — + минифицированная версия dist/lava-orb.min.js (требует esbuild)
 *
 * Стратегия:
 * 1. Прочитать все файлы в src/ в порядке зависимостей
 * 2. Убрать все import/export statements
 * 3. Обернуть в IIFE, экспорт через window.LavaOrb
 *
 * Зависимости: только Node.js (fs, path). Zero deps.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

// Порядок важен — базовые зависимости сначала
const MODULES = [
  'core/palettes.js',
  'core/temp-params.js',
  'core/config.js',
  'core/helpers.js',
  'orb/lava-orb.js',
  'orb/fire-doom.js',
  'orb/fire-particles.js',
  'orb/frost.js',
  'orb/particles.js',
  'public/group.js',
  'fx/detach.js',
  'fx/explosion.js',
  'public/attach.js',
  'index.js'
];

function stripModuleSyntax(source) {
  // Убираем import строки (все варианты)
  let out = source.replace(/^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  out = out.replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '');
  // Убираем `export` keyword перед class/function/const
  out = out.replace(/^export\s+(default\s+)?/gm, '');
  // Убираем `export { ... };` блоки
  out = out.replace(/^export\s*\{[^}]*\};?\s*$/gm, '');
  return out;
}

function build() {
  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

  const banner = [
    '/**',
    ' * lava-orb — temperature-reactive liquid capsule effect for range sliders',
    ' * Version: 3.0.0-alpha.1',
    ' * License: MIT',
    ' * Built: ' + new Date().toISOString(),
    ' */'
  ].join('\n');

  const parts = [banner, '(function(window) {', '"use strict";', ''];

  for (const rel of MODULES) {
    const abs = path.join(SRC, rel);
    if (!fs.existsSync(abs)) {
      console.error('Missing module:', rel);
      process.exit(1);
    }
    const content = fs.readFileSync(abs, 'utf8');
    const stripped = stripModuleSyntax(content);
    parts.push('// ========== ' + rel + ' ==========');
    parts.push(stripped.trim());
    parts.push('');
  }

  parts.push('})(typeof window !== "undefined" ? window : this);');
  const bundled = parts.join('\n');

  const outPath = path.join(DIST, 'lava-orb.js');
  fs.writeFileSync(outPath, bundled, 'utf8');
  const sizeKb = (bundled.length / 1024).toFixed(1);
  console.log('✓ Built ' + outPath + ' (' + sizeKb + ' KB)');

  // Minify — опционально, если установлен esbuild
  if (process.argv.includes('--minify')) {
    try {
      const esbuild = require('esbuild');
      esbuild.buildSync({
        stdin: { contents: bundled, loader: 'js' },
        minify: true,
        outfile: path.join(DIST, 'lava-orb.min.js'),
        target: 'es2020'
      });
      const minBytes = fs.statSync(path.join(DIST, 'lava-orb.min.js')).size;
      console.log('✓ Built ' + path.join(DIST, 'lava-orb.min.js') + ' (' + (minBytes / 1024).toFixed(1) + ' KB)');
    } catch (e) {
      console.warn('⚠ esbuild not available, skipping minify. Install via: npm i -D esbuild');
    }
  }
}

build();
