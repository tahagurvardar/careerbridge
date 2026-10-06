// Real production-build pages with disposable local PostgreSQL fixtures.
// Refuses remote/non-portfolio databases; never contacts production services.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
const require = createRequire(import.meta.url);
// Playwright is optional capture tooling, supplied externally; no runtime dependency.
const { chromium } = require(
  process.env.PORTFOLIO_PLAYWRIGHT_MODULE || "playwright",
);
const connectionString = process.env.DATABASE_URL;
if (!connectionString)
  throw new Error("A fresh disposable portfolio database is required");
const db = new URL(connectionString);
assert.equal(db.hostname, "127.0.0.1", "Capture requires a loopback database");
assert.match(
  db.pathname,
  /^\/careerbridge_portfolio_test(?:_\d+)?$/,
  "Refusing a non-portfolio database",
);
assert.ok(
  process.env.PORTFOLIO_TLS_CERT && process.env.PORTFOLIO_TLS_KEY,
  "Provide disposable local TLS files",
);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
assert.equal(
  await prisma.user.count(),
  0,
  "Use a fresh database; existing users will not be changed",
);
const origin = "https://127.0.0.1:3143";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = new URL("../docs/assets/screenshots/", import.meta.url);
await fs.mkdir(output, { recursive: true });
try {
  await fetch("http://127.0.0.1:3141");
  throw new Error("Capture server port is occupied");
} catch (error) {
  if (error.message === "Capture server port is occupied") throw error;
}
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3141",
  ],
  {
    cwd: root,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      DATABASE_URL: connectionString,
      DIRECT_URL: connectionString,
      APP_BASE_URL: origin,
      BETTER_AUTH_URL: origin,
      BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
      EMAIL_DELIVERY_DRIVER: "development",
    },
  },
);
server.stdout.resume();
server.stderr.on("data", (data) => process.stderr.write(data));
const proxy = https.createServer(
  {
    cert: await fs.readFile(process.env.PORTFOLIO_TLS_CERT),
    key: await fs.readFile(process.env.PORTFOLIO_TLS_KEY),
  },
  (incoming, outgoing) => {
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port: 3141,
        method: incoming.method,
        path: incoming.url,
        headers: { ...incoming.headers, "x-forwarded-proto": "https" },
      },
      (response) => {
        outgoing.writeHead(response.statusCode || 502, response.headers);
        response.pipe(outgoing);
      },
    );
    request.on("error", () => {
      outgoing.writeHead(502);
      outgoing.end();
    });
    incoming.pipe(request);
  },
);
let browser;
const captures = [];
try {
  await new Promise((resolve, reject) => {
    proxy.once("error", reject);
    proxy.listen(3143, "127.0.0.1", resolve);
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null)
      throw new Error("Capture server exited before startup");
    try {
      if ((await fetch("http://127.0.0.1:3141/api/health")).ok) break;
    } catch {
      /* bounded startup */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (attempt === 59) throw new Error("Capture startup timed out");
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const viewport = { width: 1440, height: 900 };
  async function context() {
    const value = await browser.newContext({
      viewport,
      locale: "en-US",
      timezoneId: "UTC",
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      ignoreHTTPSErrors: true,
    });
    await value.addInitScript(() => localStorage.setItem("theme", "light"));
    return value;
  }
  const guest = await context();
  const candidate = await context();
  const recruiter = await context();
  const admin = await context();
  async function register(ctx, label, role) {
    const email = `${label}@portfolio.example.test`;
    const password = randomBytes(18).toString("hex");
    const page = await ctx.newPage();
    await page.goto(origin + "/en/register", { waitUntil: "networkidle" });
    if (role === "RECRUITER")
      await page.locator('label[for="role-recruiter"]').click();
    await page
      .getByLabel("Full name", { exact: true })
      .fill(`Portfolio ${label[0].toUpperCase() + label.slice(1)}`);
    await page.getByLabel("Email address", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password", { exact: true }).fill(password);
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page.waitForURL((url) => url.pathname.endsWith("/dashboard"));
    await page.close();
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    return user.id;
  }
  const candidateId = await register(candidate, "candidate", "CANDIDATE");
  const recruiterId = await register(recruiter, "recruiter", "RECRUITER");
  const adminId = await register(admin, "admin", "CANDIDATE");
  // This promotion affects only the newly registered synthetic local fixture.
  await prisma.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });
  const fixtureDate = new Date("2026-10-06T10:00:00Z");
  const profile = await prisma.candidateProfile.create({
    data: {
      userId: candidateId,
      headline: "Backend engineering student",
      location: "Baku, Azerbaijan",
      bio: "Synthetic portfolio profile exploring backend infrastructure and reliable systems.",
      education: {
        create: {
          school: "Demo Technical University",
          degree: "BSc",
          fieldOfStudy: "Computer Engineering",
          startYear: 2023,
          isCurrent: true,
        },
      },
    },
  });
  const skills = [];
  for (const name of ["TypeScript", "PostgreSQL", "React", "Go"]) {
    const skill = await prisma.skill.create({
      data: { name, normalizedName: name.toLowerCase() },
    });
    skills.push(skill);
    await prisma.candidateSkill.create({
      data: { candidateProfileId: profile.id, skillId: skill.id },
    });
  }
  const companies = [];
  for (const [index, name] of [
    "Northstar Demo Studio",
    "Atlas Demo Labs",
    "Harbor Demo Systems",
  ].entries()) {
    companies.push(
      await prisma.company.create({
        data: {
          id: `portfolio-company-${index + 1}`,
          name,
          slug: `portfolio-company-${index + 1}`,
          tagline: "Synthetic local portfolio company",
          description:
            "Fictional company used only for local UI documentation captures.",
          industry: "Software & Technology",
          headquarters: index === 0 ? "Baku, Azerbaijan" : "Remote",
          websiteUrl: "https://portfolio.example.test",
          companySize: "ELEVEN_TO_FIFTY",
          isPublished: true,
          createdAt: fixtureDate,
          memberships: { create: { userId: recruiterId, role: "OWNER" } },
        },
      }),
    );
  }
  const jobs = [];
  const titles = [
    "Backend Engineer",
    "Frontend Developer",
    "Software Engineering Intern",
    "Platform Engineer",
    "Full-Stack Developer",
    "QA Engineer",
  ];
  for (const [index, title] of titles.entries()) {
    jobs.push(
      await prisma.job.create({
        data: {
          id: `portfolio-job-${index + 1}`,
          companyId: companies[index % companies.length].id,
          title,
          slug: `portfolio-job-${index + 1}`,
          summary:
            "Synthetic local opportunity for portfolio interface documentation.",
          description:
            "A fictional role for demonstrating the existing job discovery and hiring workspace.",
          responsibilities:
            "Build maintainable services and collaborate on clear engineering workflows.",
          requirements:
            "Software fundamentals, communication and experience with the technologies listed.",
          location: index % 2 === 0 ? "Baku, Azerbaijan" : "Remote",
          employmentType: index === 2 ? "INTERNSHIP" : "FULL_TIME",
          workplaceType: index % 2 === 0 ? "HYBRID" : "REMOTE",
          experienceLevel: index === 2 ? "ENTRY" : "JUNIOR",
          salaryMin: 18000 + index * 2000,
          salaryMax: 30000 + index * 2000,
          salaryCurrency: "USD",
          status: "PUBLISHED",
          createdAt: fixtureDate,
          publishedAt: fixtureDate,
          skills: {
            create: skills.slice(0, 3).map((skill) => ({ skillId: skill.id })),
          },
        },
      }),
    );
  }
  for (const [index, status] of [
    "SUBMITTED",
    "UNDER_REVIEW",
    "INTERVIEW",
    "SUBMITTED",
  ].entries()) {
    await prisma.jobApplication.create({
      data: {
        jobId: jobs[index].id,
        candidateId,
        status,
        createdAt: fixtureDate,
        submittedAt: fixtureDate,
        history: {
          create: {
            toStatus: "SUBMITTED",
            createdAt: fixtureDate,
            changedByUserId: candidateId,
          },
        },
      },
    });
  }
  for (const job of jobs.slice(4))
    await prisma.savedJob.create({
      data: { candidateId, jobId: job.id, createdAt: fixtureDate },
    });
  async function capture(ctx, file, route, size = viewport) {
    const page = await ctx.newPage();
    await page.setViewportSize(size);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const response = await page.goto(origin + route, {
      waitUntil: "networkidle",
    });
    assert.equal(response?.status(), 200, `Page failed: ${route}`);
    assert.equal(
      new URL(page.url()).pathname,
      route,
      `Unexpected auth redirect: ${route}`,
    );
    await page.evaluate(() => document.fonts.ready);
    if (route === "/en/jobs") {
      await page
        .getByRole("heading", { name: "Open jobs", exact: true })
        .evaluate((element) => element.scrollIntoView({ block: "start" }));
    }
    const text = await page.locator("body").innerText();
    assert.doesNotMatch(text, /[\w.+-]+@[\w.-]+\.[a-z]{2,}|[A-Z]:[\\/]/i);
    assert.deepEqual(errors, []);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    const bytes = await page.screenshot({
      path: fileURLToPath(new URL(file, output)),
      animations: "disabled",
    });
    captures.push({
      file,
      route,
      viewport: size,
      theme: "light",
      state: "sanitized synthetic local database",
      productionProof: false,
      errors,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
    console.log(`Captured ${file}`);
    await page.close();
  }
  await capture(guest, "landing-en-light.png", "/en");
  await capture(guest, "job-discovery-en-light.png", "/en/jobs");
  await capture(
    candidate,
    "candidate-dashboard-en-light.png",
    "/en/candidate/dashboard",
  );
  await capture(
    recruiter,
    "recruiter-company-en-light.png",
    "/en/recruiter/companies/portfolio-company-1",
  );
  await capture(admin, "admin-moderation-en-light.png", "/en/admin/companies");
  await capture(guest, "job-discovery-en-light-mobile.png", "/en/jobs", {
    width: 390,
    height: 844,
  });
  await fs.writeFile(
    new URL("capture-manifest.json", output),
    JSON.stringify(
      {
        applicationVersion: "1.0.0",
        captures,
        fixtureDate: fixtureDate.toISOString(),
        counts: {
          users: 3,
          companies: 3,
          jobs: 6,
          applications: 4,
          savedJobs: 2,
        },
        privacy:
          "Only freshly created synthetic local identities and companies. No production connection, email delivery, CV files, meeting links, tokens or real personal data are captured.",
        verificationBoundary:
          "Successful local page rendering is portfolio evidence, not production verification of recruiter/admin workflows.",
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => proxy.close(() => resolve()));
  server.kill();
  await prisma.$disconnect();
}
