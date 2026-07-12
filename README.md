# akshaypn.github.io

Personal research portfolio for Akshay P Nambiar.

This is a static GitHub Pages site:

- `index.html` contains the content, metadata, and structured data.
- `styles.css` contains the visual system and responsive layout.
- `script.js` contains the accessible mobile-navigation behavior.
- `images/og-research-lead.png` is the social sharing preview.
- `data/hf-artifacts.config.json` contains curated artifact descriptions,
  classifications, contribution notes, and public links.
- `data/hf-artifacts.json` is the generated Hugging Face metadata snapshot used
  by the Models & Datasets section.
- `scripts/update-hf-stats.mjs` refreshes fluctuating public statistics without
  hardcoding them into the page.

The `Update Hugging Face artifact stats` GitHub Action refreshes downloads,
likes, licenses, tasks, and update dates every Monday. It can also be run
manually from the Actions tab.

When adding a release, use an official public source, describe the contribution
as part of the wider team effort, and avoid publishing unpublished benchmarks or
implementation details.
