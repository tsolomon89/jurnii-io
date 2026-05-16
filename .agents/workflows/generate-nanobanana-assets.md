# Generate Nano Banana Assets

This workflow outlines the procedure for creating generative image assets using Nano Banana, which act as atmospheric backgrounds for our structured interface artifacts.

## Process

1. **Prompt Definition**: Review the required image prompt. Ensure it explicitly forbids text, logos, people, and gambling clichés (dice, roulette, cards). Specify "16:9" and a "dark graphite interface with precise neon green accents."
2. **Availability Check**: 
   - **If Nano Banana is available**: Use the agent skill to generate the asset.
   - **If Nano Banana is NOT available**: Create or update `assets/images/generated/IMAGE_PROMPTS.md` with the required prompt text. Do not block implementation waiting for the image; use a solid color fallback or structural CSS placeholder.
3. **Save Asset**: Save generated images to `assets/images/generated/` and reference them correctly in the HTML.
4. **Integration**: Never use a generated image as the sole visual diagram or data carrier. Use it exclusively as a background texture inside an `.artifact-shell` or behind `.artifact-floating-card` elements.
