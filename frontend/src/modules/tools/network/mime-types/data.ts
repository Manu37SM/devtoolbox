export type MimeEntry = readonly [extension: string, mime: string];

export const MIME_TYPES: MimeEntry[] = [
  ["aac", "audio/aac"], ["avi", "video/x-msvideo"], ["avif", "image/avif"], ["bin", "application/octet-stream"], ["bmp", "image/bmp"],
  ["bz2", "application/x-bzip2"], ["c", "text/x-c"], ["cer", "application/pkix-cert"], ["class", "application/java-vm"],
  ["css", "text/css"], ["csv", "text/csv"], ["doc", "application/msword"],
  ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], ["eot", "application/vnd.ms-fontobject"],
  ["epub", "application/epub+zip"], ["flac", "audio/flac"], ["gif", "image/gif"], ["gz", "application/gzip"], ["h", "text/x-c"],
  ["htm", "text/html"], ["html", "text/html"], ["ico", "image/vnd.microsoft.icon"], ["ics", "text/calendar"], ["jar", "application/java-archive"],
  ["java", "text/x-java-source"], ["jpeg", "image/jpeg"], ["jpg", "image/jpeg"], ["js", "text/javascript"], ["json", "application/json"],
  ["jsonld", "application/ld+json"], ["jsonl", "application/jsonl"], ["map", "application/json"], ["md", "text/markdown"], ["mid", "audio/midi"],
  ["mjs", "text/javascript"], ["mkv", "video/x-matroska"], ["mov", "video/quicktime"], ["mp3", "audio/mpeg"], ["mp4", "video/mp4"],
  ["mpeg", "video/mpeg"], ["ndjson", "application/x-ndjson"], ["oga", "audio/ogg"], ["ogg", "audio/ogg"], ["ogv", "video/ogg"],
  ["opus", "audio/opus"], ["otf", "font/otf"], ["p12", "application/x-pkcs12"], ["pdf", "application/pdf"], ["pem", "application/x-pem-file"],
  ["php", "application/x-httpd-php"], ["png", "image/png"], ["ppt", "application/vnd.ms-powerpoint"],
  ["pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"], ["py", "text/x-python"], ["rar", "application/vnd.rar"],
  ["rtf", "application/rtf"], ["sh", "application/x-sh"], ["sql", "application/sql"], ["svg", "image/svg+xml"], ["tar", "application/x-tar"],
  ["tif", "image/tiff"], ["tiff", "image/tiff"], ["toml", "application/toml"], ["ts", "video/mp2t"], ["tsv", "text/tab-separated-values"],
  ["ttf", "font/ttf"], ["txt", "text/plain"], ["vtt", "text/vtt"], ["wasm", "application/wasm"], ["wav", "audio/wav"], ["weba", "audio/webm"],
  ["webm", "video/webm"], ["webmanifest", "application/manifest+json"], ["webp", "image/webp"], ["woff", "font/woff"], ["woff2", "font/woff2"],
  ["xhtml", "application/xhtml+xml"], ["xls", "application/vnd.ms-excel"],
  ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], ["xml", "application/xml"], ["yaml", "application/yaml"],
  ["yml", "application/yaml"], ["zip", "application/zip"], ["7z", "application/x-7z-compressed"],
];
