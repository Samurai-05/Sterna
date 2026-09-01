#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createCountriesFog, countInteriorRings } from './country-fog.mjs'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const sourcePath = resolve(
  scriptDirectory,
  '../../api/src/countries/countries.geo.json',
)
const outputPath = resolve(scriptDirectory, '../public/countries-fog.geo.json')
const source = JSON.parse(readFileSync(sourcePath, 'utf8'))
const fog = createCountriesFog(source)

writeFileSync(outputPath, `${JSON.stringify(fog)}\n`)

console.log(
  `Generated ${outputPath}: ${countInteriorRings(source)} → ${countInteriorRings(fog)} interior rings`,
)
