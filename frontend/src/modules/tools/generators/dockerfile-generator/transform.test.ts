import { describe, expect, it } from "vitest";
import { runDockerfileGenerator } from "./transform";
import type { DockerfileGeneratorOptions } from "./schema";

const run = (stack: DockerfileGeneratorOptions["stack"], input = "", base: DockerfileGeneratorOptions["base"] = "standard") => runDockerfileGenerator(input, { stack, base, includeDockerignore: true }).output;
const fromLines = (out: string) => out.split("\n").filter((l) => l.startsWith("FROM "));

describe("runDockerfileGenerator", () => {
  it("Spring Boot Maven: layered jar, JRE runtime, non-root", () => {
    const out = run("spring-boot-maven", "java: 21\nport: 8081");
    expect(fromLines(out)).toEqual(["FROM eclipse-temurin:21-jdk AS build", "FROM eclipse-temurin:21-jre"]);
    expect(out).toContain("RUN java -Djarmode=tools -jar target/*.jar extract --layers --launcher --destination extracted");
    expect(out).toContain("COPY --from=build /workspace/extracted/application/ ./\nUSER app\nEXPOSE 8081");
    expect(out).toContain('ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]');
    expect(out).toContain("# .dockerignore\ntarget/");
  });
  it("Spring Boot Gradle on distroless skips the plain jar", () => {
    const out = run("spring-boot-gradle", "java: 17", "distroless");
    expect(out).toContain("$(ls build/libs/*.jar | grep -v plain)");
    expect(out).toContain("FROM gcr.io/distroless/java17-debian12:nonroot");
    expect(out).not.toContain("useradd");
    expect(out).toContain('ENTRYPOINT ["/usr/bin/java", "org.springframework.boot.loader.launch.JarLauncher"]');
  });
  it("Node, Next.js, Python, Go and SPA stacks", () => {
    expect(run("node", "cmd: node dist/main.js")).toContain('USER node\nEXPOSE 3000\nCMD ["node","dist/main.js"]');
    expect(run("node", "", "distroless")).toContain('CMD ["server.js"]');
    expect(run("nextjs")).toContain("COPY --from=build --chown=node:node /app/.next/standalone ./");
    expect(run("python", "", "alpine")).toContain("FROM python:3.12-alpine");
    expect(run("python")).toContain('CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8000"]');
    expect(run("go", "main: ./cmd/api")).toContain("go build -trimpath -ldflags=\"-s -w\" -o /out/app ./cmd/api");
    expect(run("go")).toContain("FROM gcr.io/distroless/static-debian12:nonroot");
    expect(run("spa-nginx", "dist: dist/shop/browser")).toContain("COPY --from=build /app/dist/shop/browser /usr/share/nginx/html");
  });
  it("every stack runs as a non-root user", () => {
    for (const stack of ["spring-boot-maven", "spring-boot-gradle", "node", "nextjs", "python", "go"] as const) {
      for (const base of ["standard", "alpine", "distroless"] as const) {
        const out = run(stack, "", base);
        expect(/USER |:nonroot|nginx-unprivileged/.test(out), `${stack}/${base}`).toBe(true);
      }
    }
  });
});
