# Notion Batch Apply Template

This Node.js script allows you to batch apply a Notion template to all existing pages within a specific data source.

> [!WARNING]
> This script is configured with `erase_content: true`.
> All existing content within the target pages will be permanently deleted and replaced by the specified template.
> Please test this on a duplicate or dummy database before running it on production data.

## Installation

> [!NOTE]
> If you are using npx, you can skip the installation step and run the script directly with `npx notion-batch-apply-template ...`.

Install the package using npm:

```bash
npm install notion-batch-apply-template
```

## Setup

Set your [Notion integration token](https://www.notion.com/help/create-integrations-with-the-notion-api) as an environment variable:

```bash
export NOTION_TOKEN="your_integration_token"
```

## Usage

Run the script:

```bash
notion-batch-apply-template --data-source <data_source_id> [options]
```

### Arguments

| Argument                    | Required | Default   | Description                                                                       |
|-----------------------------|----------|-----------|-----------------------------------------------------------------------------------|
| `--data-source` (or `--ds`) | Yes      | -         | The ID of the target data source.                                                 |
| `--template`                | No       | `default` | The ID or URL of the template to apply. If omitted, the default template is used. |
| `--delay`                   | No       | `150`     | Delay in milliseconds between API calls to avoid rate limiting.                   |

> [!TIP]
> To get a data source ID from the Notion app, the settings menu for a database includes a "Copy data source ID" button under "Manage data sources":
> ![](https://mintcdn.com/notion-demo/S-I3qLQnwRa7HjdK/images/reference/image-4.png?w=2500&fit=max&auto=format&n=S-I3qLQnwRa7HjdK&q=85&s=02948f93889722aa8adfce042bdd8b54)

## License

Notion Batch Apply Template is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).

### Disclaimer

This tool performs destructive operations.
The author is not responsible for any data loss or damages resulting from the use of this script.
Use it at your own risk.
