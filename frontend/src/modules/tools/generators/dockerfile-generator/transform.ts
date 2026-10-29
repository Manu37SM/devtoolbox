import type { TransformResult } from "@/lib/tool-transform";
import type { DockerfileGeneratorOptions } from "./schema";

export function fields(input: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const line of input.split(/\r?\n/)) { const r = /^\s*([\w-]+)\s*:\s*(.*)$/.exec(line); if (r && r[2]!.trim()) m.set(r[1]!.toLowerCase(), r[2]!.trim()); }
  return m;
}
const execForm = (cmd: string) => JSON.stringify(cmd.match(/"[^"]*"|'[^']*'|\S+/g)!.map((p) => p.replace(/^["']|["']$/g, "")));

const IGNORE: Record<DockerfileGeneratorOptions["stack"], string[]> = {
  "spring-boot-maven": ["target/", "!target/*.jar", ".idea/", "*.iml", ".git/", ".env", "**/application-local.*"],
  "spring-boot-gradle": ["build/", ".gradle/", ".idea/", "*.iml", ".git/", ".env", "**/application-local.*"],
  node: ["node_modules/", "npm-debug.log", ".git/", ".env*", "coverage/", "dist/"],
  nextjs: ["node_modules/", ".next/", ".git/", ".env*.local", "coverage/"],
  python: ["__pycache__/", "*.pyc", ".venv/", "venv/", ".git/", ".env", ".pytest_cache/"],
  go: [".git/", "bin/", "*.test", ".env", "vendor/"],
  "spa-nginx": ["node_modules/", "dist/", "build/", ".git/", ".env*"],
};

export function generate(o: DockerfileGeneratorOptions, f: Map<string, string>): { dockerfile: string; notes: string[] } {
  const notes: string[] = [];
  const port = f.get("port") ?? ({ "spring-boot-maven": "8080", "spring-boot-gradle": "8080", node: "3000", nextjs: "3000", python: "8000", go: "8080", "spa-nginx": "8080" } as const)[o.stack];
  const head = ["# syntax=docker/dockerfile:1"];
  switch (o.stack) {
    case "spring-boot-maven":
    case "spring-boot-gradle": {
      const java = f.get("java") ?? "21";
      const maven = o.stack === "spring-boot-maven";
      const jar = maven ? "target/*.jar" : "$(ls build/libs/*.jar | grep -v plain)";
      let runtime: string, user: string[], entry: string;
      if (o.base === "distroless") {
        if (!/^(17|21)$/.test(java)) notes.push(`Check that gcr.io/distroless/java${java}-debian12 exists; distroless publishes images for selected LTS versions only.`);
        runtime = `gcr.io/distroless/java${java}-debian12:nonroot`;
        user = [];
        entry = '["/usr/bin/java", "org.springframework.boot.loader.launch.JarLauncher"]';
      } else {
        runtime = `eclipse-temurin:${java}-jre${o.base === "alpine" ? "-alpine" : ""}`;
        user = o.base === "alpine" ? ["RUN addgroup -S app && adduser -S app -G app", "USER app"] : ["RUN groupadd --system app && useradd --system --gid app app", "USER app"];
        entry = '["java", "org.springframework.boot.loader.launch.JarLauncher"]';
      }
      const build = maven
        ? ["COPY mvnw pom.xml ./", "COPY .mvn .mvn", "RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -q dependency:go-offline", "COPY src src", "RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -q package -DskipTests"]
        : ["COPY gradlew settings.gradle* build.gradle* ./", "COPY gradle gradle", "RUN --mount=type=cache,target=/root/.gradle ./gradlew --no-daemon dependencies > /dev/null", "COPY src src", "RUN --mount=type=cache,target=/root/.gradle ./gradlew --no-daemon bootJar -x test"];
      const lines = [
        ...head, `FROM eclipse-temurin:${java}-jdk AS build`, "WORKDIR /workspace", ...build,
        `RUN java -Djarmode=tools -jar ${jar} extract --layers --launcher --destination extracted`,
        "", `FROM ${runtime}`, "WORKDIR /app", ...(user.length ? [user[0]!] : []),
        "COPY --from=build /workspace/extracted/dependencies/ ./", "COPY --from=build /workspace/extracted/spring-boot-loader/ ./",
        "COPY --from=build /workspace/extracted/snapshot-dependencies/ ./", "COPY --from=build /workspace/extracted/application/ ./",
        ...(user.length ? [user[1]!] : []),
        `EXPOSE ${port}`,
        'ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"',
        `ENTRYPOINT ${entry}`,
      ];
      notes.push("Layered extraction with -Djarmode=tools needs Spring Boot 3.3+. For 2.x to 3.2 use -Djarmode=layertools ... extract; before 3.2 the launcher class is org.springframework.boot.loader.JarLauncher.");
      notes.push("Tests are skipped in the image build; run them in CI before building.");
      if (o.base === "standard") notes.push("No HEALTHCHECK: use Kubernetes probes on /actuator/health/liveness and /readiness instead.");
      return { dockerfile: lines.join("\n"), notes };
    }
    case "node": {
      const node = f.get("node") ?? "22";
      const cmd = f.get("cmd") ?? "node server.js";
      const img = o.base === "alpine" ? `node:${node}-alpine` : `node:${node}-slim`;
      const runtime = o.base === "distroless" ? `gcr.io/distroless/nodejs${node}-debian12:nonroot` : img;
      const lines = [...head, `FROM ${img} AS deps`, "WORKDIR /app", "COPY package.json package-lock.json ./", "RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev", "", `FROM ${runtime}`, "WORKDIR /app", "ENV NODE_ENV=production",
        "COPY --from=deps /app/node_modules ./node_modules", o.base === "distroless" ? "COPY . ." : "COPY --chown=node:node . .", ...(o.base === "distroless" ? [] : ["USER node"]), `EXPOSE ${port}`,
        o.base === "distroless" ? `CMD ${JSON.stringify(cmd.replace(/^node\s+/, "").split(/\s+/))}` : `CMD ${execForm(cmd)}`];
      if (o.base === "distroless") notes.push("Distroless Node images already run node as the entrypoint, so CMD holds only the script and its arguments.");
      notes.push("Use CMD with node directly, not npm start, so SIGTERM reaches your process.");
      return { dockerfile: lines.join("\n"), notes };
    }
    case "nextjs": {
      const node = f.get("node") ?? "22";
      const img = `node:${node}-alpine`;
      const lines = [...head, `FROM ${img} AS deps`, "WORKDIR /app", "COPY package.json package-lock.json ./", "RUN --mount=type=cache,target=/root/.npm npm ci",
        "", `FROM ${img} AS build`, "WORKDIR /app", "COPY --from=deps /app/node_modules ./node_modules", "COPY . .", "ENV NEXT_TELEMETRY_DISABLED=1", "RUN npm run build",
        "", `FROM ${img}`, "WORKDIR /app", `ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=${port} HOSTNAME=0.0.0.0`,
        "COPY --from=build --chown=node:node /app/public ./public", "COPY --from=build --chown=node:node /app/.next/standalone ./", "COPY --from=build --chown=node:node /app/.next/static ./.next/static",
        "USER node", `EXPOSE ${port}`, 'CMD ["node", "server.js"]'];
      notes.push("Requires output: \"standalone\" in next.config. NEXT_PUBLIC_* variables are inlined at build time, so pass them as build args.");
      if (o.base !== "alpine") notes.push("Next.js uses the Alpine image here regardless of the base option.");
      return { dockerfile: lines.join("\n"), notes };
    }
    case "python": {
      const py = f.get("python") ?? "3.12";
      const cmd = f.get("cmd") ?? `uvicorn main:app --host 0.0.0.0 --port ${port}`;
      if (o.base === "distroless") notes.push("Distroless Python pins the Debian Python version and cannot pip install; the slim image is used instead.");
      const img = o.base === "alpine" ? `python:${py}-alpine` : `python:${py}-slim`;
      const lines = [...head, `FROM ${img}`, "ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1", "WORKDIR /app",
        o.base === "alpine" ? "RUN addgroup -S app && adduser -S app -G app" : "RUN useradd --system --create-home app", "COPY requirements.txt .", "RUN pip install -r requirements.txt", "COPY --chown=app:app . .", "USER app", `EXPOSE ${port}`, `CMD ${execForm(cmd)}`];
      if (o.base === "alpine") notes.push("Alpine uses musl: packages with C extensions (numpy, psycopg) may compile from source and slow builds; slim is usually faster.");
      return { dockerfile: lines.join("\n"), notes };
    }
    case "go": {
      const go = f.get("go") ?? "1.24";
      const pkg = f.get("main") ?? "./cmd/server";
      const runtime = o.base === "alpine" ? "alpine:3.20" : "gcr.io/distroless/static-debian12:nonroot";
      const lines = [...head, `FROM golang:${go}-alpine AS build`, "WORKDIR /src", "COPY go.mod go.sum ./", "RUN --mount=type=cache,target=/go/pkg/mod go mod download", "COPY . .",
        `RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/app ${pkg}`,
        "", `FROM ${runtime}`, ...(o.base === "alpine" ? ["RUN apk add --no-cache ca-certificates && adduser -S -D -H app", "USER app"] : ["USER nonroot:nonroot"]), "COPY --from=build /out/app /app", `EXPOSE ${port}`, 'ENTRYPOINT ["/app"]'];
      notes.push("CGO_ENABLED=0 builds a static binary; enable cgo only if you need it and switch to a base image with libc.");
      return { dockerfile: lines.join("\n"), notes };
    }
    case "spa-nginx": {
      const node = f.get("node") ?? "22";
      const out = f.get("dist") ?? "dist";
      const lines = [...head, `FROM node:${node}-alpine AS build`, "WORKDIR /app", "COPY package.json package-lock.json ./", "RUN --mount=type=cache,target=/root/.npm npm ci", "COPY . .", "RUN npm run build",
        "", "FROM nginxinc/nginx-unprivileged:1.27-alpine", `COPY --from=build /app/${out} /usr/share/nginx/html`, "COPY nginx.conf /etc/nginx/conf.d/default.conf", "EXPOSE 8080"];
      notes.push("nginx-unprivileged runs as a non-root user on port 8080. Add an nginx.conf with try_files $uri /index.html for client-side routing.");
      notes.push("Angular 17+ outputs to dist/<project>/browser; set dist: accordingly.");
      return { dockerfile: lines.join("\n"), notes };
    }
  }
}

export function runDockerfileGenerator(input: string, options: DockerfileGeneratorOptions): TransformResult {
  const { dockerfile, notes } = generate(options, fields(input));
  const parts = [`# Dockerfile\n${dockerfile}`];
  if (options.includeDockerignore) parts.push(`# .dockerignore\n${IGNORE[options.stack].join("\n")}`);
  parts.push(notes.map((n) => `# Note: ${n}`).join("\n"));
  return { output: parts.join("\n\n"), error: null };
}
