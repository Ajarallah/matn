# Security Policy

Matn is a local Markdown reader. It binds to `127.0.0.1` by default and serves
Markdown files plus referenced raster images under the directory or file root
used to start the process.

## Supported Versions

Security fixes are applied to the latest public version in `main`.

## Reporting a Vulnerability

Please report security issues privately through GitHub's private vulnerability
reporting for this repository, or email the maintainer listed on the GitHub
profile if private reporting is unavailable.

Do not include sensitive files or private Markdown content in public issues.

## Operational Notes

- Avoid `--host 0.0.0.0` unless you intentionally want other devices on your
  network to reach the reader.
- Treat Markdown from unknown sources as untrusted content. Matn escapes raw HTML
  and blocks unsafe link schemes, but it is still best used with files you intend
  to open locally.
