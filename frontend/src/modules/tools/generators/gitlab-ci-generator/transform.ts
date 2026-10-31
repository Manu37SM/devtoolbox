import { dump } from "js-yaml";
import type { TransformResult } from "@/lib/tool-transform";
import type { GitlabCiGeneratorOptions } from "./schema";

type Obj = Record<string, unknown>;
const STAGE_ORDER = ["lint", "test", "build", "docker", "deploy"] as const;

const SERVICES: Record<string, { name: string; vars: Obj }> = {
  postgres: { name: "postgres:16-alpine", vars: { POSTGRES_DB: "test", POSTGRES_USER: "test", POSTGRES_PASSWORD: "test" } },
  mysql: { name: "mysql:8.4", vars: { MYSQL_DATABASE: "test", MYSQL_ROOT_PASSWORD: "test" } },
  redis: { name: "redis:7-alpine", vars: {} },
  mongo: { name: "mongo:7", vars: {} },
};

interface StackDef {
  image: (v: string) => string;
  defaultVersion: string;
  cachePaths: string[];
  cacheKeyFiles: string[];
  install?: string[];
  lint: string[];
  test: string[];
  build: string[];
  artifactPaths: string[];
  coverageRegex?: string;
  junit?: string;
  variables?: Obj;
}

function stackDef(o: GitlabCiGeneratorOptions): StackDef {
  const pm = o.packageManager;
  const run = (s: string) => (pm === "npm" ? `npm run ${s}` : pm === "yarn" ? `yarn ${s}` : `pnpm run ${s}`);
  switch (o.stack) {
    case "node":
      return {
        image: (v) => `node:${v}`, defaultVersion: "22",
        cachePaths: pm === "npm" ? [".npm/"] : pm === "yarn" ? [".yarn-cache/"] : [".pnpm-store/"],
        cacheKeyFiles: [pm === "npm" ? "package-lock.json" : pm === "yarn" ? "yarn.lock" : "pnpm-lock.yaml"],
        install: pm === "npm" ? ["npm ci --cache .npm --prefer-offline"] : pm === "yarn" ? ["yarn install --frozen-lockfile --cache-folder .yarn-cache"] : ["corepack enable", "pnpm config set store-dir .pnpm-store", "pnpm install --frozen-lockfile"],
        lint: [run("lint")], test: [run("test")], build: [run("build")], artifactPaths: ["dist/"],
        coverageRegex: "/All files[^|]*\\|[^|]*\\s+([\\d.]+)/",
      };
    case "java-maven":
      return {
        image: (v) => `maven:3.9-eclipse-temurin-${v}`, defaultVersion: "21", cachePaths: [".m2/repository/"], cacheKeyFiles: ["pom.xml"],
        variables: { MAVEN_OPTS: "-Dmaven.repo.local=$CI_PROJECT_DIR/.m2/repository", MAVEN_CLI_OPTS: "--batch-mode --errors --show-version" },
        lint: ["mvn $MAVEN_CLI_OPTS verify -DskipTests -Dcheckstyle.skip=false"], test: ["mvn $MAVEN_CLI_OPTS test"], build: ["mvn $MAVEN_CLI_OPTS package -DskipTests"],
        artifactPaths: ["target/*.jar"], junit: "target/surefire-reports/TEST-*.xml", coverageRegex: "/Total.*?([0-9]{1,3})%/",
      };
    case "java-gradle":
      return {
        image: (v) => `gradle:8-jdk${v}`, defaultVersion: "21", cachePaths: [".gradle/caches/", ".gradle/wrapper/"], cacheKeyFiles: ["build.gradle", "gradle/wrapper/gradle-wrapper.properties"],
        variables: { GRADLE_USER_HOME: "$CI_PROJECT_DIR/.gradle", GRADLE_OPTS: "-Dorg.gradle.daemon=false" },
        lint: ["gradle check -x test"], test: ["gradle test"], build: ["gradle assemble"], artifactPaths: ["build/libs/*.jar"], junit: "build/test-results/test/TEST-*.xml",
      };
    case "python":
      return {
        image: (v) => `python:${v}-slim`, defaultVersion: "3.12", cachePaths: [".cache/pip/"], cacheKeyFiles: ["requirements.txt"],
        variables: { PIP_CACHE_DIR: "$CI_PROJECT_DIR/.cache/pip" },
        install: ["python -m venv .venv", "source .venv/bin/activate", "pip install -r requirements.txt"],
        lint: ["pip install ruff", "ruff check ."], test: ["pytest --junitxml=report.xml --cov --cov-report=term"], build: ["pip install build", "python -m build"],
        artifactPaths: ["dist/"], junit: "report.xml", coverageRegex: "/TOTAL.*\\s+(\\d+%)$/",
      };
    case "go":
      return {
        image: (v) => `golang:${v}`, defaultVersion: "1.23", cachePaths: [".go/pkg/mod/"], cacheKeyFiles: ["go.sum"],
        variables: { GOPATH: "$CI_PROJECT_DIR/.go" },
        lint: ["go vet ./..."], test: ["go test -race -cover ./..."], build: ["go build -o bin/app ./..."], artifactPaths: ["bin/"], coverageRegex: "/coverage: (\\d+\\.\\d+)% of statements/",
      };
    case "docker-only":
      return { image: () => "alpine:3.20", defaultVersion: "", cachePaths: [], cacheKeyFiles: [], lint: ["echo 'add lint commands'"], test: ["echo 'add test commands'"], build: ["echo 'add build commands'"], artifactPaths: [] };
  }
}

export function buildGitlabCi(o: GitlabCiGeneratorOptions): Obj {
  const s = stackDef(o);
  const image = s.image(o.version.trim() || s.defaultVersion);
  const wanted = STAGE_ORDER.filter((x) => o.stages.includes(x) || (x === "deploy" && o.deploy !== "none") || (x === "test" && o.sast));
  const stages = wanted;
  const ci: Obj = {};
  if (o.sast) ci.include = [{ template: "Security/SAST.gitlab-ci.yml" }, { template: "Security/Secret-Detection.gitlab-ci.yml" }];
  ci.stages = stages;

  const rulesFor = (extra?: Obj[]): Obj[] =>
    o.mrPipelines
      ? [{ if: '$CI_PIPELINE_SOURCE == "merge_request_event"' }, { if: "$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH" }, ...(extra ?? [])]
      : [{ when: "on_success" }];
  if (o.mrPipelines) ci.workflow = { rules: [{ if: '$CI_PIPELINE_SOURCE == "merge_request_event"' }, { if: "$CI_COMMIT_BRANCH && $CI_OPEN_MERGE_REQUESTS", when: "never" }, { if: "$CI_COMMIT_BRANCH" }, { if: "$CI_COMMIT_TAG" }] };

  const variables: Obj = { ...(s.variables ?? {}) };
  for (const svc of o.services) Object.assign(variables, SERVICES[svc]!.vars);
  if (Object.keys(variables).length) ci.variables = variables;

  const defaults: Obj = { image };
  if (o.retry > 0) defaults.retry = { max: o.retry, when: ["runner_system_failure", "stuck_or_timeout_failure"] };
  if (o.interruptible) defaults.interruptible = true;
  if (o.timeoutMinutes > 0) defaults.timeout = `${o.timeoutMinutes}m`;
  if (o.cache && s.cachePaths.length) {
    defaults.cache = { key: { files: s.cacheKeyFiles }, paths: s.cachePaths, policy: "pull-push" };
  }
  ci.default = defaults;

  const before = s.install;
  const jobBase = (stage: string, script: string[], extra: Obj = {}): Obj => ({
    stage,
    ...(before ? { before_script: before } : {}),
    script,
    ...extra,
  });
  const svcList = o.services.map((x) => ({ name: SERVICES[x]!.name, alias: x }));

  if (stages.includes("lint")) ci["lint"] = jobBase("lint", s.lint, { rules: rulesFor() });
  if (stages.includes("test")) {
    const t: Obj = { ...(svcList.length ? { services: svcList } : {}) };
    if (o.coverage && s.coverageRegex) t.coverage = s.coverageRegex;
    if (s.junit) t.artifacts = { when: "always", reports: { junit: s.junit } };
    t.rules = rulesFor();
    ci["test"] = jobBase("test", s.test, t);
  }
  if (stages.includes("build")) {
    const b: Obj = { rules: rulesFor() };
    if (o.artifacts && s.artifactPaths.length) b.artifacts = { paths: s.artifactPaths, expire_in: "1 week" };
    ci["build"] = jobBase("build", s.build, b);
  }
  if (stages.includes("docker")) {
    const tag = "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA";
    ci["docker-build"] = {
      stage: "docker", image: "docker:27", services: ["docker:27-dind"],
      variables: { DOCKER_TLS_CERTDIR: "/certs" },
      script: o.dockerPush
        ? ['echo "$CI_REGISTRY_PASSWORD" | docker login -u "$CI_REGISTRY_USER" --password-stdin $CI_REGISTRY', `docker build --pull -t ${tag} -t $CI_REGISTRY_IMAGE:latest .`, `docker push ${tag}`, "docker push $CI_REGISTRY_IMAGE:latest"]
        : [`docker build --pull -t ${tag} .`],
      rules: [{ if: "$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH" }, { if: "$CI_COMMIT_TAG" }],
    };
  }
  if (o.deploy !== "none") {
    const base: Obj = { stage: "deploy", environment: { name: o.environmentName }, rules: [{ if: "$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH", when: o.manualDeploy ? "manual" : "on_success" }], interruptible: false };
    if (o.deploy === "ssh") {
      ci["deploy"] = { ...base, image: "alpine:3.20", before_script: ["apk add --no-cache openssh-client", "eval $(ssh-agent -s)", 'echo "$SSH_PRIVATE_KEY" | tr -d "\\r" | ssh-add -', "mkdir -p ~/.ssh && chmod 700 ~/.ssh", 'echo "$SSH_KNOWN_HOSTS" >> ~/.ssh/known_hosts'], script: ['ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd /srv/app && ./deploy.sh $CI_COMMIT_SHORT_SHA"'] };
    } else if (o.deploy === "kubectl") {
      ci["deploy"] = { ...base, image: { name: "bitnami/kubectl:latest", entrypoint: [""] }, script: ["kubectl config use-context $KUBE_CONTEXT", "kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA", "kubectl rollout status deployment/app --timeout=180s"] };
    } else {
      ci["pages"] = { stage: "deploy", script: ["mkdir -p public", "cp -r dist/* public/"], artifacts: { paths: ["public"] }, rules: [{ if: "$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH" }], environment: { name: "pages" }, ...(stages.includes("build") ? { needs: ["build"] } : {}) };
    }
  }
  return ci;
}

export function gitlabCiGenerator(_input: string, options: Partial<GitlabCiGeneratorOptions>): TransformResult {
  const o: GitlabCiGeneratorOptions = {
    stack: options.stack ?? "node", version: options.version ?? "", packageManager: options.packageManager ?? "npm",
    stages: options.stages ?? ["lint", "test", "build"], services: options.services ?? [], cache: options.cache ?? true, artifacts: options.artifacts ?? true,
    mrPipelines: options.mrPipelines ?? true, dockerPush: options.dockerPush ?? true, deploy: options.deploy ?? "none",
    manualDeploy: options.manualDeploy ?? true, environmentName: options.environmentName ?? "production", coverage: options.coverage ?? false, retry: options.retry ?? 0,
    interruptible: options.interruptible ?? true, timeoutMinutes: options.timeoutMinutes ?? 0, sast: options.sast ?? false,
  };
  if (o.version && !/^[\w.-]+$/.test(o.version)) return { output: "", error: { message: "The version may only contain letters, digits, dots, dashes and underscores." } };
  if (!/^[\w./-]+$/.test(o.environmentName)) return { output: "", error: { message: "The environment name may only contain letters, digits, dots, dashes, slashes and underscores." } };
  if (!o.stages.length && o.deploy === "none" && !o.sast) return { output: "", error: { message: "Choose at least one stage." } };
  const text = dump(buildGitlabCi(o), { lineWidth: 120, noRefs: true });
  return { output: text, error: null };
}
