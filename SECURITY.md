## Security Policy

### Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | ✅ Yes    |

### Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Open a [GitHub Security Advisory](https://github.com/KananBasha/pointr/security/advisories/new) (preferred) or email the maintainer via GitHub profile.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- (Optional) suggested fix

We will respond within **48 hours** and aim to release a patch within **7 days** for critical issues.

### Scope

- Data exfiltration via overlay script (e.g., sending context outside localhost)
- MCP server authentication bypass
- CSP bypass via injected overlay
- Supply chain attacks via npm packages

### Out of Scope

- Issues requiring physical access to the developer's machine
- Theoretical attacks with no practical exploit path
- Issues in third-party dependencies (report to those maintainers directly)
