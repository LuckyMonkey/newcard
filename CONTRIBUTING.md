# Contributing

NewCard and ncNFC are independent open-source efforts. Please keep changes focused on reusable physical-to-web NFC resolution, not a particular application ecosystem.

Before submitting a change:

1. Run `npm test` on Node.js 20+.
2. Document any compatibility assumptions and indicate what actual hardware you've tested.
3. Treat UIDs as public/untrusted; do not add authentication or tracking based only on them.
4. Never commit real card UIDs, personal information, tokens, or private registry data.
5. Separate implemented behavior from speculative future OS integrations.

Issues and discussion about protocol interoperability are welcome once the repository is published.
