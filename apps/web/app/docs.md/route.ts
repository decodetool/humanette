import { agentGuide } from '../../content/agent-guide';
export const dynamic = 'force-static';
export function GET() {
  return new Response(agentGuide, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Link: '<https://humanette.dev/llms.txt>; rel="describedby", <https://humanette.dev/docs>; rel="canonical"',
    },
  });
}
