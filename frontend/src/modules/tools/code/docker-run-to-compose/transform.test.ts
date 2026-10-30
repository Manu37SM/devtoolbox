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
    const out = convertDockerRun("docker run --rm --label-file l.txt --detach-keys ctrl-x alpine", opts).output;
    expect(out.split("\n")[0]).toMatch(/^# Not converted: .*--label-file.*--detach-keys.*--rm/);
  });

  it("reports errors and handles empty input", () => {
    expect(convertDockerRun("docker ps", opts).error).not.toBeNull();
    expect(convertDockerRun("", opts)).toEqual({ output: "", error: null });
  });
});

describe("convertDockerRun options", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const y = (cmd: string, o = {}) => load(convertDockerRun(cmd, o).output) as Record<string, any>;
  const PG = "docker run -d --name db -e POSTGRES_USER=app -e POSTGRES_PASSWORD=s3cret -e TZ postgres:16";

  it("writes environment as a map and renames the service", () => {
    const d = y(PG, { envStyle: "map", serviceName: "database" });
    expect(d.services.database.environment).toEqual({ POSTGRES_USER: "app", POSTGRES_PASSWORD: "s3cret", TZ: null });
  });

  it("moves secret values to ${VAR} references and a .env listing", () => {
    const out = convertDockerRun(PG, { extractSecrets: true }).output;
    expect(out).toContain("POSTGRES_PASSWORD=${POSTGRES_PASSWORD}");
    expect(out).toContain("POSTGRES_USER=app");
    expect(out).toContain("# .env (keep out of version control)\n# POSTGRES_PASSWORD=s3cret");
  });

  it("can drop container_name and make networks local", () => {
    const d = y("docker run --name api --network backend nginx", { containerName: false, externalNetworks: false });
    expect(d.services.api.container_name).toBeUndefined();
    expect(d.networks).toEqual({ backend: {} });
  });

  it("converts several docker run commands into one file", () => {
    const d = y(`docker run -d --name db postgres:16 && docker run -d --name web -p 80:80 \\\n  nginx\ndocker run redis`);
    expect(Object.keys(d.services)).toEqual(["db", "web", "redis"]);
    expect(d.services.web.ports).toEqual(["80:80"]);
  });

  it("maps logging, ulimits, sysctls and --mount", () => {
    const d = y(
      "docker run --log-driver json-file --log-opt max-size=10m --ulimit nofile=1024:2048 --ulimit nproc=512 --sysctl net.core.somaxconn=1024 --mount type=volume,source=data,target=/var/lib/data,readonly --pull always alpine",
    );
    const s = d.services.alpine;
    expect(s.logging).toEqual({ driver: "json-file", options: { "max-size": "10m" } });
    expect(s.ulimits).toEqual({ nofile: { soft: 1024, hard: 2048 }, nproc: 512 });
    expect(s.sysctls).toEqual({ "net.core.somaxconn": "1024" });
    expect(s.volumes).toEqual([{ type: "volume", source: "data", target: "/var/lib/data", read_only: true }]);
    expect(s.pull_policy).toBe("always");
    expect(d.volumes).toEqual({ data: {} });
  });
});

