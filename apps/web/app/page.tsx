import { Examples } from '../components/examples';
import { CodeBlock } from '../components/code-block';
export default function Home() {
  return (
    <div className="shell max-w-4xl!">
      <section className="pt-12 pb-4 text-center">
        <h1 className="mx-auto max-w-2xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Screen Studios for browser automation
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-center text-balance text-base leading-7 text-muted">
          Make your browser demos easier to follow with a few lines of TypeScript. Humanette adds
          large cursors to make it easy to see mouse events and displays your keyboard presses.
        </p>
        <h2 className="mt-6 text-sm font-semibold">Use cases</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-balance text-base leading-7 text-muted">
          Use it to generate product walk throughs or ask agents to create videos to prove they
          tested or added features.
        </p>
        <div className="mx-auto mt-6 max-w-md text-left">
          <CodeBlock label="Install" language="bash" code="npm install humanette" compact />
        </div>
      </section>
      <section className="mt-10">
        <h1 className="text-3xl font-semibold tracking-tight">Examples</h1>
        <Examples />
      </section>
    </div>
  );
}
