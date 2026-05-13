# directus-file-text-extractor

Small [Hono](https://hono.dev/) service that pulls a file from [Directus](https://directus.io/) by ID, reads its MIME type from `directus_files`, and returns extracted plain text for **PDF** and **DOCX**.

## Requirements

- [Bun](https://bun.sh/)

## Install

```sh
bun install
```

## Run

```sh
bun run dev
```

Then open `http://localhost:3000` (Bun serves the default-exported app).

## API

### `POST /extract`

JSON body:

| Field          | Type   | Description                                                                                  |
| -------------- | ------ | -------------------------------------------------------------------------------------------- |
| `fileid`       | UUID   | `directus_files.id`                                                                          |
| `directus_url` | URL    | Base URL of the Directus instance (no trailing path)                                         |
| `token`        | string | Static access token with permission to read the current user, file metadata, and file assets |

Example:

```sh
curl -sS -X POST http://localhost:3000/extract \
  -H 'Content-Type: application/json' \
  -d '{
    "fileid": "00000000-0000-0000-0000-000000000000",
    "directus_url": "https://your-directus.example.com",
    "token": "your-static-token"
  }'
```

**Success (200):**

```json
{
  "fileid": "…",
  "mime_type": "application/pdf",
  "format": "pdf",
  "text": "…"
}
```

`format` is `"pdf"` or `"docx"`.

**Errors:**

| Status | Meaning                                                                          |
| ------ | -------------------------------------------------------------------------------- |
| 401    | Invalid Directus URL or token                                                    |
| 404    | File missing or token cannot read file / asset                                   |
| 415    | Unsupported MIME type (not PDF/DOCX, and no `.pdf`/`.docx` fallback on filename) |
| 422    | Supported type but text extraction failed                                        |

MIME is taken from Directus `type`. If that is empty or generic (`application/octet-stream`), the service may infer PDF/DOCX from `filename_download`.

## Directus access

The token needs at least:

- Read current user (`/users/me` via SDK `readMe()`).
- Read file row (`directus_files`) for the given `fileid`.
- Read binary asset for that file (`/assets/:id`).

## Stack

Bun, Hono, Zod, `@directus/sdk`, [pdf-parse](https://www.npmjs.com/package/pdf-parse), [mammoth](https://www.npmjs.com/package/mammoth).
