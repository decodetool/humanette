import type { MetadataRoute } from 'next';
import { siteUrl } from '../content/agent-guide';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/docs', '/examples', '/workbench'].map((path) => ({ url: `${siteUrl}${path}` }));
}
