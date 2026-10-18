// Lettura 1/2 per src/ui/theme/figma-tokens.json · SOLO LETTURA.
// Si esegue nel connettore Figma (use_figma) sul file gEx2IMz69sIuUnOYkLBjcf;
// il valore restituito va incollato nelle chiavi omonime di figma-tokens.json
// (fileKey, fileName, mode, collections, variables, textStyles, paintStyles, effectStyles).
const colls = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const byId = Object.fromEntries(vars.map(v => [v.id, v]));
const collById = Object.fromEntries(colls.map(c => [c.id, c]));
const r255 = (x) => Math.round(x * 255);
const hex = (c) => '#' + [c.r, c.g, c.b].map(x => r255(x).toString(16).padStart(2, '0')).join('').toUpperCase();
const modeOf = (coll, name) => (coll.modes.find(m => m.name === name) || coll.modes[0]).modeId;
const resolve = (v, modeName) => {
  let val = v.valuesByMode[modeOf(collById[v.variableCollectionId], modeName)];
  let alias = null;
  while (val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS') {
    const t = byId[val.id]; if (!alias) alias = t.name;
    val = t.valuesByMode[modeOf(collById[t.variableCollectionId], modeName)];
  }
  return {val, alias};
};
const variables = [];
for (const c of colls) for (const id of c.variableIds) {
  const v = byId[id]; const {val, alias} = resolve(v, 'Chiaro');
  const e = {collection: c.name, name: v.name, type: v.resolvedType};
  if (v.resolvedType === 'COLOR') { e.hex = hex(val); e.alpha = +(val.a ?? 1).toFixed(3); }
  else e.value = val;
  if (alias) e.alias = alias;
  if (v.description) e.description = v.description;
  variables.push(e);
}
const ts = await figma.getLocalTextStylesAsync();
const textStyles = ts.map(s => {
  const e = {name: s.name, family: s.fontName.family, style: s.fontName.style, size: s.fontSize,
    lineHeight: s.lineHeight.unit === 'AUTO' ? {unit: 'AUTO'} : {unit: s.lineHeight.unit, value: +s.lineHeight.value.toFixed(2)},
    letterSpacing: {unit: s.letterSpacing.unit, value: +s.letterSpacing.value.toFixed(2)}};
  if (s.description) e.description = s.description;
  return e;
});
const ps = await figma.getLocalPaintStylesAsync();
const paintStyles = ps.map(s => {
  const e = {name: s.name, paints: s.paints.map(p => p.type === 'SOLID'
    ? {type: 'SOLID', hex: hex(p.color), opacity: +(p.opacity ?? 1).toFixed(3), variable: p.boundVariables?.color ? byId[p.boundVariables.color.id]?.name : undefined}
    : {type: p.type, opacity: +(p.opacity ?? 1).toFixed(3), stops: p.gradientStops.map(g => ({hex: hex(g.color), alpha: +g.color.a.toFixed(3), position: +g.position.toFixed(4)})), transform: p.gradientTransform.map(row => row.map(x => +x.toFixed(6)))})};
  if (s.description) e.description = s.description;
  return e;
});
const es = await figma.getLocalEffectStylesAsync();
const effectStyles = es.map(s => ({name: s.name, effects: s.effects, description: s.description || undefined}));
return {fileKey: 'gEx2IMz69sIuUnOYkLBjcf', fileName: figma.root.name, mode: 'Chiaro', collections: colls.map(c => ({name: c.name, modes: c.modes.map(m => m.name)})), variables, textStyles, paintStyles, effectStyles};
