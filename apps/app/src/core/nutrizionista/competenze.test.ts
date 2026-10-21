import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { ETICHETTE_COMPETENZE, etichettaCompetenza } from './competenze.ts';

const FILE_FUNNEL = join(homedir(), 'Desktop', 'onboarding-v2', 'src', 'ui', 'pages', 'NutritionistPage.tsx');

/** Legge BADGE_LABEL dal sorgente del funnel (oggetto letterale con chiavi e valori tra apici). */
function mappaDelFunnel(sorgente: string): Record<string, string> {
  const blocco = /const BADGE_LABEL[^{]*\{([\s\S]*?)\n\}/.exec(sorgente)?.[1] ?? '';
  const mappa: Record<string, string> = {};
  for (const m of blocco.matchAll(/'([^']+)':\s*'([^']+)'/g)) mappa[m[1] as string] = m[2] as string;
  return mappa;
}

describe('etichette delle competenze', () => {
  it('coincidono con BADGE_LABEL del funnel (onboarding-v2), quando il repo è sul disco', (t) => {
    if (!existsSync(FILE_FUNNEL)) return t.skip(`funnel non presente: ${FILE_FUNNEL}`);
    const funnel = mappaDelFunnel(readFileSync(FILE_FUNNEL, 'utf8'));
    assert.ok(Object.keys(funnel).length >= 10, 'mappa del funnel non letta');
    assert.deepEqual(ETICHETTE_COMPETENZE, funnel, 'le etichette delle competenze divergono dal funnel: allineare src/core/nutrizionista/competenze.ts');
  });
  it('una chiave sconosciuta si mostra ripulita invece di sparire', () => {
    assert.equal(etichettaCompetenza('weight-loss'), 'Dimagrimento');
    assert.equal(etichettaCompetenza('menopause-care'), 'Menopause care');
  });
});
