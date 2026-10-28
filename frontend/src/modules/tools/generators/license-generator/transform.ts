import type { TransformResult } from "@/lib/tool-transform";
import type { LicenseGeneratorOptions } from "./schema";

const MIT = `MIT License

Copyright (c) {year} {holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

const ISC = `ISC License

Copyright (c) {year} {holder}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
`;

const BSD_HEAD = `Copyright (c) {year}, {holder}
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
`;
const BSD3_EXTRA = `
3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.
`;
const BSD_TAIL = `
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
`;

const UNLICENSE = `This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <https://unlicense.org>
`;

const APACHE_NOTICE = `Copyright {year} {holder}

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
`;

export const SPDX: Record<LicenseGeneratorOptions["license"], string> = { mit: "MIT", isc: "ISC", "bsd-2": "BSD-2-Clause", "bsd-3": "BSD-3-Clause", unlicense: "Unlicense", "apache-2": "Apache-2.0" };

const FULL: Record<LicenseGeneratorOptions["license"], string> = {
  mit: MIT,
  isc: ISC,
  "bsd-2": `BSD 2-Clause License\n\n${BSD_HEAD}${BSD_TAIL}`,
  "bsd-3": `BSD 3-Clause License\n\n${BSD_HEAD}${BSD3_EXTRA}${BSD_TAIL}`,
  unlicense: UNLICENSE,
  "apache-2": APACHE_NOTICE,
};

/** Reads "holder: ACME Ltd" / "year: 2026"; a bare first line is treated as the holder. */
export function parseLicenseInput(input: string, nowYear: number): { holder: string; year: string } {
  let holder = "";
  let year = String(nowYear);
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^(holder|owner|author|name|year)\s*[:=]\s*(.*)$/i.exec(line);
    if (m) { if (m[1]!.toLowerCase() === "year") year = m[2]!.trim() || year; else holder = m[2]!.trim(); }
    else if (!holder) holder = line;
  }
  return { holder, year };
}

export function commentOut(text: string, style: LicenseGeneratorOptions["comment"]): string {
  const lines = text.replace(/\n+$/, "").split("\n");
  switch (style) {
    case "block": return `/*\n${lines.map((l) => (l ? ` * ${l}` : " *")).join("\n")}\n */`;
    case "line": return lines.map((l) => (l ? `// ${l}` : "//")).join("\n");
    case "hash": return lines.map((l) => (l ? `# ${l}` : "#")).join("\n");
    default: return lines.join("\n");
  }
}

export function generateLicense(input: string, options: LicenseGeneratorOptions, nowYear: number = new Date().getFullYear()): TransformResult {
  const { holder, year } = parseLicenseInput(input, nowYear);
  if (!holder) return { output: "", error: { message: "Enter the copyright holder, e.g. \"holder: Jane Doe\"" } };
  if (!/^\d{4}(\s*[-–,]\s*\d{4})?$/.test(year)) return { output: "", error: { message: `Year "${year}" should look like 2026 or 2020-2026` } };
  const fill = (t: string) => t.replace(/\{year\}/g, year).replace(/\{holder\}/g, holder);
  if (options.output === "file") {
    const note = options.license === "apache-2" ? "\n\nNote: for Apache-2.0 the LICENSE file must contain the full license text from https://www.apache.org/licenses/LICENSE-2.0.txt; the notice above belongs in each source file header (or in a NOTICE file).\n" : "";
    return { output: fill(FULL[options.license]) + note, error: null };
  }
  const spdx = `SPDX-License-Identifier: ${SPDX[options.license]}`;
  const short = options.license === "apache-2" ? fill(APACHE_NOTICE) : `Copyright (c) ${year} ${holder}\n${spdx}`;
  const body = options.license === "apache-2" ? `${short}\n${spdx}` : short;
  return { output: commentOut(body, options.comment) + "\n", error: null };
}
