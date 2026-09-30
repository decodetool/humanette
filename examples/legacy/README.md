# Archived Decode color-grid recipe

decode-color-grid.mjs and its tests preserve the working 4 × 3 palette demonstration from the agent-browser fork. This is a historical adapter example, not the new Humanette API. It still requires the modified agent-browser CLI, a running Decode web development environment, a local development user or an accessible empty board, and ffmpeg.

Set AGENT_BROWSER_BIN explicitly to the built fork binary. Run with --dry-run to inspect commands without browser actions. Run node --test examples/legacy/decode-color-grid.test.mjs for the sequence checks. Do not run the recording against a production board.

The source came from seflless/agent-browser at af79d4081bd2366c2f0dffbd4de912fa63149f14. Apache-2.0 applies; see packages/humanette/LICENSE-APACHE-2.0. The original recipe is retained rather than claimed to be a tested adapter for the evolving Decode UI.

For the new package's real-input demonstration, use ../record-demo.mjs against the Humanette website.
