import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EmptyState } from '../../apps/web/src/components/Primitives.js';

describe('EmptyState', () => {
  it('admite acciones enriquecidas sin anidar un div dentro de un párrafo', () => {
    const html = renderToStaticMarkup(<EmptyState title="Vacío"><div>Detalle</div></EmptyState>);
    expect(html).toContain('class="empty-copy"');
    expect(html).not.toContain('<p><div');
  });
});
