# Security

## Report a problem

For repository infrastructure problems (indexes, website, downloads, or tooling), open an issue in the GitHub repository linked from the [ipapplus profile](https://github.com/ipapplus). Include the affected URL, what you expected, and steps to reproduce. Remove credentials, device identifiers and private paths from reports.

For sensitive vulnerabilities, use GitHub's **Security → Report a vulnerability** option if enabled. If it is unavailable, contact the maintainer through the public [@ipapplus account](https://x.com/ipapplus) to arrange a private reporting channel. Do not post exploit details or secrets publicly. No private email or response-time guarantee is provided here.

## Suspicious or corrupted packages

Do not install a package you suspect is unsafe. Report its package identifier, version, architecture, download URL, observed SHA256, and the reason for concern. Compare the download with the repository's index/provenance hashes; a matching hash establishes byte consistency, not safety or authorship.

Repository delivery and metadata issues belong here. Package code, payload behavior and upstream vulnerabilities generally belong with the original developer; upstream information is shown when supplied by the package. Report suspected repository tampering to the repository maintainer as well.

Third-party packages may belong to their original authors. Author, dependency, firmware and compatibility declarations come from archive metadata and are not necessarily independently verified. Repository validation does not establish that a package is safe or compatible with every device. The repository is currently unsigned; no signing or security guarantee should be inferred from HTTPS or checksum availability.
