# Black Duck Notice Generator - GitHub Action 

Generate and manage Black Duck license notice files for your projects using GitHub Actions.

## Features

- Generate new notice files in Black Duck
- Download latest notice files from Black Duck
- Modify and clean up notice file content
- Flexible authentication (direct input or environment variable)

## Usage

### Basic Example

```yaml
name: Generate License Notice
on: [push]

jobs:
  generate-notice:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate Black Duck Notice
        uses: ./
        with:
          blackduck-url: 'https://your-instance.blackducksoftware.com'
          blackduck-token: ${{ secrets.BLACKDUCK_TOKEN }}
          project-name: 'MyProject'
          version-name: 'v1.0.0'
          get-latest-notice-file: 'true'
          notice-file-path: 'NOTICE.txt'
```

### Authentication

Two methods are supported for providing the Black Duck API token:

#### Method 1: Direct Input (Recommended)
```yaml
- uses: ./
  with:
    blackduck-url: 'https://your-instance.blackducksoftware.com'
    blackduck-token: ${{ secrets.BLACKDUCK_TOKEN }}
    project-name: 'MyProject'
    version-name: 'v1.0.0'
```

#### Method 2: Environment Variable
```yaml
- uses: ./
  env:
    BLACKDUCK_TOKEN: ${{ secrets.BLACKDUCK_TOKEN }}
  with:
    blackduck-url: 'https://your-instance.blackducksoftware.com'
    project-name: 'MyProject'
    version-name: 'v1.0.0'
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `blackduck-url` | Yes | - | Black Duck server URL (e.g., https://your-instance.blackducksoftware.com) |
| `blackduck-token` | No* | - | API token for authentication |
| `project-name` | Yes | - | Black Duck project name |
| `version-name` | Yes | - | Black Duck version name |
| `notice-file-path` | No | `oss-notice-file.txt` | Output path for the notice file |
| `local-notice-file-directory` | No | `false` | Directory containing local notice file to be modified |
| `generate-notice-file` | No | `false` | Whether to trigger generation of a new notice file in Black Duck |
| `get-latest-notice-file` | No | `false` | Whether to download the latest notice file from Black Duck |
| `modify-notice-file` | No | `false` | Whether to modify an existing notice file by removing Black Duck generated text |

*Either `blackduck-token` input or `BLACKDUCK_TOKEN` environment variable must be provided.

## Advanced Examples

### Generate and Download Notice File

```yaml
- name: Create Black Duck Notice
  uses: ./
  with:
    blackduck-url: 'https://blackduck.company.com'
    blackduck-token: ${{ secrets.BLACKDUCK_TOKEN }}
    project-name: ${{ github.event.repository.name }}
    version-name: ${{ github.ref_name }}
    generate-notice-file: 'true'
    get-latest-notice-file: 'true'
    notice-file-path: 'THIRD_PARTY_NOTICES.txt'

- name: Commit Notice File
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add THIRD_PARTY_NOTICES.txt
    git commit -m "Update third party notices" || echo "No changes"
    git push
```

### Modify Existing Notice File

```yaml
- name: Modify Notice File
  uses: ./
  with:
    blackduck-url: ${{ secrets.BLACKDUCK_URL }}
    blackduck-token: ${{ secrets.BLACKDUCK_TOKEN }}
    project-name: 'MyProject'
    version-name: '1.0.0'
    modify-notice-file: 'true'
    local-notice-file-directory: './licenses'
    notice-file-path: './NOTICE.txt'
```

### Download Latest Notice on Release

```yaml
name: Update License Notice
on:
  release:
    types: [published]

jobs:
  update-notice:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download Latest Notice
        uses: ./
        with:
          blackduck-url: ${{ secrets.BLACKDUCK_URL }}
          blackduck-token: ${{ secrets.BLACKDUCK_TOKEN }}
          project-name: ${{ github.event.repository.name }}
          version-name: ${{ github.event.release.tag_name }}
          get-latest-notice-file: 'true'
          notice-file-path: 'NOTICE.txt'

      - name: Upload Notice as Release Asset
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ github.event.release.upload_url }}
          asset_path: ./NOTICE.txt
          asset_name: NOTICE.txt
          asset_content_type: text/plain
```

## Development

### Building the Action

```bash
cd licensegenerator
npm install
npm run build
```

This will compile the TypeScript code and generate the distribution files in the `licensegenerator/dist/` directory.

### Project Structure

```
blackduck-license-generator/
├── action.yml                     # GitHub Action definition
├── README.md                      # This file
├── CLAUDE.md                      # Development guidance
└── licensegenerator/
    ├── package.json               # Dependencies
    ├── tsconfig.json              # TypeScript configuration
    ├── dist/                      # Compiled output
    │   └── index.js              # Action entry point
    └── src/
        ├── index.ts              # Main action code
        ├── services/
        │   ├── BlackDuckNotice.ts       # Business logic
        │   └── BlackDuckApiCalls.ts     # API client
        └── models/               # TypeScript interfaces
```

## How It Works

1. **Authentication**: The action authenticates with Black Duck using an API token (provided as input or environment variable)
2. **URL Normalization**: The Black Duck URL is normalized by removing protocol and trailing slashes
3. **Operation Execution**: Based on the boolean flags, the action performs one or more of:
   - **Generate**: Triggers Black Duck to create a new license notice report
   - **Download**: Retrieves the latest notice file, unzips it, and saves it locally
   - **Modify**: Cleans up a local notice file by removing Black Duck boilerplate text

## License

ISC

## Support

For issues and questions, please open an issue in this repository.
