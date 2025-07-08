## GitHub Copilot Chat

- Extension Version: 0.28.3 (prod)
- VS Code: vscode/1.101.2
- OS: Mac

## Network

User Settings:
```json
  "github.copilot.advanced.debug.useElectronFetcher": true,
  "github.copilot.advanced.debug.useNodeFetcher": false,
  "github.copilot.advanced.debug.useNodeFetchFetcher": true
```

Connecting to https://api.github.com:
- DNS ipv4 Lookup: 20.27.177.116 (38 ms)
- DNS ipv6 Lookup: ::ffff:20.27.177.116 (32 ms)
- Proxy URL: None (119 ms)
- Electron fetch (configured): HTTP 200 (137 ms)
- Node.js https: HTTP 200 (122 ms)
- Node.js fetch: HTTP 200 (345 ms)
- Helix fetch: HTTP 200 (340 ms)

Connecting to https://api.individual.githubcopilot.com/_ping:
- DNS ipv4 Lookup: 140.82.113.22 (53 ms)
- DNS ipv6 Lookup: ::ffff:140.82.113.22 (8 ms)
- Proxy URL: None (17 ms)
- Electron fetch (configured): HTTP 200 (215 ms)
- Node.js https: HTTP 200 (684 ms)
- Node.js fetch: HTTP 200 (811 ms)
- Helix fetch: HTTP 200 (907 ms)

## Documentation

In corporate networks: [Troubleshooting firewall settings for GitHub Copilot](https://docs.github.com/en/copilot/troubleshooting-github-copilot/troubleshooting-firewall-settings-for-github-copilot).