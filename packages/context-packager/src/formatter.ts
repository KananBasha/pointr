import { PointrPayload } from './types.js';

export function formatMarkdown(payload: Omit<PointrPayload, 'markdown'>): string {
  let md = `## Pointr Element Context
**Intent:** "${payload.meta.intent}"

`;

  md += `### Source
- **File:** \`${payload.source.file}:${payload.source.line}:${payload.source.column}\`
- **Snippet:**
`;
  md += `\`\`\`tsx
${payload.source.snippet}
\`\`\`

`;

  if (payload.componentTree.length > 0) {
    md += `### Component Tree
`;
    const treeNames = payload.componentTree.map((c, i) => {
      if (i === payload.componentTree.length - 1) return `**\`${c.name}\`** ← selected`;
      return `\`${c.name}\``;
    });
    md += `${treeNames.join(' → ')}

`;
  }

  const selectedComp = payload.componentTree[payload.componentTree.length - 1];
  if (selectedComp && Object.keys(selectedComp.props).length > 0) {
    md += `### Props
| Prop | Value |
|------|-------|
`;
    for (const [k, v] of Object.entries(selectedComp.props)) {
      let valStr = String(v);
      if (typeof v === 'object') valStr = JSON.stringify(v);
      md += `| ${k} | ${valStr} |
`;
    }
    md += `
`;
  }

  if (Object.keys(payload.styles.computed).length > 0) {
    md += `### Computed Styles
| Property | Value |
|----------|-------|
`;
    for (const [k, v] of Object.entries(payload.styles.computed)) {
      md += `| ${k} | ${v} |
`;
    }
    md += `
`;
  }

  if (Object.keys(payload.styles.designTokens).length > 0) {
    md += `### Design Tokens
| Token | Value |
|-------|-------|
`;
    for (const [k, v] of Object.entries(payload.styles.designTokens)) {
      md += `| ${k} | ${v} |
`;
    }
    md += `
`;
  }

  md += `### Selectors
- **CSS:** \`${payload.dom.cssSelector}\`
- **XPath:** \`${payload.dom.xpath}\`
`;

  return md;
}
