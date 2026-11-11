import { agentGuide, siteUrl } from '../../content/agent-guide';
export const dynamic = 'force-static';
export function GET() {
  return new Response(agentGuide, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      Link: `<${siteUrl}/llms.txt>; rel="describedby", <${siteUrl}/docs>; rel="canonical"`,
    },
  });
}
