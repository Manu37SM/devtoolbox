import { describe, expect, it } from "vitest";
import { load } from "js-yaml";
import { convertDockerRun, parseDockerRun } from "./transform";

const opts = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compose = (cmd: string) => load(convertDockerRun(cmd, opts).output) as Record<string, any>;

describe("parseDockerRun", () => {
  it("separates flags, image and command", () => {
    const p = parseDockerRun("docker run -d -p 8080:80 --name web nginx:1.27 nginx -g 'daemon off;'");
    expect(p.image).toBe("nginx:1.27");
    expect(p.command).toEqual(["nginx", "-g", "daemon off;"]);
    expect(p.flags.get("--publish")).toEqual(["8080:80"]);
    expect(p.flags.get("--name")).toEqual(["web"]);
  });
  it("handles bundled and attached short flags, --flag=value, sudo and line continuations", () => {
    const p = parseDockerRun("sudo docker run -dit -p80:80 -eFOO=bar --restart=always \\\n  alpine sh");
    expect(p.booleans).toContain("-d");
    expect(p.booleans).toContain("-t");
    expect(p.flags.get("--publish")).toEqual(["80:80"]);
    expect(p.flags.get("--env")).toEqual(["FOO=bar"]);
    expect(p.flags.get("--restart")).toEqual(["always"]);
  });
  it("rejects other commands and missing images", () => {
    expect(() => parseDockerRun("docker build .")).toThrow(/docker run/);
    expect(() => parseDockerRun("ls")).toThrow();
    expect(() => parseDockerRun("docker run -d")).toThrow(/image/);
    expect(() => parseDockerRun("docker run -p")).toThrow(/expects a value/);
  });
});

describe("convertDockerRun", () => {
  it("maps common flags to a Compose service", () => {
    const c = compose(`docker run -d --name db -p 5432:5432 -e POSTGRES_PASSWORD=pw -v pgdata:/var/lib/postgresql/data -v ./init:/docker-entrypoint-initdb.d --restart unless-stopped --network backend -w /app -u 1000 --memory 512m --cpus 1.5 -l a=b postgres:16`);
    expect(c.services.db).toMatchObject({
      image: "postgres:16", container_name: "db", ports: ["5432:5432"], environment: ["POSTGRES_PASSWORD=pw"],
      volumes: ["pgdata:/var/lib/postgresql/data", "./init:/docker-entrypoint-initdb.d"], restart: "unless-stopped",
      networks: ["backend"], working_dir: "/app", user: "1000", mem_limit: "512m", cpus: 1.5, labels: ["a=b"],
    });
    expect(c.volumes).toEqual({ pgdata: {} });
    expect(c.networks).toEqual({ backend: { external: true } });
  });

  it("uses the image name as the service name when --name is absent", () => {
    expect(Object.keys(compose("docker run ghcr.io/acme/api:latest").services)).toEqual(["api"]);
  });

  it("maps host networking, tty/stdin, privileged, entrypoint and healthcheck", () => {
    const s = compose(`docker run -it --privileged --network host --entrypoint "/bin/sh -c" --health-cmd 'curl -f localhost' --health-retries 3 img`).services.img;
    expect(s).toMatchObject({ tty: true, stdin_open: true, privileged: true, network_mode: "host", entrypoint: ["/bin/sh", "-c"] });
    expect(s.healthcheck).toEqual({ test: ["CMD-SHELL", "curl -f localhost"], retries: 3 });
  });

  it("keeps a single-token command as a string and multi-token as a list", () => {
    expect(compose("docker run alpine sleep").services.alpine.command).toBe("sleep");
    expect(compose("docker run alpine sleep 10").services.alpine.command).toEqual(["sleep", "10"]);
  });

  it("lists flags it could not convert", () => {
    const out = convertDockerRun("docker run --rm --ulimit nofile=1024 --sysctl a=b alpine", opts).output;
    expect(out.split("\n")[0]).toMatch(/^# Not converted: .*--ulimit.*--sysctl.*--rm/);
  });

  it("reports errors and handles empty input", () => {
    expect(convertDockerRun("docker ps", opts).error).not.toBeNull();
    expect(convertDockerRun("", opts)).toEqual({ output: "", error: null });
  });
});
