// Lettura 2/2 per src/ui/theme/figma-tokens.json · SOLO LETTURA.
// Si esegue nel connettore Figma (use_figma); il valore restituito va incollato
// nella chiave "icons" di figma-tokens.json (pagina Componenti · App nativa, 418:2).
const comps = await figma.getNodeByIdAsync('418:2');
await figma.setCurrentPageAsync(comps);
const vars = await figma.variables.getLocalVariablesAsync();
const byId = Object.fromEntries(vars.map(v => [v.id, v.name]));
const all = comps.findAllWithCriteria({types: ['COMPONENT']}).filter(c => /^Icona( AI)? \//.test(c.name));
const icons = all.map(c => {
  const shapes = c.findAll(n => ['VECTOR', 'BOOLEAN_OPERATION', 'ELLIPSE', 'RECTANGLE', 'LINE'].includes(n.type));
  const sw = [...new Set(shapes.map(v => +(+v.strokeWeight).toFixed(2)))];
  const strokeVars = [...new Set(shapes.flatMap(v => (v.strokes || []).map(s => s.boundVariables?.color ? byId[s.boundVariables.color.id] : s.type)))];
  const fillVars = [...new Set(shapes.flatMap(v => (v.fills || []).map(s => s.boundVariables?.color ? byId[s.boundVariables.color.id] : s.type)))];
  const e = {id: c.id, name: c.name, size: c.width, description: c.description, strokeWeight: sw.length === 1 ? sw[0] : sw, shapes: shapes.length};
  if (strokeVars.length) e.stroke = strokeVars.length === 1 ? strokeVars[0] : strokeVars;
  if (fillVars.length) e.fill = fillVars.length === 1 ? fillVars[0] : fillVars;
  return e;
}).sort((a, b) => a.name.localeCompare(b.name));
return {page: comps.name, pageId: comps.id, icons};
